import React, { useCallback, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSalesCommand } from '../../hooks/useSalesCommand';
import { crmService } from '../../services/crmService';
import { normalizeSalesFilters } from '../../services/salesCommandQuery';
import type { SalesMetric, SalesPeriod } from '../../types/crm';
import { ConsoleAmbientBackground, FilterChips, GlassCard, bottomTabPad } from './founderUi';

const KPI_ORDER = [
  ['new_leads', 'New leads'],
  ['contacted', 'Became contacted'],
  ['qualified', 'Became qualified'],
  ['demo_scheduled', 'Demos booked'],
  ['demo_completed', 'Demo completed'],
  ['proposals_sent', 'Proposals sent'],
  ['active_pilots', 'Active pilots'],
  ['wins', 'Wins'],
  ['losses', 'Losses'],
  ['cohort_conversion', 'Cohort conversion'],
  ['open_pipeline', 'Open pipeline'],
  ['due_today', 'Due today'],
  ['overdue', 'Overdue follow-ups'],
  ['founder_attention', 'Founder attention'],
  ['new_prospects', 'School prospects added'],
  ['intake_backlog', 'Intake backlog'],
] as const;

const PERIODS: { key: SalesPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

function displayValue(metric?: SalesMetric): string {
  if (!metric || metric.value == null) return '—';
  if (metric.unit === 'ratio') return `${Math.round(metric.value * 1000) / 10}%`;
  return String(metric.value);
}

export function SalesMetricList({ metric, period, timezone, label, stage }: { metric: string; period: string; timezone: string; label: string; stage?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<Array<{ id: string; enquiry_id?: string; name?: string | null; organization?: string | null; pipeline_stage_code?: string; outcome?: string; entity_type?: string }>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next?: string) => {
    setLoading(true);
    if (!next) setError(null);
    try {
      const filters = normalizeSalesFilters({ period: period as SalesPeriod, timezone, metric, stage });
      if (next) filters.cursor = next;
      const page = await crmService.salesOpportunities(filters);
      setRows((current) => next ? [...current, ...page.rows] : page.rows);
      setCursor(page.page.next_cursor);
      setTotal(page.page.total);
      setStale(Boolean(page.updated_since_dashboard_refresh));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'These records could not be loaded.');
      if (!next) setRows([]);
    } finally {
      setLoading(false);
    }
  }, [metric, period, timezone, stage]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title={label || metric} subtitle="School sales drill-down" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomTabPad }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12, gap: 8 }}>
            {error ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
            <Text style={{ color: colors.textSecondary }}>{total == null ? 'Count unavailable' : `${total} matching records`}. {stale ? 'Updated since dashboard refresh.' : ''}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name || item.organization || 'Open record'}
            onPress={() => {
              if (item.entity_type === 'account') router.push(`/(app)/console/school-prospects/${item.id}` as never);
              else router.push(`/(app)/console/lead/${item.enquiry_id || item.id}` as never);
            }}
            style={({ pressed }) => [styles.row, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight, opacity: pressed ? 0.84 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.name || item.organization || 'Untitled'}</Text>
            <Text style={{ color: colors.textSecondary }}>{item.pipeline_stage_code || item.entity_type || 'Record'} · {item.outcome || 'Account'}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading && !error ? <GlassCard variant="lightweight"><Text style={{ color: colors.textSecondary }}>No records match this metric.</Text></GlassCard> : null}
        ListFooterComponent={cursor ? <Button title={loading ? 'Loading…' : 'Load more'} onPress={() => load(cursor)} /> : null}
      />
    </ConsoleAmbientBackground>
  );
}

export default function SalesCommandScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string }>();
  const { user } = useAuth();
  const initial = params.period === 'today' || params.period === 'week' || params.period === 'month' ? params.period : 'month';
  const command = useSalesCommand(user?.id || null, { period: initial });
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null);
  const [buckets, setBuckets] = useState<Array<{ bucket: string; count: number }> | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const columns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  const tileWidth = Math.floor((width - 32 - (columns - 1) * 8) / columns);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
  }, []);

  const openMetric = (id: string, label: string, stage?: string) => {
    router.push({ pathname: '/(app)/console/enquiries', params: { metric: id, period: command.period, timezone: command.timezone, label, stage: stage || '' } } as never);
  };

  const loadPanels = async () => {
    setPanelError(null);
    try {
      const filters = normalizeSalesFilters({ period: command.period, timezone: command.timezone });
      const [funnelBody, agingBody] = await Promise.all([
        crmService.salesFunnel(filters),
        crmService.salesAging(filters),
      ]);
      setFunnel(funnelBody.funnel || null);
      setBuckets(agingBody.buckets || []);
    } catch (err: any) {
      setPanelError(err?.response?.data?.error || 'Funnel and aging could not be loaded.');
    }
  };

  const summary = command.summary;
  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Sales Command" subtitle={summary?.scope_label || 'School sales'} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomTabPad, gap: 12 }}>
        <FilterChips options={PERIODS} value={command.period} onChange={(value) => command.setPeriod(value as SalesPeriod)} />
        <FilterChips
          options={[{ key: 'first', label: 'First touch' }, { key: 'latest', label: 'Latest touch' }]}
          value={command.attributionModel}
          onChange={(value) => command.setAttributionModel(value as 'first' | 'latest')}
        />
        <Text style={{ color: colors.textSecondary }}>
          {command.updatedAt ? `Updated ${new Date(command.updatedAt).toLocaleString()}` : 'Not updated yet'}. Stock cards are Now. Event cards use the selected period. Previous comparison is the previous equal-length period. First and latest touch are two views of the same leads.
        </Text>
        {command.error ? <GlassCard variant="lightweight"><Text accessibilityRole="alert" style={{ color: colors.error }}>{command.error}</Text></GlassCard> : null}
        {summary ? (
          <>
            <Text style={[styles.section, { color: colors.textPrimary }]}>Founder attention</Text>
            {summary.attention_preview.length === 0 ? <GlassCard variant="lightweight"><Text style={{ color: colors.textSecondary }}>No attention items in this scope.</Text></GlassCard> : summary.attention_preview.map((row) => (
              <Pressable
                key={row.entity_key}
                accessibilityRole="button"
                accessibilityLabel={`${row.name || 'Record'}, severity ${row.severity}`}
                onPress={() => router.push((row.entity_type === 'account' ? `/(app)/console/school-prospects/${row.id}` : `/(app)/console/lead/${row.id}`) as never)}
                style={({ pressed }) => [styles.row, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight, opacity: pressed ? 0.84 : 1, transform: [{ scale: reduceMotion ? 1 : pressed ? 0.985 : 1 }] }]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{row.name || row.organization || 'Untitled'}</Text>
                <Text style={{ color: colors.salesNow }}>Severity {row.severity}</Text>
                <Text style={{ color: colors.textSecondary }}>{row.reasons.map((reason) => reason.code).join(', ')}</Text>
              </Pressable>
            ))}
            <Text style={[styles.section, { color: colors.textPrimary }]}>School sales</Text>
            {summary.attribution ? (
              <GlassCard variant="lightweight">
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Campaign attribution · {summary.attribution.model}</Text>
                <Text style={{ color: colors.textSecondary }}>
                  Opens {summary.attribution.qualified_opens} qualified / {summary.attribution.raw_opens} raw. Leads {summary.attribution.campaign_leads}. Demo requests {summary.attribution.demo_requests}. Booked {summary.attribution.booked_demos}. Completed {summary.attribution.completed_demos}. Won {summary.attribution.wins}. Lost {summary.attribution.losses}.
                </Text>
                <Text style={{ color: colors.textSecondary }}>External conversion coverage: {summary.attribution.external_conversion_coverage}. These are link opens, not scans or people.</Text>
              </GlassCard>
            ) : null}
            <View style={styles.grid}>
              {KPI_ORDER.map(([id, label]) => {
                const metric = summary.metrics[id];
                const pressable = Boolean(metric?.drilldown);
                return (
                  <Pressable
                    key={id}
                    disabled={!pressable}
                    accessibilityRole={pressable ? 'button' : 'text'}
                    accessibilityLabel={`${label}. ${displayValue(metric)}. ${metric?.basis || 'Unavailable'}`}
                    onPress={() => openMetric(metric?.drilldown?.metric || id, label)}
                    style={({ pressed }) => [{ width: tileWidth, minHeight: 88, marginBottom: 8 }, styles.row, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight, opacity: pressed && pressable ? 0.84 : 1 }]}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700' }}>{command.loading ? '…' : displayValue(metric)}</Text>
                    <Text style={{ color: metric?.basis?.startsWith('Now') ? colors.salesNow : colors.salesEvent, fontSize: 11 }}>{metric?.basis?.startsWith('Now') ? 'Now' : 'Period'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.section, { color: colors.textPrimary }]}>Open stage occupancy</Text>
            <Text style={{ color: colors.textSecondary }}>This is the current distribution, not a conversion rate.</Text>
            <View style={styles.grid}>
              {Object.entries(summary.current_stage || {}).map(([code, metric]) => (
                <Pressable key={code} disabled={!metric.drilldown} accessibilityRole={metric.drilldown ? 'button' : 'text'} accessibilityLabel={`${code} occupancy ${displayValue(metric)}. Current distribution, not conversion.`} onPress={() => openMetric('current_stage', `${code} now`, code)} style={[styles.row, { width: tileWidth, borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight }]}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{code}</Text>
                  <Text style={{ color: metric.value == null ? colors.salesUnknown : colors.textSecondary }}>{displayValue(metric)}</Text>
                </Pressable>
              ))}
            </View>
            <Button title="Load cohort funnel and aging" variant="secondary" onPress={loadPanels} />
            {panelError ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{panelError}</Text> : null}
            {funnel ? (
              <GlassCard variant="lightweight">
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Creation cohort through evaluation</Text>
                <Text style={{ color: colors.textSecondary }}>Cohort {funnel.cohort_size}. Contacted {funnel.contacted}. Qualified {funnel.qualified}. Demo completed {funnel.demo_completed}. Proposal sent {funnel.proposal_sent}. Pilot {funnel.pilot_started}. Won {funnel.won}. Won without a pilot {funnel.won_without_pilot}. A skipped step is not a loss.</Text>
              </GlassCard>
            ) : null}
            {buckets ? (
              <GlassCard variant="lightweight">
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Current stage age</Text>
                {['0_2', '3_7', '8_14', '15_30', '31_plus', 'unknown'].map((bucket) => (
                  <Text key={bucket} style={{ color: bucket === 'unknown' ? colors.salesUnknown : colors.textSecondary }}>{bucket.replace('_', '–').replace('plus', '+')} days: {buckets.find((row) => row.bucket === bucket)?.count ?? 0}</Text>
                ))}
              </GlassCard>
            ) : null}
            {(summary.meta.coverage?.warnings || []).map((warning) => (
              <Text key={warning} style={{ color: colors.salesUnknown }}>{warning}</Text>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 12, marginBottom: 8, gap: 4 },
});
