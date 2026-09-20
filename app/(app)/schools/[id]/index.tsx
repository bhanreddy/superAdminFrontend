import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Pressable,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Activity,
  Sun,
  Moon,
  Users,
  GraduationCap,
  UserCheck,
  Clock,
  Zap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Map,
  Calendar,
  Hash,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { superAdminApi } from '../../../../src/services/apiService';
import { School } from '../../../../src/types/school';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { INPUT_PLACEHOLDER_COLOR } from '../../../../src/theme/styles';
import { Button } from '../../../../src/components/ui/Button';
import { Badge } from '../../../../src/components/ui/Badge';
import { useAuth } from '../../../../src/hooks/useAuth';
import { PERMISSIONS } from '../../../../src/constants/rbac';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'admin' | 'system';

interface HealthStats {
  student_count: number;
  staff_count: number;
  user_count: number;
  last_activity: string | null;
  defaults_seeded?: boolean;
  first_admin_exists?: boolean;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; text: string; type: 'success' | 'error' }
let _toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const show = useCallback((text: string, type: Toast['type'] = 'success') => {
    const id = ++_toastId;
    setToasts(p => [...p, { id, text, type }]);
    const t = setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2500);
    timers.current.push(t);
  }, []);
  return { toasts, show };
}

function ToastLayer({ toasts, colors }: { toasts: Toast[]; colors: any }) {
  return (
    <View style={toastStyles.layer} pointerEvents="none">
      {toasts.map(t => (
        <Animated.View
          key={t.id}
          entering={FadeInDown.springify().damping(16)}
          style={[
            toastStyles.pill,
            { backgroundColor: t.type === 'success' ? colors.textPrimary : colors.error },
          ]}
        >
          {t.type === 'success'
            ? <CheckCircle2 size={14} color={colors.background} />
            : <XCircle size={14} color="#fff" />
          }
          <Text style={[toastStyles.pillText, { color: t.type === 'success' ? colors.background : '#fff' }]}>
            {t.text}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const toastStyles = StyleSheet.create({
  layer: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 10 },
  pillText: { fontSize: 13, fontWeight: '700' },
});

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'system', label: 'System', icon: Zap },
];

function TabBar({ active, onChange, colors, tabs }: { active: TabId; onChange: (t: TabId) => void; colors: any; tabs: typeof TABS }) {
  return (
    <View style={[tabStyles.row, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={tabStyles.tab}>
            <Icon size={16} color={isActive ? colors.primary : colors.textSecondary} />
            <Text style={[tabStyles.label, { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? '700' : '500' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={[tabStyles.indicator, { backgroundColor: colors.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingVertical: 14, position: 'relative' },
  label: { fontSize: 13 },
  indicator: { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2.5, borderRadius: 2 },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, index, colors }: {
  icon: React.FC<any>; label: string; value: string | number; color: string; index: number; colors: any;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={[statStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[statStyles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, accent, colors }: { icon: React.FC<any>; label: string; value: string; accent?: string; colors: any }) {
  const c = accent || colors.textSecondary;
  return (
    <View style={[infoStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[infoStyles.iconWrap, { backgroundColor: c + '14' }]}>
        <Icon size={14} color={c} />
      </View>
      <Text style={[infoStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500', width: 96 },
  value: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, color, colors }: { icon: React.FC<any>; title: string; subtitle?: string; color: string; colors: any }) {
  return (
    <View style={secStyles.row}>
      <View style={[secStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[secStyles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[secStyles.sub, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider({ colors }: { colors: any }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 20 }]} />;
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, colors, hint, isDark,
}: {
  label: string; placeholder: string; value: string; onChangeText: (v: string) => void;
  secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any; colors: any; hint?: string; isDark: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={[fieldStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[
        fieldStyles.inputRow,
        {
          backgroundColor: isDark ? colors.background : '#FFFFFF',
          borderColor: focused ? colors.primary : (isDark ? colors.border : '#CBD5E1'),
        },
      ]}>
        <TextInput
          style={[fieldStyles.input, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={isDark ? `${colors.textSecondary}B3` : INPUT_PLACEHOLDER_COLOR}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(h => !h)} style={fieldStyles.eyeBtn}>
            {hidden ? <Eye size={16} color={colors.textSecondary} /> : <EyeOff size={16} color={colors.textSecondary} />}
          </Pressable>
        )}
      </View>
      {hint && <Text style={[fieldStyles.hint, { color: colors.textSecondary }]}>{hint}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 48 },
  input: { flex: 1, fontSize: 14, fontWeight: '500' },
  eyeBtn: { padding: 4 },
  hint: { fontSize: 11, fontWeight: '500', marginTop: 5, opacity: 0.7 },
});

// ─── Gender Picker ────────────────────────────────────────────────────────────

function GenderPicker({ value, onChange, colors }: { value: number; onChange: (v: number) => void; colors: any }) {
  const OPTIONS = [{ id: 1, label: 'Male' }, { id: 2, label: 'Female' }, { id: 3, label: 'Other' }];
  return (
    <View style={genderStyles.wrapper}>
      <Text style={[fieldStyles.label, { color: colors.textSecondary }]}>Gender</Text>
      <View style={[genderStyles.group, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {OPTIONS.map((opt, i) => {
          const isActive = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[
                genderStyles.option,
                i < OPTIONS.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
                isActive && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[genderStyles.optText, { color: isActive ? '#fff' : colors.textSecondary, fontWeight: isActive ? '700' : '500' }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const genderStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  group: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 12, overflow: 'hidden' },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  optText: { fontSize: 14 },
});

// ─── Health Check Row ─────────────────────────────────────────────────────────

function HealthCheckRow({ label, ok, colors, index }: { label: string; ok: boolean; colors: any; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={[hcStyles.row, { borderBottomColor: colors.border }]}>
      {ok
        ? <CheckCircle2 size={16} color={colors.success || '#22C55E'} />
        : <AlertTriangle size={16} color={colors.warning} />
      }
      <Text style={[hcStyles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[hcStyles.pill, { backgroundColor: ok ? (colors.success || '#22C55E') + '18' : colors.warning + '18' }]}>
        <Text style={[hcStyles.pillText, { color: ok ? (colors.success || '#22C55E') : colors.warning }]}>
          {ok ? 'Pass' : 'Fail'}
        </Text>
      </View>
    </Animated.View>
  );
}

const hcStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1, fontSize: 13, fontWeight: '500' },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  pillText: { fontSize: 12, fontWeight: '700' },
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SchoolDetailScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { can } = useAuth();
  const { id } = useLocalSearchParams();
  const rawId = Array.isArray(id) ? id[0] : id;
  const schoolId = Number(rawId);
  const router = useRouter();
  const { toasts, show: showToast } = useToast();

  const [school, setSchool] = useState<School | null>(null);
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminGenderId, setAdminGenderId] = useState(3);
  const [adminDob, setAdminDob] = useState('1990-01-01');
  const [formDirty, setFormDirty] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────

  useEffect(() => { if (!isNaN(schoolId)) fetchData(); }, [schoolId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch school data first — this is required
      const schoolData = await superAdminApi.getSchool(schoolId);
      setSchool(schoolData);

      // Health is optional — don't navigate away if it fails
      try {
        const healthData = await superAdminApi.getSchoolHealth(schoolId);
        setHealthStats(healthData);
      } catch (healthErr) {
        console.warn('[SchoolDetail] Health stats unavailable:', healthErr);
        // Use safe defaults so the screen still renders
        setHealthStats({
          student_count: 0,
          staff_count: 0,
          user_count: 0,
          last_activity: null,
          defaults_seeded: false,
          first_admin_exists: false,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load school data.');
      router.canGoBack() ? router.back() : router.replace('/schools' as any);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = () => {
    if (!school) return;
    const willEnable = !school.is_active;
    Alert.alert(
      willEnable ? 'Enable School?' : 'Disable School?',
      willEnable
        ? `This will allow ${school.name} to be used on the platform.`
        : `This will lock out all users of ${school.name}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willEnable ? 'Enable' : 'Disable',
          style: willEnable ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await superAdminApi.toggleSchoolActive(schoolId, !school.is_active);
              setSchool(updated);
              showToast(`School ${willEnable ? 'enabled' : 'disabled'} successfully`);
            } catch (err: any) {
              showToast(err?.response?.data?.error || 'Failed to update status', 'error');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateAdmin = async () => {
    if (!adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
      showToast('Fill all required fields', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await superAdminApi.addFirstAdmin(schoolId, {
        email: adminEmail,
        first_name: adminFirstName,
        last_name: adminLastName,
        password: adminPassword,
        gender_id: adminGenderId,
        dob: adminDob,
      });
      showToast('Admin account created');
      setAdminEmail(''); setAdminFirstName(''); setAdminLastName('');
      setAdminPassword(''); setAdminGenderId(3); setAdminDob('1990-01-01');
      setFormDirty(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to create admin', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedDefaults = () => {
    Alert.alert('Re-seed Defaults?', 'This will reset all role/permission mappings for this school.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Seed',
        onPress: async () => {
          try {
            setActionLoading(true);
            await superAdminApi.seedSchoolDefaults(schoolId);
            showToast('Defaults seeded successfully');
            fetchData();
          } catch (err: any) {
            showToast(err?.response?.data?.error || 'Failed to seed defaults', 'error');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Loading / Error states ────────────────────────────────────────────────

  if (isNaN(schoolId)) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <AlertTriangle size={32} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.textPrimary }]}>Invalid school ID</Text>
      <Button title="Go Back" onPress={() => router.replace('/admins' as any)} style={{ marginTop: 20 }} />
    </View>
  );

  if (loading || !school) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading school data…</Text>
    </View>
  );

  // ── Tab content ───────────────────────────────────────────────────────────

  const formattedLastActivity = healthStats?.last_activity
    ? new Date(healthStats.last_activity).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

  const renderOverview = () => (
    <Animated.View entering={FadeIn.duration(200)} key="overview">
      {/* Stats strip */}
      {healthStats && (
        <View style={styles.statsRow}>
          <StatCard icon={GraduationCap} label="Students" value={healthStats.student_count} color={colors.primary} index={0} colors={colors} />
          <StatCard icon={UserCheck} label="Staff" value={healthStats.staff_count} color={colors.warning} index={1} colors={colors} />
          <StatCard icon={Users} label="Users" value={healthStats.user_count} color={colors.success || '#22C55E'} index={2} colors={colors} />
        </View>
      )}

      {/* School info card */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader icon={Activity} title="School Profile" subtitle="Core identification data" color={colors.primary} colors={colors} />
        <InfoRow icon={Hash} label="School ID" value={school.id.toString()} accent={colors.primary} colors={colors} />
        <InfoRow icon={Hash} label="Code" value={school.code} accent={colors.primary} colors={colors} />
        {school.address && <InfoRow icon={Map} label="Address" value={school.address} colors={colors} />}
        <InfoRow icon={Calendar} label="Created" value={new Date(school.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} colors={colors} />
        {healthStats?.last_activity && (
          <InfoRow icon={Clock} label="Last Active" value={formattedLastActivity} colors={colors} />
        )}
      </Animated.View>

      {/* Student Management */}
      {can(PERMISSIONS.STUDENTS_IMPORT) && (
      <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader icon={GraduationCap} title="Student Management" subtitle="Add or modify student data" color={colors.primary} colors={colors} />
        <Button
          title="Import Students via Excel"
          variant="secondary"
          onPress={() => router.push({ pathname: '/(app)/students/import', params: { schoolId: school.id.toString() } })}
          style={{ marginTop: 10, alignSelf: 'flex-start' }}
        />
      </Animated.View>
      )}

      {/* Status card */}
      <Animated.View entering={FadeInDown.delay(120).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader icon={CheckCircle2} title="Platform Status" subtitle="Activation and setup state" color={colors.success || '#22C55E'} colors={colors} />

        <View style={[styles.statusRow, { backgroundColor: school.is_active ? (colors.success || '#22C55E') + '10' : colors.error + '10', borderColor: school.is_active ? (colors.success || '#22C55E') + '30' : colors.error + '30' }]}>
          <View style={[styles.statusDot, { backgroundColor: school.is_active ? (colors.success || '#22C55E') : colors.error }]} />
          <Text style={[styles.statusText, { color: school.is_active ? (colors.success || '#22C55E') : colors.error }]}>
            {school.is_active ? 'School is live and accessible' : 'School is disabled — users cannot log in'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          {can(PERMISSIONS.BUILDS_READ) && <Button
            title="Build Config"
            variant="secondary"
            onPress={() => router.push(`/(app)/schools/${school.id}/build-config` as any)}
            style={styles.halfBtn}
          />}
          {can(PERMISSIONS.CONFIGS_READ) && <Button
            title="Setup Guide"
            variant="secondary"
            onPress={() => router.push(`/(app)/schools/${school.id}/setup-guide` as any)}
            style={styles.halfBtn}
          />}
          {can(PERMISSIONS.CONFIGS_MODIFY) && <Button
            title="App Config"
            variant="secondary"
            onPress={() => router.push(`/(app)/schools/${school.id}/app-config` as any)}
            style={styles.halfBtn}
          />}
          {can(PERMISSIONS.CONFIGS_MODIFY) && <Button
            title="Feature Flags"
            variant="secondary"
            onPress={() => router.push(`/(app)/schools/${school.id}/features` as any)}
            style={styles.halfBtn}
          />}
        </View>

        {(can(PERMISSIONS.SCHOOLS_UPDATE_ASSIGNED) || can(PERMISSIONS.SCHOOLS_UPDATE_ALL)) && <Button
          title={school.is_active ? 'Disable School' : 'Enable School'}
          variant={school.is_active ? 'danger' : 'primary'}
          onPress={handleToggleActive}
          loading={actionLoading}
          style={{ marginTop: 10 }}
        />}
      </Animated.View>
    </Animated.View>
  );

  const renderAdmin = () => (
    <Animated.View entering={FadeIn.duration(200)} key="admin">
      <Animated.View entering={FadeInDown.delay(40).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader
          icon={Shield}
          title="Create First Admin"
          subtitle="Provision the primary admin account for this tenant"
          color={colors.primary}
          colors={colors}
        />

        {healthStats?.first_admin_exists && (
          <View style={[styles.infoBanner, { backgroundColor: (colors.success || '#22C55E') + '12', borderColor: (colors.success || '#22C55E') + '30' }]}>
            <CheckCircle2 size={15} color={colors.success || '#22C55E'} />
            <Text style={[styles.infoBannerText, { color: colors.success || '#22C55E' }]}>
              A first admin already exists for this school. Creating another will add a second admin.
            </Text>
          </View>
        )}

        {/* Two-column name row */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="First Name" placeholder="John" value={adminFirstName} onChangeText={v => { setAdminFirstName(v); setFormDirty(true); }} colors={colors} isDark={isDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Last Name" placeholder="Doe" value={adminLastName} onChangeText={v => { setAdminLastName(v); setFormDirty(true); }} colors={colors} isDark={isDark} />
          </View>
        </View>

        <Field
          label="Email"
          placeholder="admin@school.com"
          value={adminEmail}
          onChangeText={v => { setAdminEmail(v); setFormDirty(true); }}
          keyboardType="email-address"
          autoCapitalize="none"
          colors={colors}
          isDark={isDark}
        />

        <Field
          label="Temporary Password"
          placeholder="Min. 8 characters"
          value={adminPassword}
          onChangeText={v => { setAdminPassword(v); setFormDirty(true); }}
          secureTextEntry
          colors={colors}
          isDark={isDark}
          hint="The admin will be prompted to change this on first login."
        />

        {/* Two-column DOB + Gender */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="Date of Birth" placeholder="YYYY-MM-DD" value={adminDob} onChangeText={v => { setAdminDob(v); setFormDirty(true); }} colors={colors} isDark={isDark} />
          </View>
          <View style={{ flex: 1 }}>
            <GenderPicker value={adminGenderId} onChange={v => { setAdminGenderId(v); setFormDirty(true); }} colors={colors} />
          </View>
        </View>

        <Button
          title="Create Admin Account"
          variant="primary"
          onPress={handleCreateAdmin}
          loading={actionLoading}
          style={{ marginTop: 4, opacity: formDirty ? 1 : 0.5 }}
        />
      </Animated.View>
    </Animated.View>
  );

  const renderSystem = () => (
    <Animated.View entering={FadeIn.duration(200)} key="system">
      {/* Health checks */}
      {healthStats && (
        <Animated.View entering={FadeInDown.delay(40).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader icon={Activity} title="Health Checks" subtitle="Automated system validation" color={colors.success || '#22C55E'} colors={colors} />
          <HealthCheckRow label="School record exists in DB" ok={true} colors={colors} index={0} />
          <HealthCheckRow label="Default roles & permissions seeded" ok={!!healthStats.defaults_seeded} colors={colors} index={1} />
          <HealthCheckRow label="First admin account created" ok={!!healthStats.first_admin_exists} colors={colors} index={2} />
          <HealthCheckRow label="School is active on platform" ok={!!school.is_active} colors={colors} index={3} />

          <View style={[styles.lastActivityRow, { borderTopColor: colors.border }]}>
            <Clock size={13} color={colors.textSecondary} />
            <Text style={[styles.lastActivityText, { color: colors.textSecondary }]}>
              Last activity: {formattedLastActivity}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Seed defaults */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader icon={Zap} title="Seed Defaults" subtitle="Re-run role/permission seed for this school" color={colors.warning} colors={colors} />
        <View style={[styles.seedWarning, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={[styles.seedWarningText, { color: colors.warning }]}>
            This will overwrite existing role-permission mappings. Use with caution.
          </Text>
        </View>
        <Button
          title="Run Seed"
          variant="secondary"
          onPress={handleSeedDefaults}
          loading={actionLoading}
          style={{ marginTop: 16, alignSelf: 'flex-start' }}
        />
      </Animated.View>

      {/* Danger zone */}
      <Animated.View entering={FadeInDown.delay(120).springify()} style={[styles.card, styles.dangerCard, { borderColor: colors.error + '40' }]}>
        <SectionHeader icon={XCircle} title="Danger Zone" subtitle="Irreversible actions — proceed with care" color={colors.error} colors={colors} />
        <Button
          title={school.is_active ? 'Disable School' : 'Enable School'}
          variant={school.is_active ? 'danger' : 'primary'}
          onPress={handleToggleActive}
          loading={actionLoading}
        />
      </Animated.View>
    </Animated.View>
  );

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.heroContent}>
          {/* Monogram */}
          <View style={[styles.monogram, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.monogramText, { color: colors.primary }]}>
              {school.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </Text>
          </View>

          <View style={styles.heroText}>
            <Text style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>{school.name}</Text>
            <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
              {school.code} · ID {school.id}
            </Text>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.badgeWrap}>
              {school.is_active
                ? <Badge label="LIVE" variant="success" />
                : <Badge label="INACTIVE" variant="error" />}
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        colors={colors}
        tabs={can(PERMISSIONS.CONFIGS_MODIFY) ? TABS : TABS.filter((tab) => tab.id === 'overview')}
      />

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'admin' && renderAdmin()}
        {activeTab === 'system' && renderSystem()}
      </ScrollView>

      <ToastLayer toasts={toasts} colors={colors} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '500' },
  errorText: { fontSize: 16, fontWeight: '700', marginTop: 12 },

  // Hero
  hero: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16,
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monogram: {
    width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  monogramText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  heroText: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroMeta: { fontSize: 12, fontWeight: '600', marginTop: 2, opacity: 0.7 },
  heroRight: { alignItems: 'flex-end', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badgeWrap: {},

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Cards
  card: {
    borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  dangerCard: { backgroundColor: 'transparent' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  // Status
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 18,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // Action row
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  halfBtn: { flex: 1, minWidth: 120 },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 18,
  },
  infoBannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // Two-col form layout
  twoCol: { flexDirection: 'row', gap: 12 },

  // Last activity
  lastActivityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  lastActivityText: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },

  // Seed warning
  seedWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  seedWarningText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
