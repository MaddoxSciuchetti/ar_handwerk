import { getDb } from "@/lib/db/client";
import type {
  DeviceRecord,
  DeviceSetupInput,
  DeviceType,
  DeviceVideoInsert,
  DeviceVideoRecord,
  SyncPreference,
} from "@/lib/devices/types";

type DeviceRow = {
  id: string;
  user_id: string;
  device_type: DeviceType;
  device_name: string;
  serial_number: string;
  firmware_version: string;
  sync_preference: SyncPreference;
  connected_at: string;
};

type DeviceVideoRow = {
  id: string;
  user_id: string | null;
  device_type: DeviceType;
  title: string;
  r2_key: string;
  thumbnail_r2_key: string | null;
  duration_sec: number | null;
  recorded_at: string;
};

function mapDevice(row: DeviceRow): DeviceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    deviceType: row.device_type,
    deviceName: row.device_name,
    serialNumber: row.serial_number,
    firmwareVersion: row.firmware_version,
    syncPreference: row.sync_preference,
    connectedAt: row.connected_at,
  };
}

function mapVideo(row: DeviceVideoRow): DeviceVideoRecord {
  return {
    id: row.id,
    userId: row.user_id,
    deviceType: row.device_type,
    title: row.title,
    r2Key: row.r2_key,
    thumbnailR2Key: row.thumbnail_r2_key,
    durationSec: row.duration_sec,
    recordedAt: row.recorded_at,
  };
}

export async function getDeviceForUser(userId: string): Promise<DeviceRecord | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, user_id, device_type, device_name, serial_number,
           firmware_version, sync_preference, connected_at
    FROM devices
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  const row = rows[0] as DeviceRow | undefined;
  return row ? mapDevice(row) : null;
}

export async function upsertDevice(
  userId: string,
  input: DeviceSetupInput
): Promise<DeviceRecord> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO devices (
      user_id, device_type, device_name, serial_number,
      firmware_version, sync_preference, connected_at, updated_at
    )
    VALUES (
      ${userId},
      ${input.deviceType},
      ${input.deviceName},
      ${input.serialNumber},
      ${input.firmwareVersion},
      ${input.syncPreference},
      now(),
      now()
    )
    ON CONFLICT (user_id, device_type)
    DO UPDATE SET
      device_name = EXCLUDED.device_name,
      serial_number = EXCLUDED.serial_number,
      firmware_version = EXCLUDED.firmware_version,
      sync_preference = EXCLUDED.sync_preference,
      connected_at = now(),
      updated_at = now()
    RETURNING id, user_id, device_type, device_name, serial_number,
              firmware_version, sync_preference, connected_at
  `;

  return mapDevice(rows[0] as DeviceRow);
}

export async function deleteDeviceForUser(userId: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM devices WHERE user_id = ${userId}`;
}

export async function listVideosForDeviceType(
  deviceType: DeviceType
): Promise<DeviceVideoRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, user_id, device_type, title, r2_key, thumbnail_r2_key,
           duration_sec, recorded_at
    FROM device_videos
    WHERE device_type = ${deviceType}
    ORDER BY recorded_at DESC
  `;

  return (rows as DeviceVideoRow[]).map(mapVideo);
}

export async function listVideosForUser(userId: string): Promise<DeviceVideoRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, user_id, device_type, title, r2_key, thumbnail_r2_key,
           duration_sec, recorded_at
    FROM device_videos
    WHERE user_id = ${userId}
    ORDER BY recorded_at DESC
  `;

  return (rows as DeviceVideoRow[]).map(mapVideo);
}

export async function upsertDeviceVideo(input: DeviceVideoInsert): Promise<DeviceVideoRecord> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO device_videos (
      user_id, device_type, title, r2_key, thumbnail_r2_key,
      duration_sec, recorded_at
    )
    VALUES (
      ${input.userId},
      ${input.deviceType},
      ${input.title},
      ${input.r2Key},
      ${input.thumbnailR2Key ?? null},
      ${input.durationSec ?? null},
      ${input.recordedAt}
    )
    ON CONFLICT (r2_key)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      title = EXCLUDED.title,
      recorded_at = EXCLUDED.recorded_at,
      duration_sec = COALESCE(EXCLUDED.duration_sec, device_videos.duration_sec)
    RETURNING id, user_id, device_type, title, r2_key, thumbnail_r2_key,
              duration_sec, recorded_at
  `;

  return mapVideo(rows[0] as DeviceVideoRow);
}

export async function deleteDeviceVideoForUser(
  userId: string,
  r2Key: string
): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM device_videos
    WHERE r2_key = ${r2Key} AND user_id = ${userId}
    RETURNING id
  `;

  return rows.length > 0;
}
