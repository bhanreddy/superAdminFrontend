import { superAdminClient } from '../api/superAdminClient';

export interface SupportConversation {
  id: string; school_id: number; school_name: string; user_id: string;
  user_name: string; user_photo: string | null; last_message_at: string | null;
  portal_role: 'admin' | 'principal' | 'accounts' | 'staff' | 'driver' | 'student' | 'website' | 'unknown';
  last_message_preview: string | null; created_at: string; unread_count: number;
  channel?: 'school' | 'website'; website_key?: string; visitor_email?: string; visitor_phone?: string; page_url?: string;
}

export interface SupportMessage {
  id: string; conversation_id: string; sender_user_id: string; sender_name: string;
  body: string; created_at: string; edited_at: string | null; deleted_at: string | null;
  is_support: boolean;
}

export interface SupportThread {
  conversation: SupportConversation & { support_user_id: string };
  messages: SupportMessage[];
}

const base = '/api/super-admin/messenger';
export const messengerService = {
  async listConversations(): Promise<SupportConversation[]> {
    const [school, website] = await Promise.all([
      superAdminClient.get(`${base}/conversations`),
      superAdminClient.get(`${base}/website-conversations`),
    ]);
    const webRows = website.data.map((r: any) => ({ ...r, school_id: 0, school_name: r.website_key, user_id: r.id, user_name: r.visitor_email, user_photo: null, portal_role: 'website', unread_count: 0, channel: 'website', website_key: r.website_key }));
    return [...school.data.map((r: any) => ({ ...r, channel: 'school' })), ...webRows].sort((a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime());
  },
  async getMessages(id: string, channel: 'school' | 'website' = 'school'): Promise<SupportThread> {
    const data = (await superAdminClient.get(`${base}/${channel === 'website' ? 'website-conversations' : 'conversations'}/${id}/messages`)).data;
    if (channel === 'website') data.conversation = { ...data.conversation, school_id: 0, school_name: data.conversation.website_key, user_id: id, user_name: data.conversation.visitor_email, user_photo: null, portal_role: 'website', unread_count: 0, channel: 'website' };
    return data;
  },
  async sendMessage(id: string, body: string, channel: 'school' | 'website' = 'school'): Promise<SupportMessage> {
    return (await superAdminClient.post(`${base}/${channel === 'website' ? 'website-conversations' : 'conversations'}/${id}/messages`, { body })).data;
  },
  async markRead(id: string): Promise<void> {
    await superAdminClient.post(`${base}/conversations/${id}/read`);
  },
};
