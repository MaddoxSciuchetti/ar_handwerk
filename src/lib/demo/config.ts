import {
  DEMO_VIDEO_SCRIPTS,
  getDemoScriptByIndex,
  matchDemoScript,
} from "@/lib/demo/transcripts";
import { getVideoTitleFromR2Key } from "@/lib/r2/client";

const MIN_TRANSCRIPTION_DELAY_MS = 10_000;
const MAX_TRANSCRIPTION_DELAY_MS = 15_000;

export function isDemoVideoModeEnabled(): boolean {
  return process.env.DEMO_VIDEO_MODE === "true";
}

function demoHaystack(input: { key?: string; title?: string }): string {
  const title = input.title?.trim() || (input.key ? getVideoTitleFromR2Key(input.key) : "");
  return `${title} ${input.key ?? ""}`.trim();
}

function pickUnusedDemoScript(
  used: Set<string>,
  demoIndex: number,
): (typeof DEMO_VIDEO_SCRIPTS)[number] {
  const remaining = DEMO_VIDEO_SCRIPTS.filter((script) => !used.has(script.id));
  if (remaining.length > 0) return remaining[0];

  return getDemoScriptByIndex(demoIndex);
}

export function resolveDemoScript(input: {
  key?: string;
  title?: string;
  demoIndex?: number;
  usedScriptIds?: string[];
}): { scriptId: string; transcript: string; matchedBy: "title" | "index" } | null {
  if (!isDemoVideoModeEnabled()) return null;

  const used = new Set(input.usedScriptIds ?? []);
  const demoIndex = input.demoIndex ?? 0;
  const haystack = demoHaystack(input);

  if (haystack) {
    const matched = matchDemoScript(haystack);
    // Title match only when this script is not already assigned to another video in the batch.
    if (matched && !used.has(matched.id)) {
      return { scriptId: matched.id, transcript: matched.transcript, matchedBy: "title" };
    }
  }

  // Opaque or duplicate filenames: assign the next unused script in stable order.
  const fallback = pickUnusedDemoScript(used, demoIndex);
  return { scriptId: fallback.id, transcript: fallback.transcript, matchedBy: "index" };
}

export function resolveDemoScriptOrThrow(input: {
  key?: string;
  title?: string;
  demoIndex?: number;
  usedScriptIds?: string[];
}): { scriptId: string; transcript: string; matchedBy: "title" | "index" } {
  const resolved = resolveDemoScript(input);
  if (!resolved) {
    throw new Error("Demo video mode is not enabled.");
  }
  return resolved;
}

/** Simulates Gemini multimodal transcription latency for demo recordings. */
export async function simulateGeminiTranscriptionDelay(): Promise<void> {
  const span = MAX_TRANSCRIPTION_DELAY_MS - MIN_TRANSCRIPTION_DELAY_MS;
  const delayMs = MIN_TRANSCRIPTION_DELAY_MS + Math.floor(Math.random() * (span + 1));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
