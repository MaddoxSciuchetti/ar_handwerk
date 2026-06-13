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
  deviceType: DeviceType;
  title: string;
  r2Key: string;
  thumbnailR2Key: string | null;
  durationSec: number | null;
  recordedAt: string;
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
