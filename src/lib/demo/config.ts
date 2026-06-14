import { getDemoTranscript, matchDemoScript } from "@/lib/demo/transcripts";
import { getVideoTitleFromR2Key } from "@/lib/r2/client";

const MIN_TRANSCRIPTION_DELAY_MS = 10_000;
const MAX_TRANSCRIPTION_DELAY_MS = 15_000;

export function isDemoVideoModeEnabled(): boolean {
  return process.env.DEMO_VIDEO_MODE === "true";
}

export function resolveDemoTranscript(input: {
  key?: string;
  title?: string;
  demoIndex?: number;
}): string | null {
  if (!isDemoVideoModeEnabled()) return null;

  const title = input.title?.trim() || (input.key ? getVideoTitleFromR2Key(input.key) : "");
  const haystack = `${title} ${input.key ?? ""}`.trim();

  if (haystack) {
    const matched = matchDemoScript(haystack);
    if (matched) return matched.transcript;
  }

  return getDemoTranscript(input.demoIndex ?? 0);
}

/** Simulates Gemini multimodal transcription latency for demo recordings. */
export async function simulateGeminiTranscriptionDelay(): Promise<void> {
  const span = MAX_TRANSCRIPTION_DELAY_MS - MIN_TRANSCRIPTION_DELAY_MS;
  const delayMs = MIN_TRANSCRIPTION_DELAY_MS + Math.floor(Math.random() * (span + 1));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
