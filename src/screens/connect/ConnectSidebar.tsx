import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Hash, Lock, Search, Plus, ChevronDown, ChevronRight, PenSquare, MessageSquare, Bookmark, Bell, ShieldCheck, Compass, ArrowUpRight } from 'lucide-react-native';
import { MotionPressable } from '../../components/ui/MotionPressable';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/theme';
import { getCardTone } from '../../constants/experienceColors';
import { ConnectAvatar } from './ConnectMessageRow';
import type { Bootstrap, Channel } from '../../services/connect/api';

type Props = {
  context: Bootstrap;
  active: string | null;
  mobile: boolean;
  onChannel: (channel: Channel) => void;
  onConversation: (id: string) => void;
  onCompose: () => void;
  onCreate: () => void;
  onBrowse: () => void;
  onThreads: () => void;
  onSaved: () => void;
  onActivity: () => void;
  onSettings: () => void;
  onCompany: () => void;
};

/** Filters stay local to navigation; typing here never re-renders message history. */
export function ConnectSidebar(props: Props) {
  const { context, active, mobile } = props;
  const { colors, isDark } = useTheme();
  const tone = getCardTone('crimson', isDark);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const matches = (name: string, unread: number) => name.toLowerCase().includes(query.trim().toLowerCase()) && (filter === 'all' || unread > 0);
  const channels = context.channels.filter(c => c.joined && !c.archived_at && matches(c.name, c.unread_count));
  const direct = context.direct_messages.filter(d => matches(d.name, d.unread_count));
  const unread = [...context.channels.filter(c => c.joined), ...context.direct_messages].reduce((n, c) => n + Number(c.unread_count || 0), 0);
  const utility = (label: string, Icon: typeof Search, onPress: () => void, count?: number) => <MotionPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ hovered, pressed }) => [s.utility, { backgroundColor: hovered || pressed ? colors.hover : 'transparent' }]}>
    <Icon size={18} color={colors.textSecondary} /><Text style={[s.utilityLabel, { color: colors.textPrimary }]}>{label}</Text>
    {!!count && <Text style={[s.count, { color: tone.accent, backgroundColor: tone.cover }]}>{count > 99 ? '99+' : count}</Text>}
  </MotionPressable>;
  const heading = (label: string, open: boolean, toggle: () => void, onAdd?: () => void) => <View style={s.section}>
    <MotionPressable accessibilityRole="button" accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${label}`} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={toggle} style={s.sectionToggle}>
      {open ? <ChevronDown size={14} color={colors.textSecondary} /> : <ChevronRight size={14} color={colors.textSecondary} />}
      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{label === 'Channels' ? channels.length : direct.length}</Text>
    </MotionPressable>
    {onAdd && <MotionPressable accessibilityRole="button" accessibilityLabel={label === 'Channels' ? 'Create' : 'New DM'} onPress={onAdd} style={s.icon}><Plus size={16} color={colors.textSecondary} /></MotionPressable>}
  </View>;
  return <View testID="connect-conversations" style={[s.root, { width: mobile ? '100%' : 280, backgroundColor: tone.panel, borderColor: colors.border }]}>
    <View style={[s.header, { borderColor: colors.border }]}>
      <MotionPressable accessibilityRole="button" accessibilityLabel="Workspace preferences" onPress={props.onSettings} style={{ flex: 1, gap: 5, minWidth: 0 }}>
        <Text style={{ color: tone.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.8 }}>TEAM WORKSPACE</Text>
        <View style={s.row}><Text numberOfLines={1} style={[s.workspaceName, { color: colors.textPrimary }]}>{context.organization.name}</Text><ChevronDown size={15} color={colors.textSecondary} /></View>
      </MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel="New message" onPress={props.onCompose} style={[s.icon, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md }]}><PenSquare size={19} color={colors.primary} /></MotionPressable>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
      {utility('Threads', MessageSquare, props.onThreads)}
      {utility('Later', Bookmark, props.onSaved)}
      {utility('Activity', Bell, props.onActivity, context.unread_notifications)}
      {utility('Browse channels', Compass, props.onBrowse)}
      <View style={[s.divider, { backgroundColor: colors.border }]} />
      <View style={[s.finder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={15} color={colors.textTertiary} />
        <TextInput accessibilityLabel="Filter conversations" placeholder="Find a conversation" placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} style={{ flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: 12, paddingVertical: 10 }} />
        {!!query && <MotionPressable accessibilityRole="button" accessibilityLabel="Clear conversation filter" onPress={() => setQuery('')} style={{ padding: 6 }}><Text style={{ color: colors.primary, fontSize: 11 }}>Clear</Text></MotionPressable>}
      </View>
      <View accessibilityRole="tablist" style={[s.filters, { borderColor: colors.border }]}>
        {(['all', 'unread'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityLabel={value === 'all' ? 'All conversations' : 'Unread conversations'} accessibilityState={{ selected: filter === value }} aria-selected={filter === value} onPress={() => setFilter(value)} style={[s.filter, { backgroundColor: filter === value ? colors.surface : 'transparent', borderColor: filter === value ? colors.border : 'transparent' }]}>
          <Text style={{ color: filter === value ? colors.textPrimary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{value === 'all' ? 'All' : 'Unread'}{value === 'unread' && unread > 0 ? ` · ${unread}` : ''}</Text>
        </MotionPressable>)}
      </View>
      {heading('Channels', channelsOpen, () => setChannelsOpen(!channelsOpen), context.can_manage ? props.onCreate : undefined)}
      {channelsOpen && <>
        {channels.map(c => <MotionPressable key={c.id} accessibilityRole="button" accessibilityLabel={`Open ${c.name}${c.unread_count ? `, ${c.unread_count} unread` : ''}`} accessibilityState={{ selected: active === c.id }} onPress={() => props.onChannel(c)} style={({ hovered, pressed }) => [s.conversation, { backgroundColor: active === c.id ? tone.cover : hovered || pressed ? colors.hover : 'transparent', borderColor: active === c.id ? tone.border : 'transparent' }]}>
          {c.visibility === 'private' ? <Lock size={16} color={active === c.id ? tone.accent : colors.textSecondary} /> : <Hash size={18} color={active === c.id ? tone.accent : colors.textSecondary} />}
          <Text numberOfLines={1} style={{ flex: 1, color: active === c.id ? tone.accent : colors.textPrimary, fontSize: 14, fontWeight: active === c.id || c.unread_count ? '700' : '500' }}>{c.name}</Text>
          {!!c.unread_count && <Text style={[s.count, { backgroundColor: colors.primaryFill, color: colors.onPrimary }]}>{c.unread_count > 99 ? '99+' : c.unread_count}</Text>}
        </MotionPressable>)}
        {!channels.length && <Text style={[s.hint, { color: colors.textSecondary }]}>{filter === 'unread' ? 'You’re all caught up in channels.' : query ? 'No matching channels.' : 'Browse channels to find your team.'}</Text>}
        {context.can_manage && utility('Add channels', Plus, props.onCreate)}
      </>}
      <View style={{ height: 12 }} />
      {heading('Direct messages', dmsOpen, () => setDmsOpen(!dmsOpen), props.onCompose)}
      {dmsOpen && <>
        {direct.map(d => <MotionPressable key={d.id} accessibilityRole="button" accessibilityLabel={`Open DM with ${d.name}`} accessibilityState={{ selected: active === d.id }} onPress={() => props.onConversation(d.id)} style={({ hovered, pressed }) => [s.conversation, { backgroundColor: active === d.id ? tone.cover : hovered || pressed ? colors.hover : 'transparent', borderColor: active === d.id ? tone.border : 'transparent' }]}>
          <ConnectAvatar name={d.name} small colors={colors} /><Text numberOfLines={1} style={{ flex: 1, color: active === d.id ? tone.accent : colors.textPrimary, fontSize: 14, fontWeight: d.unread_count || active === d.id ? '700' : '500' }}>{d.name}</Text>
          {!!d.unread_count && <Text style={[s.count, { backgroundColor: colors.primaryFill, color: colors.onPrimary }]}>{d.unread_count > 99 ? '99+' : d.unread_count}</Text>}
        </MotionPressable>)}
        {!direct.length && <Text style={[s.hint, { color: colors.textSecondary }]}>{filter === 'unread' ? 'No unread direct messages.' : query ? 'No matching teammates.' : 'A quick question? Start a direct message.'}</Text>}
        {utility('Add teammates', Plus, props.onCompose)}
      </>}
    </ScrollView>
    <View style={[s.footer, { borderColor: colors.border }]}>
      {context.can_manage ? utility('Company access', ShieldCheck, props.onCompany) : <View style={s.row}><ConnectAvatar name={context.self.full_name} small colors={colors} /><Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>{context.self.full_name}</Text><ArrowUpRight size={14} color={colors.textTertiary} /></View>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { borderRightWidth: 1, minHeight: 0, flexShrink: 0 },
  header: { minHeight: 88, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1 },
  workspaceName: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scroll: { padding: 12, paddingBottom: 24 },
  utility: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: borderRadius.sm },
  utilityLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  divider: { height: 1, marginVertical: 14, marginHorizontal: 8 },
  finder: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: borderRadius.sm, minHeight: 44 },
  filters: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: borderRadius.sm, marginTop: 10, marginBottom: 12 },
  filter: { flex: 1, borderWidth: 1, borderRadius: borderRadius.xs, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  section: { flexDirection: 'row', alignItems: 'center' },
  sectionToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingLeft: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  conversation: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: borderRadius.sm, marginVertical: 2 },
  count: { fontSize: 10, fontWeight: '700', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  hint: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, lineHeight: 19 },
  footer: { padding: 10, borderTopWidth: 1 },
});
