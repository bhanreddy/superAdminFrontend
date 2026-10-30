import type { DashboardReport as apiDashboardReport } from '../../api/books';
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Report, Account, money, message } from '../../api/books';
import { Panel, Table, Notice, Action, ui } from './BooksUi';
import { reportRows, saveCsv } from './export';
export function Kpis({ report: r }: { report: apiDashboardReport }) {
  const { colors } = useTheme();
  return (
    <View style={ui.wrap}>
      {[
        {
          label: 'TOTAL RECEIVABLES',
          value: r.receivables,
          note: 'Current unpaid invoices',
          color: '#3085cc',
        },
        {
          label: 'TOTAL PAYABLES',
          value: r.payables,
          note: 'Current unpaid bills',
          color: '#dc8650',
        },
        {
          label: 'CASH & BANK',
          value: r.cash,
          note: `Ledger balance at ${r.to}`,
          color: '#15a383',
        },
        {
          label: 'NET PROFIT',
          value: r.profit,
          note: `${r.from} — ${r.to}`,
          color: '#8876da',
        },
      ].map((k) => (
        <Panel key={k.label} style={{ flex: 1, minWidth: 185, padding: 20 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.8,
            }}
          >
            {k.label}
          </Text>
          <Text
            style={{
              color: k.color,
              fontSize: 27,
              fontWeight: '700',
              letterSpacing: -0.8,
            }}
          >
            {money(k.value)}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
            {k.note}
          </Text>
        </Panel>
      ))}
    </View>
  );
}
export function CashChart({ report: r }: { report: apiDashboardReport }) {
  const { colors } = useTheme(),
    max = Math.max(
      1,
      ...r.cashflow.flatMap((v) => [Number(v.inflow), Number(v.outflow)]),
    );
  return (
    <Panel>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={[ui.title, { color: colors.textPrimary }]}>
          Cash movement
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          ● Receipts ● Payments
        </Text>
      </View>
      {r.cashflow.length ? (
        r.cashflow.slice(-8).map((v) => (
          <View key={v.month} style={ui.row}>
            <Text
              style={{ color: colors.textSecondary, width: 70, fontSize: 12 }}
            >
              {v.month}
            </Text>
            <View style={{ flex: 1, gap: 5 }}>
              <View
                style={{
                  height: 9,
                  width: `${Math.max(0, (Number(v.inflow) / max) * 100)}%`,
                  backgroundColor: '#3085cc',
                  borderRadius: 4,
                }}
              />
              <View
                style={{
                  height: 9,
                  width: `${Math.max(0, (Number(v.outflow) / max) * 100)}%`,
                  backgroundColor: '#dc8650',
                  borderRadius: 4,
                }}
              />
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                width: 125,
                textAlign: 'right',
              }}
            >
              {money(v.inflow)} / {money(v.outflow)}
            </Text>
          </View>
        ))
      ) : (
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
          Cash movements will appear after you record payments, cash expenses,
          or cash journals.
        </Text>
      )}
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
    <>
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
              borderRadius: 8,
              backgroundColor:
                tab === n ? colors.primary + '18' : colors.surface,
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
    </>
  );
}
