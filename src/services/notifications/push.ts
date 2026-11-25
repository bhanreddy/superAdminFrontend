import type { NotificationChannel } from "../../api/notifications";
export const nativePushSupported = false;
export async function enableDevicePush(
  _channels: NotificationChannel[],
): Promise<void> {
  throw new Error(
    "Device push enrolment is available in the Android and iOS apps.",
  );
}
export async function disableDevicePush(): Promise<void> {}
export async function devicePushEnabled(): Promise<boolean> {
  return false;
}
export function watchDevicePush(
  _userId: string,
  _onReceive: () => void,
  _onOpen: () => void,
): () => void {
  return () => {};
}

export async function syncNotificationBadge(_count: number): Promise<void> {}
