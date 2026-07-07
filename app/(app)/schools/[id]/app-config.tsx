import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bell, Megaphone, ShieldAlert } from 'lucide-react-native';
import { superAdminApi } from '../../../../src/services/apiService';
import { School } from '../../../../src/types/school';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const REASON_PRESETS = ['Payment overdue', 'Subscription expired', 'Please contact support'];

const LIGHT = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#4F46E5',
  primarySoft: '#EEF2FF',
  success: '#16A34A',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
};

export default function SchoolAppConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const schoolId = Number(id);

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'force' | 'payment' | null>(null);
  const [minimumVersion, setMinimumVersion] = useState('1.0.0');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSchool() {
      try {
        const data = await superAdminApi.getSchool(schoolId);
        if (!mounted) return;
        setSchool(data);
        setMinimumVersion(data.minimum_app_version || '1.0.0');
        setReason(data.payment_banner_reason || '');
      } catch (error) {
        Alert.alert('Error', 'Failed to load school app configuration');
        if (router.canGoBack()) router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (Number.isFinite(schoolId)) {
      loadSchool();
    }

    return () => {
      mounted = false;
    };
  }, [router, schoolId]);

  const previewReason = useMemo(
    () => (reason.trim() || 'Payment is due. Please contact the SuperAdmin team.'),
    [reason],
  );

  const patchConfig = async (
    section: 'force' | 'payment',
    patch: Parameters<typeof superAdminApi.updateSchoolAppConfig>[1],
  ) => {
    try {
      setSaving(section);
      const updated = await superAdminApi.updateSchoolAppConfig(schoolId, patch);
      setSchool(updated);
      setMinimumVersion(updated.minimum_app_version || '1.0.0');
      setReason(updated.payment_banner_reason || '');
    } catch (error: any) {
      Alert.alert('Save failed', error?.response?.data?.error || 'Unable to update this school config.');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveVersion = () => {
    const version = minimumVersion.trim();
    if (!SEMVER_RE.test(version)) {
      Alert.alert('Invalid version', 'Use semantic version format like 1.2.3.');
      return;
    }
    patchConfig('force', { minimum_app_version: version });
  };

  const handleForceToggle = (enabled: boolean) => {
    if (!school) return;

    if (!enabled) {
      patchConfig('force', { force_update_enabled: false });
      return;
    }

    const version = minimumVersion.trim();
    if (!SEMVER_RE.test(version)) {
      Alert.alert('Invalid version', 'Set a valid minimum app version before enabling force update.');
      return;
    }

    Alert.alert(
      'Enable force update?',
      `Enabling immediately blocks users below ${version}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          style: 'destructive',
          onPress: () => patchConfig('force', {
            force_update_enabled: true,
            minimum_app_version: version,
          }),
        },
      ],
    );
  };

  const handlePaymentToggle = (enabled: boolean) => {
    patchConfig('payment', { payment_banner_enabled: enabled });
  };

  const handleSaveReason = () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length > 280) {
      Alert.alert('Reason too long', 'Payment banner reason must be 280 characters or fewer.');
      return;
    }
    patchConfig('payment', { payment_banner_reason: trimmedReason || null });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LIGHT.primary} />
      </View>
    );
  }

  if (!school) return null;

  const forceEnabled = Boolean(school.force_update_enabled);
  const paymentEnabled = Boolean(school.payment_banner_enabled);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={18} color={LIGHT.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>App Configuration</Text>
          <Text style={styles.subtitle}>{school.name}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: LIGHT.dangerSoft }]}>
            <ShieldAlert size={20} color={LIGHT.danger} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.sectionTitle}>Section A - Force Update</Text>
            <Text style={styles.sectionSubtitle}>Hard pre-login gate for outdated app builds.</Text>
          </View>
          <StatusBadge active={forceEnabled} activeLabel="Force Update ON" inactiveLabel="Force Update OFF" />
        </View>

        <View style={styles.controlRow}>
          <View style={styles.headerText}>
            <Text style={styles.label}>Enable hard gate</Text>
            <Text style={styles.helper}>Users below the minimum version cannot enter the app.</Text>
          </View>
          {saving === 'force' ? (
            <ActivityIndicator color={LIGHT.primary} />
          ) : (
            <Switch
              value={forceEnabled}
              onValueChange={handleForceToggle}
              trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
              thumbColor={forceEnabled ? LIGHT.primary : '#F8FAFC'}
            />
          )}
        </View>

        <Text style={styles.label}>Minimum app version</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={minimumVersion}
            onChangeText={setMinimumVersion}
            placeholder="1.0.0"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable disabled={saving === 'force'} onPress={handleSaveVersion} style={styles.saveButton}>
            {saving === 'force' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: LIGHT.warningSoft }]}>
            <Bell size={20} color={LIGHT.warning} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.sectionTitle}>Section B - Payment Banner</Text>
            <Text style={styles.sectionSubtitle}>Soft notice shown only on Admin and Accounts dashboards.</Text>
          </View>
          <StatusBadge active={paymentEnabled} activeLabel="Payment Banner ON" inactiveLabel="Payment Banner OFF" />
        </View>

        <View style={styles.controlRow}>
          <View style={styles.headerText}>
            <Text style={styles.label}>Enable dashboard notice</Text>
            <Text style={styles.helper}>The banner is non-dismissible and does not block app usage.</Text>
          </View>
          {saving === 'payment' ? (
            <ActivityIndicator color={LIGHT.primary} />
          ) : (
            <Switch
              value={paymentEnabled}
              onValueChange={handlePaymentToggle}
              trackColor={{ false: '#CBD5E1', true: '#FDE68A' }}
              thumbColor={paymentEnabled ? LIGHT.warning : '#F8FAFC'}
            />
          )}
        </View>

        <Text style={styles.label}>Reason presets</Text>
        <View style={styles.presetRow}>
          {REASON_PRESETS.map((preset) => (
            <Pressable key={preset} onPress={() => setReason(preset)} style={styles.presetButton}>
              <Text style={styles.presetText}>{preset}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Custom reason</Text>
        <TextInput
          value={reason}
          onChangeText={(text) => {
            if (text.length <= 280) setReason(text);
          }}
          placeholder="Type a reason for the school-facing banner"
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={280}
          style={[styles.input, styles.reasonInput]}
        />
        <Text style={styles.counter}>{reason.length}/280</Text>

        <View style={styles.preview}>
          <Megaphone size={17} color={LIGHT.warning} />
          <Text style={styles.previewText}>{previewReason}</Text>
        </View>

        <Pressable disabled={saving === 'payment'} onPress={handleSaveReason} style={[styles.saveButton, styles.fullWidthButton]}>
          {saving === 'payment' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Payment Banner</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <View style={[
      styles.badge,
      active
        ? { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }
        : { backgroundColor: '#F8FAFC', borderColor: LIGHT.border },
    ]}>
      <View style={[styles.badgeDot, { backgroundColor: active ? LIGHT.success : LIGHT.muted }]} />
      <Text style={[styles.badgeText, { color: active ? LIGHT.success : LIGHT.muted }]}>
        {active ? activeLabel : inactiveLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT.background,
  },
  container: {
    flex: 1,
    backgroundColor: LIGHT.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT.surface,
    borderWidth: 1,
    borderColor: LIGHT.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: LIGHT.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: LIGHT.muted,
  },
  card: {
    backgroundColor: LIGHT.surface,
    borderWidth: 1,
    borderColor: LIGHT.border,
    borderRadius: 22,
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LIGHT.text,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: LIGHT.muted,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: LIGHT.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: LIGHT.text,
  },
  helper: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: LIGHT.muted,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: LIGHT.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    color: LIGHT.text,
    fontSize: 14,
  },
  reasonInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  saveButton: {
    minWidth: 92,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: LIGHT.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: LIGHT.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  counter: {
    marginTop: -8,
    textAlign: 'right',
    fontSize: 11,
    color: LIGHT.muted,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: LIGHT.warningSoft,
  },
  previewText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  fullWidthButton: {
    width: '100%',
  },
});
