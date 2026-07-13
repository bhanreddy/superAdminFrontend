import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, Building2, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, ContactRound, ListTodo, UserRoundPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { crmService } from '../../services/crmService';
import type { CrmAccount, CrmOverview, CrmTask } from '../../types/crm';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

const EMPTY: CrmOverview = { pipeline: [], accounts: [], tasks: { open: 0, overdue: 0, due_today: 0 }, unassigned: 0 };

export default function CrmScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const desktop = width >= 1024;
  const [overview, setOverview] = useState<CrmOverview>(EMPTY);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [o, a, t] = await Promise.all([
        crmService.getOverview(), crmService.listAccounts(), crmService.listTasks({ status: 'OPEN' }),
      ]);
      setOverview(o); setAccounts(a); setTasks(t);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load CRM');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);
  const pipelineTotal = useMemo(() => overview.pipeline.reduce((n, row) => n + Number(row.count || 0), 0), [overview]);
  const pipelineValue = useMemo(() => overview.pipeline.reduce((n, row) => n + Number(row.value || 0), 0), [overview]);

  const metrics = [
    { label: 'Open pipeline', value: pipelineTotal, icon: ContactRound, color: colors.primary },
    { label: 'Unassigned', value: overview.unassigned, icon: UserRoundPlus, color: colors.warning },
    { label: 'Due today', value: overview.tasks.due_today, icon: Clock3, color: colors.info },
    { label: 'Overdue', value: overview.tasks.overdue, icon: AlertTriangle, color: colors.error },
  ];

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={[st.content, { paddingBottom: bottomTabPad }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="CRM Command Center" subtitle="Pipeline, customers, work and automation" />

        <LinearGradient
          colors={isDark ? [`${colors.primary}30`, `${colors.accent}14`, 'rgba(255,255,255,0.02)'] : [`${colors.primary}18`, `${colors.accent}0D`, 'rgba(255,255,255,0.82)']}
          style={[st.hero, { borderColor: colors.clayBorderColor }, clayStyle(clayShadows.clayElevated)]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[st.eyebrow, { color: colors.primary }]}>NEXSYRUS REVENUE OS</Text>
            <Text style={[st.heroTitle, { color: colors.textPrimary }]}>One place to move every relationship forward.</Text>
            <Text style={[st.heroSub, { color: colors.textSecondary }]}>From first enquiry to onboarding, billing and retention.</Text>
          </View>
          <View style={[st.valuePill, { backgroundColor: `${colors.success}16`, borderColor: `${colors.success}35` }]}>
            <CircleDollarSign size={18} color={colors.success} />
            <View>
              <Text style={[st.valueLabel, { color: colors.textTertiary }]}>Pipeline value</Text>
              <Text style={[st.valueText, { color: colors.textPrimary }]}>₹{pipelineValue.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null}
        {error ? <GlassCard style={{ marginTop: 18 }}><Text style={{ color: colors.error }}>{error}</Text><Text style={{ color: colors.textTertiary, marginTop: 6 }}>Apply migration 07_top_level_crm.sql before opening the CRM.</Text></GlassCard> : null}

        {!loading && !error ? (
          <>
            <View style={st.metricGrid}>
              {metrics.map(({ label, value, icon: Icon, color }) => (
                <GlassCard key={label} style={st.metricCard}>
                  <View style={[st.icon, { backgroundColor: `${color}18` }]}><Icon size={18} color={color} /></View>
                  <Text style={[st.metricValue, { color: colors.textPrimary }]}>{value.toLocaleString('en-IN')}</Text>
                  <Text style={[st.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
                </GlassCard>
              ))}
            </View>

            <View style={[st.columns, !desktop && st.columnsStack]}>
              <View style={st.mainColumn}>
                <SectionTitle title="Pipeline" action="Open enquiries" onPress={() => router.push('/(app)/console/enquiries' as any)} />
                <GlassCard>
                  {overview.pipeline.map((row) => {
                    const pct = pipelineTotal ? Math.max(4, Number(row.count) / pipelineTotal * 100) : 4;
                    return <View key={row.status} style={st.pipelineRow}>
                      <View style={st.rowBetween}><Text style={[st.rowTitle, { color: colors.textPrimary }]}>{row.status}</Text><Text style={[st.rowValue, { color: colors.textPrimary }]}>{row.count}</Text></View>
                      <View style={[st.track, { backgroundColor: colors.borderSubtle }]}><LinearGradient colors={[colors.primary, colors.accent]} style={[st.fill, { width: `${pct}%` }]} /></View>
                    </View>;
                  })}
                  {!overview.pipeline.length ? <Text style={{ color: colors.textTertiary }}>No leads in the pipeline yet.</Text> : null}
                </GlassCard>

                <SectionTitle title="Customer accounts" />
                <GlassCard noPad>
                  {accounts.slice(0, 8).map((account, index) => (
                    <View key={account.id} style={[st.listRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                      <View style={[st.avatar, { backgroundColor: `${colors.primary}16` }]}><Building2 size={17} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}><Text style={[st.rowTitle, { color: colors.textPrimary }]}>{account.name}</Text><Text style={[st.rowMeta, { color: colors.textTertiary }]}>{account.vertical} · {account.lifecycle_stage} · {account.owner_name || 'Unassigned'}</Text></View>
                      <Text style={[st.count, { color: colors.textSecondary }]}>{account.open_task_count || 0} tasks</Text>
                    </View>
                  ))}
                  {!accounts.length ? <Text style={[st.empty, { color: colors.textTertiary }]}>Converted customers will appear here.</Text> : null}
                </GlassCard>
              </View>

              <View style={st.sideColumn}>
                <SectionTitle title="Work queue" />
                <GlassCard noPad>
                  {tasks.slice(0, 10).map((task, index) => (
                    <Pressable key={task.id} onPress={async () => { await crmService.updateTask(task.id, { status: 'COMPLETED' }); load(); }} style={[st.taskRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                      <View style={[st.check, { borderColor: task.priority === 'URGENT' ? colors.error : colors.border }]}><CheckCircle2 size={15} color={colors.textTertiary} /></View>
                      <View style={{ flex: 1 }}><Text style={[st.taskTitle, { color: colors.textPrimary }]}>{task.title}</Text><Text style={[st.rowMeta, { color: colors.textTertiary }]}>{task.account_name || task.enquiry_name || 'CRM'} · {task.priority}</Text></View>
                    </Pressable>
                  ))}
                  {!tasks.length ? <View style={st.emptyState}><ListTodo size={24} color={colors.success} /><Text style={{ color: colors.textSecondary }}>Work queue is clear.</Text></View> : null}
                </GlassCard>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return <View style={st.sectionTitle}><Text style={[st.sectionText, { color: colors.textPrimary }]}>{title}</Text>{action ? <Pressable onPress={onPress} style={st.action}><Text style={{ color: colors.primary, fontWeight: '700' }}>{action}</Text><ChevronRight size={15} color={colors.primary} /></Pressable> : null}</View>;
}

const st = StyleSheet.create({
  content: { paddingBottom: 60 },
  hero: { borderWidth: 1, borderRadius: 28, padding: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center', overflow: 'hidden' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, heroTitle: { fontSize: 27, lineHeight: 34, fontWeight: '850' as any, letterSpacing: -0.8, maxWidth: 620, marginTop: 7 }, heroSub: { fontSize: 13, marginTop: 7 },
  valuePill: { minWidth: 190, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 }, valueLabel: { fontSize: 10 }, valueText: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 }, metricCard: { flex: 1, minWidth: 150 }, icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, metricValue: { fontSize: 27, fontWeight: '800', letterSpacing: -0.7 }, metricLabel: { fontSize: 12, marginTop: 3 },
  columns: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' }, columnsStack: { flexDirection: 'column' }, mainColumn: { flex: 1.65, minWidth: 0 }, sideColumn: { flex: 1, minWidth: 280 }, sectionTitle: { marginTop: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.35 }, action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pipelineRow: { gap: 8, marginBottom: 18 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between' }, rowTitle: { fontSize: 13, fontWeight: '700' }, rowValue: { fontSize: 13, fontWeight: '800' }, track: { height: 8, borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }, avatar: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, rowMeta: { fontSize: 10.5, marginTop: 3 }, count: { fontSize: 11, fontWeight: '650' as any }, empty: { padding: 20, textAlign: 'center' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15 }, check: { width: 32, height: 32, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, taskTitle: { fontSize: 12.5, fontWeight: '700' }, emptyState: { padding: 28, gap: 10, alignItems: 'center' },
});
