import { getDemoTranscript } from "@/lib/demo/transcripts";

const MIN_TRANSCRIPTION_DELAY_MS = 10_000;
const MAX_TRANSCRIPTION_DELAY_MS = 15_000;

export function isDemoVideoModeEnabled(): boolean {
  return process.env.DEMO_VIDEO_MODE === "true";
}

export function resolveDemoTranscript(demoIndex: number): string | null {
  if (!isDemoVideoModeEnabled()) return null;
  return getDemoTranscript(demoIndex);
}

/** Simulates Gemini multimodal transcription latency for demo recordings. */
export async function simulateGeminiTranscriptionDelay(): Promise<void> {
  const span = MAX_TRANSCRIPTION_DELAY_MS - MIN_TRANSCRIPTION_DELAY_MS;
  const delayMs = MIN_TRANSCRIPTION_DELAY_MS + Math.floor(Math.random() * (span + 1));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
