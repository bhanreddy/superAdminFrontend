import { createClient } from '@supabase/supabase-js';
import { connectApi, Invalidation, Message, mergeMessages } from './api';

export type ConnectionState = 'connecting' | 'live' | 'offline';

// Subscription events are hints; PostgreSQL history is authoritative. A rejoin or
// foreground reconciles all loaded rows, recovering missed inserts, edits and deletes.
export async function reconcileHistory(
  conversationId: string,
  current: Message[],
  api = connectApi,
): Promise<Message[]> {
  let after = current.length
    ? Math.max(0, Math.min(...current.map((m) => Number(m.sequence))) - 1)
    : 0;
  let merged = current;
  for (;;) {
    const page = await api.history(conversationId, { after, limit: 100 });
    merged = mergeMessages(merged, page.messages);
    if (!page.has_more) return merged;
    const next = Math.max(...page.messages.map((m) => Number(m.sequence)));
    if (!Number.isFinite(next) || next <= after)
      throw new Error('History did not advance. Reopen the conversation.');
    after = next;
  }
}

export function watchConnect(
  onEvent: (event: Invalidation) => void,
  onState: (state: ConnectionState, reason?: string) => void,
  onRejoin: () => void,
  deps: { api?: typeof connectApi; clientFactory?: typeof createClient } = {},
) {
  const api = deps.api || connectApi,
    factory = deps.clientFactory || createClient;
  let stopped = false,
    client: ReturnType<typeof createClient> | null = null,
    renew: ReturnType<typeof setTimeout> | null = null;
  async function start() {
    onState('connecting');
    try {
      const session = await api.realtimeSession();
      if (stopped) return;
      client = factory(session.url, session.anon_key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      await client.realtime.setAuth(session.token);
      if (stopped) {
        await client.removeAllChannels();
        client.realtime.disconnect();
        return;
      }
      client
        .channel('nexsyrus-connect-events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'collaboration_events' },
          (payload) => {
            if (!stopped) onEvent(payload.new as Invalidation);
          },
        )
        .subscribe((status) => {
          if (stopped) return;
          if (status === 'SUBSCRIBED') {
            onState('live');
            onRejoin();
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
            onState(
              'offline',
              'Connection interrupted. History will reconcile when reconnected.',
            );
        });
      const refresh = async () => {
        if (stopped || !client) return;
        try {
          const next = await api.realtimeSession();
          if (stopped) return;
          await client.realtime.setAuth(next.token);
          if (stopped) return;
          renew = setTimeout(
            refresh,
            Math.max(1000, (next.expires_in - 30) * 1000),
          );
        } catch {
          if (!stopped) {
            onState(
              'offline',
              'Realtime session expired. Reconnect to continue.',
            );
            await client.removeAllChannels();
            client.realtime.disconnect();
          }
        }
      };
      renew = setTimeout(
        refresh,
        Math.max(1000, (session.expires_in - 30) * 1000),
      );
    } catch (error: any) {
      if (!stopped)
        onState(
          'offline',
          error?.response?.data?.error ||
            'Realtime unavailable. Use Refresh while configuration is reviewed.',
        );
    }
  }
  void start();
  return () => {
    stopped = true;
    if (renew) clearTimeout(renew);
    if (client) {
      void client.removeAllChannels();
      client.realtime.disconnect();
    }
  };
}
