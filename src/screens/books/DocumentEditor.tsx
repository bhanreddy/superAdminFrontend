import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../api/books';
import { Action, FormRow, Dialog, Field, Select, Panel, Notice, ui } from './BooksUi';
const emptyLine = (): api.LineInput => ({
  description: '',
  quantity: '1',
  rate: '',
  discount: '0',
  tax_rate: '0',
});
export function documentInput(d: api.BookDocument): api.DocumentInput {
  return {
    kind: d.kind,
    contact_id: d.contact_id || '',
    date: d.date.slice(0, 10),
    due_date: d.due_date?.slice(0, 10) || '',
    reference: d.reference,
    notes: d.notes,
    subject: d.subject || '',
    salesperson: d.salesperson || '',
    terms: d.terms || '',
    discount_type: d.discount_type || 'amount',
    discount_value: api.decimal(d.discount_value),
    adjustment: api.decimal(d.adjustment),
    adjustment_description: d.adjustment_description || 'Adjustment',
    challan_type: d.challan_type || '',
    paid_account: d.paid_account || '1000',
    state_code: d.contact_snapshot.state_code,
    lines: d.lines.map((l) => ({
      item_id: l.item_id,
      description: l.description,
      hsn_sac: l.hsn_sac,
      quantity: String(l.quantity_milli / 1000),
      rate: api.decimal(l.rate),
      discount: api.decimal(l.discount),
      tax_rate: api.decimal(l.tax_rate),
    })),
  };
}
export default function DocumentEditor({
  kind,
  document,
  contacts,
  items,
  accounts,
  onClose,
  onSaved,
}: {
  kind: api.DocumentKind;
  document?: api.BookDocument;
  contacts: api.Contact[];
  items: api.Item[];
  accounts: api.Account[];
  onClose: () => void;
  onSaved: (d: api.BookDocument) => void;
}) {
  const { colors } = useTheme();
  const [form, setForm] = useState<api.DocumentInput>(() =>
    document
      ? documentInput(document)
      : {
          kind,
          contact_id: '',
          date: api.today(),
          due_date: '',
          reference: '',
          notes: '',
          subject: '',
          salesperson: '',
          terms: '',
          discount_type: 'amount',
          discount_value: '0',
          adjustment: '0',
          adjustment_description: 'Adjustment',
          challan_type: '',
          paid_account: '1000',
          state_code: '',
          lines: [emptyLine()],
        },
  );
  const [preview, setPreview] = useState<any>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (key: keyof api.DocumentInput, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setPreview(null);
  };
  const line = (index: number, patch: Partial<api.LineInput>) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));
    setPreview(null);
  };
  const sales = [
    'quote',
    'sales_order',
    'invoice',
    'credit_note',
    'delivery_challan',
  ].includes(kind);
  const options = contacts.filter(
    (c) =>
      c.active &&
      (c.kind === 'both' || c.kind === (sales ? 'customer' : 'vendor')),
  );
  async function save() {
    setBusy(true);
    setError('');
    try {
      const d = document
        ? await api.put<api.BookDocument>(`/documents/${document.id}`, form)
        : await api.post<api.BookDocument>('/documents', form);
      onSaved(d);
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    setBusy(true);
    setError('');
    try {
      setPreview(await api.post('/documents/preview', form));
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`${document ? 'Edit' : 'New'} ${api.singular[kind].toLowerCase()}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Action label="Cancel" secondary onPress={onClose} disabled={busy} />
          <Action
            label="Review totals"
            secondary
            onPress={review}
            disabled={busy}
          />
          <Action label="Save draft" onPress={save} disabled={busy} />
        </>
      }
    >
      {error && <Notice error text={error} />}
      <Notice text="Save a draft, review the document, then post it to update your accounts. Prices are tax exclusive. Line and document discounts apply before tax; the signed adjustment applies after tax." />
      <FormRow style={ui.wrap}>
        <Select
          label={sales ? 'Customer' : 'Vendor'}
          value={form.contact_id || ''}
          options={[
            ...(kind === 'expense' ? [{ value: '', label: 'No vendor' }] : []),
            ...options.map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(value) => {
            const c = contacts.find((c) => c.id === value);
            const d = new Date(form.date + 'T00:00:00Z');
            const validDate = !Number.isNaN(d.getTime());
            if (validDate)
              d.setUTCDate(d.getUTCDate() + (c?.payment_terms || 0));
            setForm((f) => ({
              ...f,
              contact_id: value,
              due_date:
                kind === 'delivery_challan'
                  ? ''
                  : validDate
                    ? d.toISOString().slice(0, 10)
                    : f.due_date,
            }));
            setPreview(null);
          }}
        />
        <Field
          label="Document date (YYYY-MM-DD)"
          value={form.date}
          onChange={(v) => set('date', v)}
        />
        {kind !== 'delivery_challan' && (
          <Field
            label="Due date (optional)"
            value={form.due_date}
            onChange={(v) => set('due_date', v)}
          />
        )}
      </FormRow>
      <FormRow style={ui.wrap}>
        <Field
          label="Reference"
          value={form.reference}
          onChange={(v) => set('reference', v)}
        />
        {kind === 'expense' && (
          <>
            <Select
              label="Paid through"
              value={form.paid_account || '1000'}
              options={accounts
                .filter((a) => a.is_cash)
                .map((a) => ({ value: a.code, label: a.name }))}
              onChange={(v) => set('paid_account', v)}
            />
            {!form.contact_id && (
              <Field
                label="Place of supply state code"
                value={form.state_code}
                onChange={(v) => set('state_code', v)}
              />
            )}
          </>
        )}
      </FormRow>
      <FormRow style={ui.wrap}>
        <Field
          label="Subject"
          value={form.subject}
          onChange={(v) => set('subject', v)}
        />
        {sales && (
          <Field
            label="Salesperson"
            value={form.salesperson}
            onChange={(v) => set('salesperson', v)}
          />
        )}
      </FormRow>
      {kind === 'delivery_challan' && (
        <>
          <Select
            label="Challan type"
            value={form.challan_type || ''}
            options={[
              { value: 'supply_of_liquid_gas', label: 'Supply of Liquid Gas' },
              { value: 'job_work', label: 'Job Work' },
              { value: 'supply_on_approval', label: 'Supply on Approval' },
              { value: 'others', label: 'Others' },
            ]}
            onChange={(v) => set('challan_type', v)}
          />
          <Notice text="A finalized challan records the delivery document. It does not post sales or move stock in SuperAdmin. Convert it to an invoice and post that invoice to update accounts and stock." />
        </>
      )}
      <Text style={[ui.title, { color: colors.textPrimary }]}>Line items</Text>
      {form.lines.map((l, index) => (
        <Panel key={index} style={{ padding: 16 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              ITEM {index + 1}
            </Text>
            {form.lines.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove item ${index + 1}`}
                onPress={() =>
                  set(
                    'lines',
                    form.lines.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 size={17} color="#c6465a" />
              </Pressable>
            )}
          </View>
          <FormRow style={ui.wrap}>
            <Select
              label={`Catalog item ${index + 1}`}
              value={l.item_id || ''}
              options={[
                { value: '', label: 'Custom line' },
                ...items
                  .filter((i) => i.active)
                  .map((i) => ({
                    value: i.id,
                    label: `${i.name}${i.sku ? ' · ' + i.sku : ''}`,
                  })),
              ]}
              onChange={(id) => {
                const item = items.find((i) => i.id === id);
                line(
                  index,
                  item
                    ? {
                        item_id: id,
                        description: item.name,
                        hsn_sac: item.hsn_sac,
                        rate: api.decimal(
                          sales ? item.sale_rate : item.purchase_rate,
                        ),
                        tax_rate: api.decimal(item.tax_rate),
                      }
                    : { item_id: null },
                );
              }}
            />
            <Field
              label={`Description ${index + 1}`}
              value={l.description}
              onChange={(v) => line(index, { description: v })}
            />
            <Field
              label={`HSN / SAC ${index + 1}`}
              value={l.hsn_sac}
              onChange={(v) => line(index, { hsn_sac: v })}
            />
          </FormRow>
          <FormRow style={ui.wrap}>
            <Field
              label={`Quantity ${index + 1}`}
              value={l.quantity}
              onChange={(v) => line(index, { quantity: v })}
            />
            <Field
              label={`Rate ₹ ${index + 1}`}
              value={l.rate}
              onChange={(v) => line(index, { rate: v })}
            />
            <Field
              label={`Discount ₹ ${index + 1}`}
              value={l.discount}
              onChange={(v) => line(index, { discount: v })}
            />
            <Field
              label={`Tax % ${index + 1}`}
              value={l.tax_rate}
              onChange={(v) => line(index, { tax_rate: v })}
            />
          </FormRow>
        </Panel>
      ))}
      <View style={ui.row}>
        <Action
          label="Add line item"
          secondary
          icon={<Plus size={15} color={colors.primary} />}
          onPress={() => set('lines', [...form.lines, emptyLine()])}
          disabled={form.lines.length >= 100}
        />
      </View>
      <FormRow style={ui.wrap}>
        <Select
          label="Document discount type"
          value={form.discount_type || 'amount'}
          options={[
            { value: 'amount', label: 'Amount ₹' },
            { value: 'percent', label: 'Percentage %' },
          ]}
          onChange={(v) => set('discount_type', v)}
        />
        <Field
          label={
            form.discount_type === 'percent'
              ? 'Document discount %'
              : 'Document discount ₹'
          }
          value={form.discount_value}
          onChange={(v) => set('discount_value', v)}
        />
        <Field
          label="Adjustment description"
          value={form.adjustment_description}
          onChange={(v) => set('adjustment_description', v)}
        />
        <Field
          label="Adjustment ₹ (signed)"
          value={form.adjustment}
          onChange={(v) => set('adjustment', v)}
        />
      </FormRow>
      {preview && (
        <Panel>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: colors.textSecondary }}>
              Document discount
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {api.money(preview.discount_total)}
            </Text>
          </View>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: colors.textSecondary }}>
              {form.adjustment_description || 'Adjustment'}
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {api.money(preview.adjustment)}
            </Text>
          </View>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: colors.textSecondary }}>Subtotal</Text>
            <Text style={{ color: colors.textPrimary }}>
              {api.money(preview.subtotal)}
            </Text>
          </View>
          {Object.entries(preview.tax_breakup).map(([k, v]) => (
            <View key={k} style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text
                style={{
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                }}
              >
                {k}
              </Text>
              <Text style={{ color: colors.textPrimary }}>{api.money(v)}</Text>
            </View>
          ))}
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={[ui.title, { color: colors.textPrimary }]}>Total</Text>
            <Text style={[ui.title, { color: colors.primary }]}>
              {api.money(preview.total)}
            </Text>
          </View>
        </Panel>
      )}
      <Field
        label="Customer / vendor notes"
        value={form.notes}
        onChange={(v) => set('notes', v)}
        multiline
      />
      <Field
        label="Terms & Conditions"
        value={form.terms}
        onChange={(v) => set('terms', v)}
        multiline
      />
    </Dialog>
  );
}
