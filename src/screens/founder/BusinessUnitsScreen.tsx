import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import * as founderDb from '../../services/founderSupabase';
import type { BusinessUnitRow } from '../../types/founder';
import { styles as ds, INPUT_PLACEHOLDER_COLOR } from '../../theme/styles';
import {
  ConsoleAmbientBackground,
  GlassCard,
  PrimaryGradientButton,
  bottomTabPad,
} from './founderUi';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Building, Phone } from 'lucide-react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { safePressHandler } from '../../utils/safePressHandler';

/** Used for monthly gain/loss vs collections (with subscription price as the plan cost baseline). */
const SUBSCRIPTION_PLANS: { value: string; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

const PLAN_VALUES = new Set(SUBSCRIPTION_PLANS.map((p) => p.value));

function parseSubscriptionPrice(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function subscriptionLabel(plan: string | null | undefined): string {
  if (!plan) return 'Unset';
  const row = SUBSCRIPTION_PLANS.find((p) => p.value === plan);
  return row?.label ?? plan;
}

function normalizePlanForForm(plan: string | null | undefined): string {
  if (plan && PLAN_VALUES.has(plan)) return plan;
  return 'FREE';
}

function phoneDigitCount(s: string): number {
  return s.replace(/\D/g, '').length;
}

async function dialPhone(raw: string) {
  const compact = raw.trim().replace(/\s/g, '');
  if (!compact) return;
  const url = `tel:${compact}`;
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot open phone', `Call manually: ${raw.trim()}`);
    }
  } catch {
    Alert.alert('Cannot open phone', `Call manually: ${raw.trim()}`);
  }
}

export default function BusinessUnitsScreen() {
  const { colors, isDark } = useTheme();
  const [units, setUnits] = useState<BusinessUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<BusinessUnitRow | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('FREE');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await founderDb.listBusinessUnits(true);
      setUnits(list);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => units.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      u.name.toLowerCase().includes(s) ||
      (u.code || '').toLowerCase().includes(s) ||
      (u.phone || '').toLowerCase().includes(s)
    );
  }), [units, q]);

  const openCreate = () => {
    setEditRow(null);
    setName('');
    setCode('');
    setSubscriptionPrice('');
    setSubscriptionPlan('FREE');
    setPhone('');
    setModalOpen(true);
  };

  const openEdit = (u: BusinessUnitRow) => {
    setEditRow(u);
    setName(u.name);
    setCode(u.code || '');
    const p = parseSubscriptionPrice(u.subscription_price);
    setSubscriptionPrice(p != null ? String(p) : '');
    setSubscriptionPlan(normalizePlanForForm(u.subscription_plan));
    setPhone(u.phone?.trim() ? u.phone.trim() : '');
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Validation', 'Code is required.');
      return;
    }
    if (!subscriptionPlan || !PLAN_VALUES.has(subscriptionPlan)) {
      Alert.alert('Validation', 'Choose a subscription plan.');
      return;
    }
    if (!subscriptionPrice.trim()) {
      Alert.alert('Validation', 'Subscription price is required (use 0 for Free).');
      return;
    }
    const n = parseFloat(subscriptionPrice.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) {
      Alert.alert('Validation', 'Subscription price must be a non-negative number.');
      return;
    }
    const phoneTrim = phone.trim();
    if (phoneTrim && phoneDigitCount(phoneTrim) < 7) {
      Alert.alert('Validation', 'Phone must include at least 7 digits, or leave blank.');
      return;
    }
    const phonePayload = phoneTrim || null;
    setSaving(true);
    try {
      if (editRow) {
        await founderDb.updateBusinessUnit(editRow.id, {
          name: name.trim(),
          code: code.trim(),
          subscription_price: n,
          subscription_plan: subscriptionPlan,
          phone: phonePayload,
        });
      } else {
        await founderDb.createBusinessUnit({
          name: name.trim(),
          code: code.trim(),
          subscription_price: n,
          subscription_plan: subscriptionPlan,
          phone: phonePayload,
        });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (u: BusinessUnitRow) => {
    Alert.alert(
      u.is_active ? 'Deactivate unit?' : 'Activate unit?',
      u.name,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: u.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await founderDb.setBusinessUnitActive(u.id, !u.is_active);
              load();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Update failed');
            }
          },
        },
      ],
    );
  };

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Business units" subtitle="Directory" />
      <View style={styles.pad}>
        <View
          style={[
            styles.searchWrap,
            ds.searchBarWrapper,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
              borderColor: isDark ? colors.border : '#CBD5E1',
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search name, code, or phone"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={q}
            onChangeText={setQ}
            style={[ds.inputInChrome, styles.searchIn, { color: colors.textPrimary }]}
          />
        </View>

        <View style={{ marginVertical: 12 }}>
          <PrimaryGradientButton label="＋ Create unit" onPress={openCreate} />
        </View>

        {loading ? (
          <ActivityIndicator color="#7C6FFF" style={{ marginTop: 24 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomTabPad }}
          >
            {filtered.map((u) => (
              <GlassCard key={u.id} style={{ marginBottom: 12 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nm, { color: colors.textPrimary }]}>{u.name}</Text>
                    <Text style={[styles.cd, { color: colors.textSecondary }]}>
                      {u.code || 'No code'} · {u.is_active ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={[styles.metaLine, { color: colors.textSecondary }]}>
                      {parseSubscriptionPrice(u.subscription_price) != null
                        ? founderDb.formatInr(parseSubscriptionPrice(u.subscription_price)!, 0)
                        : '—'}{' '}
                      · {subscriptionLabel(u.subscription_plan)}
                    </Text>
                    {u.phone?.trim() ? (
                      <Text style={[styles.phoneLine, { color: colors.textSecondary }]}>{u.phone.trim()}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.btns}>
                  {u.phone?.trim() ? (
                    <Pressable
                      onPress={() => dialPhone(u.phone!)}
                      style={({ pressed }) => [styles.textBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
                    >
                      <View style={styles.callRow}>
                        <Phone size={14} color="#00D4AD" />
                        <Text style={{ color: '#00D4AD', fontWeight: '800' }}>Call</Text>
                      </View>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => openEdit(u)}
                    style={({ pressed }) => [styles.textBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
                  >
                    <Text style={{ color: '#38C8F4', fontWeight: '800' }}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleActive(u)}
                    style={({ pressed }) => [styles.textBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
                  >
                    <Text style={{ color: u.is_active ? '#FF6B7A' : '#00D4AD', fontWeight: '800' }}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
            {filtered.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
                No units match search.
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent>
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
                 <Building size={18} color="#0EA5E9" />
               </LinearGradient>
               <View style={{ flex: 1, marginLeft: 14 }}>
                 <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                   {editRow ? 'Edit unit' : 'Create unit'}
                 </Text>
                 <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                   Plan and price tie to monthly collections for gain vs cost. Add a phone number to reach
                   this unit if subscription payment is overdue.
                 </Text>
               </View>
               <Pressable onPress={() => setModalOpen(false)} style={({ pressed }) => [styles.sheetClose, !isDark && { backgroundColor: colors.surface }, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}>
                 <X color={colors.textSecondary} size={18} />
               </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Input label="Name" value={name} onChangeText={setName} placeholder="Unit name" />
              <Input label="Code" value={code} onChangeText={setCode} placeholder="Short code (required)" />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="For calls if subscription isn’t paid (optional)"
                keyboardType="phone-pad"
              />
              <Text style={[styles.formHint, { color: colors.textSecondary, marginTop: -4 }]}>
                Tap Call on the unit card to dial when you need payment follow-up.
              </Text>
              <Input
                label="Subscription price (₹)"
                value={subscriptionPrice}
                onChangeText={setSubscriptionPrice}
                placeholder="Required — use 0 for Free"
                keyboardType="decimal-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Subscription plan</Text>
              <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                Tier is used with monthly totals to compare revenue against this unit’s subscription cost.
              </Text>
              <View style={styles.planRow}>
                {SUBSCRIPTION_PLANS.map((p) => {
                  const active = subscriptionPlan === p.value;
                  return (
                    <Pressable
                      key={p.value}
                      onPress={() => setSubscriptionPlan(p.value)}
                      style={({ pressed }) => [
                        styles.planChip,
                        active && styles.planChipOn,
                        {
                          borderColor: active
                            ? '#0EA5E9'
                            : isDark
                              ? 'rgba(255,255,255,0.1)'
                              : colors.border,
                          backgroundColor: active
                            ? isDark
                              ? 'rgba(14,165,233,0.18)'
                              : 'rgba(14,165,233,0.12)'
                            : isDark
                              ? 'rgba(255,255,255,0.04)'
                              : colors.glassBackground,
                        },
                        ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: active ? '#0EA5E9' : colors.textSecondary,
                        }}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalOpen(false)}
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
                onPress={safePressHandler(save)}
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
                  <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
                </LinearGradient>
              </Pressable>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: 0, paddingTop: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchIn: { flex: 1, fontSize: 16, paddingVertical: 4 },
  row: { flexDirection: 'row' },
  nm: { fontSize: 17, fontWeight: '800' },
  cd: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  metaLine: { fontSize: 11, marginTop: 6, fontWeight: '600', opacity: 0.95 },
  phoneLine: { fontSize: 12, marginTop: 5, fontWeight: '600' },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  formHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '500',
  },
  planRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  planChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  planChipOn: {
    borderWidth: 1.5,
  },
  btns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 12 },
  textBtn: { paddingVertical: 6 },
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
  modalSub: { fontSize: 12, marginTop: 2 },
  
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
