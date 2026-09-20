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
  const { user, employeeId, role, roleLabel, assignedSchools } = useAuth();
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isManager = role === 'IMPLEMENTATION_MANAGER';

  const loadData = useCallback(async () => {
    try {
      const res: any = await superAdminApi.getSchools();
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
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
  const inProgressCount = schools.filter(s => s.onboarding_status !== 'live').length;
  const liveCount = schools.filter(s => s.onboarding_status === 'live').length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Top Header Card */}
        <LinearGradient
          colors={isDark ? ['#0d1d33', '#060d17'] : ['#e9f3ff', '#d9ecff']}
          style={[styles.headerCard, { borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.25)' }]}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.roleBadgeRow}>
                <View style={[styles.rolePill, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.35)' }]}>
                  <Layers size={13} color="#38BDF8" />
                  <Text style={[styles.rolePillText, { color: '#38BDF8' }]}>
                    {roleLabel.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.empPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.empText, { color: colors.textSecondary }]}>
                    {employeeId || 'IE-DEPLOY'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
                {isManager ? 'Implementation Operations Desk' : 'My Assigned Deployments'}
              </Text>
              <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
                {isManager
                  ? 'Track onboarding velocity, data import completion, and rollout checklists across all clusters.'
                  : `Managing implementation milestones for ${totalAssigned} assigned partner institution${totalAssigned === 1 ? '' : 's'}.`}
              </Text>
            </View>

            <View style={styles.headerActionCol}>
              <Pressable
                style={[styles.quickActionButton, { backgroundColor: '#0284C7' }]}
                onPress={() => router.push('/checklist' as any)}
              >
                <CheckSquare size={16} color="#FFFFFF" />
                <Text style={styles.quickActionText}>Open Checklists</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryActionButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                onPress={() => router.push('/schools' as any)}
              >
                <School size={15} color={colors.textPrimary} />
                <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>View All Schools</Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={[styles.statsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#38BDF8' }]}>{totalAssigned}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {isManager ? 'Active Schools' : 'Assigned Schools'}
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{inProgressCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Under Onboarding</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{liveCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Live in Production</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>100%</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Server SLA</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section: Implementation Checklist Quick Access */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Active Implementation Workflows
            </Text>
          </View>
          <Pressable onPress={() => router.push('/checklist' as any)}>
            <Text style={[styles.sectionActionText, { color: colors.primary }]}>Detailed Checklist →</Text>
          </Pressable>
        </View>

        {/* Schools List Cards */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading school deployment pipelines...</Text>
          </View>
        ) : schools.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <School size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Schools Assigned</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              You currently have no schools linked to your implementation portfolio. Contact your manager or Founder to assign schools.
            </Text>
          </View>
        ) : (
          <View style={styles.schoolsGrid}>
            {schools.map((s) => {
              const isLive = s.onboarding_status === 'live';
              return (
                <View
                  key={s.id}
                  style={[
                    styles.schoolCard,
                    clayStyle(clayShadows.clay),
                    {
                      backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                >
                  <View style={styles.schoolCardTop}>
                    <View style={styles.schoolAvatar}>
                      <School size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.schoolName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={[styles.schoolCode, { color: colors.textSecondary }]}>
                        Code: {s.code} • ID #{s.id}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          borderColor: isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: isLive ? '#10B981' : '#F59E0B' }]}>
                        {isLive ? 'LIVE' : 'ONBOARDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.schoolCardDivider} />

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.cardBtn, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe' }]}
                      onPress={() => router.push(`/checklist?schoolId=${s.id}` as any)}
                    >
                      <CheckSquare size={14} color="#0284C7" />
                      <Text style={[styles.cardBtnText, { color: '#0284C7' }]}>Checklist</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.cardBtn, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#e0e7ff' }]}
                      onPress={() => router.push(`/schools/${s.id}` as any)}
                    >
                      <UploadCloud size={14} color="#6366F1" />
                      <Text style={[styles.cardBtnText, { color: '#6366F1' }]}>Data Import</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.cardBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}
                      onPress={() => router.push(`/schools/${s.id}` as any)}
                    >
                      <Settings size={14} color={colors.textSecondary} />
                      <Text style={[styles.cardBtnText, { color: colors.textSecondary }]}>Config</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Section: Implementation Guidelines & Support */}
        <View style={[styles.guideCard, { backgroundColor: isDark ? 'rgba(14, 23, 42, 0.65)' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={18} color="#38BDF8" />
            <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
              Implementation SOP & Data Readiness Rules
            </Text>
          </View>
          <Text style={[styles.guideText, { color: colors.textSecondary }]}>
            • Ensure School Logo, Academic Year, and Class Sections are configured before running Student CSV imports.{'\n'}
            • Mark any blocker immediately in the Checklist tab with reasons to alert the Implementation Manager and Founder.{'\n'}
            • When student data import reaches 100% and APK is tested, request Final Sign-Off for production switch.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20 },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  empPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  empText: { fontSize: 11, fontWeight: '600' },
  welcomeTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  welcomeSub: { fontSize: 13, lineHeight: 18, maxWidth: 580 },
  headerActionCol: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryActionText: { fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  statCell: { flex: 1, minWidth: 120 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionActionText: { fontSize: 13, fontWeight: '600' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },
  emptyCard: {
    padding: 32,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 440, lineHeight: 18 },
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
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
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
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
    borderRadius: 10,
  },
  cardBtnText: { fontSize: 12, fontWeight: '700' },
  guideCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  guideTitle: { fontSize: 14, fontWeight: '700' },
  guideText: { fontSize: 12.5, lineHeight: 20 },
});
