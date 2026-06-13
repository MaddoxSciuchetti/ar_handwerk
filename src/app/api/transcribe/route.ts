import { NextResponse } from "next/server";
import { getTranscriptionPrompt, getTranscriptionProvider, transcribeVideo } from "@/lib/transcribe";

export const runtime = "nodejs";

/** Returns which transcription provider is active (for UI hints). */
export async function GET() {
  const provider = getTranscriptionProvider();
  return NextResponse.json({
    provider,
    configured: provider !== "stub",
  });
}

/**
 * Step 1 of the pipeline: video -> transcript.
 *
 * Accepts a multipart/form-data upload with a `video` field and returns the
 * full transcript produced by the multimodal model.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No video file provided under the 'video' field." },
        { status: 400 },
      );
    }

    const result = await transcribeVideo(file);

    return NextResponse.json({
      transcript: result.transcript,
      source: result.source,
      durationMs: result.durationMs,
      transcriptionPrompt: getTranscriptionPrompt(),
      file: { name: file.name, type: file.type, size: file.size },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
