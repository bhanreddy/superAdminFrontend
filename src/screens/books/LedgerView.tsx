import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as api from '../../api/books';
import { useTheme } from '../../contexts/ThemeContext';
import { Action, Dialog, Notice, Panel, Select, Table, ui } from './BooksUi';
import { saveCsv } from './export';
export default function LedgerView({ account, dates, canExport, canManage = false, onChanged, onClose }: {
  account: Pick<api.Account, 'code' | 'name'>; dates: { from: string; to: string }; canExport: boolean; canManage?: boolean; onChanged?: () => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const [page, setPage] = useState(1), [version, retry] = useState(0);
  const [report, setReport] = useState<api.LedgerReport | null>(null);
  const [busy, setBusy] = useState(false), [exporting, setExporting] = useState(false), [error, setError] = useState('');
  const [classification, setClassification] = useState('');
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current; setBusy(true); setError(''); setReport(null);
    api.get<api.LedgerReport>(`/accounts/${encodeURIComponent(account.code)}/ledger`, { ...dates, page })
      .then(r => { if (id === request.current) { setReport(r); setClassification(r.account.cash_flow_activity || ''); } })
      .catch(e => { if (id === request.current) setError(api.message(e)); })
      .finally(() => { if (id === request.current) setBusy(false); });
    return () => { request.current++; };
  }, [account.code, dates.from, dates.to, page, version]);
  async function saveClassification() {
    setSaving(true); setError('');
    try {
      await api.put(`/accounts/${encodeURIComponent(account.code)}/reporting`, { cash_flow_activity: classification || null });
      retry(n => n + 1); onChanged?.();
    } catch (e) { setError(api.message(e)); }
    finally { setSaving(false); }
  }
  const value = (v: unknown) => <Text style={{ color: colors.textPrimary }}>{api.money(v)}</Text>;
  async function exportLedger() {
    setExporting(true); setError('');
    try {
      const rows: Record<string, unknown>[] = [];
      let first: api.LedgerReport | null = null;
      for (let p = 1; ; p++) {
        const r = await api.get<api.LedgerReport>(`/accounts/${encodeURIComponent(account.code)}/ledger`, { ...dates, page: p, page_size: 500 });
        first ||= r;
        // Do not silently export page sets changed by a concurrent posting.
        if (r.total !== first.total || r.opening_balance !== first.opening_balance || r.period_debit !== first.period_debit || r.period_credit !== first.period_credit)
          throw new Error('Ledger changed during export. Retry the export.');
        rows.push(...r.data.map(l => ({ organization: r.organization_name, currency: r.currency, account: account.code, name: account.name, from: dates.from, to: dates.to,
          date: l.date, reference: l.reference, source: l.source, journal_id: l.journal_id, notes: l.notes,
          debit_inr: api.decimal(l.debit), credit_inr: api.decimal(l.credit), balance_inr: api.decimal(l.running_balance) })));
        if (p * r.page_size >= r.total) break;
      }
      await saveCsv([
        { organization: first!.organization_name, currency: first!.currency, account: account.code, name: account.name, from: dates.from, to: dates.to, reference: 'Opening balance', balance_inr: api.decimal(first!.opening_balance) },
        ...rows,
        { organization: first!.organization_name, currency: first!.currency, account: account.code, reference: 'Closing balance', debit_inr: api.decimal(first!.period_debit), credit_inr: api.decimal(first!.period_credit), balance_inr: api.decimal(first!.closing_balance) },
      ], `books-ledger-${account.code}-${dates.from}-${dates.to}.csv`);
    } catch (e) { setError(api.message(e)); }
    finally { setExporting(false); }
  }
  return <Dialog title={`${account.code} · ${account.name}`} onClose={onClose}>
    <Notice text={`${dates.from} to ${dates.to} · INR · Balances use debit minus credit; credit balances are negative.`} />
    {error ? <><Notice error text={error} /><Action label="Retry ledger" secondary disabled={busy} onPress={() => retry(n => n + 1)} /></> : null}
    {busy ? <Notice text="Loading ledger…" /> : report && <>
      <Panel>
        <Text style={{ color: colors.textPrimary, lineHeight: 26 }}>Opening balance: {api.money(report.opening_balance)}{'\n'}Period debits: {api.money(report.period_debit)}{'\n'}Period credits: {api.money(report.period_credit)}{'\n'}Closing balance: {api.money(report.closing_balance)}</Text>
      </Panel>
      <Table rows={report.data} columns={[
        { key: 'date', label: 'Date', width: 110 }, { key: 'reference', label: 'Reference', width: 260 },
        { key: 'source', label: 'Source', width: 140 }, { key: 'notes', label: 'Notes', width: 220 },
        { key: 'debit', label: 'Debit', width: 150, render: r => value(r.debit) },
        { key: 'credit', label: 'Credit', width: 150, render: r => value(r.credit) },
        { key: 'running_balance', label: 'Running balance', width: 180, render: r => value(r.running_balance) },
      ]} />
      <View style={ui.row}>
        <Action label="Previous ledger page" secondary disabled={page <= 1} onPress={() => setPage(p => p - 1)} />
        <Text style={{ color: colors.textSecondary }}>Page {page} of {Math.max(1, Math.ceil(report.total / report.page_size))} · {report.total} entries</Text>
        <Action label="Next ledger page" secondary disabled={page * report.page_size >= report.total} onPress={() => setPage(p => p + 1)} />
      </View>
    </>}
    {canManage && report && !report.account.is_cash && <Panel>
      <Notice text="Account classification applies to all reporting periods. Changes are recorded in the Books activity log. Mixed journals can specify their own activity when posted." />
      <Select label="Account cash flow activity" value={classification} onChange={setClassification}
        options={[{ value: '', label: 'Unclassified / review required' }, ...['operating', 'investing', 'financing'].map(value => ({ value, label: value }))]} />
      <Action label="Save cash flow classification" secondary disabled={saving || busy || classification === (report.account.cash_flow_activity || '')} onPress={() => void saveClassification()} />
    </Panel>}
    {canExport && <Action label="Export full ledger" secondary disabled={exporting || busy} onPress={() => void exportLedger()} />}
  </Dialog>;
}
