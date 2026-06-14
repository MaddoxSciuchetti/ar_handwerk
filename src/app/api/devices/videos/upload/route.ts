import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ensureDeviceVideoSchema } from "@/lib/db/ensure-schema";
import { getDeviceForUser, upsertDeviceVideo } from "@/lib/devices/repository";
import {
  buildR2UploadKey,
  getPresignedR2Url,
  getVideoTitleFromR2Key,
  isR2Configured,
  uploadR2Video,
} from "@/lib/r2/client";

export const runtime = "nodejs";

const DEFAULT_DEVICE_TYPE = "meta-ray-ban";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
  }

  try {
    await ensureDeviceVideoSchema();

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

    const device = await getDeviceForUser(user.id);
    const recordedAt = new Date().toISOString();
    const title = getVideoTitleFromR2Key(key);

    await upsertDeviceVideo({
      userId: user.id,
      deviceType: device?.deviceType ?? DEFAULT_DEVICE_TYPE,
      title,
      r2Key: key,
      recordedAt,
    });

    return NextResponse.json({
      key,
      title,
      playbackUrl: await getPresignedR2Url(key),
      sizeBytes: file.size,
      recordedAt,
    });
  } catch (error) {
    console.error("Failed to upload video to R2", error);
    const message = error instanceof Error ? error.message : "Failed to upload video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
