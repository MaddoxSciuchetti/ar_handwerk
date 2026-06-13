import { planActionsForTasks } from "@/lib/actions/planner";
import { getConnectedGmailAddress } from "@/lib/google/gmail";
import { extractServiceTasks } from "@/lib/pioneer";
import { parsePioneerTasks, type Task } from "@/lib/tasks";
import { getTranscriptionPrompt, transcribeVideo } from "@/lib/transcribe";

export type VideoAnalysisResult = {
  tasks: Task[];
  transcript: string;
  source: string;
  transcriptionPrompt: string;
};

export async function analyzeVideoFile(
  file: File,
  userId: string
): Promise<VideoAnalysisResult> {
  const transcribeResult = await transcribeVideo(file);

  if (transcribeResult.source === "stub") {
    throw new Error(
      "No transcription API is configured. Add GEMINI_API_KEY to .env.local and restart the dev server."
    );
  }

  const pioneerResult = await extractServiceTasks(transcribeResult.transcript);
  const tasks = parsePioneerTasks(pioneerResult.data);

  const defaultEmail = await getConnectedGmailAddress(userId).catch(() => null);
  let plannedTasks = tasks;

  try {
    plannedTasks = await planActionsForTasks(tasks, {
      transcript: transcribeResult.transcript,
      defaultEmail,
    });
  } catch {
    plannedTasks = tasks;
  }

  return {
    tasks: plannedTasks,
    transcript: transcribeResult.transcript,
    source: transcribeResult.source,
    transcriptionPrompt: getTranscriptionPrompt(),
  };
}
