import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import * as founderDb from '../../services/founderSupabase';
import { currentMonthPrefix, pickSeriesRowForMonthPrefix } from '../../utils/founderDashboardMetrics';
import {
  ConsoleAmbientBackground,
  GlassCard,
  KpiTile,
  SectionTitle,
  founderGradients,
  bottomTabPad,
} from './founderUi';

function pick(row: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) {
      const n = Number(row[k]);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return String(v);
  }
  return '—';
}

/** Aligns with founder-console `src/app/analytics/page.tsx` */
export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [monthlyClosed, setMonthlyClosed] = useState<Record<string, unknown>[]>([]);
  const [monthlyExpense, setMonthlyExpense] = useState<Record<string, unknown>[]>([]);
  const [expenseV2Fallback, setExpenseV2Fallback] = useState<Record<string, unknown>[]>([]);
  const [conversionRateRows, setConversionRateRows] = useState<Record<string, unknown>[]>([]);
  const [costPerLeadRows, setCostPerLeadRows] = useState<Record<string, unknown>[]>([]);
  const [leadsByWebsite, setLeadsByWebsite] = useState<Record<string, unknown>[]>([]);
  const [founderLeadPerf, setFounderLeadPerf] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mc, me, ev2, cr, cpl, lbw, flp] = await Promise.all([
        founderDb.fetchMonthlyClosedDeals(),
        founderDb.fetchMonthlyExpenseSummaryRoi(),
        founderDb.fetchMonthlyExpenseSummaryV2(),
        founderDb.fetchConversionRateSeries(),
        founderDb.fetchCostPerLeadSeries(),
        founderDb.fetchLeadsByWebsite(),
        founderDb.fetchFounderLeadPerformance(),
      ]);
      setMonthlyClosed(mc);
      setMonthlyExpense(me);
      setExpenseV2Fallback(ev2);
      setConversionRateRows(cr);
      setCostPerLeadRows(cpl);
      setLeadsByWebsite(lbw);
      setFounderLeadPerf(flp);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const prefix = currentMonthPrefix();
  const financialOverview = useMemo(() => {
    const currentClosed = pickSeriesRowForMonthPrefix(monthlyClosed, prefix);
    const expenseSeries = monthlyExpense.length > 0 ? monthlyExpense : expenseV2Fallback;
    const currentExpense = pickSeriesRowForMonthPrefix(expenseSeries, prefix);
    const currentConversion = pickSeriesRowForMonthPrefix(conversionRateRows, prefix);
    const currentCpl = pickSeriesRowForMonthPrefix(costPerLeadRows, prefix);

    const rev = pick(currentClosed, ['total_revenue', 'total_deal_value', 'revenue', 'amount']);
    const exp = pick(currentExpense, ['total_expense', 'total_amount', 'amount', 'expense']);
    let conv = pick(currentConversion, ['conversion_ratio', 'conversion_rate', 'rate']);
    if (conv > 0 && conv < 1) conv *= 100;
    const cpl = pick(currentCpl, ['cost_per_lead', 'cpl']);

    return {
      revenueThisMonth: rev,
      expenseThisMonth: exp,
      netProfit: rev - exp,
      conversionRate: conv,
      costPerLead: cpl,
    };
  }, [monthlyClosed, monthlyExpense, expenseV2Fallback, conversionRateRows, costPerLeadRows, prefix]);

  const finCards = [
    { label: 'Revenue', value: financialOverview.revenueThisMonth, gradient: founderGradients.success, prefix: '₹' as const },
    { label: 'Expenses', value: financialOverview.expenseThisMonth, gradient: founderGradients.danger, prefix: '₹' as const },
    {
      label: 'Net Profit',
      value: financialOverview.netProfit,
      gradient: financialOverview.netProfit >= 0 ? founderGradients.primary : founderGradients.danger,
      prefix: '₹' as const,
      isProfit: true,
    },
    { label: 'CPL', value: financialOverview.costPerLead, gradient: founderGradients.warning, prefix: '₹' as const },
    { label: 'Conversion', value: financialOverview.conversionRate, gradient: founderGradients.info, suffix: '%' as const, isPercent: true },
  ];

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Analytics" subtitle="Growth & ROI (founder-console parity)" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.pad, { paddingBottom: bottomTabPad }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#7C6FFF" style={{ marginTop: 32 }} />
        ) : (
          <>
            <SectionTitle title="Financial overview (this month)" />
            <View style={styles.kpiGrid}>
              {finCards.map((card) => (
                <KpiTile
                  key={card.label}
                  label={card.label}
                  value={
                    card.isPercent
                      ? `${card.value.toFixed(1)}${card.suffix ?? ''}`
                      : `${card.prefix}${Number(card.value).toLocaleString('en-IN')}`
                  }
                  gradient={card.gradient}
                />
              ))}
            </View>

            <SectionTitle title="Website performance" />
            <GlassCard>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { color: colors.textSecondary, flex: 1.2 }]}>Website</Text>
                <Text style={[styles.th, { color: colors.textSecondary }]}>Leads</Text>
                <Text style={[styles.th, { color: colors.textSecondary }]}>Deals</Text>
                <Text style={[styles.th, { color: colors.textSecondary, flex: 1.1 }]}>Revenue</Text>
              </View>
              {leadsByWebsite.map((r, i) => (
                <View key={i} style={[styles.tr, { borderTopColor: colors.border }]}>
                  <Text style={[styles.td, { color: colors.textPrimary, flex: 1.2 }]} numberOfLines={1}>
                    {pickStr(r, ['website_source', 'source', 'website', 'domain', 'channel', 'name'])}
                  </Text>
                  <Text style={[styles.td, { color: colors.textPrimary }]}>
                    {pick(r, ['total_leads', 'leads', 'lead_count', 'enquiries', 'count']).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.td, { color: '#059669' }]}>
                    {pick(r, ['closed_deals', 'deals', 'closed', 'deal_count']).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.td, { color: '#00D4AD', flex: 1.1 }]} numberOfLines={1}>
                    {founderDb.formatInr(pick(r, ['revenue', 'total_revenue', 'amount', 'value']), 0)}
                  </Text>
                </View>
              ))}
              {leadsByWebsite.length === 0 ? (
                <Text style={{ color: colors.textSecondary, paddingVertical: 12 }}>No website data.</Text>
              ) : null}
            </GlassCard>

            <SectionTitle title="Founder performance" />
            <GlassCard>
              {founderLeadPerf.map((r, i) => (
                <View key={i} style={[styles.lbRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.rank, { color: colors.textSecondary }]}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lbName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {pickStr(r, ['assigned_to', 'founder_name', 'full_name', 'name', 'email'])}
                    </Text>
                    <Text style={[styles.lbSub, { color: colors.textSecondary }]}>
                      Leads {pick(r, ['total_assigned', 'leads', 'lead_count']).toLocaleString('en-IN')} · Deals{' '}
                      {pick(r, ['closed_deals', 'deals', 'closed']).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={styles.lbRev}>
                    {founderDb.formatInr(pick(r, ['revenue_generated', 'revenue', 'deal_value', 'total']), 0)}
                  </Text>
                </View>
              ))}
              {founderLeadPerf.length === 0 ? (
                <Text style={{ color: colors.textSecondary, paddingVertical: 12 }}>No founder performance rows.</Text>
              ) : null}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { paddingHorizontal: 0, paddingTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tableHead: { flexDirection: 'row', marginBottom: 8 },
  th: { flex: 1, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  td: { flex: 1, fontSize: 13, fontWeight: '600' },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: { width: 28, fontWeight: '800', fontSize: 14 },
  lbName: { fontSize: 15, fontWeight: '800' },
  lbSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  lbRev: { fontSize: 14, fontWeight: '800', color: '#00D4AD' },
});
