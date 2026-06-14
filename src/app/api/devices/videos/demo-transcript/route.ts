import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDeviceForUser } from "@/lib/devices/repository";
import {
  isDemoVideoModeEnabled,
  resolveDemoTranscript,
  simulateGeminiTranscriptionDelay,
} from "@/lib/demo/config";
import { isR2Configured, isUserOwnedR2Key } from "@/lib/r2/client";

export const runtime = "nodejs";

/** Demo step 1 — simulated Gemini transcription delay, returns scripted transcript. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
  }

  if (!isDemoVideoModeEnabled()) {
    return NextResponse.json({ error: "Demo video mode is not enabled" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { key?: string; demoIndex?: number; title?: string };
    const key = body.key?.trim();

    if (!key) {
      return NextResponse.json({ error: "A video key is required" }, { status: 400 });
    }

    if (!isUserOwnedR2Key(user.id, key)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const device = await getDeviceForUser(user.id);
    if (!device) {
      return NextResponse.json({ error: "No connected device" }, { status: 404 });
    }

    const demoIndex = typeof body.demoIndex === "number" ? body.demoIndex : 0;
    const transcript = resolveDemoTranscript({
      key,
      title: body.title,
      demoIndex,
    });

    if (!transcript) {
      return NextResponse.json({ error: "No demo transcript configured" }, { status: 404 });
    }

    await simulateGeminiTranscriptionDelay();

    return NextResponse.json({
      key,
      title: body.title?.trim() || key.split("/").pop() || "Demo video",
      transcript,
      demo: true,
    });
  } catch (error) {
    console.error("Failed to resolve demo transcript", error);
    const message = error instanceof Error ? error.message : "Failed to load demo transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
