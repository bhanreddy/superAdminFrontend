import type { ThemeColors } from '../../constants/theme';
import { workspaceUi } from '../../constants/layout';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { brandColors, experienceColors } from '../../constants/experienceColors';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  School,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckSquare,
  FileSpreadsheet,
  Settings,
  Users,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { bottomTabPad } from '../founder/founderUi';

interface SchoolItem {
  id: number;
  name: string;
  code: string;
  address?: string;
  logo_url?: string;
  onboarding_status?: string;
  is_active?: boolean;
}

export default function ImplementationDashboard() {
  const { colors, isDark, clayShadows } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user, employeeId, role, roleLabel, assignedSchools } = useAuth();
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isManager = role === 'IMPLEMENTATION_MANAGER';

  const loadData = useCallback(async () => {
    try {
      const res: any = await superAdminApi.getSchools();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setSchools(list);
    } catch (err) {
      console.error('Error fetching implementation schools:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const totalAssigned = schools.length;
  const inProgressCount = schools.filter(
    (s) => s.onboarding_status !== 'live',
  ).length;
  const liveCount = schools.filter(
    (s) => s.onboarding_status === 'live',
  ).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomTabPad },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Header Card */}
        <View>
          <ScreenHeader
            eyebrow={[roleLabel, employeeId].filter(Boolean).join(' · ')}
            title={isManager ? 'Implementation Operations Desk' : 'My Assigned Deployments'}
            subtitle={isManager ? 'Track onboarding, data imports, and rollout checklists across your schools.' : `Implementation milestones for ${totalAssigned} assigned partner institution${totalAssigned === 1 ? '' : 's'}.`}
            rightAction={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button title="Open Checklists" onPress={() => router.push('/checklist' as any)} />
              <Button title="View All Schools" variant="outline" onPress={() => router.push('/schools' as any)} />
            </View>}
          />
          <Card style={{ marginBottom: 20 }}>
            <View
            style={[
              styles.statsRow,
              {
                borderTopColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.info }]}>
                {totalAssigned}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {isManager ? 'Active Schools' : 'Assigned Schools'}
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {inProgressCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Under Onboarding
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: brandColors.blue }]}>
                {liveCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Live in Production
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: brandColors.violet }]}>100%</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Server SLA
              </Text>
            </View>
          </View>
          </Card>
        </View>

        {/* Section: Implementation Checklist Quick Access */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Active Implementation Workflows
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/checklist' as any)}>
            <Text style={[styles.sectionActionText, { color: colors.primary }]}>
              Detailed Checklist →
            </Text>
          </Pressable>
        </View>

        {/* Schools List Cards */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading school deployment pipelines...
            </Text>
          </View>
        ) : schools.length === 0 ? (
          <Card noPadding
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
              },
            ]}
          >
            <School size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Schools Assigned
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              You currently have no schools linked to your implementation
              portfolio. Contact your manager or Founder to assign schools.
            </Text>
          </Card>
        ) : (
          <View style={styles.schoolsGrid}>
            {schools.map((s) => {
              const isLive = s.onboarding_status === 'live';
              return (
                <Card noPadding
                  key={s.id}
                  style={[
                    styles.schoolCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(22, 27, 34, 0.85)'
                        : '#FFFFFF',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                >
                  <View style={styles.schoolCardTop}>
                    <View style={styles.schoolAvatar}>
                      <School size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.schoolName,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {s.name}
                      </Text>
                      <Text
                        style={[
                          styles.schoolCode,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Code: {s.code} • ID #{s.id}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: isLive
                            ? colors.infoDim
                            : colors.warningDim,
                          borderColor: isLive
                            ? colors.infoDim
                            : colors.warningDim,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: isLive ? brandColors.blue : colors.warning },
                        ]}
                      >
                        {isLive ? 'LIVE' : 'ONBOARDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.schoolCardDivider} />

                  <View style={styles.actionsRow}>
                    <Pressable accessibilityRole="button"
                      style={[
                        styles.cardBtn,
                        {
                          backgroundColor: isDark
                            ? colors.infoDim
                            : '#e0f2fe',
                        },
                      ]}
                      onPress={() =>
                        router.push(`/checklist?schoolId=${s.id}` as any)
                      }
                    >
                      <CheckSquare size={14} color={brandColors.blue} />
                      <Text style={[styles.cardBtnText, { color: brandColors.blue }]}>
                        Checklist
                      </Text>
                    </Pressable>

                    <Pressable accessibilityRole="button"
                      style={[
                        styles.cardBtn,
                        {
                          backgroundColor: isDark
                            ? colors.infoDim
                            : '#e0e7ff',
                        },
                      ]}
                      onPress={() => router.push(`/schools/${s.id}` as any)}
                    >
                      <UploadCloud size={14} color={brandColors.violet} />
                      <Text style={[styles.cardBtnText, { color: brandColors.violet }]}>
                        Data Import
                      </Text>
                    </Pressable>

                    <Pressable accessibilityRole="button"
                      style={[
                        styles.cardBtn,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#f1f5f9',
                        },
                      ]}
                      onPress={() => router.push(`/schools/${s.id}` as any)}
                    >
                      <Settings size={14} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.cardBtnText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Config
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Section: Implementation Guidelines & Support */}
        <Card noPadding
          style={[
            styles.guideCard,
            {
              backgroundColor: isDark ? 'rgba(14, 23, 42, 0.65)' : '#F8FAFC',
              borderColor: isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <Sparkles size={18} color={colors.info} />
            <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
              Implementation SOP & Data Readiness Rules
            </Text>
          </View>
          <Text style={[styles.guideText, { color: colors.textSecondary }]}>
            • Ensure School Logo, Academic Year, and Class Sections are
            configured before running Student CSV imports.{'\n'}• Mark any
            blocker immediately in the Checklist tab with reasons to alert the
            Implementation Manager and Founder.{'\n'}• When student data import
            reaches 100% and APK is tested, request Final Sign-Off for
            production switch.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 0 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCell: { flex: 1, minWidth: 100 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: workspaceUi.sectionTitle.fontSize, fontWeight: workspaceUi.sectionTitle.fontWeight },
  sectionActionText: { fontSize: 13, fontWeight: '600' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },
  emptyCard: {
    padding: workspaceUi.cardPadding,
    borderRadius: workspaceUi.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 18,
  },
  schoolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
  },
  schoolCard: {
    width: Platform.OS === 'web' ? '48.5%' : '100%',
    minWidth: 280,
    flexGrow: 1,
    borderRadius: workspaceUi.cardRadius,
    borderWidth: 1,
    padding: workspaceUi.cardPadding,
  },
  schoolCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  schoolAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.infoDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  schoolCode: { fontSize: 12 },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  schoolCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardBtn: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: workspaceUi.controlRadius,
  },
  cardBtnText: { fontSize: 12, fontWeight: '700' },
  guideCard: {
    borderRadius: workspaceUi.cardRadius,
    borderWidth: 1,
    padding: workspaceUi.cardPadding,
  },
  guideTitle: { fontSize: 14, fontWeight: '700' },
  guideText: { fontSize: 12.5, lineHeight: 20 },
});
