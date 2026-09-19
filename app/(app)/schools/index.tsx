import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, Building2, Eye, Power, School, CheckCircle2, XCircle,
  TrendingUp, Hash, Terminal, Settings
} from 'lucide-react-native';
import { superAdminApi } from '../../../src/services/apiService';
import { School as SchoolType } from '../../../src/types/school';
import { useTheme, clayStyle } from '../../../src/contexts/ThemeContext';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { DataTable, Column } from '../../../src/components/ui/DataTable';
import { KebabMenu } from '../../../src/components/ui/KebabMenu';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { DeleteSchoolModal } from '../../../src/components/ui/DeleteSchoolModal';
import { Trash2 } from 'lucide-react-native';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';

/* ─── Entrance animation ──────────────────────────────────────────────────── */
function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */
function StatCard({ title, value, badge, icon, accent, description, compact = false, tiny = false }: {
  title: string; value: number | string; badge?: string;
  icon: React.ReactNode; accent: string; description?: string; compact?: boolean; tiny?: boolean;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.978, tension: 280, friction: 16, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, tension: 280, friction: 16, useNativeDriver: true }).start()}
      style={st.statWrap}
    >
      {({ hovered }: any) => {
        const shadow = hovered ? clayShadows.clayElevated : clayShadows.clay;
        return (
          <Animated.View style={[
            {
              transform: [{ scale }],
              borderRadius: 18,
            },
            Platform.OS === 'web' ? {
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hovered ? 'scale(1.025)' : 'none',
            } as any : {},
          ]}>
            <LinearGradient
              colors={isDark
                ? [`${accent}12`, `${accent}06`, 'transparent']
                : [`${accent}0A`, `${accent}04`, 'transparent']}
              style={[
                st.stat,
                compact && st.statCompact,
                tiny && st.statTiny,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                  borderWidth: 1,
                  backgroundColor: colors.card,
                },
                Platform.OS === 'web' ? {
                  boxShadow: isDark
                    ? `inset 3px 3px 6px rgba(255,255,255,0.07), inset -4px -4px 8px ${accent}0A, inset -2px -2px 4px rgba(0,0,0,0.35), ${shadow.web}`
                    : `inset 3px 3px 6px rgba(255,255,255,0.95), inset -4px -4px 8px ${accent}12, inset -2px -2px 4px rgba(0,0,0,0.04), ${shadow.web}`,
                } as any : {},
              ]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={[st.statGlow, { backgroundColor: `${accent}${isDark ? '06' : '04'}` }]} />

              <View style={[st.statRow1, compact && st.statRow1Compact]}>
                <View style={[st.statIcon, {
                  backgroundColor: isDark ? `${accent}16` : `${accent}0A`,
                  borderColor: isDark ? `${accent}25` : `${accent}12`,
                  borderWidth: 1,
                },
                Platform.OS === 'web' ? {
                  boxShadow: isDark
                    ? `inset 1.5px 1.5px 3px rgba(0,0,0,0.4), inset -1.5px -1.5px 3px rgba(255,255,255,0.05)`
                    : `inset 1.5px 1.5px 3px rgba(255,255,255,0.95), inset -2px -2px 4px ${accent}20, inset -1.5px -1.5px 3px rgba(0,0,0,0.03)`,
                } as any : {},
                compact && st.statIconCompact]}>
                  {icon}
                </View>
                {badge && (
                  <View style={[st.statBadge, {
                    backgroundColor: isDark ? `${accent}14` : `${accent}08`,
                    borderColor: `${accent}18`,
                    borderWidth: 1,
                  },
                  Platform.OS === 'web' ? {
                    boxShadow: isDark
                      ? `inset 1px 1.5px 3px rgba(255,255,255,0.1), inset -1.5px -1.5px 3px rgba(0,0,0,0.3)`
                      : `inset 1.5px 1.5px 3px rgba(255,255,255,0.9), inset -1.5px -1.5px 3px rgba(0,0,0,0.04)`,
                  } as any : {},
                  compact && st.statBadgeCompact]}>
                    {!tiny && <TrendingUp size={10} color={accent} strokeWidth={2.5} />}
                    <Text style={[st.statBadgeText, compact && st.statBadgeTextCompact, { color: accent }]} numberOfLines={1}>
                      {badge}
                    </Text>
                  </View>
                )}
              </View>

              <View style={st.statValRow}>
                <Text style={[st.statVal, compact && st.statValCompact, { color: colors.textPrimary }]}>{value}</Text>
              </View>
              <Text style={[st.statLabel, compact && st.statLabelCompact, { color: colors.textSecondary }]} numberOfLines={2}>
                {title}
              </Text>

              {description && (
                <Text style={[st.statDesc, compact && st.statDescCompact, { color: colors.textTertiary }]} numberOfLines={2}>
                  {description}
                </Text>
              )}

              <View style={[st.statLine, { backgroundColor: accent, opacity: 0.7 }]} />
            </LinearGradient>
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function SchoolsListScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { width } = useWindowDimensions();
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_build' | 'live' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [clusterUnreachable, setClusterUnreachable] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolType | null>(null);
  const router = useRouter();
  const isPhone = width < 520;
  const isTinyPhone = width < 380;

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      setClusterUnreachable(false);
      const res = await superAdminApi.getSchools();
      if (Array.isArray(res)) {
        setSchools(res);
      } else {
        setSchools(res.data || []);
        if (res.cluster_unreachable) setClusterUnreachable(true);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const stats = useMemo(() => {
    const total = schools.length;
    const active = schools.filter(s => s.is_active).length;
    return { total, active, inactive: total - active, pct: total > 0 ? Math.round((active / total) * 100) : 0 };
  }, [schools]);

  const filteredSchools = useMemo(() => {
    if (statusFilter === 'all') return schools;
    return schools.filter(s => s.onboarding_status === statusFilter);
  }, [schools, statusFilter]);

  const handleToggle = async (school: SchoolType) => {
    try { await superAdminApi.toggleSchoolActive(school.id, !school.is_active); fetchSchools(); } catch {}
  };

  const handleDeleteConfirm = async () => {
    if (!schoolToDelete) return;
    try {
      await superAdminApi.deleteSchool(schoolToDelete.id);
      setDeleteModalVisible(false);
      setSchoolToDelete(null);
      fetchSchools();
    } catch (err: any) {
      console.error('Failed to delete school:', err);
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete school';
      if (Platform.OS === 'web') {
        // Alert.alert is a no-op on RN web
        // eslint-disable-next-line no-alert
        window.alert(`Delete failed\n\n${message}`);
      } else {
        Alert.alert('Delete failed', message);
      }
      throw err;
    }
  };

  const goToSchool = (school: SchoolType) => {
    router.push({ pathname: '/(app)/schools/[id]', params: { id: school.id.toString() } } as any);
  };

  const goToBuildConfig = (school: SchoolType) => {
    router.push({ pathname: '/(app)/schools/[id]/build-config', params: { id: school.id.toString() } } as any);
  };

  const goToAppConfig = (school: SchoolType) => {
    router.push({ pathname: '/(app)/schools/[id]/app-config', params: { id: school.id.toString() } } as any);
  };

  const columns: Column<SchoolType>[] = [
    {
      key: 'name', title: 'School', flex: 3, sortable: true,
      render: (item) => (
        <Pressable
          onPress={() => goToSchool(item)}
          style={({ hovered }: any) => [
            st.nameCell,
            { flex: 1, minWidth: 0 },
            Platform.OS === 'web' ? { transition: 'opacity 0.15s' } as any : {},
            hovered && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={isDark ? [`${colors.primary}20`, `${colors.primary}0A`] : [`${colors.primary}12`, `${colors.primary}05`]}
            style={[
              st.nameIcon,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                borderWidth: 1,
              },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? 'inset 1.5px 1.5px 3px rgba(255,255,255,0.06), inset -1.5px -1.5px 3px rgba(0,0,0,0.3)'
                  : `inset 1.5px 1.5px 3px rgba(255,255,255,0.95), inset -2px -2px 4px ${colors.primary}20, inset -1.5px -1.5px 3px rgba(0,0,0,0.04)`,
              } as any : {},
            ]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Building2 size={16} color={colors.primary} strokeWidth={1.8} />
          </LinearGradient>
          <View style={st.nameInfo}>
            <Text style={[st.nameLabel, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[st.nameCode, { color: colors.textTertiary }]}>{item.code}</Text>
              <View style={[st.clusterBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[st.clusterBadgeText, { color: colors.textSecondary }]}>{item.cluster_id || 'cluster_a'}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      ),
    },
    {
      key: 'id', title: 'ID', width: isPhone ? 58 : 80, sortable: true,
      render: (item) => (
        <View style={[
          st.idPill,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            borderColor: colors.clayBorderColor,
            borderWidth: 1,
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 1.5px 1.5px 3px rgba(0,0,0,0.25), inset -1.5px -1.5px 3px rgba(255,255,255,0.02)'
              : 'inset 1.5px 1.5px 3px rgba(0,0,0,0.04), inset -1.5px -1.5px 3px rgba(255,255,255,0.7)',
          } as any : {},
        ]}>
          {!isTinyPhone && <Hash size={10} color={colors.textTertiary} strokeWidth={2.5} />}
          <Text style={[st.idLabel, { color: colors.textSecondary }]}>{item.id}</Text>
        </View>
      ),
    },
    {
      key: 'status', title: 'Status', width: isPhone ? 100 : 130, sortable: true,
      render: (item) => {
        let label = 'Pending';
        let variant: any = 'warning';
        if (item.onboarding_status === 'apk_delivered') { label = 'APK Delivered'; variant = 'info'; }
        else if (item.onboarding_status === 'live') { label = 'Live'; variant = 'success'; }
        else if (item.onboarding_status === 'suspended') { label = 'Suspended'; variant = 'error'; }

        return <Badge label={label} variant={variant} dot />;
      },
    },
    {
      key: 'actions', title: '', width: isPhone ? 50 : 80,
      render: (item) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          {!isPhone && (
            <Pressable
              onPress={() => goToBuildConfig(item)}
              style={({ pressed, hovered }: any) => [
                st.iconButton,
                {
                  backgroundColor: hovered
                    ? isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    : colors.clayInnerLight,
                  borderColor: colors.clayBorderColor,
                  borderWidth: 1,
                },
                Platform.OS === 'web' && hovered ? clayStyle(clayShadows.subtle) : {},
                pressed && { transform: [{ scale: 0.92 }] },
                Platform.OS === 'web' ? {
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                } as any : {},
              ]}
            >
              <Terminal size={16} color={colors.textSecondary} />
            </Pressable>
          )}
          <KebabMenu items={[
            { label: 'View Details', icon: <Eye size={14} color={colors.textSecondary} />, onPress: () => goToSchool(item) },
            { label: 'Build Config', icon: <Terminal size={14} color={colors.textSecondary} />, onPress: () => goToBuildConfig(item) },
            { label: 'App Config', icon: <Settings size={14} color={colors.textSecondary} />, onPress: () => goToAppConfig(item) },
            { label: item.is_active ? 'Deactivate' : 'Activate', icon: <Power size={14} color={item.is_active ? colors.error : colors.success} />, onPress: () => handleToggle(item), danger: item.is_active },
            {
              label: 'Delete School',
              icon: <Trash2 size={14} color={colors.error} />,
              onPress: () => {
                setSchoolToDelete(item);
                setDeleteModalVisible(true);
              },
              danger: true
            }
          ]} />
        </View>
      ),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1, paddingHorizontal: 0, paddingTop: 4 }}>
        <ScreenHeader
          title="Schools"
          subtitle={
            loading
              ? 'Institutions and onboarding'
              : `${filteredSchools.length} shown · ${schools.length} total`
          }
          subtitleColor={colors.textSecondary}
          rightAction={
            <Button
              title="Add School"
              leftIcon={<Plus size={15} color="#fff" strokeWidth={2.5} />}
              size="sm"
              style={[st.addButton, isPhone && st.addButtonPhone]}
              onPress={() => router.push('/(app)/schools/add')}
            />
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[st.scrollContent, isPhone && st.scrollContentPhone]}
          showsVerticalScrollIndicator={false}
        >
      {clusterUnreachable && !loading && (
        <FadeIn delay={20}>
          <View
            style={[
              st.clusterAlert,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.22)',
              },
            ]}
          >
            <View style={[st.clusterAlertAccent, { backgroundColor: colors.error }]} />
            <XCircle size={20} color={colors.error} strokeWidth={2} />
            <Text style={[st.clusterAlertText, { color: colors.textPrimary }]}>
              One or more clusters are unreachable. Showing partial data.
            </Text>
          </View>
        </FadeIn>
      )}

      {/* ── Stats ── */}
      <FadeIn delay={clusterUnreachable && !loading ? 50 : 40}>
        <View style={[st.statsRow, isPhone && st.statsRowPhone]}>
          {loading ? (
            [1, 2, 3].map(i => <View key={i} style={st.statWrap}><Skeleton height={isPhone ? 136 : 160} borderRadius={18} /></View>)
          ) : (
            <>
              <StatCard
                title="Total Schools"
                value={stats.total}
                icon={<School size={isPhone ? 16 : 18} color={colors.primary} strokeWidth={1.8} />}
                accent={colors.primary}
                description="All registered"
                compact={isPhone}
                tiny={isTinyPhone}
              />
              <StatCard
                title="Active"
                value={stats.active}
                badge={isPhone ? `${stats.pct}%` : `${stats.pct}% uptime`}
                icon={<CheckCircle2 size={isPhone ? 16 : 18} color={colors.success} strokeWidth={1.8} />}
                accent={colors.success}
                description="Currently running"
                compact={isPhone}
                tiny={isTinyPhone}
              />
              <StatCard
                title="Inactive"
                value={stats.inactive}
                icon={<XCircle size={isPhone ? 16 : 18} color={colors.error} strokeWidth={1.8} />}
                accent={colors.error}
                description="Paused or disabled"
                compact={isPhone}
                tiny={isTinyPhone}
              />
            </>
          )}
        </View>
      </FadeIn>

      {/* ── Section Label & Filter ── */}
      <FadeIn delay={90}>
        <View style={[st.sectionRow, isPhone && st.sectionRowPhone, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[st.sectionBar, { backgroundColor: colors.primary }]} />
            <Text style={[st.sectionLabel, { color: colors.textPrimary }]}>All Schools</Text>
            <Text style={[st.sectionCount, { color: colors.textTertiary }]}>
              {!loading ? `${filteredSchools.length} total` : ''}
            </Text>
          </View>

          <View style={[
            st.filterBar,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
              borderColor: colors.clayBorderColor,
              borderWidth: 1,
            },
            Platform.OS === 'web' ? {
              boxShadow: isDark
                ? 'inset 2.5px 2.5px 5px rgba(0,0,0,0.35), inset -2.5px -2.5px 5px rgba(255,255,255,0.02)'
                : 'inset 2.5px 2.5px 5px rgba(0,0,0,0.05), inset -2.5px -2.5px 5px rgba(255,255,255,0.8)',
            } as any : {},
          ]}>
            {(['all', 'pending_build', 'live', 'suspended'] as const).map((filter) => {
              const active = statusFilter === filter;
              let label = filter === 'pending_build' ? 'Pending' : filter;
              label = label.charAt(0).toUpperCase() + label.slice(1);
              return (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  style={({ pressed, hovered }: any) => [
                    st.filterPill,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : hovered
                          ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                          : 'transparent',
                    },
                    active && Platform.OS === 'web' ? {
                      boxShadow: isDark
                        ? 'inset 2px 2px 4px rgba(255,255,255,0.35), inset -3px -3px 6px rgba(0,0,0,0.4), 2px 4px 8px rgba(129,140,248,0.16)'
                        : 'inset 2px 2px 4px rgba(255,255,255,0.45), inset -3px -3px 6px rgba(0,0,0,0.22), 2px 4px 8px rgba(91,91,246,0.18)',
                    } as any : {},
                    pressed && { transform: [{ scale: 0.96 }] },
                    Platform.OS === 'web' ? {
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                    } as any : {},
                  ]}
                >
                  <Text style={[st.filterText, active ? { color: '#FFF' } : { color: colors.textSecondary }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </FadeIn>

      {/* ── Table ── */}
      <FadeIn delay={130}>
        <DataTable
          columns={columns}
          data={filteredSchools}
          keyExtractor={(item) => item.id.toString()}
          loading={loading}
          searchPlaceholder="Search by name or code..."
          searchKeys={['name', 'code']}
          emptyTitle="No schools yet"
          emptyDescription="Add your first school to get started"
          emptyActionLabel="Add School"
          onEmptyAction={() => router.push('/(app)/schools/add')}
          onRowPress={goToSchool}
        />
      </FadeIn>

      <DeleteSchoolModal
        visible={deleteModalVisible}
        school={schoolToDelete}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
      />
        </ScrollView>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  scrollContent: { paddingBottom: 48, paddingTop: 8 },
  scrollContentPhone: { paddingBottom: 72 },

  clusterAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  clusterAlertAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  clusterAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  addButton: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  addButtonPhone: { borderRadius: 10 },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 32,
  },
  statsRowPhone: {
    gap: 8,
    marginBottom: 24,
  },
  statWrap: { flex: 1, minWidth: 0 },
  stat: {
    borderRadius: 18, borderWidth: 1,
    padding: 18, overflow: 'hidden',
    position: 'relative', gap: 2,
  },
  statCompact: {
    borderRadius: 16,
    padding: 12,
    minHeight: 132,
  },
  statTiny: {
    paddingHorizontal: 10,
  },
  statGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 90, height: 90, borderRadius: 45,
  },
  statGlow2: {
    position: 'absolute', bottom: -20, left: -20,
    width: 60, height: 60, borderRadius: 30,
  },
  statRow1: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  statRow1Compact: { marginBottom: 12 },
  statIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  statIconCompact: { width: 34, height: 34, borderRadius: 11 },
  statValRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 6,
  },
  statVal: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  statValCompact: { fontSize: 26, letterSpacing: -0.8 },
  statLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1, marginTop: 2 },
  statLabelCompact: { fontSize: 12, lineHeight: 15 },
  statDesc: { fontSize: 11, fontWeight: '400', marginTop: 4, letterSpacing: 0.1 },
  statDescCompact: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1,
  },
  statBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: 54,
  },
  statBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  statBadgeTextCompact: { fontSize: 9, letterSpacing: 0 },
  statLine: {
    position: 'absolute', bottom: 0, left: 16, right: 16, height: 2.5, borderRadius: 2,
  },

  /* Section */
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  sectionRowPhone: { marginBottom: 12 },
  sectionBar: { width: 3, height: 18, borderRadius: 2 },
  sectionLabel: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  sectionCount: { fontSize: 13, fontWeight: '400', marginLeft: 4 },

  /* Table cells */
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  nameInfo: { flex: 1, gap: 3 },
  nameLabel: { fontSize: 14, fontWeight: '600', letterSpacing: -0.15 },
  nameCode: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  idPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  idLabel: { fontSize: 12, fontWeight: '600' },

  /* Filter */
  filterBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clusterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clusterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
