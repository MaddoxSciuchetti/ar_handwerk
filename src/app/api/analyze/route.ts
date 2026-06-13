import { NextResponse } from "next/server";
import { extractServiceTasks } from "@/lib/pioneer";

export const runtime = "nodejs";

/**
 * Step 2 of the pipeline: transcript -> Pioneer structured extraction.
 *
 * Accepts JSON `{ transcript: string }` and returns the structured tasks,
 * entities and relations extracted by the fine-tuned Pioneer model.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const transcript = body?.transcript;

    if (typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'transcript' string." },
        { status: 400 },
      );
    }

    const result = await extractServiceTasks(transcript);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
