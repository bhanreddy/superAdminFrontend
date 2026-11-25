import { Platform } from "react-native";
import Constants from "expo-constants";
import { notificationApi, NotificationChannel } from "../../api/notifications";
import { getStoredAccessToken } from "../../api/tokens";
export const nativePushSupported = true;
let registration: { id: string; accessToken: string } | null = null;
let registering: Promise<void> | null = null;
async function sdk(): Promise<typeof import("expo-notifications")> {
  return require("expo-notifications");
}
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Push registration timed out. Check your connection and retry.",
              ),
            ),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
const handledResponses = new Map<string, string>();
async function token() {
  const value = await getStoredAccessToken();
  if (!value) throw new Error("Sign in again before enabling notifications.");
  return value;
}
export async function enableDevicePush(
  channels: NotificationChannel[],
): Promise<void> {
  if (registering) return registering;
  registering = (async () => {
    const sessionToken = await token();
    const notifications = await sdk();
    if (Platform.OS === "android") {
      for (const channel of channels)
        await notifications.setNotificationChannelAsync(channel.id, {
          name: channel.label,
          description: channel.description,
          importance: channel.mandatory
            ? notifications.AndroidImportance.HIGH
            : notifications.AndroidImportance.DEFAULT,
          lockscreenVisibility:
            notifications.AndroidNotificationVisibility.PRIVATE,
          sound: null,
        });
    }
    let permission = await notifications.getPermissionsAsync();
    if (!permission.granted)
      permission = await notifications.requestPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Notification permission was not granted. Enable it in device settings, then retry.",
      );
    const projectId =
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId)
      throw new Error(
        "This app build is missing its push project configuration.",
      );
    const result = await bounded(
      notifications.getExpoPushTokenAsync({ projectId }),
    );
    // Never register a token if the user switched accounts during the OS prompt.
    if ((await token()) !== sessionToken)
      throw new Error("Your session changed. Enable notifications again.");
    const device = await notificationApi.registerDevice(
      result.data,
      Platform.OS === "ios" ? "ios" : "android",
    );
    registration = { id: device.id, accessToken: sessionToken };
  })().finally(() => {
    registering = null;
  });
  return registering;
}
export async function disableDevicePush(): Promise<void> {
  // Server removes every device registration for the CURRENT session. This also
  // works after an app restart, when the in-memory registration has been lost.
  await notificationApi.removeSessionDevices();
  registration = null;
}
export async function devicePushEnabled(): Promise<boolean> {
  if (registration?.accessToken !== (await getStoredAccessToken()))
    registration = null;
  const state = await notificationApi.deviceStatus();
  return state.enabled;
}
export function watchDevicePush(
  userId: string,
  onReceive: () => void,
  onOpen: () => void,
): () => void {
  let disposed = false;
  const subscriptions: { remove: () => void }[] = [];
  let seen: string | null = handledResponses.get(userId) || null;
  void sdk()
    .then(async (notifications) => {
      if (disposed) return;
      // The OS receives only generic previews. Data paths are never navigated.
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      const open = (
        response: Awaited<
          ReturnType<typeof notifications.getLastNotificationResponseAsync>
        >,
      ) => {
        if (disposed || !response) return;
        const content = response.notification.request.content;
        if (content.data.user_id && content.data.user_id !== userId) return;
        const id = response.notification.request.identifier;
        if (seen === id) return;
        seen = id;
        handledResponses.set(userId, id);
        onReceive();
        onOpen();
      };
      subscriptions.push(
        notifications.addNotificationReceivedListener(() => {
          if (!disposed) onReceive();
        }),
      );
      subscriptions.push(
        notifications.addNotificationResponseReceivedListener(open),
      );
      subscriptions.push(
        notifications.addPushTokenListener(() => {
          // Rotate only if the user already enrolled. Never display permission
          // prompts from a background callback.
          void notifications
            .getPermissionsAsync()
            .then(async (p) => {
              if (!disposed && p.granted && (await devicePushEnabled())) {
                await enableDevicePush([]);
              }
            })
            .catch(() => {});
        }),
      );
      open(await notifications.getLastNotificationResponseAsync());
    })
    .catch(() => {
      /* An older installed build can still use the inbox. */
    });
  return () => {
    disposed = true;
    subscriptions.forEach((s) => s.remove());
  };
}

export async function syncNotificationBadge(count: number): Promise<void> {
  try {
    const notifications = await sdk();
    await notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    /* Badge support varies by launcher. */
  }
}
