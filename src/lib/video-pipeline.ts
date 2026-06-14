import { planActionsForTasks } from "@/lib/actions/planner";
import { simulateGeminiTranscriptionDelay } from "@/lib/demo/config";
import { getConnectedGmailAddress } from "@/lib/google/gmail";
import { extractServiceTasks } from "@/lib/pioneer";
import { parsePioneerTasks, enrichTasksWithPioneerData, type Task } from "@/lib/tasks";
import { getTranscriptionPrompt, transcribeVideo } from "@/lib/transcribe";

export type VideoAnalysisResult = {
  tasks: Task[];
  transcript: string;
  source: string;
  transcriptionPrompt: string;
  demo?: boolean;
};

async function runPioneerAndPlan(
  transcript: string,
  userId: string,
  source: string,
): Promise<Pick<VideoAnalysisResult, "tasks" | "transcript" | "source">> {
  const pioneerResult = await extractServiceTasks(transcript);
  const pioneerData = pioneerResult.data;
  const tasks = parsePioneerTasks(pioneerData);

  const defaultEmail = await getConnectedGmailAddress(userId).catch(() => null);
  let plannedTasks = tasks;

  try {
    plannedTasks = enrichTasksWithPioneerData(
      pioneerData,
      await planActionsForTasks(tasks, {
        transcript,
        defaultEmail,
      }),
    );
  } catch {
    plannedTasks = enrichTasksWithPioneerData(pioneerData, tasks);
  }

  return {
    tasks: plannedTasks,
    transcript,
    source,
  };
}

export async function analyzeVideoTranscript(
  transcript: string,
  userId: string,
  options?: {
    source?: string;
    simulateTranscriptionDelay?: boolean;
    demo?: boolean;
  },
): Promise<VideoAnalysisResult> {
  if (options?.simulateTranscriptionDelay) {
    await simulateGeminiTranscriptionDelay();
  }

  const result = await runPioneerAndPlan(
    transcript,
    userId,
    options?.source ?? "transcript",
  );

  return {
    ...result,
    transcriptionPrompt: getTranscriptionPrompt(),
    demo: options?.demo,
  };
}

export async function analyzeVideoFile(
  file: File,
  userId: string,
): Promise<VideoAnalysisResult> {
  const transcribeResult = await transcribeVideo(file);

  if (transcribeResult.source === "stub") {
    throw new Error(
      "No transcription API is configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
    );
  }

  const result = await runPioneerAndPlan(
    transcribeResult.transcript,
    userId,
    transcribeResult.source,
  );

  return {
    ...result,
    transcriptionPrompt: getTranscriptionPrompt(),
  };
}
