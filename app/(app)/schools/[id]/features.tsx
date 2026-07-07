import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Lock,
  Search,
  RotateCcw,
  Sparkles,
  Heart,
  Shield,
  Megaphone,
  AlertCircle,
  Bus,
  Atom,
  Compass,
  Settings,
  BookOpen,
  Coins,
  Menu,
  Sliders,
  Smartphone,
  Activity,
  Home,
} from 'lucide-react-native';
import { superAdminApi, SchoolFeature } from '../../../../src/services/apiService';
import { useFounderAuth } from '../../../../src/hooks/useFounderAuth';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { ScreenHeader } from '../../../../src/components/ui/ScreenHeader';
import { Badge } from '../../../../src/components/ui/Badge';
import { Input } from '../../../../src/components/ui/Input';
import { EmptyState } from '../../../../src/components/ui/EmptyState';

const GROUP_ORDER: SchoolFeature['group'][] = [
  'drawer',
  'quick_actions',
  'topbar',
  'home',
  'bottom_nav',
];
const GROUP_LABEL: Record<SchoolFeature['group'], string> = {
  drawer: 'Drawer',
  quick_actions: 'Quick Actions',
  topbar: 'Top Bar',
  home: 'Home',
  bottom_nav: 'Bottom Nav',
};

const getFeatureIcon = (key: string, group: string) => {
  const k = key.toLowerCase();
  if (k.includes('dcgd')) return BookOpen;
  if (k.includes('ai') || k.includes('doubt')) return Sparkles;
  if (k.includes('insurance')) return Shield;
  if (k.includes('money') || (k.includes('science') && k.includes('money'))) return Coins;
  if (k.includes('safety') || k.includes('girl')) return Heart;
  if (k.includes('announcement')) return Megaphone;
  if (k.includes('complaint')) return AlertCircle;
  if (k.includes('value') || k.includes('life')) return Compass;
  if (k.includes('transport') || k.includes('bus')) return Bus;
  if (k.includes('science') || k.includes('project')) return Atom;
  
  switch (group) {
    case 'drawer':
      return Menu;
    case 'quick_actions':
      return Sliders;
    case 'topbar':
      return Activity;
    case 'home':
      return Home;
    case 'bottom_nav':
      return Smartphone;
    default:
      return Settings;
  }
};

export default function SchoolFeatureFlagsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const schoolId = Number(id);
  const { isFounderOnly, isApprover } = useFounderAuth();
  const { isSuperAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const canWrite = isSuperAdmin || isFounderOnly; // Founder/super-admin write; Approver read-only

  const [features, setFeatures] = useState<SchoolFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await superAdminApi.getSchoolFeatures(schoolId);
      setFeatures(res.features);
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to load feature flags', 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    if (Number.isFinite(schoolId)) load();
  }, [schoolId, load]);

  const filteredFeatures = useMemo(() => {
    if (!search.trim()) return features;
    const term = search.toLowerCase();
    return features.filter(
      (f) =>
        f.label.toLowerCase().includes(term) ||
        f.key.toLowerCase().includes(term) ||
        (f.group && GROUP_LABEL[f.group]?.toLowerCase().includes(term)),
    );
  }, [features, search]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: filteredFeatures.filter((f) => f.group === group),
    })).filter((g) => g.items.length > 0);
  }, [filteredFeatures]);

  const onToggle = async (feature: SchoolFeature, next: boolean) => {
    if (!canWrite || !feature.toggleable || savingKey) return;

    // Optimistic update.
    const prev = features;
    setFeatures((list) =>
      list.map((f) => (f.key === feature.key ? { ...f, enabled: next, source: 'overridden' } : f)),
    );
    setSavingKey(feature.key);
    try {
      const res = await superAdminApi.updateSchoolFeature(schoolId, feature.key, next);
      setFeatures((list) =>
        list.map((f) =>
          f.key === feature.key ? { ...f, enabled: res.enabled, source: 'overridden' } : f,
        ),
      );
      showToast(`${feature.label} ${next ? 'enabled' : 'disabled'}`, 'success');
    } catch (e: any) {
      setFeatures(prev); // revert
      showToast(e?.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const onReset = async (feature: SchoolFeature) => {
    if (!canWrite || feature.source !== 'overridden' || savingKey) return;

    const prev = features;
    setSavingKey(feature.key);
    try {
      const res = await superAdminApi.resetSchoolFeature(schoolId, feature.key);
      setFeatures((list) =>
        list.map((f) =>
          f.key === feature.key ? { ...f, enabled: res.enabled, source: 'default' } : f,
        ),
      );
      showToast(`${feature.label} reset to default`, 'success');
    } catch (e: any) {
      setFeatures(prev);
      showToast(e?.response?.data?.error || 'Reset failed', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {!canWrite && (
        <View style={[styles.readOnly, { backgroundColor: colors.warningDim, borderColor: colors.warning }]}>
          <Lock size={14} color={colors.warning} />
          <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
            {isApprover ? 'Approver — read only. Only a Founder can change flags.' : 'Read only.'}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenHeader
            title="Feature Flags"
            subtitle="Configure, override, and reset feature permissions for this school."
            showBack
          />

          <Input
            placeholder="Search feature flags by name, key, or group..."
            value={search}
            onChangeText={setSearch}
            containerStyle={styles.searchInputContainer}
            autoCapitalize="none"
          />

          {grouped.length === 0 ? (
            <EmptyState
              title="No Features Found"
              description={search ? `No feature flags match "${search}". Try a different keyword.` : "No feature flags are available."}
              icon={<Search size={32} color={colors.textTertiary} />}
            />
          ) : (
            grouped.map(({ group, items }) => (
              <View key={group} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {GROUP_LABEL[group]}
                </Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {items.map((f, i) => {
                    const FeatureIcon = getFeatureIcon(f.key, f.group);
                    return (
                      <View
                        key={f.key}
                        style={[
                          styles.row,
                          i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                        ]}
                      >
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
                          <FeatureIcon size={18} color={colors.primary} />
                        </View>
                        
                        <View style={{ flex: 1, paddingRight: 16 }}>
                          <View style={styles.labelRow}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>{f.label}</Text>
                            {!f.toggleable && (
                              <Badge label="core" variant="info" size="sm" />
                            )}
                          </View>
                          
                          <View style={styles.badgeRow}>
                            <Badge
                              label={f.source === 'overridden' ? 'overridden' : 'default'}
                              variant={f.source === 'overridden' ? 'primary' : 'success'}
                              size="sm"
                              dot
                            />
                            {f.data_bearing && (
                              <Text style={[styles.metaText, { color: colors.textTertiary }]}>enforced server-side</Text>
                            )}
                            {canWrite && f.source === 'overridden' && f.toggleable && (
                              <Pressable
                                onPress={() => onReset(f)}
                                disabled={savingKey === f.key}
                                style={({ pressed, hovered }: any) => [
                                  styles.resetButton,
                                  {
                                    backgroundColor: hovered ? colors.primaryDim : 'transparent',
                                    borderColor: colors.primary,
                                    opacity: pressed ? 0.7 : 1,
                                  },
                                ]}
                                hitSlop={6}
                              >
                                <RotateCcw size={11} color={colors.primary} style={{ marginRight: 3 }} />
                                <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                        
                        <Switch
                          value={f.enabled}
                          onValueChange={(next) => onToggle(f, next)}
                          disabled={!canWrite || !f.toggleable || savingKey === f.key}
                          trackColor={{ true: colors.primary, false: isDark ? colors.border : '#CBD5E1' }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {toast && (
        <View
          style={[
            styles.toast,
            { backgroundColor: toast.type === 'success' ? colors.textPrimary : colors.error },
          ]}
        >
          <Text style={[styles.toastText, { color: toast.type === 'success' ? colors.background : '#FFFFFF' }]}>
            {toast.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s' } : {}),
  } as any,
  resetText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
