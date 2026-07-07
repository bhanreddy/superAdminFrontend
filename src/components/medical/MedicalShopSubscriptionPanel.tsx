import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { CreditCard, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../ui/Toast';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { superAdminClient } from '../../api/superAdminClient';
import type { MedicalShopSubscriptionResponse } from '../../types/medicalSubscription';

const STATUSES = [
  'trial',
  'pending',
  'active',
  'paused',
  'cancelled',
  'expired',
  'created',
  'authenticated',
] as const;

const BILLING = ['monthly', 'annual'] as const;

interface Props {
  shopId: string;
}

function isoDateOnly(iso?: string | null): string {
  if (!iso) return '';
  try {
    return iso.slice(0, 10);
  } catch {
    return '';
  }
}

function toIsoEndOfDay(dateStr: string): string | null {
  const t = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function MedicalShopSubscriptionPanel({ shopId }: Props) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<MedicalShopSubscriptionResponse | null>(null);
  /** Set when GET fails (404/401/etc.) — shown inline instead of a global error toast */
  const [loadError, setLoadError] = useState<string | null>(null);

  const [planName, setPlanName] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [billingCycle, setBillingCycle] = useState<string>('monthly');
  const [periodEnd, setPeriodEnd] = useState('');
  const [trialEnd, setTrialEnd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await superAdminClient.get(`/api/v1/medical/shops/${shopId}/subscription`);
      if (!res.data?.success) throw new Error(res.data?.error || 'Failed to load');
      const payload = res.data.data as MedicalShopSubscriptionResponse;
      setData(payload);
      if (payload.linked && payload.subscription) {
        const s = payload.subscription;
        setPlanName(s.plan_name || '');
        setStatus(s.status || 'active');
        setBillingCycle(s.billing_cycle || 'monthly');
        setPeriodEnd(isoDateOnly(s.current_period_end));
        setTrialEnd(isoDateOnly(s.trial_end));
      }
    } catch (e: any) {
      const status = e.response?.status as number | undefined;
      const msg =
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        'Failed to load subscription';
      setData(null);
      if (status === 404) {
        setLoadError(
          'Subscription API not found (404). Use a SuperAdmin Backend that includes /api/v1/medical/shops/:id/subscription, and set EXPO_PUBLIC_SUPERADMIN_API_URL — on Android emulator use http://10.0.2.2:PORT (your machine’s loopback). Rebuild the app after changing .env.',
        );
      } else if (status === 401) {
        setLoadError(
          'Not authorized (401). Your session may have expired — sign out and sign in again. If this persists, check that the backend validates the same Supabase JWT as the app.',
        );
      } else {
        setLoadError(null);
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [shopId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!data?.linked) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        plan_name: planName,
        status,
        billing_cycle: billingCycle,
      };
      if (periodEnd.trim()) {
        const iso = toIsoEndOfDay(periodEnd);
        if (!iso) {
          showToast('Invalid period end date (use YYYY-MM-DD)', 'error');
          setSaving(false);
          return;
        }
        body.current_period_end = iso;
      }
      if (trialEnd.trim()) {
        const iso = toIsoEndOfDay(trialEnd);
        if (!iso) {
          showToast('Invalid trial end date (use YYYY-MM-DD)', 'error');
          setSaving(false);
          return;
        }
        body.trial_end = iso;
      }

      const res = await superAdminClient.patch(`/api/v1/medical/shops/${shopId}/subscription`, body);
      if (!res.data?.success) throw new Error(res.data?.error || 'Save failed');
      showToast('Subscription updated', 'success');
      await load();
    } catch (e: any) {
      showToast(e.response?.data?.error || e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.loading, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[st.loadingText, { color: colors.textTertiary }]}>Loading subscription…</Text>
      </View>
    );
  }

  if (loadError && !data) {
    return (
      <View style={[st.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
        <View style={st.cardHead}>
          <CreditCard size={18} color={colors.warning} />
          <Text style={[st.cardTitle, { color: colors.textPrimary }]}>POS subscription</Text>
        </View>
        <Text style={[st.muted, { color: colors.textSecondary }]}>{loadError}</Text>
        <Button title="Retry" variant="outline" onPress={load} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (!data) {
    return null;
  }

  if (!data.linked) {
    return (
      <View style={[st.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
        <View style={st.cardHead}>
          <CreditCard size={18} color={colors.warning} />
          <Text style={[st.cardTitle, { color: colors.textPrimary }]}>POS subscription</Text>
        </View>
        <Text style={[st.muted, { color: colors.textSecondary }]}>
          {data.message || 'This shop is not linked to a Medical POS clinic yet.'}
        </Text>
      </View>
    );
  }

  const plans = data.plans || [];

  return (
    <View style={[st.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
      <View style={st.cardHeadRow}>
        <View style={st.cardHead}>
          <CreditCard size={18} color={colors.primary} />
          <Text style={[st.cardTitle, { color: colors.textPrimary }]}>POS subscription</Text>
        </View>
        <Pressable
          onPress={load}
          style={({ pressed }) => [st.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <RefreshCw size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {data.clinic && (
        <View style={[st.row, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[st.label, { color: colors.textTertiary }]}>Clinic</Text>
          <Text style={[st.val, { color: colors.textPrimary }]} numberOfLines={2}>
            {data.clinic.name}
          </Text>
        </View>
      )}

      {data.subscription && (
        <View style={{ marginBottom: 12 }}>
          <Badge
            label={data.subscription.status}
            variant={
              data.subscription.status === 'active'
                ? 'success'
                : data.subscription.status === 'trial'
                  ? 'warning'
                  : 'primary'
            }
            dot
          />
        </View>
      )}

      <Text style={[st.sectionLabel, { color: colors.textTertiary }]}>Plan</Text>
      {plans.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {plans.map((p) => {
            const active = planName === p.name;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlanName(p.name)}
                style={[
                  st.chip,
                  {
                    backgroundColor: active ? `${colors.primary}22` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                  },
                ]}
              >
                <Text style={[st.chipText, { color: active ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                  {p.display_name || p.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Input
          label="Plan name (e.g. trial, basic, pro)"
          placeholder="trial"
          value={planName}
          onChangeText={setPlanName}
          autoCapitalize="none"
          containerStyle={{ marginBottom: 8 }}
        />
      )}

      <Text style={[st.sectionLabel, { color: colors.textTertiary }]}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {STATUSES.map((s) => {
          const active = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[
                st.chip,
                {
                  backgroundColor: active ? `${colors.primary}22` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  borderColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                },
              ]}
            >
              <Text style={[st.chipText, { color: active ? colors.primary : colors.textPrimary }]}>{s}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[st.sectionLabel, { color: colors.textTertiary }]}>Billing</Text>
      <View style={st.billingRow}>
        {BILLING.map((b) => {
          const active = billingCycle === b;
          return (
            <Pressable
              key={b}
              onPress={() => setBillingCycle(b)}
              style={[
                st.billingChip,
                {
                  flex: 1,
                  backgroundColor: active ? `${colors.primary}22` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  borderColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                },
              ]}
            >
              <Text style={[st.chipText, { color: active ? colors.primary : colors.textPrimary }]}>{b}</Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Current period end (YYYY-MM-DD)"
        placeholder="e.g. 2026-12-31"
        value={periodEnd}
        onChangeText={setPeriodEnd}
        autoCapitalize="none"
        containerStyle={{ marginBottom: 12 }}
      />
      <Input
        label="Trial end (YYYY-MM-DD)"
        placeholder="Optional"
        value={trialEnd}
        onChangeText={setTrialEnd}
        autoCapitalize="none"
        containerStyle={{ marginBottom: 8 }}
      />

      <Button title="Save subscription" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />

      {data.invoices && data.invoices.length > 0 && (
        <>
          <Text style={[st.sectionLabel, { color: colors.textTertiary, marginTop: 16 }]}>Recent invoices</Text>
          {data.invoices.slice(0, 5).map((inv) => (
            <View
              key={inv.id}
              style={[st.invRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
            >
              <Text style={[st.invAmt, { color: colors.textPrimary }]}>₹{Number(inv.amount).toFixed(2)}</Text>
              <Badge
                label={inv.status}
                variant={inv.status === 'paid' || inv.status === 'completed' ? 'success' : 'warning'}
              />
            </View>
          ))}
        </>
      )}

      {Platform.OS === 'web' ? <View style={{ height: 8 }} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  loading: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  iconBtn: { padding: 6, borderRadius: 8 },
  muted: { fontSize: 13, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 12, fontWeight: '600', minWidth: 56 },
  val: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  billingRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  billingChip: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  invRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  invAmt: { fontSize: 13, fontWeight: '600' },
});
