import type { DashboardReport as apiDashboardReport } from '../../api/books';
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Report, money } from '../../api/books';
import { Panel, Table, Notice, ui } from './BooksUi';
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
  'Trial balance',
  'Receivables',
  'Payables',
  'Tax summary',
  'Cash flow',
];
export default function ReportsView({
  report: r,
  onDocument,
}: {
  report: Report;
  onDocument: (id: string, kind: string) => void;
}) {
  const { colors } = useTheme();
  const [tab, setTab] = useState(names[0]);
  const currency = (v: unknown) => (
    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{money(v)}</Text>
  );
  const balance = r.trial.filter((a) =>
    ['asset', 'liability', 'equity'].includes(a.type),
  );
  return (
    <>
      <Kpis report={r} />
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        {names.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="tab"
            accessibilityState={{ selected: n === tab }}
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
      {tab === 'Profit & loss' && (
        <>
          <Table
            rows={r.trial.filter((a) => ['income', 'expense'].includes(a.type))}
            columns={[
              { key: 'name', label: 'Account', width: 310 },
              { key: 'type', label: 'Type' },
              {
                key: 'amount',
                label: 'Period balance',
                width: 200,
                render: (a) =>
                  currency(
                    a.type === 'income'
                      ? Number(a.period_credit) - Number(a.period_debit)
                      : Number(a.period_debit) - Number(a.period_credit),
                  ),
              },
            ]}
          />
          <Panel>
            <Text style={[ui.title, { color: colors.textPrimary }]}>
              Net profit: {money(r.profit)}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Income {money(r.income)} · Expenses {money(r.expenses)}
            </Text>
          </Panel>
        </>
      )}
      {tab === 'Balance sheet' && (
        <>
          <Table
            rows={balance}
            columns={[
              { key: 'name', label: 'Account', width: 310 },
              { key: 'type', label: 'Type' },
              {
                key: 'amount',
                label: 'Closing balance',
                width: 200,
                render: (a) =>
                  currency(
                    a.type === 'asset'
                      ? Number(a.debit) - Number(a.credit)
                      : Number(a.credit) - Number(a.debit),
                  ),
              },
            ]}
          />
          <Panel>
            <Text style={{ color: colors.textPrimary, lineHeight: 25 }}>
              Assets: {money(r.assets)}
              {'\n'}Liabilities: {money(r.liabilities)}
              {'\n'}Owner equity: {money(r.equity)}
              {'\n'}Accumulated earnings: {money(r.retained)}
            </Text>
            <Text style={[ui.title, { color: colors.primary }]}>
              Balance check:{' '}
              {money(r.assets - r.liabilities - r.equity - r.retained)}
            </Text>
          </Panel>
        </>
      )}
      {tab === 'Trial balance' && (
        <Table
          rows={r.trial}
          columns={[
            { key: 'code', label: 'Code', width: 80 },
            { key: 'name', label: 'Account', width: 280 },
            {
              key: 'debit',
              label: 'Cumulative debit',
              width: 180,
              render: (a) => currency(a.debit),
            },
            {
              key: 'credit',
              label: 'Cumulative credit',
              width: 180,
              render: (a) => currency(a.credit),
            },
          ]}
        />
      )}
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
      {tab === 'Cash flow' && (
        <>
          <CashChart report={r} />
          <Table
            rows={r.cashflow}
            columns={[
              { key: 'month', label: 'Month' },
              {
                key: 'inflow',
                label: 'Receipts',
                width: 200,
                render: (a) => currency(a.inflow),
              },
              {
                key: 'outflow',
                label: 'Payments',
                width: 200,
                render: (a) => currency(a.outflow),
              },
              {
                key: 'net',
                label: 'Net movement',
                width: 200,
                render: (a) => currency(Number(a.inflow) - Number(a.outflow)),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
