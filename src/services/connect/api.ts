import { superAdminClient } from '../../api/superAdminClient';

export type Employee = {
  id: string;
  full_name: string;
  employee_id: string;
  role: string;
};
export type Channel = {
  id: string;
  name: string;
  description: string;
  purpose: string;
  visibility: 'public' | 'private';
  category: string;
  announcements_only: boolean;
  archived_at: string | null;
  joined: boolean;
  can_manage: boolean;
  unread_count: number;
};
export type DirectMessage = {
  id: string;
  employee_id: string;
  name: string;
  unread_count: number;
};
export type Attachment = {
  id: string;
  filename: string;
  mime: string;
  byte_size: number;
};
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  client_id: string;
  sequence: number | string;
  revision?: number | string;
  parent_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_count: number;
  reactions: { user_id: string; emoji: string }[];
  mentions: { user_id: string; name: string }[];
  attachments?: Attachment[];
};
export type History = {
  messages: Message[];
  has_more: boolean;
  last_sequence: number;
};
export type Notice = {
  id: string;
  kind: string;
  read_at: string | null;
  created_at: string;
  conversation_id: string;
  message_id: string;
  parent_id: string | null;
  preview: string;
  sender_name: string;
};
export type Bootstrap = {
  organization: { id: string; name: string };
  self: Employee;
  can_manage: boolean;
  channels: Channel[];
  direct_messages: DirectMessage[];
  unread_notifications: number;
  preferences: { mode: 'all' | 'mentions' | 'muted'; push_enabled: boolean };
};
export type Draft = {
  client_id: string;
  body: string;
  mentions: string[];
  parent_id?: string | null;
};
export type Invalidation = {
  id: number;
  conversation_id: string | null;
  user_id: string | null;
  message_id: string | null;
};
const base = '/api/super-admin/connect';
export const connectApi = {
  bootstrap: async (): Promise<Bootstrap> =>
    (await superAdminClient.get(`${base}/bootstrap`)).data,
  employees: async (q = '', conversation_id?: string): Promise<Employee[]> =>
    (
      await superAdminClient.get(`${base}/employees`, {
        params: { q, conversation_id },
      })
    ).data,
  directory: async (q = ''): Promise<Employee[]> => {
    const data = (
      await superAdminClient.get('/api/super-admin/users', {
        params: { search: q, status: 'ACTIVE' },
      })
    ).data;
    return (Array.isArray(data) ? data : data.data || []).filter(
      (u: Employee) => !['CA', 'CA_LEAD'].includes(u.role),
    );
  },
  provision: async (id: string, remove = false) =>
    remove
      ? (await superAdminClient.delete(`${base}/employees/${id}`)).data
      : (await superAdminClient.post(`${base}/employees/${id}`)).data,
  createChannel: async (
    input: Record<string, unknown>,
  ): Promise<{ id: string; name: string }> =>
    (await superAdminClient.post(`${base}/channels`, input)).data,
  updateChannel: async (id: string, input: Record<string, unknown>) =>
    (await superAdminClient.patch(`${base}/channels/${id}`, input)).data,
  members: async (
    id: string,
  ): Promise<
    { user_id: string; full_name: string; employee_id: string; role: string }[]
  > => (await superAdminClient.get(`${base}/channels/${id}/members`)).data,
  membership: async (
    id: string,
    userId: string,
    role = 'member',
    remove = false,
  ) =>
    remove
      ? (
          await superAdminClient.delete(
            `${base}/channels/${id}/members/${userId}`,
          )
        ).data
      : (
          await superAdminClient.put(
            `${base}/channels/${id}/members/${userId}`,
            { role },
          )
        ).data,
  dm: async (employee_id: string): Promise<{ id: string }> =>
    (await superAdminClient.post(`${base}/direct-messages`, { employee_id }))
      .data,
  history: async (
    id: string,
    params: Record<string, unknown> = {},
  ): Promise<History> =>
    (
      await superAdminClient.get(`${base}/conversations/${id}/messages`, {
        params,
      })
    ).data,
  message: async (id: string): Promise<Message> =>
    (await superAdminClient.get(`${base}/messages/${id}`)).data,
  send: async (id: string, draft: Draft): Promise<Message> =>
    (await superAdminClient.post(`${base}/conversations/${id}/messages`, draft))
      .data,
  edit: async (
    id: string,
    body: string,
    mentions: string[],
  ): Promise<Message> =>
    (await superAdminClient.patch(`${base}/messages/${id}`, { body, mentions }))
      .data,
  delete: async (id: string): Promise<Message> =>
    (await superAdminClient.delete(`${base}/messages/${id}`)).data,
  react: async (id: string, emoji: string, remove = false): Promise<Message> =>
    remove
      ? (
          await superAdminClient.delete(`${base}/messages/${id}/reactions`, {
            data: { emoji },
          })
        ).data
      : (
          await superAdminClient.put(`${base}/messages/${id}/reactions`, {
            emoji,
          })
        ).data,
  read: async (id: string, last_sequence: number) =>
    (
      await superAdminClient.post(`${base}/conversations/${id}/read`, {
        last_sequence,
      })
    ).data,
  notifications: async (): Promise<Notice[]> =>
    (await superAdminClient.get(`${base}/notifications`)).data,
  readNotice: async (id: string) =>
    (await superAdminClient.post(`${base}/notifications/${id}/read`)).data,
  preferences: async (mode: string, push_enabled = false) =>
    (await superAdminClient.put(`${base}/preferences`, { mode, push_enabled }))
      .data,
  search: async (
    params: Record<string, unknown>,
  ): Promise<{
    messages: Message[];
    channels: Pick<Channel, 'id' | 'name' | 'purpose'>[];
    employees: Employee[];
  }> => (await superAdminClient.get(`${base}/search`, { params })).data,
  save: async (id: string, remove = false) =>
    remove
      ? (await superAdminClient.delete(`${base}/messages/${id}/saved`)).data
      : (await superAdminClient.put(`${base}/messages/${id}/saved`)).data,
  pin: async (id: string, remove = false) =>
    remove
      ? (await superAdminClient.delete(`${base}/messages/${id}/pin`)).data
      : (await superAdminClient.put(`${base}/messages/${id}/pin`)).data,
  saved: async (): Promise<
    {
      message_id: string;
      conversation_id: string;
      preview: string;
      deleted_at: string | null;
    }[]
  > => (await superAdminClient.get(`${base}/saved`)).data,
  pins: async (
    id: string,
  ): Promise<
    {
      message_id: string;
      conversation_id: string;
      preview: string;
      deleted_at: string | null;
    }[]
  > => (await superAdminClient.get(`${base}/conversations/${id}/pins`)).data,
  presence: async (status: string, note = '') =>
    (await superAdminClient.put(`${base}/presence`, { status, note })).data,
  listPresence: async (): Promise<
    { user_id: string; status: string; note: string }[]
  > => (await superAdminClient.get(`${base}/presence`)).data,
  task: async (
    id: string,
    input: Record<string, unknown>,
  ): Promise<{ task_id: string; school_id: number }> =>
    (await superAdminClient.post(`${base}/messages/${id}/task`, input)).data,
  taskSchools: async (): Promise<{ id: number; name: string }[]> => {
    const data = (await superAdminClient.get('/api/super-admin/schools')).data;
    return Array.isArray(data) ? data : data.data || [];
  },
  upload: async (id: string, form: FormData) =>
    (
      await superAdminClient.post(`${base}/messages/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data,
  download: async (id: string): Promise<ArrayBuffer> =>
    (
      await superAdminClient.get(`${base}/attachments/${id}/download`, {
        responseType: 'arraybuffer',
      })
    ).data,
  realtimeSession: async (): Promise<{
    url: string;
    anon_key: string;
    token: string;
    expires_in: number;
  }> => (await superAdminClient.post(`${base}/realtime-session`)).data,
};

// The ID is an idempotency key, never a credential. Retain the SAME draft on retry.
export function draftId(): string {
  const cryptoObject = (globalThis as any).crypto;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
export function mergeMessages(
  current: Message[],
  incoming: Message[],
): Message[] {
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) {
    const previous = map.get(m.id);
    if (previous && Number(previous.revision || 0) > Number(m.revision || 0))
      continue;
    map.set(m.id, m);
  }
  return [...map.values()].sort(
    (a, b) => Number(a.sequence) - Number(b.sequence),
  );
}
export function errorText(error: any): string {
  return (
    error?.response?.data?.error ||
    error?.message ||
    'Unable to complete this action. Try again.'
  );
}
