import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, School, Send, ShieldCheck } from 'lucide-react-native';
import { useTheme, clayStyle } from '../../../src/contexts/ThemeContext';
import { SupportChatBackground } from '../../../src/components/messenger/SupportChatBackground';
import { messengerService, type SupportMessage, type SupportThread } from '../../../src/services/messengerService';

export default function SupportThreadScreen() {
  const params = useLocalSearchParams<{ id: string; school?: string; user?: string; channel?: 'school' | 'website' }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const channel = params.channel === 'website' ? 'website' : 'school';
  const { colors, isDark, clayShadows } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try { const data = await messengerService.getMessages(id, channel); setThread(data); if (channel === 'school') messengerService.markRead(id).catch(() => {}); }
    catch (err) { console.warn('Support thread failed', err); }
  }, [id, channel]);

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { if (thread) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false })); }, [thread?.messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!id || !body || sending) return;
    setText(''); setSending(true);
    try {
      const message = await messengerService.sendMessage(id, body, channel);
      setThread((prev) => prev ? { ...prev, messages: [...prev.messages, message] } : prev);
    } catch { setText(body); }
    finally { setSending(false); }
  };

  const schoolName = thread?.conversation.school_name || params.school || 'School';
  const userName = thread?.conversation.user_name || params.user || 'School user';

  return (
    <View style={[st.root, { borderColor: colors.clayBorderColor }, clayStyle(clayShadows.clayElevated)]}>
      <View style={[st.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <Pressable onPress={() => router.back()} style={[st.back, { backgroundColor: colors.hover }]}><ArrowLeft size={20} color={colors.textPrimary} /></Pressable>
        <View style={[st.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[st.avatarText, { color: colors.primary }]}>{userName.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[st.schoolName, { color: colors.textPrimary }]}>{schoolName}</Text><View style={st.userLine}><School size={11} color={colors.primary} /><Text numberOfLines={1} style={[st.userName, { color: colors.textSecondary }]}>{userName} · {(thread?.conversation.portal_role || 'unknown').toUpperCase()} portal</Text></View></View>
        <View style={[st.official, { backgroundColor: `${colors.primary}14` }]}><ShieldCheck size={13} color={colors.primary} /><Text style={[st.officialText, { color: colors.primary }]}>Official support</Text></View>
      </View>

      <View style={st.chat}>
        <SupportChatBackground />
        {!thread ? <ActivityIndicator color={colors.primary} style={{ marginTop: 50 }} /> : (
          <ScrollView ref={scrollRef} contentContainerStyle={st.messages} showsVerticalScrollIndicator={false}>
            <View style={[st.notice, { backgroundColor: isDark ? 'rgba(30,41,59,0.88)' : 'rgba(255,251,235,0.92)' }]}><Text style={[st.noticeText, { color: isDark ? '#CBD5E1' : '#8A6D3B' }]}>Messages are encrypted in transit and visible to this school user and Nexsyrus Support.</Text></View>
            {thread.messages.map((message, index) => <Bubble key={message.id} message={message} showDay={index === 0 || new Date(thread.messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString()} />)}
          </ScrollView>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.composer, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Reply as Nexsyrus Support…" placeholderTextColor={colors.textTertiary} multiline maxLength={4000} style={[st.input, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: colors.border }]} onSubmitEditing={send} />
          <Pressable onPress={send} disabled={!text.trim() || sending} style={[st.send, { backgroundColor: colors.primary, opacity: !text.trim() || sending ? 0.45 : 1 }]}><Send size={18} color="#fff" /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message, showDay }: { message: SupportMessage; showDay: boolean }) {
  const { colors, isDark } = useTheme();
  const mine = message.is_support;
  const when = new Date(message.created_at);
  return <>
    {showDay ? <View style={st.day}><Text style={[st.dayText, { color: colors.textSecondary, backgroundColor: isDark ? 'rgba(30,41,59,0.82)' : 'rgba(226,232,240,0.88)' }]}>{when.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</Text></View> : null}
    <View style={[st.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <View style={[st.bubble, mine ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 } : { backgroundColor: isDark ? '#252838' : '#FFFFFF', borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 }]}>
        {!mine ? <Text style={[st.sender, { color: colors.primary }]}>{message.sender_name}</Text> : null}
        <Text style={[st.body, { color: mine ? '#FFFFFF' : colors.textPrimary }]}>{message.body}</Text>
        <Text style={[st.time, { color: mine ? 'rgba(255,255,255,0.72)' : colors.textTertiary }]}>{when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
      </View>
    </View>
  </>;
}

const st = StyleSheet.create({
  root: { flex: 1, borderWidth: 1, borderRadius: 25, overflow: 'hidden', minHeight: 0 }, header: { minHeight: 68, paddingHorizontal: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 13, fontWeight: '800' }, schoolName: { fontSize: 15, fontWeight: '800' }, userLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }, userName: { fontSize: 11.5 }, official: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 }, officialText: { fontSize: 10.5, fontWeight: '700' },
  chat: { flex: 1, minHeight: 0 }, messages: { padding: 18, paddingBottom: 28 }, notice: { alignSelf: 'center', maxWidth: 430, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11, marginBottom: 15 }, noticeText: { fontSize: 10.5, textAlign: 'center', lineHeight: 15 }, day: { alignItems: 'center', marginVertical: 12 }, dayText: { fontSize: 10.5, fontWeight: '650' as any, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, bubbleRow: { flexDirection: 'row', marginVertical: 3 }, bubble: { maxWidth: '76%', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16 }, sender: { fontSize: 10.5, fontWeight: '750' as any, marginBottom: 3 }, body: { fontSize: 14, lineHeight: 20 }, time: { alignSelf: 'flex-end', fontSize: 9.5, marginTop: 3 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 }, input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10, fontSize: 14, outlineStyle: 'none' } as any, send: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
