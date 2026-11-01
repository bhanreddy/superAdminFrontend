import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Search, Hash, Lock, ArrowUpRight, MessageCircle, Plus, Check } from 'lucide-react-native';
import { MotionPressable } from '../../components/ui/MotionPressable';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/theme';
import { getCardTone } from '../../constants/experienceColors';
import type { Bootstrap, Channel } from '../../services/connect/api';

type Entry = { id: string; name: string; description: string; channel?: Channel };
export function ConnectDirectory({ context, mode, busy = false, onOpen, onCreate }: {
  context: Bootstrap;
  mode: 'switcher' | 'channels';
  busy?: boolean;
  onOpen: (entry: Entry) => void;
  onCreate?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const tone = getCardTone('crimson', isDark);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const list = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, number>());
  const entries = useMemo(() => {
    const channels: Entry[] = context.channels.filter(c => !c.archived_at && (mode === 'channels' || c.joined)).map(c => ({ id: c.id, name: c.name, description: c.purpose || c.description || (c.visibility === 'private' ? 'Private channel' : 'Public channel'), channel: c }));
    const direct: Entry[] = mode === 'switcher' ? context.direct_messages.map(d => ({ id: d.id, name: d.name, description: 'Direct message' })) : [];
    const search = query.trim().toLowerCase().replace(/^#\s*/, '');
    return [...channels, ...direct].filter(c => `${c.name} ${c.description}`.toLowerCase().includes(search));
  }, [context.channels, context.direct_messages, mode, query]);
  const shown = entries.slice(0, 50);
  const selected = shown[Math.min(index, Math.max(0, shown.length - 1))];
  return <View style={{ gap: 16 }}>
    <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 21 }}>{mode === 'switcher' ? 'Jump straight to a channel or teammate. Use ↑ ↓ to choose and Enter to open.' : 'Discover the channels available to you. Join a conversation to see it in your sidebar.'}</Text>
    <View style={[s.search, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Search size={19} color={colors.primary} />
      <TextInput autoFocus accessibilityLabel={mode === 'switcher' ? 'Jump to conversation' : 'Find channels'} placeholder={mode === 'switcher' ? 'Where would you like to go?' : 'Search channels by name or topic'} placeholderTextColor={colors.textTertiary} value={query} onChangeText={value => { setQuery(value); setIndex(0); }} returnKeyType="go" onSubmitEditing={() => { if (selected && !busy) onOpen(selected); }} onKeyPress={event => {
        const key = event.nativeEvent.key;
        if (key === 'ArrowDown' || key === 'ArrowUp') {
          event.preventDefault();
          const next = Math.max(0, Math.min(shown.length - 1, index + (key === 'ArrowDown' ? 1 : -1)));
          setIndex(next);
          list.current?.scrollTo?.({ y: Math.max(0, (positions.current.get(shown[next]?.id) || 0) - 100), animated: false });
        }
      }} style={{ flex: 1, minWidth: 0, fontSize: 15, color: colors.textPrimary, paddingVertical: 12 }} />
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600' }}>{entries.length} {mode === 'switcher' ? 'conversations' : 'channels'}{entries.length > 50 ? ' · Showing the first 50. Refine your search to find more.' : ''}</Text>
    <ScrollView ref={list} nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 12 }}>
    {shown.map(entry => <MotionPressable key={entry.id} onLayout={event => positions.current.set(entry.id, event.nativeEvent.layout.y)} accessibilityRole="button" accessibilityLabel={`${entry.channel && !entry.channel.joined ? 'Join' : 'Go to'} ${entry.name}`} accessibilityState={{ selected: selected?.id === entry.id, disabled: busy }} disabled={busy} onPress={() => onOpen(entry)} style={({ hovered }) => [s.entry, { backgroundColor: selected?.id === entry.id ? tone.panel : hovered ? colors.hover : colors.surface, borderColor: selected?.id === entry.id ? tone.border : colors.borderSubtle }]}>
      <View style={[s.symbol, { backgroundColor: entry.channel ? tone.cover : getCardTone('blue', isDark).cover }]}>{entry.channel ? entry.channel.visibility === 'private' ? <Lock size={19} color={tone.accent} /> : <Hash size={22} color={tone.accent} /> : <MessageCircle size={20} color={getCardTone('blue', isDark).accent} />}</View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{entry.name}</Text><Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{entry.description}</Text></View>
      {mode === 'channels' && <View style={{ alignItems: 'center', gap: 4 }}>{entry.channel?.joined ? <Check size={15} color={colors.textSecondary} /> : <Plus size={16} color={colors.primary} />}<Text style={{ color: entry.channel?.joined ? colors.textSecondary : colors.primary, fontSize: 10, fontWeight: '600' }}>{entry.channel?.joined ? 'Joined' : 'Join'}</Text></View>}
      {mode === 'switcher' && <ArrowUpRight size={17} color={colors.textTertiary} />}
    </MotionPressable>)}
    </ScrollView>
    {!shown.length && <View style={{ paddingVertical: 24, gap: 8, alignItems: 'center' }}><Search size={26} color={colors.textTertiary} /><Text style={{ color: colors.textPrimary, fontWeight: '600' }}>No matches found</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Try a different name or topic.</Text></View>}
    {mode === 'channels' && onCreate && <MotionPressable accessibilityRole="button" accessibilityLabel="Create a channel" onPress={onCreate} style={[s.create, { backgroundColor: colors.primaryFill }]}><Plus size={17} color={colors.onPrimary} /><Text style={{ color: colors.onPrimary, fontSize: 13, fontWeight: '600' }}>Create a channel</Text></MotionPressable>}
  </View>;
}
const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, borderWidth: 1, borderRadius: borderRadius.md },
  entry: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: borderRadius.md },
  symbol: { width: 42, height: 42, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  create: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 16, minHeight: 44, borderRadius: borderRadius.md },
});
