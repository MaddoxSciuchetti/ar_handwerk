import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDeviceForUser } from "@/lib/devices/repository";
import {
  getPresignedR2Url,
  getVideoTitleFromR2Key,
  isR2Configured,
  listR2VideoObjects,
} from "@/lib/r2/client";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
  }

  try {
    const device = await getDeviceForUser(user.id);
    if (!device) {
      return NextResponse.json({ error: "No connected device" }, { status: 404 });
    }

    const objects = await listR2VideoObjects();
    const videos = await Promise.all(
      objects.map(async (object) => ({
        id: object.key,
        title: getVideoTitleFromR2Key(object.key),
        recordedAt: object.lastModified ?? new Date().toISOString(),
        durationSec: null,
        sizeBytes: object.sizeBytes,
        playbackUrl: await getPresignedR2Url(object.key),
        thumbnailUrl: null,
      }))
    );

    return NextResponse.json({
      device: {
        id: device.id,
        deviceType: device.deviceType,
        deviceName: device.deviceName,
        serialNumber: device.serialNumber,
      },
      videos,
    });
  } catch (error) {
    console.error("Failed to load device videos", error);
    return NextResponse.json({ error: "Failed to load device videos" }, { status: 500 });
  }
}
