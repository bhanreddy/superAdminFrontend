import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { crmClient } from '../../api/crmClient';
import { ConsoleAmbientBackground, GlassCard, SkeletonKpiGrid } from '../founder/founderUi';

export default function FieldPerformanceScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [today, owners] = await Promise.all([
        crmClient.get('/api/super-admin/field/today').then((r) => r.data),
        crmClient.get('/api/super-admin/crm/sales-command/owners', { params: { period: 'week' } }).then((r) => r.data).catch(() => null),
      ]);
      setData({ today: today?.data ?? today, owners: owners?.data ?? owners });
    } catch { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const t = data?.today?.totals || {};
  const cards = [
    ['Schools Visited', t.visited ?? 0, '#0A84FF'],
    ['Distance (KM)', t.distance_km ?? 0, '#64D2FF'],
    ['Qualified Leads', t.qualified ?? 0, '#30D158'],
    ['Follow-ups Breached', t.followups_breached ?? 0, '#FF453A'],
  ];

  return (
    <ConsoleAmbientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>My Performance</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Quality over visit-count gaming — productive visits, decision makers, demos, proposals.</Text>
        {loading ? <SkeletonKpiGrid /> : (
          <View style={styles.grid}>
            {cards.map(([label, val, color]: any) => (
              <GlassCard key={label} style={styles.card}>
                <Text style={[styles.val, { color }]}>{String(val)}</Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
              </GlassCard>
            ))}
          </View>
        )}
        <GlassCard style={styles.funnel}>
          <Text style={[styles.h, { color: colors.textPrimary }]}>Conversion Funnel</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Visit → Demo → Proposal → Pilot → Win (from Sales Command).</Text>
        </GlassCard>
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 12.5, marginTop: 2, marginBottom: 14, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flex: 1, minWidth: 150, padding: 16 },
  val: { fontSize: 26, fontWeight: '800' },
  label: { fontSize: 11.5, marginTop: 4, fontWeight: '600' },
  funnel: { padding: 16, marginTop: 12 },
  h: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 4 },
});
