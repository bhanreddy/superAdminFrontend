import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileUp, GraduationCap, Eye, CheckCircle2, XCircle,
  TrendingUp,
} from 'lucide-react-native';
import { superAdminApi } from '../../../src/services/apiService';
import { Student as StudentType } from '../../../src/types/student';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { DataTable, Column } from '../../../src/components/ui/DataTable';
import { KebabMenu } from '../../../src/components/ui/KebabMenu';
import { Skeleton } from '../../../src/components/ui/Skeleton';
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
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.978, tension: 280, friction: 16, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, tension: 280, friction: 16, useNativeDriver: true }).start()}
      style={({ hovered }: any) => [
        st.statWrap,
        Platform.OS === 'web' ? { transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)' } as any : {},
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={isDark
            ? [`${accent}14`, `${accent}08`, `${accent}03`]
            : [`${accent}0C`, `${accent}06`, `${accent}02`]}
          style={[
            st.stat,
            compact && st.statCompact,
            tiny && st.statTiny,
            {
              borderColor: `${accent}${isDark ? '20' : '14'}`,
            },
          ]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[st.statGlow, { backgroundColor: `${accent}${isDark ? '0C' : '08'}` }]} />
          <View style={[st.statGlow2, { backgroundColor: `${accent}${isDark ? '06' : '04'}` }]} />

          <View style={[st.statRow1, compact && st.statRow1Compact]}>
            <View style={[st.statIcon, {
              backgroundColor: `${accent}${isDark ? '1A' : '12'}`,
              borderColor: `${accent}${isDark ? '28' : '1A'}`,
            }, compact && st.statIconCompact]}>
              {icon}
            </View>
            {badge && (
              <View style={[st.statBadge, {
                backgroundColor: `${accent}${isDark ? '14' : '0C'}`,
                borderColor: `${accent}${isDark ? '20' : '14'}`,
              }, compact && st.statBadgeCompact]}>
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

          <View style={[st.statLine, { backgroundColor: accent }]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function StudentsListScreen() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [students, setStudents] = useState<StudentType[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isPhone = width < 520;
  const isTinyPhone = width < 380;

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getStudents();
      setStudents(res || []);
    } catch {
      // Error handling
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const stats = useMemo(() => {
    const total = students.length;
    // Assuming status_name 'Active' or is_active logic, looking at original code it checked if (s as any).is_active !== false
    const active = students.filter(s => (s as any).is_active !== false).length;
    return { total, active, inactive: total - active, pct: total > 0 ? Math.round((active / total) * 100) : 0 };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return students;
    if (statusFilter === 'active') return students.filter(s => (s as any).is_active !== false);
    return students.filter(s => (s as any).is_active === false);
  }, [students, statusFilter]);

  const goToStudent = (student: StudentType) => {
    router.push({ pathname: '/(app)/students/[id]', params: { id: student.id.toString() } } as any);
  };

  const columns: Column<StudentType>[] = [
    {
      key: 'name', title: 'Student', flex: 3, sortable: true,
      render: (item) => {
        const name = (item as any).full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown';
        const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
        
        // Avatar color from name hash
        const AVATAR_COLORS = [colors.primary, colors.success, colors.warning, '#C084FC', '#FB923C', '#22D3EE'];
        const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length;
        const avatarColor = AVATAR_COLORS[colorIdx];

        return (
          <Pressable
            onPress={() => goToStudent(item)}
            style={({ hovered }: any) => [
              st.nameCell,
            { flex: 1, minWidth: 0 },
              Platform.OS === 'web' ? { transition: 'opacity 0.15s' } as any : {},
              hovered && { opacity: 0.85 },
            ]}
          >
            <View style={[st.avatar, { backgroundColor: `${avatarColor}22` }]}>
              <Text style={[st.avatarText, { color: avatarColor }]}>{initials}</Text>
            </View>
            <View style={st.nameInfo}>
              <Text style={[st.nameLabel, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[st.nameCode, { color: colors.textTertiary }]}>{item.admission_no || '—'}</Text>
                {item.school_id && (
                  <View style={[st.clusterBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[st.clusterBadgeText, { color: colors.textSecondary }]}>School #{item.school_id}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        );
      },
    },
    {
      key: 'status', title: 'Status', width: isPhone ? 100 : 130, sortable: true,
      render: (item) => {
        const isActive = (item as any).is_active !== false;
        return <Badge label={isActive ? 'Active' : 'Inactive'} variant={isActive ? 'success' : 'error'} dot />;
      },
    },
    {
      key: 'actions', title: '', width: isPhone ? 50 : 80,
      render: (item) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          <KebabMenu items={[
            { label: 'View Details', icon: <Eye size={14} color={colors.textSecondary} />, onPress: () => goToStudent(item) },
          ]} />
        </View>
      ),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1, paddingHorizontal: 0, paddingTop: 4 }}>
        <ScreenHeader
          title="Students"
          subtitle={
            loading
              ? 'Global student directory'
              : `${filteredStudents.length} shown · ${students.length} total`
          }
          subtitleColor={colors.textSecondary}
          rightAction={
            <Button
              title="Bulk Import"
              leftIcon={<FileUp size={15} color="#fff" strokeWidth={2.5} />}
              size="sm"
              style={[st.addButton, isPhone && st.addButtonPhone]}
              onPress={() => router.push('/(app)/students/import' as any)}
            />
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[st.scrollContent, isPhone && st.scrollContentPhone]}
          showsVerticalScrollIndicator={false}
        >
      {/* ── Stats ── */}
      <FadeIn delay={40}>
        <View style={[st.statsRow, isPhone && st.statsRowPhone]}>
          {loading ? (
            [1, 2, 3].map(i => <View key={i} style={st.statWrap}><Skeleton height={isPhone ? 136 : 160} borderRadius={18} /></View>)
          ) : (
            <>
              <StatCard
                title="Total Students"
                value={stats.total}
                icon={<GraduationCap size={isPhone ? 16 : 18} color={colors.primary} strokeWidth={1.8} />}
                accent={colors.primary}
                description="All registered"
                compact={isPhone}
                tiny={isTinyPhone}
              />
              <StatCard
                title="Active"
                value={stats.active}
                badge={isPhone ? `${stats.pct}%` : `${stats.pct}% rate`}
                icon={<CheckCircle2 size={isPhone ? 16 : 18} color={colors.success} strokeWidth={1.8} />}
                accent={colors.success}
                description="Currently enrolled"
                compact={isPhone}
                tiny={isTinyPhone}
              />
              <StatCard
                title="Inactive"
                value={stats.inactive}
                icon={<XCircle size={isPhone ? 16 : 18} color={colors.error} strokeWidth={1.8} />}
                accent={colors.error}
                description="Past or suspended"
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
            <Text style={[st.sectionLabel, { color: colors.textPrimary }]}>All Students</Text>
            <Text style={[st.sectionCount, { color: colors.textTertiary }]}>
              {!loading ? `${filteredStudents.length} total` : ''}
            </Text>
          </View>

          <View style={[st.filterBar, { backgroundColor: isDark ? '#1E1E1E' : '#F1F5F9', borderColor: colors.border }]}>
            {(['all', 'active', 'inactive'] as const).map((filter) => {
              const active = statusFilter === filter;
              let label = filter.charAt(0).toUpperCase() + filter.slice(1);
              return (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  style={[st.filterPill, active && { backgroundColor: colors.primary }]}
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
          data={filteredStudents}
          keyExtractor={(item) => (item.id || (item as any).user_id || Math.random()).toString()}
          loading={loading}
          searchPlaceholder="Search by name or admission no..."
          searchKeys={['first_name', 'last_name', 'full_name', 'admission_no']}
          emptyTitle="No students yet"
          emptyDescription="Import students to get started"
          emptyActionLabel="Bulk Import"
          onEmptyAction={() => router.push('/(app)/students/import' as any)}
          onRowPress={goToStudent}
        />
      </FadeIn>
        </ScrollView>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  scrollContent: { paddingBottom: 48, paddingTop: 8 },
  scrollContentPhone: { paddingBottom: 72 },
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
  avatar: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13, fontWeight: '800', letterSpacing: -0.2,
  },
  nameInfo: { flex: 1, gap: 3 },
  nameLabel: { fontSize: 14, fontWeight: '600', letterSpacing: -0.15 },
  nameCode: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  
  /* Filter */
  filterBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPill: {
    paddingHorizontal: 14,
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