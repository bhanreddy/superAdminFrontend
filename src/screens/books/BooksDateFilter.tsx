import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Action, Dialog, Field, FormRow, Notice, ui } from './BooksUi';

type ReportDates = { from: string; to: string };
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function formatDate(value: string) {
  if (!validDate(value)) return value;
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
export default function BooksDateFilter({ value, fiscalStart, today, onChange }: {
  value: ReportDates; fiscalStart: string; today: string; onChange: (dates: ReportDates) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const isFinancialYear = value.from === fiscalStart && value.to === today;
  const apply = () => {
    if (!validDate(draft.from) || !validDate(draft.to)) {
      setError('Enter valid dates in YYYY-MM-DD format.'); return;
    }
    if (draft.from > draft.to) { setError('The start date must be on or before the end date.'); return; }
    onChange(draft); setOpen(false);
  };
  return <>
    <View style={[st.toolbar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={st.summary}>
        <View style={[st.icon, { backgroundColor: colors.primary + '12' }]}><CalendarDays size={17} color={colors.primary} /></View>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>{isFinancialYear ? 'THIS FINANCIAL YEAR' : 'REPORTING PERIOD'}</Text>
          <Text selectable style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 20 }}>{formatDate(value.from)} – {formatDate(value.to)}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Change dates" onPress={() => { setDraft(value); setError(''); setOpen(true); }} style={({ pressed }) => [st.changeButton, { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>{width < 600 ? 'Dates' : 'Change dates'}</Text>
      </Pressable>
    </View>
    {open && <Dialog title="Reporting period" onClose={() => setOpen(false)} maxWidth={540} footer={<>
      <Action label="Cancel" secondary onPress={() => setOpen(false)} />
      <Action label="Apply dates" onPress={apply} />
    </>}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 22 }}>Choose the dates used for your dashboard and reports.</Text>
      <FormRow>
        <Field label="From (YYYY-MM-DD)" value={draft.from} onChange={from => setDraft(current => ({ ...current, from }))} />
        <Field label="To (YYYY-MM-DD)" value={draft.to} onChange={to => setDraft(current => ({ ...current, to }))} />
      </FormRow>
      {!!error && <Notice error text={error} />}
      <View style={ui.row}><Action label="This financial year" secondary onPress={() => { setDraft({ from: fiscalStart, to: today }); setError(''); }} /></View>
    </Dialog>}
  </>;
}
const st = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexShrink: 0 },
  changeButton: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  icon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
