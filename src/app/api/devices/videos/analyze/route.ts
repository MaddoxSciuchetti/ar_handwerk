import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDeviceForUser } from "@/lib/devices/repository";
import { fetchR2VideoFile, isR2Configured } from "@/lib/r2/client";
import { analyzeVideoFile } from "@/lib/video-pipeline";

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
    const body = (await request.json()) as { key?: string };
    const key = body.key?.trim();

    if (!key) {
      return NextResponse.json({ error: "A video key is required" }, { status: 400 });
    }

    const device = await getDeviceForUser(user.id);
    if (!device) {
      return NextResponse.json({ error: "No connected device" }, { status: 404 });
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
