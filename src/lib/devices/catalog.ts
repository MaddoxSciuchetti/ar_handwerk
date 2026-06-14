import type { DeviceType } from "@/lib/devices/types";

export type SupportedDevice = {
  type: DeviceType;
  label: string;
  description: string;
  defaultFirmware: string;
};

export const SUPPORTED_DEVICES: SupportedDevice[] = [
  {
    type: "meta-ray-ban",
    label: "Meta Ray Ban",
    description: "Smart glasses for hands-free field capture",
    defaultFirmware: "v12.4.1",
  },
];

export function getSupportedDevice(type: DeviceType): SupportedDevice | undefined {
  return SUPPORTED_DEVICES.find((device) => device.type === type);
}
