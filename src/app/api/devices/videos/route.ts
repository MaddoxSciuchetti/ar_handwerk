import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ensureDeviceVideoSchema } from "@/lib/db/ensure-schema";
import {
  deleteDeviceVideoForUser,
  getDeviceForUser,
} from "@/lib/devices/repository";
import { syncUserVideosFromR2 } from "@/lib/devices/videos";
import {
  deleteR2Object,
  getPresignedR2Url,
  isR2Configured,
  isUserOwnedR2Key,
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
    await ensureDeviceVideoSchema();

    const device = await getDeviceForUser(user.id);
    if (!device) {
      return NextResponse.json({ error: "No connected device" }, { status: 404 });
    }

    const records = await syncUserVideosFromR2(user.id, device.deviceType);
    const videos = await Promise.all(
      records.map(async (record) => ({
        id: record.r2Key,
        title: record.title,
        recordedAt: record.recordedAt,
        durationSec: record.durationSec,
        sizeBytes: null,
        playbackUrl: await getPresignedR2Url(record.r2Key),
        thumbnailUrl: record.thumbnailR2Key
          ? await getPresignedR2Url(record.thumbnailR2Key)
          : null,
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

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
  }

  try {
    await ensureDeviceVideoSchema();

    const body = (await request.json()) as { key?: string };
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

    await deleteDeviceVideoForUser(user.id, key);
    await deleteR2Object(key);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete device video", error);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
