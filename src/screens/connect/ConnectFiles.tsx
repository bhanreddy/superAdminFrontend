import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { FileText, Download, ArrowUpRight, FolderOpen } from 'lucide-react-native';
import { MotionPressable } from '../../components/ui/MotionPressable';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/theme';
import { getCardTone } from '../../constants/experienceColors';
import type { Attachment, Message } from '../../services/connect/api';

export function ConnectFiles({ messages, more, busy, onEarlier, onDownload, onMessage }: {
  messages: Message[];
  more: boolean;
  busy: boolean;
  onEarlier: () => void;
  onDownload: (file: Attachment) => void;
  onMessage: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const tone = getCardTone('blue', isDark);
  const files = useMemo(() => messages.filter(m => !m.deleted_at).flatMap(message => (message.attachments || []).map(file => ({ file, message }))), [messages]);
  return <View style={{ flex: 1, minHeight: 0 }}>
    <View style={{ padding: 20, gap: 5 }}><Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>Shared files</Text><Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 19 }}>Files from loaded messages in this conversation.{more ? ' Load earlier messages to find older files.' : ''}</Text></View>
    <FlatList data={files} keyExtractor={item => `${item.message.id}:${item.file.id}`} initialNumToRender={12} maxToRenderPerBatch={6} windowSize={7} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12, flexGrow: 1 }} renderItem={({ item: { file, message } }) => <View style={[s.card, { backgroundColor: tone.panel, borderColor: tone.border }]}>
      <View style={[s.symbol, { backgroundColor: tone.cover }]}><FileText size={24} color={tone.accent} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text numberOfLines={2} style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{file.filename}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{Math.max(1, Math.ceil(file.byte_size / 1024))} KB · {message.sender_name}</Text>
        <MotionPressable accessibilityRole="button" accessibilityLabel={`View message for ${file.filename}`} onPress={() => onMessage(message.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' }}><Text style={{ color: tone.accent, fontSize: 12, fontWeight: '600' }}>View message</Text><ArrowUpRight size={13} color={tone.accent} /></MotionPressable>
      </View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={`Download ${file.filename}`} onPress={() => onDownload(file)} style={[s.download, { backgroundColor: colors.surface, borderColor: tone.border }]}><Download size={18} color={tone.accent} /></MotionPressable>
    </View>} ListEmptyComponent={<View style={s.empty}><View style={[s.symbol, { backgroundColor: tone.cover }]}><FolderOpen size={26} color={tone.accent} /></View><Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>A home for shared files</Text><Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 21, fontSize: 13 }}>Attach a file to a message and it will appear here, with the conversation that gives it context.</Text></View>} ListFooterComponent={more ? <MotionPressable disabled={busy} accessibilityRole="button" accessibilityLabel="Load earlier files" onPress={onEarlier} style={[s.earlier, { borderColor: colors.border }]}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{busy ? 'Loading…' : 'Load earlier messages'}</Text></MotionPressable> : null} />
  </View>;
}
const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', padding: 16, gap: 12, borderWidth: 1, borderRadius: borderRadius.lg },
  symbol: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  download: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: borderRadius.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14, maxWidth: 460, alignSelf: 'center' },
  earlier: { minHeight: 44, padding: 12, borderWidth: 1, borderRadius: borderRadius.md, alignSelf: 'flex-start', marginTop: 12 },
});
