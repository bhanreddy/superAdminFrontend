import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  CheckSquare,
  ChevronRight,
  FileText,
  School,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { PERMISSIONS } from '../../constants/rbac';
import { superAdminApi } from '../../services/apiService';
import { bottomTabPad } from '../founder/founderUi';

type DashboardAction = {
  key: string;
  label: string;
  description: string;
  route: string;
  color: string;
  icon: React.ReactNode;
};

/**
 * Safe fallback dashboard for current and future internal roles. It renders
 * only capabilities present in the effective permission set returned by the
 * server, so adding a role never falls through to Founder-only UI.
 */
export default function GenericRoleDashboard() {
  const { colors, clayShadows } = useTheme();
  const { user, employeeId, roleLabel, assignedSchools, can } = useAuth();
  const router = useRouter();
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canReadSchools = can(PERMISSIONS.SCHOOLS_READ_ALL) || can(PERMISSIONS.SCHOOLS_READ_ASSIGNED);

  const loadSchools = useCallback(async () => {
    if (!canReadSchools) {
      setSchoolCount(0);
      setRefreshing(false);
      return;
    }

    try {
      const response: any = await superAdminApi.getSchools();
      const schools = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setSchoolCount(schools.length);
    } catch {
      setSchoolCount(null);
    } finally {
      setRefreshing(false);
    }
  }, [canReadSchools]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const actions = useMemo<DashboardAction[]>(() => {
    const available: DashboardAction[] = [];

    if (canReadSchools) {
      available.push({
        key: 'schools',
        label: 'Schools',
        description: 'Open the schools available to your role and assignments.',
        route: '/(app)/schools/',
        color: '#0A84FF',
        icon: <School size={22} color="#0A84FF" />,
      });
    }
    if (can(PERMISSIONS.CHECKLIST_READ)) {
      available.push({
        key: 'checklist',
        label: 'Onboarding Checklist',
        description: 'Review launch readiness for schools in your scope.',
        route: '/(app)/checklist',
        color: '#30D158',
        icon: <CheckSquare size={22} color="#30D158" />,
      });
    }
    if (can(PERMISSIONS.REQUIREMENTS_READ)) {
      available.push({
        key: 'requirements',
        label: 'Requirements',
        description: 'Review and track school requirements.',
        route: '/(app)/requirements',
        color: '#AF52DE',
        icon: <FileText size={22} color="#AF52DE" />,
      });
    }
    if (can(PERMISSIONS.COMPLAINTS_READ)) {
      available.push({
        key: 'complaints',
        label: 'Complaints & Support',
        description: 'View tickets permitted for your portfolio.',
        route: '/(app)/complaints',
        color: '#FF9F0A',
        icon: <AlertCircle size={22} color="#FF9F0A" />,
      });
    }
    if (can(PERMISSIONS.STUDENTS_IMPORT)) {
      available.push({
        key: 'imports',
        label: 'Data Imports',
        description: 'Upload and validate school data.',
        route: '/(app)/students/',
        color: '#64D2FF',
        icon: <UploadCloud size={22} color="#64D2FF" />,
      });
    }

    return available;
  }, [can, canReadSchools]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Team member';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadSchools();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View
        style={[
          styles.hero,
          clayStyle(clayShadows.clayElevated),
          { backgroundColor: colors.surface, borderColor: colors.clayBorderColor },
        ]}
      >
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
          <ShieldCheck size={26} color={colors.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{roleLabel}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome, {displayName}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your workspace reflects your current role, individual overrides, and assigned school portfolio.</Text>
        </View>
        {employeeId ? (
          <View style={[styles.employeeBadge, { backgroundColor: `${colors.primary}12` }]}>
            <Text style={[styles.employeeText, { color: colors.primary }]}>{employeeId}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.clayBorderColor }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible schools</Text>
          {schoolCount === null ? (
            <ActivityIndicator color={colors.primary} style={styles.metricLoader} />
          ) : (
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{schoolCount}</Text>
          )}
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.clayBorderColor }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Direct assignments</Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{assignedSchools.length}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available tools</Text>
      {actions.length ? (
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => router.push(action.route as any)}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface, borderColor: colors.clayBorderColor },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>{action.icon}</View>
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{action.label}</Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{action.description}</Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.clayBorderColor }]}>
          <ShieldCheck size={28} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No modules assigned</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Ask your manager or a Founder to review your role and permission overrides.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, gap: 18 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 25, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20, maxWidth: 720 },
  employeeBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10 },
  employeeText: { fontSize: 12, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metricCard: { minWidth: 180, flexGrow: 1, borderWidth: 1, borderRadius: 18, padding: 18, gap: 7 },
  metricLabel: { fontSize: 13, fontWeight: '600' },
  metricValue: { fontSize: 30, fontWeight: '800' },
  metricLoader: { alignSelf: 'flex-start', marginVertical: 8 },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginTop: 4 },
  actionGrid: { gap: 12 },
  actionCard: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 15, fontWeight: '800' },
  actionDescription: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 520, lineHeight: 19 },
});
