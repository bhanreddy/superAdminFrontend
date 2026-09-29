import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  useSharedValue,
  FadeInDown,
  FadeIn,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { MoreVertical, Copy, ExternalLink, Sun, Moon, CheckCircle2, AlertTriangle, Clock, Zap, ChevronRight } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { superAdminApi } from '../../../../src/services/apiService';
import { School } from '../../../../src/types/school';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { Button } from '../../../../src/components/ui/Button';
import { Badge } from '../../../../src/components/ui/Badge';
import { PhaseSection } from '../../../../src/components/setup/PhaseSection';
import { StepItem } from '../../../../src/components/setup/StepItem';
import { CodeBlock } from '../../../../src/components/setup/CodeBlock';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepKeys =
  | 'step_duplicate_done'
  | 'step_configure_env'
  | 'step_configure_appjson'
  | 'step_configure_easjson'
  | 'step_configure_firebase'
  | 'step_expo_project_done'
  | 'step_setup_script_done'
  | 'step_2_1' | 'step_2_2' | 'step_2_3' | 'step_2_4'
  | 'step_3_1' | 'step_3_2' | 'step_3_3'
  | 'step_4_1' | 'step_4_2';

type StepState = Record<StepKeys, boolean>;

const defaultStepState: StepState = {
  step_duplicate_done: false,
  step_configure_env: false,
  step_configure_appjson: false,
  step_configure_easjson: false,
  step_configure_firebase: false,
  step_expo_project_done: false,
  step_setup_script_done: false,
  step_2_1: false, step_2_2: false, step_2_3: false, step_2_4: false,
  step_3_1: false, step_3_2: false, step_3_3: false,
  step_4_1: false, step_4_2: false,
};

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastMessage {
  id: number;
  text: string;
}

let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const show = useCallback((text: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text }]);
    const t = setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
    timers.current.push(t);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts, colors }: { toasts: ToastMessage[]; colors: any }) {
  return (
    <View style={styles.toastContainer} pointerEvents="none">
      {toasts.map(t => (
        <Animated.View
          key={t.id}
          entering={FadeInDown.springify().damping(18)}
          style={[styles.toast, { backgroundColor: colors.textPrimary }]}
        >
          <CheckCircle2 size={14} color={colors.background} />
          <Text style={[styles.toastText, { color: colors.background }]}>{t.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// ─── Phase Progress Pip ───────────────────────────────────────────────────────

function PhasePip({
  number,
  label,
  done,
  active,
  colors,
  index,
}: {
  number: number;
  label: string;
  done: boolean;
  active: boolean;
  colors: any;
  index: number;
}) {
  const scale = useSharedValue(0.8);
  useEffect(() => {
    scale.value = withDelay(index * 80, withSpring(1, { damping: 14 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg = done
    ? colors.success || '#22C55E'
    : active
    ? colors.primary
    : colors.border;

  const textColor = done || active ? '#fff' : colors.textSecondary;

  return (
    <View style={styles.pipWrapper}>
      <Animated.View style={[styles.pip, { backgroundColor: bg }, animStyle]}>
        {done ? (
          <CheckCircle2 size={14} color="#fff" />
        ) : (
          <Text style={[styles.pipNumber, { color: textColor }]}>{number}</Text>
        )}
      </Animated.View>
      <Text
        style={[
          styles.pipLabel,
          { color: active || done ? colors.textPrimary : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Next Action Banner ───────────────────────────────────────────────────────

function NextActionBanner({
  text,
  colors,
  onPress,
}: {
  text: string;
  colors: any;
  onPress?: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <Pressable
        onPress={onPress}
        style={[
          styles.nextBanner,
          { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' },
        ]}
      >
        <View style={[styles.nextBannerDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.nextBannerText, { color: colors.primary }]} numberOfLines={2}>
          {text}
        </Text>
        {onPress && <ChevronRight size={16} color={colors.primary} />}
      </Pressable>
    </Animated.View>
  );
}

// ─── School Monogram ──────────────────────────────────────────────────────────

function SchoolMonogram({ name, code, colors }: { name: string; code: string; colors: any }) {
  const letters = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  return (
    <View style={[styles.monogram, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
      <Text style={[styles.monogramText, { color: colors.primary }]}>{letters}</Text>
    </View>
  );
}

// ─── CopyRow ─────────────────────────────────────────────────────────────────

function CopyRow({
  label,
  value,
  onCopy,
  colors,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  colors: any;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onCopy}
      style={[
        styles.copyRow,
        {
          backgroundColor: pressed ? colors.primary + '10' : colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.copyLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.copyValueGroup}>
        <Text style={[styles.copyValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
        <View style={[styles.copyIcon, { backgroundColor: colors.border }]}>
          <Copy size={13} color={colors.textSecondary} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SetupGuideScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { id } = useLocalSearchParams();
  const rawId = Array.isArray(id) ? id[0] : id;
  const schoolId = Number(rawId);
  const router = useRouter();
  const { toasts, show: showToast } = useToast();

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [firebaseInstructionsExpanded, setFirebaseInstructionsExpanded] = useState(false);
  const [setupScriptDetailsExpanded, setSetupScriptDetailsExpanded] = useState(false);

  const [autoState, setAutoState] = useState({
    schoolExists: false,
    defaultsSeeded: false,
    firstAdminExists: false,
  });
  const [stepState, setStepState] = useState<StepState>(defaultStepState);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isNaN(schoolId)) initialize();
  }, [schoolId]);

  const initialize = async () => {
    setLoading(true);
    try {
      const [schoolData, healthData] = await Promise.all([
        superAdminApi.getSchool(schoolId),
        superAdminApi.getSchoolHealth(schoolId),
      ]);
      setSchool(schoolData);
      setAutoState({
        schoolExists: !!schoolData.id,
        defaultsSeeded: healthData.defaults_seeded,
        firstAdminExists: healthData.first_admin_exists,
      });
      const saved = await AsyncStorage.getItem(`setup_guide_${schoolId}`);
      if (saved) setStepState({ ...defaultStepState, ...JSON.parse(saved) });
    } catch {
      Alert.alert('Error', 'Failed to fetch setup details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSetSteps = async (updates: Partial<StepState>) => {
    const newState = { ...stepState, ...updates };
    setStepState(newState);
    await AsyncStorage.setItem(`setup_guide_${schoolId}`, JSON.stringify(newState));
  };

  const handleToggleStep = async (stepKey: StepKeys) => {
    await handleSetSteps({ [stepKey]: !stepState[stepKey] });
  };

  const handleToggleStepGroup = async (primaryStepKey: StepKeys, linkedStepKeys: StepKeys[] = []) => {
    const nextValue = !stepState[primaryStepKey];
    const updates = [primaryStepKey, ...linkedStepKeys].reduce<Partial<StepState>>(
      (acc, key) => ({ ...acc, [key]: nextValue }),
      {}
    );
    await handleSetSteps(updates);
  };

  const resetChecklist = () => {
    Alert.alert('Reset Checklist', 'Clear all manual checkboxes for this school?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            setMenuVisible(false);
            setStepState(defaultStepState);
            await AsyncStorage.removeItem(`setup_guide_${schoolId}`);
          } catch {
            // silent
          }
        },
      },
    ]);
  };

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    showToast(`${label} copied`);
  };

  const handleMarkAsLive = async () => {
    if (!school) return;
    Alert.alert('Mark as Live?', `Confirm ${school.name} is fully operational.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark as Live',
        onPress: async () => {
          try {
            setActionLoading(true);
            const updated = await superAdminApi.toggleSchoolActive(schoolId, true, 'Marked live by super admin');
            setSchool(updated);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to update school');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const phase1Done = autoState.schoolExists && autoState.defaultsSeeded && autoState.firstAdminExists;
  const configureFilesDone =
    stepState.step_configure_env &&
    stepState.step_configure_appjson &&
    stepState.step_configure_easjson &&
    stepState.step_configure_firebase;
  const phase2Done =
    stepState.step_duplicate_done &&
    configureFilesDone &&
    stepState.step_expo_project_done &&
    stepState.step_setup_script_done &&
    stepState.step_2_4;
  const phase3Done = stepState.step_3_1 && stepState.step_3_2 && stepState.step_3_3;
  const phase4Done = stepState.step_4_1 && stepState.step_4_2 && !!school?.is_active;

  const phase1Count = [autoState.schoolExists, autoState.defaultsSeeded, autoState.firstAdminExists].filter(Boolean).length;
  const phase2Count = [
    stepState.step_duplicate_done,
    stepState.step_configure_env,
    stepState.step_configure_appjson,
    stepState.step_configure_easjson,
    stepState.step_configure_firebase,
    stepState.step_expo_project_done,
    stepState.step_setup_script_done,
    stepState.step_2_4,
  ].filter(Boolean).length;
  const phase3Count = [stepState.step_3_1, stepState.step_3_2, stepState.step_3_3].filter(Boolean).length;
  const phase4Count = [stepState.step_4_1, stepState.step_4_2, !!school?.is_active].filter(Boolean).length;

  const totalSteps = 17;
  const completedSteps = phase1Count + phase2Count + phase3Count + phase4Count;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const allDone = phase1Done && phase2Done && phase3Done && phase4Done;

  // ── Next action ───────────────────────────────────────────────────────────

  const nextAction = (() => {
    if (!phase1Done) {
      if (!autoState.firstAdminExists) return { text: 'Create the first admin account to complete Phase 1', action: () => school && router.push(`/(app)/schools/${school.id}`) };
      if (!autoState.defaultsSeeded) return { text: 'Re-seed defaults to complete Phase 1', action: undefined };
      return { text: 'Platform setup is completing automatically…', action: undefined };
    }
    if (!phase2Done) {
      if (!stepState.step_duplicate_done) return { text: 'Duplicate and rename the base SchoolIMS project folder', action: undefined };
      if (!stepState.step_configure_env) return { text: 'Configure .env with school variables', action: undefined };
      if (!stepState.step_configure_appjson) return { text: 'Update app.json bundle ID, slug, and EAS project fields', action: undefined };
      if (!stepState.step_configure_easjson) return { text: 'Add this school’s eas.json build profile', action: undefined };
      if (!stepState.step_configure_firebase) return { text: 'Replace google-services.json with the Firebase app file', action: undefined };
      if (!stepState.step_expo_project_done) return { text: 'Run eas project:create inside the duplicated folder', action: undefined };
      if (!stepState.step_setup_script_done) return { text: 'Run the new-school setup script before building', action: undefined };
      return { text: 'Replace branding assets (icon, splash, adaptive-icon)', action: undefined };
    }
    if (!phase3Done) {
      if (!stepState.step_3_1) return { text: 'Build the Android APK via EAS', action: undefined };
      if (!stepState.step_3_2) return { text: 'Install and test APK on a real device', action: undefined };
      return { text: 'Deliver APK & credentials securely to school admin', action: undefined };
    }
    if (!phase4Done) {
      if (!school?.is_active) return { text: 'Mark school as Live once admin confirms first login', action: undefined };
      return { text: 'Confirm school has set up academic year and staff', action: undefined };
    }
    return null;
  })();

  // ── Progress animation ────────────────────────────────────────────────────

  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withTiming(progressPercent, { duration: 600 });
  }, [progressPercent]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const allReady = phase1Done && phase2Done;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || !school) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>Loading setup guide…</Text>
      </View>
    );
  }

  const folderNameSuggestion = `schoolims-${school.id}`;
  const androidPackage = school.android_package || `com.nexsyrus.schoolims.${school.code.toLowerCase()}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Setup Guide',
          headerRight: () => (
            <View style={styles.headerActions}>
              <View>
                <Pressable
                  onPress={() => setMenuVisible(!menuVisible)}
                  style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <MoreVertical size={17} color={colors.textPrimary} />
                </Pressable>
                {menuVisible && (
                  <Animated.View
                    entering={FadeIn.duration(150)}
                    style={[styles.menuDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Pressable style={styles.menuItem} onPress={resetChecklist}>
                      <AlertTriangle size={14} color={colors.error} />
                      <Text style={[styles.menuItemText, { color: colors.error }]}>Reset checklist</Text>
                    </Pressable>
                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                    <Pressable
                      style={styles.menuItem}
                      onPress={() => { setMenuVisible(false); initialize(); }}
                    >
                      <Zap size={14} color={colors.textPrimary} />
                      <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>Refresh health check</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            </View>
          ),
        }}
      />

      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* ── Hero Header ── */}
        <View style={[styles.hero, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {/* School identity row */}
          <View style={styles.heroTop}>
            <SchoolMonogram name={school.name} code={school.code} colors={colors} />
            <View style={styles.heroTitles}>
              <Text style={[styles.schoolName, { color: colors.textPrimary }]} numberOfLines={1}>
                {school.name}
              </Text>
              <Text style={[styles.schoolCode, { color: colors.textSecondary }]}>{school.code}</Text>
            </View>
            <View>
              {school.is_active ? (
                <Badge label="LIVE" variant="success" />
              ) : (
                <Badge label={allReady ? 'READY' : 'SETUP'} variant={allReady ? 'success' : 'warning'} />
              )}
            </View>
          </View>

          {/* Phase pips row */}
          <View style={[styles.pipsRow, { borderTopColor: colors.border }]}>
            {[
              { label: 'Platform', done: phase1Done, active: !phase1Done },
              { label: 'Expo', done: phase2Done, active: phase1Done && !phase2Done },
              { label: 'Build', done: phase3Done, active: phase2Done && !phase3Done },
              { label: 'Handover', done: phase4Done, active: phase3Done && !phase4Done },
            ].map((p, i) => (
              <React.Fragment key={i}>
                <PhasePip number={i + 1} label={p.label} done={p.done} active={p.active} colors={colors} index={i} />
                {i < 3 && (
                  <View
                    style={[styles.pipConnector, { backgroundColor: p.done ? (colors.success || '#22C55E') : colors.border }]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Progress bar */}
          <View style={styles.progressArea}>
            <View style={styles.progressMeta}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {completedSteps} / {totalSteps} tasks
              </Text>
              <Text style={[styles.progressPct, { color: colors.primary }]}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[styles.progressFill, { backgroundColor: allDone ? (colors.success || '#22C55E') : colors.primary }, animatedProgressStyle]}
              />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Next Action Banner ── */}
          {nextAction && !allDone && (
            <NextActionBanner text={`Next → ${nextAction.text}`} colors={colors} onPress={nextAction.action} />
          )}

          {allDone && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={[styles.completeBanner, { backgroundColor: (colors.success || '#22C55E') + '14', borderColor: (colors.success || '#22C55E') + '40' }]}
            >
              <CheckCircle2 size={18} color={colors.success || '#22C55E'} />
              <Text style={[styles.completeBannerText, { color: colors.success || '#22C55E' }]}>
                All phases complete — {school.name} is live!
              </Text>
            </Animated.View>
          )}

          {/* ── PHASE 1 ── */}
          <PhaseSection
            phaseNumber={1}
            title="DB & Platform Setup"
            subtitle="NexSyrus backend tasks — done via this console"
            status={phase1Done ? 'Done' : 'In Progress'}
            completedCount={phase1Count}
            totalCount={3}
            initialExpanded={!phase1Done}
          >
            <StepItem
              type="Auto"
              title="School seeded in database"
              description="School row created in schools table with name, code, and is_active = true."
              isCompleted={autoState.schoolExists}
            >
              <View style={styles.chipRow}>
                <View style={[styles.chip, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>ID: {school.id}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>Code: {school.code}</Text>
                </View>
              </View>
            </StepItem>

            <StepItem
              type="Auto"
              title="Default roles and permissions seeded"
              description="6 system roles (admin, staff, student, accounts, principal, driver) and all permissions seeded. Role-permission mappings applied."
              isCompleted={autoState.defaultsSeeded}
            >
              {!autoState.defaultsSeeded && (
                <Button
                  title="Re-seed Defaults"
                  variant="secondary"
                  style={styles.actionBtn}
                  onPress={async () => {
                  try {
                    await superAdminApi.seedSchoolDefaults(school.id);
                    await initialize();
                  } catch {
                    // silent
                  }
                  }}
                />
              )}
            </StepItem>

            <StepItem
              type="Auto"
              title="First admin account created"
              description="A Supabase Auth user created and linked as role = admin. This is the school's primary admin who configures the app after handover."
              isCompleted={autoState.firstAdminExists}
              isLast
            >
              {!autoState.firstAdminExists && (
                <Button
                  title="Create First Admin →"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => router.push(`/(app)/schools/${school.id}`)}
                />
              )}
            </StepItem>
          </PhaseSection>

          {/* ── PHASE 2 ── */}
          {/* Overlap: the old create-project, .env, and app.json steps are merged here to avoid duplicate setup tasks. */}
          <PhaseSection
            phaseNumber={2}
            title="Expo App Configuration"
            subtitle="Developer task — configure the school's Expo project"
            status={phase2Done ? 'Done' : !phase1Done ? 'Pending' : 'In Progress'}
            completedCount={phase2Count}
            totalCount={8}
            initialExpanded={phase1Done && !phase2Done}
          >
            <StepItem
              type="Dev Task"
              title="Duplicate Base Project"
              description="Copy the SchoolIMS base project folder. Rename it to match this school."
              isCompleted={stepState.step_duplicate_done}
              onToggle={() => handleToggleStepGroup('step_duplicate_done', ['step_2_1'])}
            >
              <CopyRow
                label="Folder name"
                value={folderNameSuggestion}
                onCopy={() => handleCopy(folderNameSuggestion, 'Folder name')}
                colors={colors}
              />
              <NoteBlock
                variant="info"
                text="Copy the SchoolIMS base Expo project (or your repo template). Each school gets its own repository or branch."
                colors={colors}
              />
              <NoteBlock
                variant="warning"
                text="Do NOT reuse the same build for multiple schools. School identity is baked at build time. One school = one app."
                colors={colors}
              />
            </StepItem>

            <StepItem
              type="Dev Task"
              title="Configure School Files"
              description="Update the school-specific project files before creating or building the Expo app."
              isCompleted={configureFilesDone}
              onToggle={() => {
                const nextValue = !configureFilesDone;
                handleSetSteps({
                  step_configure_env: nextValue,
                  step_configure_appjson: nextValue,
                  step_configure_easjson: nextValue,
                  step_configure_firebase: nextValue,
                  step_2_2: nextValue,
                  step_2_3: nextValue,
                });
              }}
            >
              <View style={styles.fileRows}>
                <View style={[styles.fileRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.fileRowHeader}>
                    <Text style={[styles.fileName, { color: colors.textPrimary }]}>.env</Text>
                    <Button
                      title="View .env Config"
                      size="sm"
                      variant="secondary"
                      onPress={() => router.push(`/(app)/schools/${school.id}/build-config?section=env`)}
                    />
                  </View>
                  <Text style={[styles.fileChangeText, { color: colors.textSecondary }]}>All school environment values</Text>
                  <Text style={[styles.fileChangeText, { color: colors.textSecondary }]}>
                    Generate the school package from the setup wizard, then apply the ZIP. The preview below is the live configuration, not a second template.
                  </Text>
                  <Pressable
                    style={styles.inlineCheckRow}
                    onPress={() => handleSetSteps({
                      step_configure_env: !stepState.step_configure_env,
                      step_2_2: !stepState.step_configure_env,
                    })}
                  >
                    <CheckCircle2
                      size={18}
                      color={stepState.step_configure_env ? (colors.success || '#22C55E') : colors.textSecondary}
                    />
                    <Text style={[styles.inlineCheckText, { color: colors.textPrimary }]}>.env configured</Text>
                  </Pressable>
                  <CodeBlock
                    content={`EXPO_PUBLIC_SCHOOL_ID=${school.id}
EXPO_PUBLIC_SCHOOL_CODE=${school.code}
EXPO_PUBLIC_SCHOOL_NAME="${school.name}"
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
                  />
                </View>

                <View style={[styles.fileRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.fileRowHeader}>
                    <Text style={[styles.fileName, { color: colors.textPrimary }]}>app.json</Text>
                    <Button
                      title="View app.json Changes"
                      size="sm"
                      variant="secondary"
                      onPress={() => router.push(`/(app)/schools/${school.id}/build-config?section=appjson`)}
                    />
                  </View>
                  <Text style={[styles.fileChangeText, { color: colors.textSecondary }]}>
                    name, slug, android.package, ios.bundleIdentifier, extra.eas.projectId
                  </Text>
                  <Text style={[styles.fileChangeText, { color: colors.textSecondary }]}>
                    Edit app.json to set the school-specific app name, slug, and bundle identifier.
                  </Text>
                  <Pressable
                    style={styles.inlineCheckRow}
                    onPress={() => handleSetSteps({
                      step_configure_appjson: !stepState.step_configure_appjson,
                      step_2_3: !stepState.step_configure_appjson,
                    })}
                  >
                    <CheckCircle2
                      size={18}
                      color={stepState.step_configure_appjson ? (colors.success || '#22C55E') : colors.textSecondary}
                    />
                    <Text style={[styles.inlineCheckText, { color: colors.textPrimary }]}>app.json updated</Text>
                  </Pressable>
                  <CodeBlock
                    content={`{
  "expo": {
    "name": "${school.name}",
    "slug": "schoolims-${school.code.toLowerCase()}",
    "ios": {
      "bundleIdentifier": "com.nexsyrus.schoolims.${school.code.toLowerCase()}"
    },
    "android": {
      "package": "com.nexsyrus.schoolims.${school.code.toLowerCase()}"
    }
  }
}`}
                  />
                </View>

                <View style={[styles.fileRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.fileRowHeader}>
                    <Text style={[styles.fileName, { color: colors.textPrimary }]}>eas.json</Text>
                    <Button
                      title="View eas.json Profile"
                      size="sm"
                      variant="secondary"
                      onPress={() => router.push(`/(app)/schools/${school.id}/build-config?section=easjson`)}
                    />
                  </View>
                  <Text style={[styles.fileChangeText, { color: colors.textSecondary }]}>Add new profile block for this school</Text>
                  <Pressable
                    style={styles.inlineCheckRow}
                    onPress={() => handleSetSteps({ step_configure_easjson: !stepState.step_configure_easjson })}
                  >
                    <CheckCircle2
                      size={18}
                      color={stepState.step_configure_easjson ? (colors.success || '#22C55E') : colors.textSecondary}
                    />
                    <Text style={[styles.inlineCheckText, { color: colors.textPrimary }]}>eas.json profile added</Text>
                  </Pressable>
                </View>

                <View style={[styles.fileRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.fileRowHeader}>
                    <Text style={[styles.fileName, { color: colors.textPrimary }]}>google-services.json</Text>
                    <Button
                      title="Firebase Instructions"
                      size="sm"
                      variant="secondary"
                      onPress={() => setFirebaseInstructionsExpanded(!firebaseInstructionsExpanded)}
                    />
                  </View>
                  <Text style={[styles.fileChangeText, { color: colors.textSecondary }]}>Replace with real file from Firebase Console</Text>
                  {firebaseInstructionsExpanded && (
                    <View style={[styles.subChecklist, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {[
                        '1. Go to console.firebase.google.com',
                        '2. Open your SchoolIMS Firebase project',
                        '3. Project Settings → Add Android App',
                        `4. Package name: ${androidPackage}`,
                        '5. Download google-services.json',
                        '6. Replace the file in your project folder',
                      ].map((item, i) => (
                        <View key={i} style={styles.subCheckRow}>
                          <View style={[styles.subCheckDot, { backgroundColor: colors.border }]} />
                          <Text style={[styles.subCheckText, { color: colors.textSecondary }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <NoteBlock
                    variant="info"
                    text={`After replacing google-services.json, run the setup script.\nIt will automatically verify:\n- google-services.json exists and is not the template\n- Package name in google-services.json matches android.package in app.json\n- If they don't match → script exits with exact error message telling you what to fix`}
                    colors={colors}
                  />
                  <Pressable
                    style={styles.inlineCheckRow}
                    onPress={() => handleSetSteps({ step_configure_firebase: !stepState.step_configure_firebase })}
                  >
                    <CheckCircle2
                      size={18}
                      color={stepState.step_configure_firebase ? (colors.success || '#22C55E') : colors.textSecondary}
                    />
                    <Text style={[styles.inlineCheckText, { color: colors.textPrimary }]}>google-services.json replaced</Text>
                  </Pressable>
                </View>
              </View>
            </StepItem>

            <StepItem
              type="Dev Task"
              title="Create Expo Project"
              description="cd into the duplicated school folder, then run these commands."
              isCompleted={stepState.step_expo_project_done}
              onToggle={() => handleToggleStep('step_expo_project_done')}
            >
              <CodeBlock content="eas login" />
              <CodeBlock content="eas project:create" />
              <NoteBlock
                variant="info"
                text="eas project:create automatically writes the projectId into app.json. No manual copy needed."
                colors={colors}
              />
            </StepItem>

            <StepItem
              type="Dev Task"
              title="Run Setup Script"
              description="From inside the duplicated school folder, run the setup script."
              isCompleted={stepState.step_setup_script_done}
              onToggle={() => handleToggleStep('step_setup_script_done')}
            >
              <CodeBlock content="./scripts/new-school-setup.sh" />
              <Button
                title={setupScriptDetailsExpanded ? 'Hide What this script does' : 'What this script does'}
                variant="secondary"
                style={styles.actionBtn}
                onPress={() => setSetupScriptDetailsExpanded(!setupScriptDetailsExpanded)}
              />
              {setupScriptDetailsExpanded && (
                <View style={[styles.subChecklist, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {[
                    'Validates .env is configured',
                    'Validates app.json package is set',
                    'Validates google-services.json is replaced',
                    'Validates package names match across files',
                    'Cleans all stale build artifacts',
                    'Runs npm install',
                    'Runs npx expo prebuild --clean',
                  ].map((item, i) => (
                    <View key={i} style={styles.subCheckRow}>
                      <CheckCircle2 size={14} color={colors.success || '#22C55E'} />
                      <Text style={[styles.subCheckText, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              <NoteBlock
                variant="warning"
                text="⚠️ If the script exits with an error, fix the flagged file before re-running. Do not skip this step."
                colors={colors}
              />
            </StepItem>

            <StepItem
              type="Dev Task"
              title="Replace default branding assets"
              description="Replace assets/icon.png, splash.png, and adaptive-icon.png with the school's logo. Recommended: icon 1024×1024, splash 1284×2778."
              isCompleted={stepState.step_2_4}
              onToggle={() => handleToggleStep('step_2_4')}
              isLast
            >
              {school.logo_url && (
                <NoteBlock
                  variant="info"
                  text={`Logo URL is set — download and use as icon source:\n${school.logo_url}`}
                  colors={colors}
                />
              )}
            </StepItem>
          </PhaseSection>

          {/* ── PHASE 3 ── */}
          <PhaseSection
            phaseNumber={3}
            title="Build & Distribution"
            subtitle="Build the APK/IPA and deliver to school"
            status={phase3Done ? 'Done' : !phase2Done ? 'Pending' : 'In Progress'}
            completedCount={phase3Count}
            totalCount={3}
            initialExpanded={phase2Done && !phase3Done}
          >
            <StepItem
              type="Dev Task"
              title="Build Android APK via EAS"
              description="Run EAS build to produce a school-specific APK. Use the internal profile for first delivery."
              isCompleted={stepState.step_3_1}
              onToggle={() => handleToggleStep('step_3_1')}
            >
              <CodeBlock content={`eas build --platform android --profile preview`} />
              <NoteBlock
                variant="info"
                text="Use --profile production for Play Store. Use --profile preview for direct APK distribution."
                colors={colors}
              />
            </StepItem>

            <StepItem
              type="Dev Task"
              title="Install and test the APK"
              description="Install on an Android device. Log in with first admin credentials and verify all systems."
              isCompleted={stepState.step_3_2}
              onToggle={() => handleToggleStep('step_3_2')}
            >
              <View style={[styles.subChecklist, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {[
                  'Login with first admin credentials works',
                  'School name displayed correctly in app header',
                  'Dashboard loads without errors',
                  'Push notification test passes',
                ].map((item, i) => (
                  <View key={i} style={styles.subCheckRow}>
                    <View style={[styles.subCheckDot, { backgroundColor: colors.border }]} />
                    <Text style={[styles.subCheckText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </StepItem>

            <StepItem
              type="Dev Task"
              title="Deliver APK to school admin"
              description="Share APK and first admin credentials securely. Use a password manager — never send credentials over WhatsApp or email in plaintext."
              isCompleted={stepState.step_3_3}
              onToggle={() => handleToggleStep('step_3_3')}
              isLast
            >
              <NoteBlock
                variant="error"
                text="Never share admin passwords in plaintext. Use a password manager export or a secure one-time link."
                colors={colors}
              />
            </StepItem>
          </PhaseSection>

          {/* ── PHASE 4 ── */}
          <PhaseSection
            phaseNumber={4}
            title="Handover & Verification"
            subtitle="Confirm the school is live and operational"
            status={phase4Done ? 'Done' : !phase3Done ? 'Pending' : 'In Progress'}
            completedCount={phase4Count}
            totalCount={3}
            initialExpanded={phase3Done}
          >
            <StepItem
              type="Manual"
              title="School admin first login"
              description="Confirm the school admin has logged in and can access their dashboard."
              isCompleted={stepState.step_4_1}
              onToggle={() => handleToggleStep('step_4_1')}
            />

            <StepItem
              type="Manual"
              title="School sets up academic year, classes, and staff"
              description="School admin creates academic year, adds classes/sections, adds staff, and enrolls students inside their app — not via this console."
              isCompleted={stepState.step_4_2}
              onToggle={() => handleToggleStep('step_4_2')}
            >
              <NoteBlock
                variant="info"
                text="Your job ends at APK delivery. The school admin owns their configuration from this point."
                colors={colors}
              />
            </StepItem>

            <StepItem
              type="Action"
              title="Mark school as live in platform"
              description="Confirm the school is operational and active on the platform."
              isCompleted={school.is_active}
              isLast
            >
              {school.is_active ? (
                <View style={styles.liveRow}>
                  <CheckCircle2 size={16} color={colors.success || '#22C55E'} />
                  <Text style={[styles.liveText, { color: colors.success || '#22C55E' }]}>School is live</Text>
                </View>
              ) : (
                <Button
                  title="Mark as Live"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={handleMarkAsLive}
                  loading={actionLoading}
                />
              )}
            </StepItem>
          </PhaseSection>

          {/* ── Quick Reference Card ── */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={[styles.refCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.refCardHeader}>
                <Text style={[styles.refCardTitle, { color: colors.textPrimary }]}>Quick Reference</Text>
                <Text style={[styles.refCardSub, { color: colors.textSecondary }]}>Tap any row to copy</Text>
              </View>

              <CopyRow
                label="School ID"
                value={school.id.toString()}
                onCopy={() => handleCopy(school.id.toString(), 'School ID')}
                colors={colors}
              />
              <CopyRow
                label="School Code"
                value={school.code}
                onCopy={() => handleCopy(school.code, 'School Code')}
                colors={colors}
              />
              <CopyRow
                label="Env var name"
                value="EXPO_PUBLIC_SCHOOL_ID"
                onCopy={() => handleCopy('EXPO_PUBLIC_SCHOOL_ID', 'Env var name')}
                colors={colors}
              />
              {school.logo_url && (
                <CopyRow
                  label="Logo URL"
                  value={school.logo_url}
                  onCopy={() => handleCopy(school.logo_url!, 'Logo URL')}
                  colors={colors}
                />
              )}

              <Pressable
                style={[styles.viewDetailsBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' }]}
                onPress={() => router.replace(`/(app)/schools/${school.id}`)}
              >
                <Text style={[styles.viewDetailsText, { color: colors.primary }]}>View School Details</Text>
                <ExternalLink size={15} color={colors.primary} />
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ height: 48 }} />
        </ScrollView>

        {/* Toast layer */}
        <ToastContainer toasts={toasts} colors={colors} />
      </SafeAreaView>
    </>
  );
}

// ─── NoteBlock helper (replaces inline noteBlock usage) ───────────────────────

function NoteBlock({
  variant,
  text,
  colors,
}: {
  variant: 'warning' | 'info' | 'error';
  text: string;
  colors: any;
}) {
  const colorMap: Record<string, string> = {
    warning: colors.warning,
    info: colors.primary,
    error: colors.error,
  };
  const c = colorMap[variant];
  return (
    <View style={[styles.noteBlock, { backgroundColor: c + '12', borderColor: c + '30' }]}>
      <Text style={[styles.noteText, { color: c }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingLabel: { fontSize: 13, fontWeight: '500' },
  container: { flex: 1 },

  // Header actions
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  menuDropdown: {
    position: 'absolute', top: 44, right: 0,
    borderRadius: 14, borderWidth: 1, minWidth: 192,
    zIndex: 100, shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12,
    shadowRadius: 12, elevation: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 13, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 12 },

  // Hero
  hero: {
    paddingTop: 20, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0 },
  monogram: {
    width: 46, height: 46, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5,
  },
  monogramText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  heroTitles: { flex: 1 },
  schoolName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  schoolCode: { fontSize: 12, fontWeight: '600', marginTop: 1, opacity: 0.6 },

  // Pips
  pipsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, paddingTop: 16, borderTopWidth: 1,
  },
  pipWrapper: { alignItems: 'center', flex: 1 },
  pip: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  pipNumber: { fontSize: 13, fontWeight: '800' },
  pipLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  pipConnector: { height: 2, flex: 1, marginBottom: 20, borderRadius: 1 },

  // Progress
  progressArea: { marginTop: 18 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressPct: { fontSize: 18, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 4 },

  // Banners
  nextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  nextBannerDot: { width: 8, height: 8, borderRadius: 4 },
  nextBannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  completeBannerText: { fontSize: 13, fontWeight: '700', flex: 1 },

  // Action button helper
  actionBtn: { marginTop: 12, alignSelf: 'flex-start' },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '700' },

  // Note block
  noteBlock: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  noteText: { fontSize: 12.5, lineHeight: 19, fontWeight: '600' },

  // File configuration rows
  fileRows: { gap: 12 },
  fileRow: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  fileRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fileName: { fontSize: 14, fontFamily: 'monospace', fontWeight: '800', flex: 1 },
  fileChangeText: { fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  inlineCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  inlineCheckText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Sub-checklist
  subChecklist: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8, gap: 10 },
  subCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subCheckDot: { width: 6, height: 6, borderRadius: 3 },
  subCheckText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Live row
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  liveText: { fontSize: 14, fontWeight: '700' },

  // Reference card
  refCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginTop: 8,
  },
  refCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, paddingBottom: 8,
  },
  refCardTitle: { fontSize: 16, fontWeight: '800' },
  refCardSub: { fontSize: 11, fontWeight: '500' },
  copyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 0.5, borderColor: 'transparent',
  },
  copyLabel: { fontSize: 13, fontWeight: '500' },
  copyValueGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  copyValue: { fontSize: 12, fontFamily: 'monospace', fontWeight: '700', maxWidth: width * 0.45 },
  copyIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  viewDetailsBtn: {
    margin: 14, marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  viewDetailsText: { fontSize: 14, fontWeight: '700' },

  // Toast
  toastContainer: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignItems: 'center', pointerEvents: 'none', gap: 8,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 10,
  },
  toastText: { fontSize: 13, fontWeight: '700' },
});