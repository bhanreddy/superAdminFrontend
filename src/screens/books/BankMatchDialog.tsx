import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../api/books';
import { Action, Dialog, Notice, Select, ui } from './BooksUi';

function entryLabel(source: string) {
  if (source === 'payment') return 'Books payment';
  if (source === 'manual') return 'Manual journal';
  if (source === 'document') return 'Books document';
  if (source === 'platform_reversal' || source === 'reversal') return 'Reversal';
  if (source.startsWith('platform_billing_')) return 'Client billing';
  if (source.startsWith('platform_payroll_')) return 'Payroll';
  if (source.startsWith('platform_expense_')) return 'Operating expense';
  if (source.startsWith('platform_collection_')) return 'Collection';
  return 'Journal entry';
}

export default function BankMatchDialog({ row, onClose, onSaved }: {
  row: api.BankTransaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [candidates, setCandidates] = useState<api.BankMatchCandidate[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const path = `/bank-transactions/${row.id}`;

  useEffect(() => {
    let active = true;
    api.get<{ data: api.BankMatchCandidate[]; has_more: boolean }>(`${path}/candidates`, { page })
      .then(result => {
        if (!active) return;
        setCandidates(result.data);
        setHasMore(result.has_more);
      })
      .catch(error => { if (active) setLoadError(api.message(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, page, attempt]);

  function reload(nextPage: number) {
    setLoading(true);
    setLoadError('');
    setSaveError('');
    setSelected('');
    if (nextPage === page) setAttempt(value => value + 1);
    else setPage(nextPage);
  }

  async function save() {
    if (saving.current || !selected) return;
    saving.current = true;
    setBusy(true);
    setSaveError('');
    try {
      await api.put(`${path}/match`, { journal_line_id: selected, match_revision: row.match_revision });
      onSaved();
    } catch (error) {
      setSaveError(api.message(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <Dialog title="Match bank transaction" busy={busy} onClose={onClose} footer={<>
    <Action label="Cancel" secondary onPress={onClose} disabled={busy} />
    <Action label="Save match" onPress={save} disabled={busy || loading || !selected} />
  </>}>
    <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{row.description} · {api.money(row.amount)}</Text>
    <Text style={{ color: colors.textSecondary }}>{row.date.slice(0, 10)} · {row.account_name}{row.reference ? ` · ${row.reference}` : ''}</Text>
    {loading ? <View accessibilityLabel="Loading matching entries" accessibilityRole="progressbar"><Skeleton height={68} borderRadius={12} /></View>
      : loadError ? <>
        <Notice error text={loadError} />
        <Action label="Retry" secondary onPress={() => reload(page)} />
      </> : <>
        {candidates.length ? <Select
          label="Posted entry"
          value={selected}
          onChange={setSelected}
          options={candidates.map(entry => ({
            value: entry.id,
            label: [entry.date, entry.reference, entry.payment_reference, entryLabel(entry.source), `Line ${entry.id}`].filter(Boolean).join(' · '),
          }))}
        /> : <Notice text="No available posted entries match this account, direction and amount." />}
        {(page > 1 || hasMore) && <View style={ui.wrap}>
          <Action label="Previous entries" secondary disabled={busy || page === 1} onPress={() => reload(page - 1)} />
          <Action label="Next entries" secondary disabled={busy || !hasMore} onPress={() => reload(page + 1)} />
        </View>}
      </>}
    {!!saveError && <>
      <Notice error text={saveError} />
      <Action label="Refresh matching entries" secondary onPress={() => reload(page)} />
    </>}
  </Dialog>;
}
