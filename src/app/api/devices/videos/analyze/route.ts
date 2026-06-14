import { NextResponse } from "next/server";
import { resolveDemoScript } from "@/lib/demo/config";
import { getSessionUser } from "@/lib/auth/session";
import { getDeviceForUser } from "@/lib/devices/repository";
import { fetchR2VideoFile, isR2Configured, isUserOwnedR2Key } from "@/lib/r2/client";
import { analyzeVideoFile, analyzeVideoTranscript } from "@/lib/video-pipeline";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      key?: string;
      demoIndex?: number;
      title?: string;
      usedScriptIds?: string[];
    };
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
    const resolved = resolveDemoScript({
      key,
      title: body.title,
      demoIndex,
      usedScriptIds: body.usedScriptIds,
    });

    if (resolved) {
      const result = await analyzeVideoTranscript(resolved.transcript, user.id, {
        source: "demo-gemini",
        simulateTranscriptionDelay: true,
        demo: true,
        demoScriptId: resolved.scriptId,
      });

      return NextResponse.json({
        key,
        title: key.split("/").pop() ?? "Demo video",
        scriptId: resolved.scriptId,
        matchedBy: resolved.matchedBy,
        ...result,
      });
    }

    const file = await fetchR2VideoFile(key);
    const result = await analyzeVideoFile(file, user.id);

    return NextResponse.json({
      key,
      title: file.name,
      ...result,
    });
  } catch (error) {
    console.error("Failed to analyze device video", error);
    const message = error instanceof Error ? error.message : "Failed to analyze video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
