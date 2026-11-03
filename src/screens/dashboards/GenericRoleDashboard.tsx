import type { ThemeColors } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { getCardTone } from '../../constants/experienceColors';
import { workspaceUi } from '../../constants/layout';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { brandColors, experienceColors } from '../../constants/experienceColors';
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
  const { colors, clayShadows, isDark } = useTheme();
  const paint = getCardTone('blue', isDark);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user, employeeId, roleLabel, assignedSchools, can } = useAuth();
  const router = useRouter();
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canReadSchools =
    can(PERMISSIONS.SCHOOLS_READ_ALL) || can(PERMISSIONS.SCHOOLS_READ_ASSIGNED);

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
        color: brandColors.red,
        icon: <School size={22} color={brandColors.red} />,
      });
    }
    if (can(PERMISSIONS.CHECKLIST_READ)) {
      available.push({
        key: 'checklist',
        label: 'Onboarding Checklist',
        description: 'Review launch readiness for schools in your scope.',
        route: '/(app)/checklist',
        color: '#335F90',
        icon: <CheckSquare size={22} color="#335F90" />,
      });
    }
    if (can(PERMISSIONS.REQUIREMENTS_READ)) {
      available.push({
        key: 'requirements',
        label: 'Requirements',
        description: 'Review and track school requirements.',
        route: '/(app)/requirements',
        color: colors.info,
        icon: <FileText size={22} color={colors.info} />,
      });
    }
    if (can(PERMISSIONS.COMPLAINTS_READ)) {
      available.push({
        key: 'complaints',
        label: 'Complaints & Support',
        description: 'View tickets permitted for your portfolio.',
        route: '/(app)/complaints',
        color: colors.warning,
        icon: <AlertCircle size={22} color={colors.warning} />,
      });
    }
    if (can(PERMISSIONS.STUDENTS_IMPORT)) {
      available.push({
        key: 'imports',
        label: 'Data Imports',
        description: 'Upload and validate school data.',
        route: '/(app)/students/',
        color: colors.info,
        icon: <UploadCloud size={22} color={colors.info} />,
      });
    }

    return available;
  }, [can, canReadSchools, colors]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Team member';

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
      <ScreenHeader
        eyebrow={[roleLabel, employeeId].filter(Boolean).join(' · ')}
        title={`Welcome, ${displayName}`}
        subtitle="Your schools, assignments, and available tools in one place."
      />

      <View style={styles.metricsRow}>
        <Card noPadding
          style={[
            styles.metricCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.clayBorderColor,
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Visible schools
          </Text>
          {schoolCount === null ? (
            <ActivityIndicator
              color={colors.primary}
              style={styles.metricLoader}
            />
          ) : (
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {schoolCount}
            </Text>
          )}
        </Card>
        <Card noPadding
          style={[
            styles.metricCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.clayBorderColor,
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Direct assignments
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {assignedSchools.length}
          </Text>
        </Card>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Available tools
      </Text>
      {actions.length ? (
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Card noPadding tone="blue"
              key={action.key}
              onPress={() => router.push(action.route as any)}
              style={styles.actionCard}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: paint.accent },
                ]}
              >
                {React.isValidElement<{ color?: string }>(action.icon)
                  ? React.cloneElement(action.icon, { color: paint.panel })
                  : action.icon}
              </View>
              <View style={styles.actionCopy}>
                <Text
                  style={[styles.actionTitle, { color: colors.textPrimary }]}
                >
                  {action.label}
                </Text>
                <Text
                  style={[
                    styles.actionDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {action.description}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </Card>
          ))}
        </View>
      ) : (
        <Card noPadding
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.clayBorderColor,
            },
          ]}
        >
          <ShieldCheck size={28} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No modules assigned
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ask your manager or a Founder to review your role and permission
            overrides.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 0, gap: 20 },
  metricsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metricCard: {
    minWidth: 180,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: workspaceUi.cardRadius,
    padding: workspaceUi.cardPadding,
    gap: 7,
  },
  metricLabel: { fontSize: 13, fontWeight: '600' },
  metricValue: { fontSize: 30, fontWeight: '800' },
  metricLoader: { alignSelf: 'flex-start', marginVertical: 8 },
  sectionTitle: { fontSize: workspaceUi.sectionTitle.fontSize, fontWeight: workspaceUi.sectionTitle.fontWeight, marginTop: 4 },
  actionGrid: { gap: 12 },
  actionCard: {
    borderWidth: 1,
    borderRadius: workspaceUi.cardRadius,
    padding: workspaceUi.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 15, fontWeight: '800' },
  actionDescription: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  emptyCard: {
    borderWidth: 1,
    borderRadius: workspaceUi.cardRadius,
    padding: workspaceUi.cardPadding,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 19,
  },
});
