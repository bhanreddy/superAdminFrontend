import type { DashboardReport as apiDashboardReport } from '../../api/books';
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Landmark, TrendingUp } from 'lucide-react-native';
import { MotionPressable as Pressable } from '../../components/ui/MotionPressable';
import { MotionSection } from '../../components/ui/MotionSection';
import { MetricValue } from '../../components/ui/MetricValue';
import { borderRadius } from '../../constants/theme';
import { brandColors, getCardTone, type CardTone } from '../../constants/experienceColors';
import { useTheme } from '../../contexts/ThemeContext';
import { Report, Account, money, message } from '../../api/books';
import { Panel, Table, Notice, Action, ui } from './BooksUi';
import { reportRows, saveCsv } from './export';
export function Kpis({ report: r }: { report: apiDashboardReport }) {
  const { isDark } = useTheme();
  const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={ui.wrap}>
      {[
        { label: 'TOTAL RECEIVABLES', value: r.receivables, note: 'Current unpaid invoices', tone: 'blue', Icon: ArrowDownLeft },
        { label: 'TOTAL PAYABLES', value: r.payables, note: 'Current unpaid bills', tone: 'rose', Icon: ArrowUpRight },
        { label: 'CASH & BANK', value: r.cash, note: `As of ${date(r.to)}`, tone: 'honey', Icon: Landmark },
        { label: 'NET PROFIT', value: r.profit, note: `${date(r.from)} — ${date(r.to)}`, tone: 'lavender', Icon: TrendingUp },
      ].map(k => {
        const tone = getCardTone(k.tone as CardTone, isDark);
        return <Panel key={k.label} tone={k.tone as CardTone} material="soft" style={{ flex: 1, minWidth: 185, padding: 20, gap: 14 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: tone.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, flex: 1 }}>{k.label}</Text>
            <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: tone.cover, alignItems: 'center', justifyContent: 'center' }}><k.Icon size={19} color={tone.accent} /></View>
          </View>
          <MetricValue value={money(k.value)} style={{ color: tone.ink, fontVariant: ['tabular-nums'] }} />
          <Text style={{ color: tone.muted, fontSize: 12, lineHeight: 18 }}>{k.note}</Text>
        </Panel>;
      })}
    </View>
  );
}
export function CashChart({ report: r }: { report: apiDashboardReport }) {
  const { colors, isDark } = useTheme();
  const max = Math.max(1, ...r.cashflow.flatMap(v => [Number(v.inflow), Number(v.outflow)]));
  const receiptColor = isDark ? brandColors.blueBright : brandColors.blue;
  const paymentColor = isDark ? brandColors.peach : brandColors.rose;
  return (
    <Panel>
      <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <View style={{ gap: 4 }}>
          <Text style={[ui.title, { color: colors.textPrimary }]}>Cash movement</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Money in and out over time</Text>
        </View>
        <View style={ui.row}>
          {[['Receipts', receiptColor], ['Payments', paymentColor]].map(([label, color]) => <View key={label} style={[ui.row, { gap: 6 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
          </View>)}
        </View>
      </View>
      {r.cashflow.length ? r.cashflow.slice(-8).map(v => (
        <View key={v.month} accessible accessibilityLabel={`${v.month}: receipts ${money(v.inflow)}, payments ${money(v.outflow)}`} style={{ gap: 8 }}>
          <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>{v.month}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{money(v.inflow)} / {money(v.outflow)}</Text>
          </View>
          <View style={{ gap: 5 }}>
            <View style={{ height: 9, width: `${Math.max(0, Number(v.inflow) / max * 100)}%`, backgroundColor: receiptColor, borderRadius: 5 }} />
            <View style={{ height: 9, width: `${Math.max(0, Number(v.outflow) / max * 100)}%`, backgroundColor: paymentColor, borderRadius: 5 }} />
          </View>
        </View>
      )) : <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>Cash movements will appear after you record payments, cash expenses, or cash journals.</Text>}
    </Panel>
  );
}
const names = [
  'Profit & loss',
  'Balance sheet',
  'Ledger accounts',
  'Trial balance',
  'Receivables',
  'Payables',
  'Tax summary',
  'Cash flow',
];
export default function ReportsView({
  report: r,
  onDocument,
  onAccount,
  canExport = false,
}: {
  report: Report;
  onDocument: (id: string, kind: string) => void;
  onAccount?: (account: Pick<Account, 'code' | 'name'>) => void;
  canExport?: boolean;
}) {
  const { colors } = useTheme();
  const [tab, setTab] = useState(names[0]);
  const currency = (v: unknown) => (
    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{money(v)}</Text>
  );
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  async function exportStatement() {
    setExporting(true); setExportError('');
    try { await saveCsv(reportRows(r, tab), `books-${tab.toLowerCase().replaceAll(' ', '-')}-${r.from}-${r.to}.csv`); }
    catch (e) { setExportError(message(e)); }
    finally { setExporting(false); }
  }
  const summary = (label: string, value: number) => <Text key={label} style={{ color: colors.textPrimary, fontSize: 15, lineHeight: 28 }}>{label}: {money(value)}</Text>;
  const accounts = (label: string, rows: typeof r.profit_loss.income, total: number) => <Panel>
    <Text style={[ui.title, { color: colors.textPrimary }]}>{label}</Text>
    <Table rows={rows} onRow={onAccount ? a => onAccount(a) : undefined} columns={[
      { key: 'code', label: 'Code', width: 90 }, { key: 'name', label: 'Account', width: 310 },
      { key: 'amount', label: 'Amount', width: 200, render: a => currency(a.amount) },
    ]} />{summary(`Total ${label.toLowerCase()}`, total)}
  </Panel>;
  return (
    <MotionSection transitionKey={tab} style={{ gap: 18 }}>
      <Kpis report={r} />
      <Notice text={`${r.organization_name} · ${r.from} to ${r.to} · INR · Accrual basis. Balance sheet is as of ${r.to}. Only posted journals and their dated reversals affect these statements.`} />
      {exportError ? <Notice error text={exportError} /> : null}
      {canExport && <Action label="Export statement" secondary disabled={exporting} onPress={() => void exportStatement()} />}
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        {names.map((n) => (
          <Pressable
            key={n}
            accessibilityLabel={n}
            accessibilityRole="tab"
            accessibilityState={{ selected: n === tab }} aria-selected={n === tab}
            onPress={() => setTab(n)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 10,
              minHeight: 44,
              justifyContent: 'center',
              borderRadius: borderRadius.md,
              backgroundColor:
                tab === n ? colors.primaryMuted : colors.surface,
            }}
          >
            <Text
              style={{
                color: tab === n ? colors.primary : colors.textSecondary,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'Profit & loss' && <>
        {accounts('Income', r.profit_loss.income, r.income)}
        {accounts('Expenses', r.profit_loss.expenses, r.expenses)}
        <Panel>{summary(r.profit < 0 ? 'Net loss' : 'Net profit', r.profit)}</Panel>
      </>}
      {tab === 'Balance sheet' && <>
        {accounts('Assets', r.balance_sheet.assets, r.assets)}
        {accounts('Liabilities', r.balance_sheet.liabilities, r.liabilities)}
        {accounts('Owner equity', r.balance_sheet.equity, r.equity)}
        <Panel>
          {summary('Earnings before period', r.balance_sheet.prior_earnings)}
          {summary('Period earnings', r.balance_sheet.period_earnings)}
          {summary('Total equity including earnings', r.balance_sheet.total_equity)}
          {summary('Total liabilities and equity', r.balance_sheet.liabilities_and_equity)}
          {summary('Balance difference', r.balance_sheet.difference)}
        </Panel>
        <Notice error={r.balance_sheet.difference !== 0} text={r.balance_sheet.difference === 0 ? 'Balanced: assets equal liabilities plus equity.' : 'The balance sheet does not reconcile. Review the ledger before using this statement.'} />
      </>}
      {['Ledger accounts', 'Trial balance'].includes(tab) && <>
        <Notice text={onAccount ? 'Select an account for its opening balance, transactions, and running balance. Balances use debit minus credit.' : 'Balances use debit minus credit. Account viewing permission is required to open ledger transactions.'} />
        <Table rows={r.trial} onRow={onAccount} columns={[
          { key: 'code', label: 'Code', width: 80 }, { key: 'name', label: 'Account', width: 260 },
          { key: 'opening_balance', label: 'Opening balance', width: 170, render: a => currency(a.opening_balance) },
          { key: 'period_debit', label: 'Period debit', width: 170, render: a => currency(a.period_debit) },
          { key: 'period_credit', label: 'Period credit', width: 170, render: a => currency(a.period_credit) },
          { key: 'balance', label: 'Closing balance', width: 170, render: a => currency(a.balance) },
        ]} />
      </>}
      {['Receivables', 'Payables'].includes(tab) && (
        <>
          <Notice
            text={`Outstanding balances and age buckets are current as of ${r.aging_as_of}. Date filters apply to the ledger reports above.`}
          />
          <Table
            rows={r.aging.filter(
              (a) => a.kind === (tab === 'Receivables' ? 'invoice' : 'bill'),
            )}
            onRow={(a) => onDocument(a.id, a.source ? 'connections' : a.kind)}
            columns={[
              { key: 'number', label: 'Document', width: 190 },
              { key: 'contact_name', label: 'Contact', width: 230 },
              {
                key: 'due_date',
                label: 'Due date',
                render: (a) => (
                  <Text style={{ color: colors.textPrimary }}>
                    {a.due_date?.slice(0, 10) || '—'}
                  </Text>
                ),
              },
              { key: 'bucket', label: 'Age' },
              {
                key: 'balance',
                label: 'Outstanding',
                width: 180,
                render: (a) => currency(a.balance),
              },
            ]}
          />
        </>
      )}
      {tab === 'Tax summary' && (
        <>
          <Notice text="This summarizes the configured tax on posted documents. Credit rows reduce the corresponding sales/purchase tax when preparing a return. This screen does not file GST returns or generate IRNs." />
          <Table
            rows={r.taxes}
            columns={[
              { key: 'kind', label: 'Transaction', width: 180 },
              {
                key: 'taxable',
                label: 'Taxable amount',
                width: 180,
                render: (a) => currency(a.taxable),
              },
              { key: 'cgst', label: 'CGST', render: (a) => currency(a.cgst) },
              { key: 'sgst', label: 'SGST', render: (a) => currency(a.sgst) },
              { key: 'igst', label: 'IGST', render: (a) => currency(a.igst) },
            ]}
          />
        </>
      )}
      {tab === 'Cash flow' && <>
        <Notice text="Direct method. Transfers between cash and bank accounts are excluded. Mixed activities and accounts without a classification appear under unclassified; set a cash flow activity when posting manual journals." />
        {!r.cash_flow.classification_complete && <Notice error text="Cash flow classification needs review: unclassified journals are included in reconciliation but require accounting review." />}
        <Panel>{summary('Opening cash and bank', r.cash_flow.opening_cash)}</Panel>
        <Table rows={r.cash_flow.activities} columns={[
          { key: 'activity', label: 'Activity', width: 200 },
          { key: 'journal_count', label: 'Journals', width: 100 },
          { key: 'inflow', label: 'Receipts', width: 180, render: a => currency(a.inflow) },
          { key: 'outflow', label: 'Payments', width: 180, render: a => currency(a.outflow) },
          { key: 'net', label: 'Net cash flow', width: 180, render: a => currency(a.net) },
        ]} />
        <Panel>{summary('Net change in cash', r.cash_flow.net_change)}{summary('Closing cash and bank', r.cash_flow.closing_cash)}{summary('Cash reconciliation difference', r.cash_flow.difference)}</Panel>
        <Notice error={r.cash_flow.difference !== 0} text={r.cash_flow.difference === 0 ? 'Cash reconciles to the balance sheet.' : 'Cash does not reconcile. Review ledger classifications before using this statement.'} />
        <CashChart report={r} />
      </>}
    </MotionSection>
  );
}
