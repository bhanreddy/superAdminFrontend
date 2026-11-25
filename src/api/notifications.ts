import { superAdminClient } from "./superAdminClient";
export interface NotificationChannel {
  id: string;
  label: string;
  description: string;
  mandatory: boolean;
  total: number;
  unread: number;
  inbox_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
}
export interface NotificationItem {
  id: string;
  event_id: string;
  school_id?: number | null;
  created_at: string;
  read_at: string | null;
  channel: string;
  kind: string;
  priority: "normal" | "high" | "critical";
  title: string;
  body: string;
  action_path: string | null;
}
export interface NotificationBootstrap {
  channels: NotificationChannel[];
  unread: number;
  registered_devices: number;
  capabilities: {
    email: boolean;
    push: boolean;
    sms: boolean;
    expo_push?: boolean;
  };
}
const path = "/api/super-admin/notifications";
export const notificationApi = {
  async registerDevice(token: string, platform: "android" | "ios") {
    return (await superAdminClient.post(`${path}/devices`, { token, platform }))
      .data.data as { id: string };
  },
  async deviceStatus(): Promise<{ enabled: boolean }> {
    return (await superAdminClient.get(`${path}/devices/current`)).data.data;
  },
  async removeSessionDevices() {
    await superAdminClient.delete(`${path}/devices/current`);
  },
  async bootstrap(signal?: AbortSignal): Promise<NotificationBootstrap> {
    return (await superAdminClient.get(`${path}/bootstrap`, { signal })).data
      .data;
  },
  async list(
    params: { channel?: string; unread?: string; before?: string },
    signal?: AbortSignal,
  ): Promise<{ data: NotificationItem[]; next_cursor: string | null }> {
    return (await superAdminClient.get(path, { params, signal })).data;
  },
  async update(id: string, operation: "read" | "unread" | "archive") {
    return (await superAdminClient.patch(`${path}/${id}`, { operation })).data
      .data;
  },
  async readAll(through: string, channel?: string) {
    return (
      await superAdminClient.post(`${path}/read-all`, { through, channel })
    ).data.data;
  },
  async preferences(
    channel: string,
    preferences: Partial<
      Pick<
        NotificationChannel,
        "inbox_enabled" | "email_enabled" | "push_enabled" | "sms_enabled"
      >
    >,
  ) {
    return (
      await superAdminClient.patch(
        `${path}/preferences/${channel}`,
        preferences,
      )
    ).data.data;
  },
  async publish(
    body: { title: string; body: string; roles: string[]; priority: string },
    key: string,
  ) {
    return (
      await superAdminClient.post(`${path}/announcements`, body, {
        headers: { "Idempotency-Key": key },
      })
    ).data.data;
  },
};
export function notificationError(error: any): string {
  return (
    error?.response?.data?.error ||
    (error?.code === "ECONNABORTED"
      ? "The request timed out. Try again."
      : "Unable to reach notifications. Check your connection and retry.")
  );
}
