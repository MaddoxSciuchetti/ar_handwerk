import {
  listVideosForUser,
  upsertDeviceVideo,
} from "@/lib/devices/repository";
import type { DeviceType, DeviceVideoRecord } from "@/lib/devices/types";
import {
  getUserUploadPrefix,
  getVideoTitleFromR2Key,
  listR2VideoObjects,
} from "@/lib/r2/client";

export async function syncUserVideosFromR2(
  userId: string,
  deviceType: DeviceType
): Promise<DeviceVideoRecord[]> {
  const prefix = getUserUploadPrefix(userId);
  const objects = await listR2VideoObjects(prefix);

  await Promise.all(
    objects.map((object) =>
      upsertDeviceVideo({
        userId,
        deviceType,
        title: getVideoTitleFromR2Key(object.key),
        r2Key: object.key,
        recordedAt: object.lastModified ?? new Date().toISOString(),
      })
    )
  );

  return listVideosForUser(userId);
}
