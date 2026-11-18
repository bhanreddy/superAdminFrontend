import { Platform } from 'react-native';
import type { Report } from '../../api/books';
import { decimal } from '../../api/books';
import { toCsv } from './csv';
export async function saveCsv(rows: Record<string, unknown>[], filename: string) {
  return saveCsvText(toCsv(rows), filename);
}
export async function saveCsvText(csv: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const content = csv.startsWith('\uFEFF') ? csv : '\uFEFF' + csv;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    try {
      const a = document.createElement('a'); a.href = url; a.download = safeName;
      document.body.appendChild(a);
      try { a.click(); } finally { a.remove(); }
    } finally {
      // Give the browser time to consume the URL before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } else {
    const FileSystem: typeof import('expo-file-system') = require('expo-file-system');
    const Sharing: typeof import('expo-sharing') = require('expo-sharing');
    if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
      throw new Error('File sharing is unavailable on this device. Use Books in a browser to download the CSV.');
    const directory = `${FileSystem.cacheDirectory}books-export-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    try {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const uri = directory + safeName;
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Save or share Books CSV' });
    } finally { await FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => {}); }
  }
}
export function reportRows(r: Report, tab: string): Record<string, unknown>[] {
  const context = { organization: r.organization_name, report: tab, from: r.from, to: r.to, basis: tab === 'Cash flow' ? 'Cash · direct method' : 'Accrual', currency: 'INR' };
  const amount = (section: string, name: string, value: unknown, code = '') => ({ ...context, section, code, name, amount_inr: decimal(value) });
  if (tab === 'Profit & loss') return [
    ...r.profit_loss.income.map(a => amount('Income', a.name, a.amount, a.code)),
    amount('Total', 'Total income', r.income),
    ...r.profit_loss.expenses.map(a => amount('Expenses', a.name, a.amount, a.code)),
    amount('Total', 'Total expenses', r.expenses), amount('Total', 'Net profit / loss', r.profit),
  ];
  if (tab === 'Balance sheet') {
    const b = r.balance_sheet;
    return [...b.assets.map(a => amount('Assets', a.name, a.amount, a.code)), amount('Total', 'Total assets', b.total_assets),
      ...b.liabilities.map(a => amount('Liabilities', a.name, a.amount, a.code)), amount('Total', 'Total liabilities', b.total_liabilities),
      ...b.equity.map(a => amount('Equity', a.name, a.amount, a.code)), amount('Equity', 'Earnings before period', b.prior_earnings),
      amount('Equity', 'Period earnings', b.period_earnings), amount('Total', 'Total equity', b.total_equity),
      amount('Total', 'Liabilities and equity', b.liabilities_and_equity), amount('Check', 'Balance difference', b.difference)];
  }
  if (tab === 'Cash flow') return [amount('Cash', 'Opening cash', r.cash_flow.opening_cash),
    ...r.cash_flow.activities.map(a => ({ ...context, basis: 'Cash · direct method', section: a.activity, inflow_inr: decimal(a.inflow), outflow_inr: decimal(a.outflow), net_inr: decimal(a.net), journal_count: a.journal_count })),
    amount('Cash', 'Net change', r.cash_flow.net_change), amount('Cash', 'Closing cash', r.cash_flow.closing_cash), amount('Check', 'Cash difference', r.cash_flow.difference)];
  if (tab === 'Trial balance' || tab === 'Ledger accounts') return r.trial.map(a => ({ ...context, code: a.code, name: a.name, type: a.type,
    opening_inr: decimal(a.opening_balance), debit_inr: decimal(a.period_debit), credit_inr: decimal(a.period_credit), closing_inr: decimal(a.balance) }));
  if (tab === 'Tax summary') return r.taxes.map(a => ({ ...context, kind: a.kind, taxable_inr: decimal(a.taxable), cgst_inr: decimal(a.cgst), sgst_inr: decimal(a.sgst), igst_inr: decimal(a.igst) }));
  return r.aging.filter(a => a.kind === (tab === 'Receivables' ? 'invoice' : 'bill')).map(a => ({ ...context, as_of: r.aging_as_of, number: a.number, contact: a.contact_name, due_date: a.due_date, bucket: a.bucket, outstanding_inr: decimal(a.balance) }));
}
