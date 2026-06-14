import { getDb } from "@/lib/db/client";

let deviceVideoSchemaReady = false;

export async function ensureDeviceVideoSchema(): Promise<void> {
  if (deviceVideoSchemaReady) return;

  const sql = getDb();
  await sql`ALTER TABLE device_videos ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS device_videos_user_id_idx ON device_videos (user_id)`;

  deviceVideoSchemaReady = true;
}
