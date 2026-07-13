import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Building2, Store, ShoppingBag, Contact, UserRound, ShieldAlert, Users2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { crmService } from '../../services/crmService';
import * as founderDb from '../../services/founderSupabase';
import { pressableWebStyles } from '../../utils/webPressable';
import type { CrmAccount } from '../../types/crm';
import type { FounderRow } from '../../types/founder';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

const VERTICAL_ICON: Record<string, any> = {
  SCHOOL: Building2,
  MEDICAL: Store,
  RETAIL: ShoppingBag,
  OTHER: Contact,
};

export default function TenantAssignmentsScreen() {
  const { colors, isDark } = useTheme();
  const { isSuperAdmin } = useAuth();

  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [founders, setFounders] = useState<FounderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, f] = await Promise.all([
        crmService.listAccounts(),
        founderDb.listFoundersForSettings(),
      ]);
      setAccounts(a);
      setFounders(f.filter((x) => x.is_active));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const assign = useCallback(async (accountId: string, ownerFounderId: string | null) => {
    setSavingId(accountId);
    // Optimistic — reflect the new owner immediately, revert on failure.
    const prev = accounts;
    const ownerName = founders.find((f) => f.id === ownerFounderId)?.full_name || null;
    setAccounts((list) => list.map((a) => (a.id === accountId ? { ...a, owner_founder_id: ownerFounderId, owner_name: ownerName } : a)));
    try {
      await crmService.assignAccount(accountId, ownerFounderId);
    } catch (e: any) {
      setAccounts(prev);
      setError(e?.response?.data?.error || e?.message || 'Failed to reassign tenant');
    } finally {
      setSavingId(null);
    }
  }, [accounts, founders]);

  // Assigned-tenant counts per superAdmin for the summary row.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach((a) => { if (a.owner_founder_id) map[a.owner_founder_id] = (map[a.owner_founder_id] || 0) + 1; });
    return map;
  }, [accounts]);
  const unassignedCount = useMemo(() => accounts.filter((a) => !a.owner_founder_id).length, [accounts]);

  if (!isSuperAdmin) {
    return (
      <ConsoleAmbientBackground>
        <ScreenHeader title="Tenant Assignments" subtitle="Distribute tenants across superAdmins" />
        <View style={st.deny}>
          <ShieldAlert size={30} color={colors.warning} />
          <Text style={[st.denyText, { color: colors.textSecondary }]}>Only a Super Admin can assign tenants to superAdmins.</Text>
        </View>
      </ConsoleAmbientBackground>
    );
  }

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={[st.content, { paddingBottom: bottomTabPad }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Tenant Assignments" subtitle="Distribute tenants across superAdmins" />

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null}
        {error ? <GlassCard style={{ marginTop: 14 }}><Text style={{ color: colors.error }}>{error}</Text></GlassCard> : null}

        {!loading ? (
          <>
            {/* superAdmin workload summary */}
            <View style={st.summaryGrid}>
              <GlassCard style={st.summaryCard}>
                <View style={[st.icon, { backgroundColor: `${colors.warning}18` }]}><Users2 size={17} color={colors.warning} /></View>
                <Text style={[st.summaryValue, { color: colors.textPrimary }]}>{unassignedCount}</Text>
                <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>Unassigned tenants</Text>
              </GlassCard>
              {founders.map((f) => (
                <GlassCard key={f.id} style={st.summaryCard}>
                  <View style={[st.icon, { backgroundColor: `${colors.primary}16` }]}><UserRound size={17} color={colors.primary} /></View>
                  <Text style={[st.summaryValue, { color: colors.textPrimary }]}>{counts[f.id] || 0}</Text>
                  <Text style={[st.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>{f.full_name || f.email || 'superAdmin'}</Text>
                </GlassCard>
              ))}
            </View>

            <Text style={[st.sectionText, { color: colors.textPrimary }]}>Tenants</Text>
            <GlassCard noPad>
              {accounts.map((account, index) => {
                const Icon = VERTICAL_ICON[account.vertical] || Contact;
                return (
                  <View key={account.id} style={[st.tenantRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                    <View style={st.tenantHead}>
                      <View style={[st.avatar, { backgroundColor: `${colors.primary}16` }]}><Icon size={17} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.tenantName, { color: colors.textPrimary }]}>{account.name}</Text>
                        <Text style={[st.tenantMeta, { color: colors.textTertiary }]}>{account.vertical} · {account.lifecycle_stage} · {account.owner_name || 'Unassigned'}</Text>
                      </View>
                      {savingId === account.id ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.ownerRow}>
                      <OwnerPill label="Unassigned" active={!account.owner_founder_id} isDark={isDark} colors={colors} onPress={() => assign(account.id, null)} />
                      {founders.map((f) => (
                        <OwnerPill
                          key={f.id}
                          label={f.full_name || f.email || 'superAdmin'}
                          active={account.owner_founder_id === f.id}
                          isDark={isDark}
                          colors={colors}
                          onPress={() => assign(account.id, f.id)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
              {!accounts.length ? <Text style={[st.empty, { color: colors.textTertiary }]}>No tenants yet. Accept an enquiry to create one.</Text> : null}
            </GlassCard>
          </>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

function OwnerPill({ label, active, isDark, colors, onPress }: { label: string; active: boolean; isDark: boolean; colors: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        st.ownerPill,
        active
          ? { backgroundColor: 'rgba(14,165,233,0.14)', borderColor: '#0EA5E9' }
          : { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
        ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
      ]}
    >
      <UserRound size={12} color={active ? '#38BDF8' : colors.textSecondary} />
      <Text style={[st.ownerPillLbl, { color: active ? '#38BDF8' : colors.textSecondary }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  content: { paddingBottom: 60 },
  deny: { alignItems: 'center', gap: 12, marginTop: 60, paddingHorizontal: 30 },
  denyText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  summaryCard: { flex: 1, minWidth: 140 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  summaryValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  summaryLabel: { fontSize: 11.5, marginTop: 2 },
  sectionText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.35, marginTop: 26, marginBottom: 12 },
  tenantRow: { padding: 16, gap: 12 },
  tenantHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tenantName: { fontSize: 15, fontWeight: '750' as any },
  tenantMeta: { fontSize: 11, marginTop: 3 },
  ownerRow: { gap: 8, paddingRight: 8 },
  ownerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  ownerPillLbl: { fontSize: 12, fontWeight: '700', maxWidth: 150 },
  empty: { padding: 22, textAlign: 'center' },
});
