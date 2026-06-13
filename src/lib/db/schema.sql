-- Neon schema for device connections and synced videos

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'meta-ray-ban',
  device_name TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  firmware_version TEXT NOT NULL DEFAULT 'v12.4.1',
  sync_preference TEXT NOT NULL DEFAULT 'auto' CHECK (sync_preference IN ('auto', 'manual')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS devices_user_id_device_type_idx
  ON devices (user_id, device_type);

CREATE TABLE IF NOT EXISTS device_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL,
  title TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  thumbnail_r2_key TEXT,
  duration_sec INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_videos_device_type_idx
  ON device_videos (device_type);

CREATE INDEX IF NOT EXISTS device_videos_recorded_at_idx
  ON device_videos (recorded_at DESC);

-- Demo catalog for Meta Ray Ban glasses
INSERT INTO device_videos (device_type, title, r2_key, duration_sec, recorded_at)
VALUES
  (
    'meta-ray-ban',
    'Site walk — Building A',
    'devices/meta-ray-ban/videos/demo-1.mp4',
    42,
    '2025-06-13T10:30:00Z'
  ),
  (
    'meta-ray-ban',
    'Safety inspection — Roof',
    'devices/meta-ray-ban/videos/demo-2.mp4',
    68,
    '2025-06-12T14:15:00Z'
  ),
  (
    'meta-ray-ban',
    'Equipment check — Workshop',
    'devices/meta-ray-ban/videos/demo-3.mp4',
    35,
    '2025-06-11T09:00:00Z'
  )
ON CONFLICT (r2_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  problem TEXT,
  assignee TEXT,
  location TEXT,
  deadline TEXT,
  item_to_buy TEXT,
  material TEXT,
  equipment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  proposed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_flow_step INTEGER NOT NULL DEFAULT 0,
  integrations JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_user_id_created_at_idx
  ON tasks (user_id, created_at DESC);
