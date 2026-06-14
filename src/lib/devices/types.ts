export type DeviceType = "meta-ray-ban";

export type SyncPreference = "auto" | "manual";

export type DeviceRecord = {
  id: string;
  userId: string;
  deviceType: DeviceType;
  deviceName: string;
  serialNumber: string;
  firmwareVersion: string;
  syncPreference: SyncPreference;
  connectedAt: string;
};

export type DeviceVideoRecord = {
  id: string;
  userId: string | null;
  deviceType: DeviceType;
  title: string;
  r2Key: string;
  thumbnailR2Key: string | null;
  durationSec: number | null;
  recordedAt: string;
};

export type DeviceVideoInsert = {
  userId: string;
  deviceType: DeviceType;
  title: string;
  r2Key: string;
  recordedAt: string;
  durationSec?: number | null;
  thumbnailR2Key?: string | null;
};

export type DeviceVideo = DeviceVideoRecord & {
  playbackUrl: string;
  thumbnailUrl: string | null;
};

export type DeviceSetupInput = {
  deviceType: DeviceType;
  deviceName: string;
  serialNumber: string;
  firmwareVersion: string;
  syncPreference: SyncPreference;
};
