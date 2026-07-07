import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { useEnquiries } from '../../hooks/useEnquiries';
import * as founderDb from '../../services/founderSupabase';
import type { EnquiryListFilters } from '../../services/founderSupabase';
import type { EnquiryRow, EnquiryStatus, FounderRow } from '../../types/founder';
import { ConsoleAmbientBackground, GlassCard, FilterChips, bottomTabPad } from './founderUi';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MessageCircle, X, UserRound, Activity } from 'lucide-react-native';

const STATUS_OPTS: { key: EnquiryStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'REJECTED', label: 'Rejected' },
];

const ASSIGNED_OPTS_BASE = [
  { key: 'ALL' as const, label: 'Any' },
  { key: 'UNASSIGNED' as const, label: 'Unassigned' },
];

export default function EnquiriesScreen() {
  const { colors } = useTheme();
  const { enquiries, loading, filters, setFilters, refresh } = useEnquiries();

  const [founders, setFounders] = useState<FounderRow[]>([]);

  const [detail, setDetail] = useState<EnquiryRow | null>(null);
  const [assignId, setAssignId] = useState<string>('');
  const [statusPick, setStatusPick] = useState<EnquiryStatus>('NEW');
  const [dealValue, setDealValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const f = await founderDb.listFoundersForSettings();
        setFounders(f.filter((x) => x.is_active));
      } catch {
        setFounders([]);
      }
    })();
  }, []);

  const sources = useMemo(() => {
    const src = new Set<string>();
    enquiries.forEach((e) => { if (e.source) src.add(e.source); });
    return Array.from(src).sort();
  }, [enquiries]);

  const categories = useMemo(() => {
    const cat = new Set<string>();
    enquiries.forEach((e) => { if (e.category) cat.add(e.category); });
    return Array.from(cat).sort();
  }, [enquiries]);

  useEffect(() => {
    if (detail) {
      setAssignId(detail.assigned_to || '');
      setStatusPick(detail.status);
      setDealValue(
        detail.deal_value != null && Number.isFinite(Number(detail.deal_value))
          ? String(detail.deal_value)
          : '',
      );
    }
  }, [detail]);

  const sourceOpts = useMemo<{ key: string; label: string }[]>(() => [
    { key: 'ALL', label: 'All sources' },
    ...sources.map((s) => ({ key: s, label: s })),
  ], [sources]);

  const categoryOpts = useMemo<{ key: string; label: string }[]>(() => [
    { key: 'ALL', label: 'All categories' },
    ...categories.map((c) => ({ key: c, label: c })),
  ], [categories]);

  const assignedOpts = useMemo<{ key: string; label: string }[]>(() => [
    ...ASSIGNED_OPTS_BASE.map((o) => ({ key: o.key, label: o.label })),
    ...founders.map((f) => ({ key: f.id, label: f.full_name || f.email || f.id })),
  ], [founders]);

  const saveDetail = async () => {
    if (!detail) return;
    const dv = dealValue.trim() === '' ? null : parseFloat(dealValue.replace(/,/g, ''));
    if (dealValue.trim() !== '' && !Number.isFinite(dv as number)) {
      Alert.alert('Validation', 'Invalid deal value.');
      return;
    }
    setSaving(true);
    try {
      await founderDb.updateEnquiry(detail.id, {
        status: statusPick,
        assigned_to: assignId || null,
        deal_value: dv,
      });
      setDetail(null);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const isDark = colors.background === '#000000' || colors.background === '#1A1D2E';

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Enquiries" subtitle="Leads & pipeline" />
      <View style={styles.pad}>
        <Text style={[styles.h, { color: colors.textSecondary }]}>Status</Text>
        <FilterChips
          options={STATUS_OPTS}
          value={filters.status}
          onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, status: k }))}
        />
        <Text style={[styles.h, { color: colors.textSecondary }]}>Source</Text>
        <FilterChips<string>
          options={sourceOpts}
          value={filters.source}
          onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, source: k }))}
        />
        <Text style={[styles.h, { color: colors.textSecondary }]}>Category</Text>
        <FilterChips<string>
          options={categoryOpts}
          value={filters.category}
          onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, category: k }))}
        />
        <Text style={[styles.h, { color: colors.textSecondary }]}>Assigned</Text>
        <FilterChips<string>
          options={assignedOpts}
          value={
            filters.assignedTo === 'ALL' || filters.assignedTo === 'UNASSIGNED'
              ? filters.assignedTo
              : String(filters.assignedTo)
          }
          onChange={(k) =>
            setFilters((f: EnquiryListFilters) => ({
              ...f,
              assignedTo: k as 'ALL' | 'UNASSIGNED' | string,
            }))
          }
        />

        {loading ? (
          <ActivityIndicator color="#38C8F4" style={{ marginTop: 24 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomTabPad }}
          >
            {enquiries.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setDetail(e)}
                style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 0.9 })]}
              >
                <GlassCard style={{ marginBottom: 12 }}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>
                    {e.name || 'Unnamed lead'}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {e.status} · {e.source || '—'} · {e.category || '—'}
                  </Text>
                  {e.deal_value != null ? (
                    <Text style={[styles.deal, { color: '#00D4AD' }]}>
                      {founderDb.formatInr(Number(e.deal_value), 2)}
                    </Text>
                  ) : null}
                </GlassCard>
              </Pressable>
            ))}
            {enquiries.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
                No enquiries match filters.
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>

      <Modal visible={!!detail} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          {isDark && (
             <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          )}
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#12151F' : colors.surface, borderTopColor: isDark ? 'rgba(14,165,233,0.14)' : colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border }]} />

            <View style={styles.sheetHeaderGroup}>
               <LinearGradient colors={isDark ? ['rgba(14,165,233,0.18)', 'rgba(0,212,173,0.06)'] : ['rgba(14,165,233,0.1)', 'transparent']} style={styles.sheetIconWrap}>
                 <MessageCircle size={18} color="#0EA5E9" strokeWidth={2} />
               </LinearGradient>
               <View style={{ flex: 1, marginLeft: 14 }}>
                 <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Lead details</Text>
                 <Text style={[styles.sub, { color: colors.textSecondary }]}>
                   {detail?.email || '—'} · {detail?.phone || '—'}
                 </Text>
               </View>
               <Pressable onPress={() => setDetail(null)} style={({ pressed }) => [styles.sheetClose, !isDark && { backgroundColor: colors.surface }, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}>
                 <X color={colors.textSecondary} size={18} />
               </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {/* ASSIGNMENT */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Assign to founder</Text>
              <View style={styles.pillGridWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillGridInner}>
                   <Pressable
                     onPress={() => setAssignId('')}
                     style={({ pressed }) => [
                       styles.unitCard,
                       !assignId && styles.unitCardActive,
                       !isDark && { borderColor: !assignId ? '#0EA5E9' : colors.border, backgroundColor: !assignId ? 'rgba(14,165,233,0.06)' : colors.surface },
                       ...pressableWebStyles(pressed, { pressedOpacity: 0.7 })
                     ]}
                   >
                     <View style={[styles.unitIconCircle, !assignId && { backgroundColor: 'transparent' }]}>
                       {!assignId && <LinearGradient colors={isDark ? ['rgba(14,165,233,0.25)', 'transparent'] : ['rgba(14,165,233,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />}
                       <UserRound size={13} color={!assignId ? (isDark ? '#38BDF8' : '#0284C7') : colors.textSecondary} />
                     </View>
                     <Text style={[styles.unitLabel, { color: !assignId ? (isDark ? '#38BDF8' : '#0284C7') : colors.textPrimary }]}>Unassigned</Text>
                     {!assignId && <View style={styles.unitActiveDot} />}
                   </Pressable>
                   {founders.map((f) => {
                     const active = assignId === f.id;
                     return (
                       <Pressable
                         key={f.id}
                         onPress={() => setAssignId(f.id)}
                         style={({ pressed }) => [
                           styles.unitCard,
                           active && styles.unitCardActive,
                           !isDark && { borderColor: active ? '#0EA5E9' : colors.border, backgroundColor: active ? 'rgba(14,165,233,0.06)' : colors.surface },
                           ...pressableWebStyles(pressed, { pressedOpacity: 0.7 })
                         ]}
                       >
                         <View style={[styles.unitIconCircle, active && { backgroundColor: 'transparent' }]}>
                           {active && <LinearGradient colors={isDark ? ['rgba(14,165,233,0.25)', 'transparent'] : ['rgba(14,165,233,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />}
                           <UserRound size={13} color={active ? (isDark ? '#38BDF8' : '#0284C7') : colors.textSecondary} />
                         </View>
                         <Text style={[styles.unitLabel, { color: active ? (isDark ? '#38BDF8' : '#0284C7') : colors.textPrimary }]}>{f.full_name || f.email || f.id}</Text>
                         {active && <View style={styles.unitActiveDot} />}
                       </Pressable>
                     )
                   })}
                </ScrollView>
              </View>

              {/* STATUS */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={styles.statusGrid}>
                 {(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'REJECTED'] as EnquiryStatus[]).map((s) => {
                   const active = statusPick === s;
                   const sColor = s === 'QUALIFIED' ? '#00D4AD' : s === 'CLOSED' ? '#38BDF8' : s === 'REJECTED' ? '#FF6B7A' : '#A78BFA';
                   return (
                     <Pressable
                       key={s}
                       onPress={() => setStatusPick(s)}
                       style={({ pressed }) => [
                         styles.statusChip,
                         active
                            ? { backgroundColor: `rgba(${sColor === '#00D4AD' ? '0,212,173' : sColor === '#38BDF8' ? '56,189,248' : sColor === '#FF6B7A' ? '255,107,122' : '167,139,250'},0.15)`, borderColor: sColor }
                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.glassBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
                         ...pressableWebStyles(pressed, { pressedOpacity: 0.75 })
                       ]}
                     >
                        <Text style={[styles.statusChipLbl, { color: active ? sColor : isDark ? 'rgba(255,255,255,0.65)' : colors.textSecondary }]}>{s}</Text>
                     </Pressable>
                   )
                 })}
              </View>

              <View style={{ marginTop: 8 }}>
                <Input
                  label="Deal value (₹)"
                  value={dealValue}
                  onChangeText={setDealValue}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setDetail(null)}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.glassBackground,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                    },
                    ...pressableWebStyles(pressed, { pressedOpacity: 0.8 }),
                  ]}
                >
                  <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveDetail}
                  disabled={saving}
                  style={({ pressed }) => [
                    { flex: 1, marginLeft: 12 },
                    ...pressableWebStyles(pressed, { disabled: saving, pressedOpacity: 0.85 }),
                  ]}
                >
                  <LinearGradient
                    colors={['#0D9488', '#0EA5E9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  >
                    <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save changes'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: 0, paddingTop: 8 },
  h: { fontSize: 11, fontWeight: '700', marginTop: 8, marginBottom: 6, textTransform: 'uppercase' },
  name: { fontSize: 17, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  deal: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#12151F',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 36,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '92%',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeaderGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  sheetIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 2, marginBottom: 0 },
  
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  
  pillGridWrap: { marginBottom: 18, marginHorizontal: -24 },
  pillGridInner: { paddingHorizontal: 24, paddingBottom: 4, gap: 10 },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    paddingRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    position: 'relative',
    overflow: 'hidden',
  },
  unitCardActive: {
    borderColor: 'rgba(14,165,233,0.5)',
    backgroundColor: 'rgba(14,165,233,0.1)',
  },
  unitIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unitLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, maxWidth: 160 },
  unitActiveDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#0EA5E9' },
  
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statusChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusChipLbl: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelTxt: { fontWeight: '700', fontSize: 14 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
