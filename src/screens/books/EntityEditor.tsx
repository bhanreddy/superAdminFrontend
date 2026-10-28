import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useBooksAccess as useAuth } from './BooksCompanyContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../api/books';
import { Action, FormRow, Dialog, Field, Select, Toggle, Notice, ui } from './BooksUi';
import { parseStatement } from './csv';
export type EntityType =
  | 'contact'
  | 'item'
  | 'account'
  | 'project'
  | 'time'
  | 'settings'
  | 'stock'
  | 'bank'
  | 'recurring'
  | 'payment'
  | 'credit'
  | 'match';
interface Props {
  type: EntityType;
  initial?: any;
  contacts: api.Contact[];
  items: api.Item[];
  accounts: api.Account[];
  projects: any[];
  payments: api.Payment[];
  document?: api.BookDocument;
  onClose: () => void;
  onSaved: () => void;
}
const titles: Record<EntityType, string> = {
  contact: 'Contact',
  item: 'Item',
  account: 'Account',
  project: 'Project',
  time: 'Time entry',
  settings: 'Organization settings',
  stock: 'Stock adjustment',
  bank: 'Import bank statement',
  recurring: 'Recurring transaction',
  payment: 'Record payment',
  credit: 'Apply credit',
  match: 'Match bank transaction',
};
export default function EntityEditor(p: Props) {
  const { colors } = useTheme();
  const { can } = useAuth();
  const [form, setForm] = useState<any>(() => {
    const base = {
      date: api.today(),
      name: '',
      kind: 'customer',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      state_code: '',
      payment_terms: '30',
      sale_rate: '0',
      purchase_rate: '0',
      tax_rate: '0',
      unit: 'unit',
      hsn_sac: '',
      sku: '',
      track_inventory: false,
      code: '',
      type: 'asset',
      is_cash: false,
      contact_id: '',
      budget: '0',
      hourly_rate: '0',
      project_id: '',
      minutes: '60',
      description: '',
      billable: true,
      quantity: '',
      reason: '',
      account_code: '1010',
      csv: '',
      template_id: p.document?.id || '',
      interval_months: '1',
      next_date: api.today(),
      amount: api.decimal(p.document?.balance),
      method: 'bank_transfer',
      reference: '',
      request_key: api.requestKey(),
      document_id: p.document?.id || '',
      payment_kind: p.document?.kind === 'bill' || (!can('books.invoice.view') && can('books.bill.view')) ? 'bill' : 'invoice',
      credit_id: '',
      payment_id: '',
      organization_name: '',
      fiscal_year_month: '4',
      active: true,
    };
    if (p.type === 'item' && p.initial)
      return {
        ...base,
        ...p.initial,
        sale_rate: api.decimal(p.initial.sale_rate),
        purchase_rate: api.decimal(p.initial.purchase_rate),
        tax_rate: api.decimal(p.initial.tax_rate),
      };
    return { ...base, ...p.initial };
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [creditOptions, setCreditOptions] = useState<api.BookDocument[]>([]);
  React.useEffect(() => {
    if (p.type === 'credit' && p.document) {
      api
        .get<{ data: api.BookDocument[] }>('/documents', {
          kind: p.document.kind === 'invoice' ? 'credit_note' : 'vendor_credit',
          contact_id: p.document.contact_id,
          status: 'unpaid',
        })
        .then((r) =>
          setCreditOptions(
            r.data.filter((d) => d.contact_id === p.document?.contact_id),
          ),
        )
        .catch((e) => setError(api.message(e)));
    }
  }, []);
  const [paymentOptions, setPaymentOptions] = useState<api.BookDocument[]>([]);
  React.useEffect(() => {
    if (p.type !== 'payment' || p.document) return;
    let active = true;
    api
      .get<{ data: api.BookDocument[] }>('/documents', {
        kind: form.payment_kind,
        status: 'unpaid',
        page: 1,
      })
      .then((r) => {
        if (active) setPaymentOptions(r.data);
      })
      .catch((e) => {
        if (active) setError(api.message(e));
      });
    return () => {
      active = false;
    };
  }, [p.type, p.document, form.payment_kind]);
  const paymentDocument =
    p.document || paymentOptions.find((d) => d.id === form.document_id);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const field = (k: string, label: string, multiline = false) => (
    <Field
      key={k}
      label={label}
      value={form[k]}
      onChange={(v) => set(k, v)}
      multiline={multiline}
    />
  );
  const select = (
    k: string,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <Select
      key={k}
      label={label}
      value={String(form[k] ?? '')}
      options={options}
      onChange={(v) => set(k, v)}
    />
  );
  const contactOptions = p.contacts
    .filter((c) => c.active && c.kind !== 'vendor')
    .map((c) => ({ value: c.id, label: c.name }));
  const cash = p.accounts
    .filter((a) => a.is_cash)
    .map((a) => ({ value: a.code, label: a.name }));
  async function save() {
    setBusy(true);
    setError('');
    try {
      const paths: Partial<Record<EntityType, string>> = {
        contact: '/contacts',
        item: '/items',
        account: '/accounts',
        project: '/projects',
        time: '/time-entries',
        recurring: '/recurring',
        payment: '/payments',
        credit: '/credits',
      };
      if (p.type === 'settings') await api.put('/settings', form);
      else if (p.type === 'stock')
        await api.post(`/items/${p.initial.id}/adjust`, form);
      else if (p.type === 'bank')
        await api.post('/bank-transactions/import', {
          account_code: form.account_code,
          rows: parseStatement(form.csv),
        });
      else if (p.type === 'match')
        await api.put(`/bank-transactions/${p.initial.id}/match`, {
          payment_id: form.payment_id || null,
        });
      else {
        const path = paths[p.type]!;
        if (['contact', 'item'].includes(p.type) && p.initial?.id)
          await api.put(`${path}/${p.initial.id}`, form);
        else await api.post(path, form);
      }
      p.onSaved();
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={titles[p.type]}
      onClose={p.onClose}
      busy={busy}
      footer={
        <>
          <Action
            secondary
            label="Cancel"
            onPress={p.onClose}
            disabled={busy}
          />
          <Action
            label={
              p.type === 'bank'
                ? 'Import statement'
                : p.type === 'payment'
                  ? 'Record payment'
                  : 'Save'
            }
            onPress={save}
            disabled={busy}
          />
        </>
      }
    >
      {error && <Notice error text={error} />}
      {p.type === 'contact' && (
        <>
          <FormRow style={ui.wrap}>
            {select('kind', 'Contact type', [
              { value: 'customer', label: 'Customer' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'both', label: 'Customer & vendor' },
            ])}
            {field('name', 'Display / legal name')}
          </FormRow>
          <FormRow style={ui.wrap}>
            {field('email', 'Email')}
            {field('phone', 'Phone')}
          </FormRow>
          <FormRow style={ui.wrap}>
            {field('gstin', 'GSTIN (optional)')}
            {field('state_code', 'State code (2 digits)')}
            {field('payment_terms', 'Payment terms (days)')}
          </FormRow>
          {field('address', 'Billing address', true)}
          {p.initial?.id && (
            <Toggle
              label="Active contact"
              value={form.active}
              onChange={(v) => set('active', v)}
            />
          )}
        </>
      )}
      {p.type === 'item' && (
        <>
          <FormRow style={ui.wrap}>
            {field('name', 'Item / service name')}
            {field('sku', 'SKU')}
            {field('unit', 'Unit')}
          </FormRow>
          <FormRow style={ui.wrap}>
            {field('sale_rate', 'Selling price ₹')}
            {field('purchase_rate', 'Standard purchase cost ₹')}
            {field('tax_rate', 'Tax %')}
            {field('hsn_sac', 'HSN / SAC')}
          </FormRow>
          {!p.initial?.id && (
            <Toggle
              label="Track stock for this item"
              value={form.track_inventory}
              onChange={(v) => set('track_inventory', v)}
            />
          )}
          <Notice text="Inventory issues use the item’s standard purchase cost. Bills receive stock at standard cost; differences from line cost post to purchase price variance. Standard cost is fixed after the first stock movement. Add opening stock through a stock adjustment; new items start at zero." />
          {p.initial?.id && (
            <Toggle
              label="Active item"
              value={form.active}
              onChange={(v) => set('active', v)}
            />
          )}
        </>
      )}
      {p.type === 'account' && (
        <>
          <FormRow style={ui.wrap}>
            {field('code', 'Unique account code (4–8 digits)')}
            {field('name', 'Account name')}
            {select(
              'type',
              'Account type',
              ['asset', 'liability', 'equity', 'income', 'expense'].map(
                (value) => ({ value, label: value }),
              ),
            )}
          </FormRow>
          <Toggle
            label="Cash / bank account"
            value={form.is_cash}
            onChange={(v) => set('is_cash', v)}
          />
        </>
      )}
      {p.type === 'project' && (
        <>
          <FormRow style={ui.wrap}>
            {field('name', 'Project name')}
            {select('contact_id', 'Customer', contactOptions)}
          </FormRow>
          <FormRow style={ui.wrap}>
            {field('budget', 'Budget ₹')}
            {field('hourly_rate', 'Hourly rate ₹')}
          </FormRow>
        </>
      )}
      {p.type === 'time' && (
        <>
          <FormRow style={ui.wrap}>
            {select(
              'project_id',
              'Project',
              p.projects.map((v) => ({ value: v.id, label: v.name })),
            )}
            {field('date', 'Date (YYYY-MM-DD)')}
            {field('minutes', 'Minutes')}
          </FormRow>
          {field('description', 'Work description', true)}
          <Toggle
            label="Billable"
            value={form.billable}
            onChange={(v) => set('billable', v)}
          />
        </>
      )}
      {p.type === 'settings' && (
        <>
          {field('organization_name', 'Organization / legal name')}
          {field('address', 'Address', true)}
          <FormRow style={ui.wrap}>
            {field('gstin', 'GSTIN (optional)')}
            {field('state_code', 'State code (2 digits)')}
            {select(
              'fiscal_year_month',
              'Financial year starts',
              Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: new Date(2026, i, 1).toLocaleDateString('en-IN', {
                  month: 'long',
                }),
              })),
            )}
          </FormRow>
          <Notice text="Currency: INR. These settings are captured on new documents. Existing posted documents keep their original organization details." />
        </>
      )}
      {p.type === 'stock' && (
        <>
          <Notice
            text={`Current stock: ${Number(p.initial.stock_milli) / 1000} ${p.initial.unit}. Adjustments post inventory against owner equity at standard cost.`}
          />
          <FormRow style={ui.wrap}>
            {field('date', 'Date (YYYY-MM-DD)')}
            {field('quantity', 'Quantity adjustment (+ receipt / − issue)')}
          </FormRow>
          {field('reason', 'Reason', true)}
        </>
      )}
      {p.type === 'bank' && (
        <>
          {select('account_code', 'Statement account', cash)}
          <Notice
            text={
              'Paste CSV with headers: date,description,amount,reference,external_key. Use YYYY-MM-DD dates, positive deposits and negative withdrawals. external_key must be the bank’s unique transaction ID. Imports do not create accounting entries; match them to recorded payments.'
            }
          />
          <Action
            label="Choose CSV file"
            secondary
            onPress={() => {
              void (async () => {
                try {
                  const picked = await DocumentPicker.getDocumentAsync({
                    type: [
                      'text/csv',
                      'text/comma-separated-values',
                      'text/plain',
                    ],
                    copyToCacheDirectory: true,
                  });
                  if (picked.canceled) return;
                  const asset = picked.assets[0];
                  if ((asset.size || 0) > 2097152)
                    throw new Error('Choose a CSV up to 2 MiB.');
                  const contents = asset.file
                    ? await asset.file.text()
                    : await FileSystem.readAsStringAsync(asset.uri);
                  set('csv', contents);
                } catch (e) {
                  setError(api.message(e));
                }
              })();
            }}
          />
          {field('csv', 'Statement CSV', true)}
        </>
      )}
      {p.type === 'payment' && (
        <>
          {!p.document && (
            <>
              <Select
                label="Payment direction"
                value={form.payment_kind}
                options={[
                  { value: 'invoice', label: 'Payment received from customer' },
                  { value: 'bill', label: 'Payment made to vendor' },
                ].filter(o => can(`books.${o.value}.view`))}
                onChange={(v) =>
                  setForm((f: any) => ({
                    ...f,
                    payment_kind: v,
                    document_id: '',
                    amount: '0',
                    request_key: api.requestKey(),
                  }))
                }
              />
              <Select
                label="Outstanding document"
                value={form.document_id}
                options={paymentOptions.map((d) => ({
                  value: d.id,
                  label: `${d.number} · ${d.contact_snapshot.name} · ${api.money(d.balance)}`,
                }))}
                onChange={(v) => {
                  const d = paymentOptions.find((d) => d.id === v);
                  setForm((f: any) => ({
                    ...f,
                    document_id: v,
                    amount: api.decimal(d?.balance),
                    request_key: api.requestKey(),
                  }));
                }}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                The first 50 outstanding documents are listed. You can also
                record a payment directly from any invoice or bill.
              </Text>
            </>
          )}

          <Notice
            text={`${paymentDocument?.number || 'Select an outstanding document'} · Outstanding ${api.money(paymentDocument?.balance)}. This records a payment in your books; it does not transfer funds.`}
          />
          <FormRow style={ui.wrap}>
            {field('amount', 'Amount ₹')}
            {field('date', 'Payment date (YYYY-MM-DD)')}
            {select('account_code', 'Cash / bank account', cash)}
          </FormRow>
          <FormRow style={ui.wrap}>
            {select(
              'method',
              'Payment method',
              ['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other'].map(
                (value) => ({ value, label: value.replaceAll('_', ' ') }),
              ),
            )}
            {field('reference', 'Payment reference')}
          </FormRow>
        </>
      )}
      {p.type === 'credit' && (
        <>
          <Notice
            text={`Apply an existing posted credit to ${p.document?.number}. Only credits for the same contact can be used.`}
          />
          {select(
            'credit_id',
            'Available credit',
            creditOptions.map((c) => ({
              value: c.id,
              label: `${c.number} · ${api.money(c.balance)} available`,
            })),
          )}
          {field('amount', 'Credit amount ₹')}
        </>
      )}
      {p.type === 'recurring' && (
        <>
          <Notice
            text={`Template: ${p.document?.number}. Due transactions are generated as drafts when you choose “Generate due drafts” in Recurring. Review and post each draft separately.`}
          />
          <FormRow style={ui.wrap}>
            {select('interval_months', 'Repeat every', [
              { value: '1', label: 'Month' },
              { value: '3', label: 'Quarter' },
              { value: '6', label: 'Six months' },
              { value: '12', label: 'Year' },
            ])}
            {field('next_date', 'Next date (YYYY-MM-DD)')}
          </FormRow>
        </>
      )}
      {p.type === 'match' && (
        <>
          <Notice
            text={`${p.initial.description} · ${api.money(p.initial.amount)}. Select a recorded payment with the same account, direction and amount.`}
          />
          {select(
            'payment_id',
            'Payment',
            p.payments
              .filter(
                (pay) =>
                  pay.status === 'posted' &&
                  pay.account_code === p.initial.account_code &&
                  Number(p.initial.amount) ===
                    (pay.kind === 'invoice' ? 1 : -1) * Number(pay.amount),
              )
              .map((pay) => ({
                value: pay.id,
                label: `${pay.number} · ${api.money(pay.amount)} · ${pay.reference || pay.date.slice(0, 10)}`,
              })),
          )}
        </>
      )}
    </Dialog>
  );
}
export function JournalEditor({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: api.Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: api.today(),
    reference: '',
    notes: '',
    lines: [
      { account_code: '1000', debit: '', credit: '' },
      { account_code: '3000', debit: '', credit: '' },
    ],
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError('');
    try {
      await api.post('/journals', form);
      onSaved();
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Manual journal"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Action label="Cancel" secondary onPress={onClose} disabled={busy} />
          <Action label="Post journal" onPress={save} disabled={busy} />
        </>
      }
    >
      {error && <Notice error text={error} />}
      <Notice text="Debits must equal credits. Posting creates an immutable journal. Use an opposite journal to correct it. Use the sales and purchases screens for customer/vendor balances and inventory quantities." />
      <FormRow style={ui.wrap}>
        <Field
          label="Journal date (YYYY-MM-DD)"
          value={form.date}
          onChange={(v) => setForm((f) => ({ ...f, date: v }))}
        />
        <Field
          label="Reference"
          value={form.reference}
          onChange={(v) => setForm((f) => ({ ...f, reference: v }))}
        />
      </FormRow>
      {form.lines.map((l, i) => (
        <FormRow key={i} style={ui.wrap}>
          <Select
            label={`Account ${i + 1}`}
            value={l.account_code}
            options={accounts.map((a) => ({
              value: a.code,
              label: `${a.code} · ${a.name}`,
            }))}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                lines: f.lines.map((x, j) =>
                  i === j ? { ...x, account_code: v } : x,
                ),
              }))
            }
          />
          {form.lines.length > 2 && (
            <Action
              label={`Remove journal line ${i + 1}`}
              secondary
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  lines: f.lines.filter((_, j) => j !== i),
                }))
              }
            />
          )}
          {(['debit', 'credit'] as const).map((k) => (
            <Field
              key={k}
              label={`${k === 'debit' ? 'Debit' : 'Credit'} ₹ ${i + 1}`}
              value={l[k]}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  lines: f.lines.map((x, j) =>
                    i === j ? { ...x, [k]: v } : x,
                  ),
                }))
              }
            />
          ))}
        </FormRow>
      ))}
      <Action
        secondary
        label="Add journal line"
        onPress={() =>
          setForm((f) => ({
            ...f,
            lines: [...f.lines, { account_code: '', debit: '', credit: '' }],
          }))
        }
      />
      <Field
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
        multiline
      />
    </Dialog>
  );
}
