import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildR2UploadKey,
  getPresignedR2Url,
  getVideoTitleFromR2Key,
  isR2Configured,
  uploadR2Video,
} from "@/lib/r2/client";

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
    const formData = await request.formData();
    const file = formData.get("video");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No video file provided under the 'video' field." },
        { status: 400 }
      );
    }

    const key = buildR2UploadKey(user.id, file.name);
    await uploadR2Video(file, key);

    return NextResponse.json({
      key,
      title: getVideoTitleFromR2Key(key),
      playbackUrl: await getPresignedR2Url(key),
      sizeBytes: file.size,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to upload video to R2", error);
    const message = error instanceof Error ? error.message : "Failed to upload video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
