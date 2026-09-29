import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  School,
  PlusCircle,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { INTAKE_STATUS, schoolIntakeApi, type IntakeStatus, type SchoolIntake } from '../../services/schoolIntakeService';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from '../founder/founderUi';

interface SchoolItem {
  id: number;
  name: string;
  code: string;
  address?: string;
  logo_url?: string;
  onboarding_status?: string;
  is_active?: boolean;
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  pending_build: { label: 'Waiting for Data / Build', color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.12)' },
  apk_delivered: { label: 'Build Ready / APK Delivered', color: '#30D158', bg: 'rgba(48, 209, 88, 0.12)' },
  live: { label: 'Live in Production', color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.12)' },
  suspended: { label: 'Suspended', color: '#FF453A', bg: 'rgba(255, 69, 58, 0.12)' },
};

export default function SalesExecutiveDashboard() {
  const { colors, isDark } = useTheme();
  const { user, employeeId } = useAuth();
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [intakes, setIntakes] = useState<SchoolIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [res, intakeRows] = await Promise.all([
        superAdminApi.getSchools(),
        schoolIntakeApi.list().catch(() => [] as SchoolIntake[]),
      ]);
      const list = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setSchools(list);
      setIntakes(intakeRows);
    } catch (err) {
      console.error('Error fetching executive schools:', err);
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

  const withFounder = intakes.filter((item) => item.status === 'SUBMITTED' || item.status === 'FAILED').length;
  const sentBack = intakes.filter((item) => item.status === 'CHANGES_REQUESTED').length;

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomTabPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.roleTag}>
                <Sparkles size={12} color="#64D2FF" />
                <Text style={styles.roleTagText}>Sales Executive Console</Text>
              </View>
              {employeeId && (
                <View style={styles.empBadge}>
                  <Text style={styles.empBadgeText}>{employeeId}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              My Assigned Schools
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Upload a school dossier. The founder reviews it, then the school is created and assigned back to you.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/(app)/schools/add' as any)}
            style={({ pressed, hovered }: any) => [
              styles.newSchoolBtn,
              hovered && { opacity: 0.9 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <PlusCircle size={18} color="#FFFFFF" />
            <Text style={styles.newSchoolBtnText}>Onboard a school</Text>
          </Pressable>
        </View>

        {/* Quick Action Cards */}
        <View style={styles.quickGrid}>
          <GlassCard style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
              <School size={20} color="#0A84FF" />
            </View>
            <Text style={[styles.quickVal, { color: colors.textPrimary }]}>{schools.length}</Text>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Assigned Schools</Text>
          </GlassCard>

          <GlassCard style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
              <CheckCircle2 size={20} color="#30D158" />
            </View>
            <Text style={[styles.quickVal, { color: colors.textPrimary }]}>
              {schools.filter((s) => s.onboarding_status === 'live' || s.onboarding_status === 'apk_delivered').length}
            </Text>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Build Ready / Live</Text>
          </GlassCard>

          <GlassCard style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
              <Clock size={20} color="#FF9F0A" />
            </View>
            <Text style={[styles.quickVal, { color: colors.textPrimary }]}>
              {schools.filter((s) => s.onboarding_status === 'pending_build').length}
            </Text>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Pending Data</Text>
          </GlassCard>
        </View>

        <Pressable
          onPress={() => router.push('/(app)/schools/add?tab=sent' as any)}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }], marginBottom: 20 }]}
        >
          <GlassCard variant="lightweight" style={styles.intakeStrip}>
            <View style={styles.intakeStripRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Founder review</Text>
              <Text style={[styles.schoolAddr, { color: colors.textSecondary }]}>
                {intakes.length
                  ? `${withFounder} with the founder${sentBack ? ` · ${sentBack} sent back to you` : ''}`
                  : 'A school is created only after the founder approves your dossier.'}
              </Text>
              </View>
              <View style={styles.intakeCount}>
                <Text style={styles.intakeCountText}>{intakes.length}</Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {intakes.slice(0, 3).map((item) => {
          const meta = INTAKE_STATUS[item.status as IntakeStatus] || INTAKE_STATUS.SUBMITTED;
          return (
            <GlassCard key={item.id} variant="lightweight" style={styles.intakeRow}>
              <View style={styles.intakeStripRow}>
                <Text style={[styles.schoolName, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: meta.color, fontSize: 12, fontWeight: '700' }}>{meta.label}</Text>
              </View>
            </GlassCard>
          );
        })}

        {/* Schools List */}
        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            My Schools Pipeline
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
            {schools.length} Active
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : schools.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <School size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Schools Assigned</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Schools appear here after the founder approves your dossier. Send one from Onboard a school.
            </Text>
          </GlassCard>
        ) : (
          schools.map((school) => {
            const statusInfo = STATUS_BADGE[school.onboarding_status || 'pending_build'] || STATUS_BADGE.pending_build;
            return (
              <GlassCard key={school.id} style={styles.schoolCard}>
                <View style={styles.schoolRow}>
                  <View style={styles.schoolLeft}>
                    <View style={styles.schoolAvatar}>
                      {school.logo_url ? (
                        <Image source={{ uri: school.logo_url }} style={styles.logoImg} />
                      ) : (
                        <School size={22} color={colors.primary} />
                      )}
                    </View>

                    <View style={styles.schoolInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.schoolName, { color: colors.textPrimary }]}>
                          {school.name}
                        </Text>
                        <View style={styles.codeTag}>
                          <Text style={styles.codeText}>{school.code}</Text>
                        </View>
                      </View>
                      <Text style={[styles.schoolAddr, { color: colors.textSecondary }]} numberOfLines={1}>
                        {school.address || 'Address not provided'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusInfo.bg, borderColor: `${statusInfo.color}33` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons for this school */}
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => router.push(`/(app)/schools/${school.id}` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <School size={14} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Details</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/(app)/checklist` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <CheckCircle2 size={14} color="#30D158" />
                    <Text style={[styles.actionBtnText, { color: '#30D158' }]}>Onboarding Checklist</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/(app)/students` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <UploadCloud size={14} color="#64D2FF" />
                    <Text style={[styles.actionBtnText, { color: '#64D2FF' }]}>Upload Excel</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/(app)/requirements` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <FileText size={14} color="#FF9F0A" />
                    <Text style={[styles.actionBtnText, { color: '#FF9F0A' }]}>Requirements</Text>
                  </Pressable>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 210, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.25)',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64D2FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  empBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245, 245, 247, 0.7)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: 4,
    maxWidth: 560,
    lineHeight: 18,
  },
  newSchoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  newSchoolBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  intakeStrip: {
    padding: 16,
  },
  intakeStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intakeCount: {
    minWidth: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  intakeCountText: {
    color: '#0A84FF',
    fontWeight: '800',
    fontSize: 16,
  },
  intakeRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  quickCard: {
    flex: 1,
    minWidth: 140,
    padding: 16,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickVal: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  quickLabel: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  emptyCard: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 18,
  },

  schoolCard: {
    marginBottom: 12,
    padding: 18,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  schoolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 240,
  },
  schoolAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
  },
  codeTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A84FF',
  },
  schoolAddr: {
    fontSize: 12,
    marginTop: 3,
  },
  statusPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
