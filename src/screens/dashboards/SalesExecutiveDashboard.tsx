import type { ThemeColors } from '../../constants/theme';
import { workspaceUi } from '../../constants/layout';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
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



export default function SalesExecutiveDashboard() {
  const { colors, isDark } = useTheme();
  const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    pending_build: { label: 'Waiting for Data / Build', color: colors.warning, bg: colors.warningDim },
    apk_delivered: { label: 'Build Ready / APK Delivered', color: colors.info, bg: colors.infoDim },
    live: { label: 'Live in Production', color: colors.success, bg: colors.successDim },
    suspended: { label: 'Suspended', color: colors.error, bg: colors.errorDim }
  };
  const styles = React.useMemo(() => createStyles(colors), [colors]);
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
        <ScreenHeader
          eyebrow={['Sales Executive', employeeId].filter(Boolean).join(' · ')}
          title="My Assigned Schools"
          subtitle="Upload school dossiers and track review, onboarding, and follow-up."
          rightAction={<Button title="Onboard a school" onPress={() => router.push('/(app)/schools/add' as any)} />}
        />

        {/* Quick Action Cards */}
        <View style={styles.quickGrid}>
          <GlassCard style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: colors.infoDim }]}>
              <School size={20} color={brandColors.red} />
            </View>
            <Text style={[styles.quickVal, { color: colors.textPrimary }]}>{schools.length}</Text>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Assigned Schools</Text>
          </GlassCard>

          <GlassCard style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: colors.infoDim }]}>
              <CheckCircle2 size={20} color="#335F90" />
            </View>
            <Text style={[styles.quickVal, { color: colors.textPrimary }]}>
              {schools.filter((s) => s.onboarding_status === 'live' || s.onboarding_status === 'apk_delivered').length}
            </Text>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Build Ready / Live</Text>
          </GlassCard>

          <GlassCard style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: colors.warningDim }]}>
              <Clock size={20} color={colors.warning} />
            </View>
            <Text style={[styles.quickVal, { color: colors.textPrimary }]}>
              {schools.filter((s) => s.onboarding_status === 'pending_build').length}
            </Text>
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Pending Data</Text>
          </GlassCard>
        </View>

        <Pressable accessibilityRole="button"
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
                  <Pressable accessibilityRole="button"
                    onPress={() => router.push(`/(app)/schools/${school.id}` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <School size={14} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Details</Text>
                  </Pressable>

                  <Pressable accessibilityRole="button"
                    onPress={() => router.push(`/(app)/checklist` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <CheckCircle2 size={14} color="#335F90" />
                    <Text style={[styles.actionBtnText, { color: '#335F90' }]}>Onboarding Checklist</Text>
                  </Pressable>

                  <Pressable accessibilityRole="button"
                    onPress={() => router.push(`/(app)/students` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <UploadCloud size={14} color={colors.info} />
                    <Text style={[styles.actionBtnText, { color: colors.info }]}>Upload Excel</Text>
                  </Pressable>

                  <Pressable accessibilityRole="button"
                    onPress={() => router.push(`/(app)/requirements` as any)}
                    style={({ pressed }: any) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
                  >
                    <FileText size={14} color={colors.warning} />
                    <Text style={[styles.actionBtnText, { color: colors.warning }]}>Requirements</Text>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({

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
    backgroundColor: colors.infoDim,
  },
  intakeCountText: {
    color: colors.primary,
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
    padding: workspaceUi.cardPadding,
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
    fontSize: workspaceUi.sectionTitle.fontSize,
    fontWeight: workspaceUi.sectionTitle.fontWeight,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  emptyCard: {
    alignItems: 'center',
    padding: workspaceUi.cardPadding,
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
    padding: workspaceUi.cardPadding,
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
    backgroundColor: colors.infoDim,
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
    color: colors.primary,
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
