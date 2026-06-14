import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupportedDevice } from "@/lib/devices/catalog";
import {
  deleteDeviceForUser,
  getDeviceForUser,
  upsertDevice,
} from "@/lib/devices/repository";
import type { DeviceSetupInput, DeviceType, SyncPreference } from "@/lib/devices/types";

export const runtime = "nodejs";

function isDeviceType(value: string): value is DeviceType {
  return value === "meta-ray-ban";
}

function isSyncPreference(value: string): value is SyncPreference {
  return value === "auto" || value === "manual";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const device = await getDeviceForUser(user.id);
    return NextResponse.json({ device });
  } catch (error) {
    console.error("Failed to load device", error);
    return NextResponse.json({ error: "Failed to load device" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<DeviceSetupInput>;
    const deviceType = body.deviceType ?? "meta-ray-ban";
    const deviceName = body.deviceName?.trim();
    const serialNumber = body.serialNumber?.trim();
    const firmwareVersion = body.firmwareVersion?.trim();
    const syncPreference = body.syncPreference ?? "auto";

    if (!isDeviceType(deviceType)) {
      return NextResponse.json({ error: "Unsupported device type" }, { status: 400 });
    }

    if (!getSupportedDevice(deviceType)) {
      return NextResponse.json({ error: "Unsupported device type" }, { status: 400 });
    }

    if (!deviceName || !serialNumber || !firmwareVersion) {
      return NextResponse.json({ error: "Missing required device fields" }, { status: 400 });
    }

    if (!isSyncPreference(syncPreference)) {
      return NextResponse.json({ error: "Invalid sync preference" }, { status: 400 });
    }

    const device = await upsertDevice(user.id, {
      deviceType,
      deviceName,
      serialNumber,
      firmwareVersion,
      syncPreference,
    });

    return NextResponse.json({ device });
  } catch (error) {
    console.error("Failed to register device", error);
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteDeviceForUser(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to disconnect device", error);
    return NextResponse.json({ error: "Failed to disconnect device" }, { status: 500 });
  }
}
