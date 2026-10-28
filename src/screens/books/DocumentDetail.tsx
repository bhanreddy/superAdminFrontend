import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBooksAccess as useAuth } from './BooksCompanyContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../api/books';
import { Action, Dialog, Panel, Table, Badge, Notice, ui } from './BooksUi';
import { EntityType } from './EntityEditor';
import AttachmentsPanel from './AttachmentsPanel';
export default function DocumentDetail({
  document: d,
  onClose,
  onRefresh,
  onEdit,
  onEntity,
  onConverted,
}: {
  document: api.BookDocument;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onEdit: () => void;
  onEntity: (type: EntityType) => void;
  onConverted: (d: api.BookDocument) => void;
}) {
  const { colors } = useTheme();
  const { can } = useAuth();
  const allowed = (module: string, action = 'view') => can(`books.${module}.${action}`);
  const creditKind = d.kind === 'invoice' ? 'credit_note' : 'vendor_credit';
  const convertKind = d.kind === 'purchase_order' ? 'bill' : 'invoice';
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<{
      label: string;
      description: string;
      run: () => Promise<any>;
    } | null>(null);
  async function run(fn: () => Promise<any>, refresh = true) {
    setBusy(true);
    setError('');
    try {
      await fn();
      if (refresh) await onRefresh();
      setConfirm(null);
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  async function print() {
    let win: Window | null = null;
    setBusy(true);
    setError('');
    try {
      if (Platform.OS === 'web') {
        win = window.open('', '_blank');
        if (!win) throw new Error('Allow popups to print this document.');
        win.opener = null;
      }
      const html = await api.printHtml(d.id);
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      } else {
        const path = `${FileSystem.cacheDirectory}${d.number.replaceAll('/', '-')}.html`;
        await FileSystem.writeAsStringAsync(path, html);
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(path, { mimeType: 'text/html' });
        else throw new Error('Document sharing is unavailable on this device.');
      }
    } catch (e) {
      win?.close();
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  const financial = [
    'invoice',
    'bill',
    'credit_note',
    'vendor_credit',
  ].includes(d.kind);
  return (
    <Dialog
      title={d.number}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Action label="Close" secondary onPress={onClose} disabled={busy} />
          {allowed('data', 'export') && <Action
            label="Print / save PDF"
            secondary
            onPress={print}
            disabled={busy}
          />}
        </>
      }
    >
      {error && <Notice error text={error} />}
      {confirm ? (
        <Panel>
          <Text style={[ui.title, { color: colors.textPrimary }]}>
            {confirm.label}
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            {confirm.description}
          </Text>
          <View style={ui.row}>
            <Action
              label="Keep document"
              secondary
              onPress={() => setConfirm(null)}
              disabled={busy}
            />
            <Action
              label={confirm.label}
              danger={confirm.label.toLowerCase().includes('void')}
              onPress={() => run(confirm.run)}
              disabled={busy}
            />
          </View>
        </Panel>
      ) : (
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Badge value={d.status} />
          {d.status === 'draft' && (
            <>
              {allowed(d.kind, 'manage') && <Action label="Edit draft" secondary onPress={onEdit} />}
              <Action
                label="Post document"
                disabled={!allowed(d.kind, 'post')}
                onPress={() =>
                  setConfirm({
                    label: 'Post document',
                    description: [
                      'quote',
                      'sales_order',
                      'purchase_order',
                      'delivery_challan',
                    ].includes(d.kind)
                      ? 'Finalize this document so it can be converted. This does not post a ledger entry.'
                      : 'Post this document to the ledger and update stock where applicable. Posted documents keep their original amounts and contact details.',
                    run: () => api.post(`/documents/${d.id}/post`),
                  })
                }
              />
            </>
          )}
          {d.status === 'posted' &&
            ['invoice', 'bill'].includes(d.kind) &&
            Number(d.balance) > 0 && (
              <>
                <Action
                  label="Record payment"
                  disabled={!allowed('payments', 'record')}
                  onPress={() => onEntity('payment')}
                />
                <Action
                  label="Apply credit"
                  disabled={!allowed(d.kind, 'manage') || !allowed(creditKind)}
                  secondary
                  onPress={() => onEntity('credit')}
                />
              </>
            )}
          {d.status === 'posted' &&
            [
              'quote',
              'sales_order',
              'purchase_order',
              'delivery_challan',
            ].includes(d.kind) && (
              <Action
                disabled={!allowed(convertKind, 'manage')}
                label={
                  d.kind === 'purchase_order'
                    ? 'Convert to bill'
                    : 'Convert to invoice'
                }
                onPress={() =>
                  run(
                    async () =>
                      onConverted(await api.post(`/documents/${d.id}/convert`)),
                    false,
                  )
                }
              />
            )}
          {d.status === 'posted' &&
            ['invoice', 'bill', 'expense'].includes(d.kind) && (
              <Action
                label="Make recurring"
                disabled={!allowed('recurring', 'manage')}
                secondary
                onPress={() => onEntity('recurring')}
              />
            )}
          {d.status !== 'void' && (
            <Action
              label="Void document"
              disabled={!allowed(d.kind, 'void')}
              secondary
              onPress={() =>
                setConfirm({
                  label: 'Void document',
                  description:
                    'Void this document and append reversing entries to the ledger. Allocated payments and credits must be removed first.',
                  run: () => api.post(`/documents/${d.id}/void`),
                })
              }
            />
          )}
        </View>
      )}
      <View style={ui.wrap}>
        <Panel style={{ flex: 1, minWidth: 220 }}>
          <Text style={[ui.label, { color: colors.textSecondary }]}>
            {api.singular[d.kind].toUpperCase()}
          </Text>
          <Text style={[ui.title, { color: colors.textPrimary }]}>
            {d.contact_snapshot.name}
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
            {d.contact_snapshot.address || 'No address supplied'}
            {d.contact_snapshot.gstin
              ? `\nGSTIN: ${d.contact_snapshot.gstin}`
              : ''}
          </Text>
        </Panel>
        <Panel style={{ flex: 1, minWidth: 220 }}>
          <Text style={{ color: colors.textSecondary }}>
            Date: {d.date.slice(0, 10)}
            {d.kind !== 'delivery_challan' && d.due_date
              ? `\nDue: ${d.due_date.slice(0, 10)}`
              : ''}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Reference: {d.reference || '—'}
          </Text>
          {financial && (
            <Text style={[ui.title, { color: colors.primary }]}>
              Balance {api.money(d.balance)}
            </Text>
          )}
        </Panel>
      </View>
      {(d.subject || d.salesperson || d.challan_type) && (
        <Panel>
          {d.subject && (
            <Text style={{ color: colors.textPrimary }}>
              Subject: {d.subject}
            </Text>
          )}
          {d.salesperson && (
            <Text style={{ color: colors.textSecondary }}>
              Salesperson: {d.salesperson}
            </Text>
          )}
          {d.challan_type && (
            <Text style={{ color: colors.textSecondary }}>
              Challan type: {d.challan_type.replaceAll('_', ' ')}
            </Text>
          )}
        </Panel>
      )}
      <Table
        columns={[
          { key: 'description', label: 'Item', width: 270 },
          {
            key: 'quantity',
            label: 'Qty',
            width: 80,
            render: (l) => (
              <Text style={{ color: colors.textPrimary }}>
                {l.quantity_milli / 1000}
              </Text>
            ),
          },
          {
            key: 'rate',
            label: 'Rate',
            render: (l) => (
              <Text style={{ color: colors.textPrimary }}>
                {api.money(l.rate)}
              </Text>
            ),
          },
          {
            key: 'tax_rate',
            label: 'Tax',
            width: 80,
            render: (l) => (
              <Text style={{ color: colors.textPrimary }}>
                {l.tax_rate / 100}%
              </Text>
            ),
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (l) => (
              <Text style={{ color: colors.textPrimary }}>
                {api.money(Number(l.amount) + Number(l.document_discount || 0))}
              </Text>
            ),
          },
        ]}
        rows={d.lines}
      />
      <Panel>
        {[
          [
            'Subtotal before document discount',
            Number(d.subtotal) + Number(d.discount_total || 0),
          ],
          ['Document discount', d.discount_total || 0],
          ['Subtotal', d.subtotal],
          ['CGST', d.tax_breakup.cgst],
          ['SGST', d.tax_breakup.sgst],
          ['IGST', d.tax_breakup.igst],
          [d.adjustment_description || 'Adjustment', d.adjustment || 0],
          ['Total', d.total],
          ...(financial ? [['Payments / credits', d.settled]] : []),
        ].map(([label, value]) => (
          <View
            key={String(label)}
            style={[ui.row, { justifyContent: 'space-between' }]}
          >
            <Text style={{ color: colors.textSecondary }}>{String(label)}</Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: label === 'Total' ? '800' : '500',
              }}
            >
              {api.money(value)}
            </Text>
          </View>
        ))}
      </Panel>
      {!!d.notes && (
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
          {d.notes}
        </Text>
      )}
      {!!d.terms && (
        <Panel>
          <Text style={[ui.title, { color: colors.textPrimary }]}>
            Terms & Conditions
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            {d.terms}
          </Text>
        </Panel>
      )}
      {!!d.payments?.length && (
        <>
          <Text style={[ui.title, { color: colors.textPrimary }]}>
            Payments
          </Text>
          <Table
            rows={d.payments}
            columns={[
              {
                key: 'date',
                label: 'Date',
                render: (p) => (
                  <Text style={{ color: colors.textPrimary }}>
                    {p.date.slice(0, 10)}
                  </Text>
                ),
              },
              {
                key: 'amount',
                label: 'Amount',
                render: (p) => (
                  <Text style={{ color: colors.textPrimary }}>
                    {api.money(p.amount)}
                  </Text>
                ),
              },
              { key: 'reference', label: 'Reference' },
              {
                key: 'status',
                label: 'Status',
                render: (p) => <Badge value={p.status} />,
              },
              {
                key: 'action',
                label: 'Action',
                width: 170,
                render: (p) =>
                  p.status === 'posted' ? (
                    <Action
                      label="Void payment"
                      secondary
                      disabled={busy || !allowed('payments', 'void')}
                      onPress={() =>
                        setConfirm({
                          label: 'Void payment',
                          description:
                            'Reverse this recorded payment and restore the document’s outstanding balance. Matched bank transactions must be unmatched first.',
                          run: () => api.post(`/payments/${p.id}/void`),
                        })
                      }
                    />
                  ) : null,
              },
            ]}
          />
        </>
      )}
      {!!d.credits?.length && (
        <>
          <Text style={[ui.title, { color: colors.textPrimary }]}>
            Applied credits
          </Text>
          {d.credits.map((c) => (
            <View
              key={c.id}
              style={[ui.row, { justifyContent: 'space-between' }]}
            >
              <Text style={{ color: colors.textPrimary }}>
                {api.money(c.amount)}
              </Text>
              <Action
                label="Remove credit allocation"
                secondary
                disabled={busy || !allowed(d.kind, 'manage') || !allowed(creditKind)}
                onPress={() => run(() => api.remove(`/credits/${c.id}`))}
              />
            </View>
          ))}
        </>
      )}
      {allowed('documents') && <AttachmentsPanel documentId={d.id} />}
    </Dialog>
  );
}
