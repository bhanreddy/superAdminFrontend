import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Headphones, MessageCircle, Search, School } from 'lucide-react-native';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { useTheme, clayStyle } from '../../../src/contexts/ThemeContext';
import { messengerService, type SupportConversation } from '../../../src/services/messengerService';

export default function SupportInboxScreen() {
  const { colors, clayShadows } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try { setRows(await messengerService.listConversations()); }
    catch (err) { console.warn('Support inbox failed', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q ? rows : rows.filter((r) => r.user_name.toLowerCase().includes(q) || r.school_name.toLowerCase().includes(q) || r.portal_role.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      contentContainerStyle={st.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Support Messenger" subtitle="Every school conversation in one inbox" />
      <View style={[st.hero, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }, clayStyle(clayShadows.clayElevated)]}>
        <View style={[st.heroIcon, { backgroundColor: `${colors.primary}20` }]}><Headphones size={23} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={[st.heroTitle, { color: colors.textPrimary }]}>Nexsyrus Support</Text><Text style={[st.heroSub, { color: colors.textSecondary }]}>{rows.length} private user thread{rows.length === 1 ? '' : 's'} · primary database</Text></View>
        {!!rows.reduce((n, r) => n + r.unread_count, 0) && <View style={[st.totalBadge, { backgroundColor: colors.error }]}><Text style={st.totalBadgeText}>{rows.reduce((n, r) => n + r.unread_count, 0)}</Text></View>}
      </View>
      <View style={[st.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Search size={17} color={colors.textTertiary} /><TextInput value={query} onChangeText={setQuery} placeholder="Search sender or school" placeholderTextColor={colors.textTertiary} style={[st.searchInput, { color: colors.textPrimary }]} /></View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null}
      {!loading && filtered.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push({ pathname: '/(app)/messenger/[id]', params: { id: item.id, school: item.school_name, user: item.user_name, channel: item.channel || 'school' } } as any)}
          style={[st.row, { backgroundColor: colors.surface, borderColor: colors.clayBorderColor }, clayStyle(clayShadows.clay)]}
        >
          <View style={[st.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[st.avatarText, { color: colors.primary }]}>{item.user_name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={st.titleLine}><Text numberOfLines={1} style={[st.name, { color: colors.textPrimary }]}>{item.user_name}</Text><Text style={[st.time, { color: colors.textTertiary }]}>{item.last_message_at ? new Date(item.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</Text></View>
            <View style={st.schoolLine}><School size={12} color={colors.primary} /><Text numberOfLines={1} style={[st.school, { color: colors.primary }]}>{item.channel === 'website' ? `${item.website_key} · ${item.visitor_phone}` : item.school_name}</Text></View>
            <View style={[st.portalChip, { backgroundColor: `${colors.primary}12` }]}><Text style={[st.portalText, { color: colors.primary }]}>{item.portal_role.toUpperCase()} PORTAL</Text></View>
            <Text numberOfLines={1} style={[st.preview, { color: colors.textSecondary }]}>{item.last_message_preview || 'No messages yet'}</Text>
          </View>
          {item.unread_count > 0 && <View style={[st.badge, { backgroundColor: colors.primary }]}><Text style={st.badgeText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text></View>}
        </Pressable>
      ))}
      {!loading && !filtered.length ? <View style={st.empty}><MessageCircle size={30} color={colors.textTertiary} /><Text style={[st.emptyTitle, { color: colors.textPrimary }]}>No support conversations</Text><Text style={[st.emptySub, { color: colors.textTertiary }]}>Threads appear after a school user sends the first message.</Text></View> : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingBottom: 60 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 18, borderRadius: 24 }, heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, heroTitle: { fontSize: 18, fontWeight: '800' }, heroSub: { fontSize: 12, marginTop: 3 }, totalBadge: { minWidth: 28, height: 28, paddingHorizontal: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, totalBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 46, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, marginTop: 18, marginBottom: 14 }, searchInput: { flex: 1, fontSize: 14, outlineStyle: 'none' } as any,
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderWidth: 1, borderRadius: 21, marginBottom: 11 }, avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 15, fontWeight: '800' }, titleLine: { flexDirection: 'row', alignItems: 'center' }, name: { flex: 1, fontSize: 15, fontWeight: '750' as any }, time: { fontSize: 10.5, marginLeft: 8 }, schoolLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }, school: { fontSize: 11.5, fontWeight: '650' as any }, preview: { fontSize: 12.5, marginTop: 5 }, badge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800' }, empty: { alignItems: 'center', paddingTop: 70, gap: 8 }, emptyTitle: { fontSize: 16, fontWeight: '750' as any }, emptySub: { fontSize: 12.5, textAlign: 'center' },
  portalChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5 }, portalText: { fontSize: 9, fontWeight: '800', letterSpacing: .6 },
});
