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
import {
  Users,
  School,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { superAdminClient } from '../../api/superAdminClient';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from '../founder/founderUi';

interface ExecutiveUser {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  status: string;
  territory?: string;
  assigned_schools_count?: number;
}

export default function SalesManagerDashboard() {
  const { colors, isDark } = useTheme();
  const { user, employeeId } = useAuth();
  const router = useRouter();

  const [executives, setExecutives] = useState<ExecutiveUser[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [schRes, usrRes, reqRes] = await Promise.all([
        superAdminApi.getSchools(),
        superAdminClient.get('/api/super-admin/users?role=SALES_EXECUTIVE'),
        superAdminClient.get('/api/super-admin/requirements'),
      ]);

      const rawSch: any = schRes;
      const schList = Array.isArray(rawSch) ? rawSch : Array.isArray(rawSch?.data) ? rawSch.data : [];
      setSchools(schList);
      setExecutives(Array.isArray(usrRes.data) ? usrRes.data : usrRes.data?.data || []);
      setRequirements(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.data || []);
    } catch (err) {
      console.error('Error loading sales manager data:', err);
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

  const liveSchools = schools.filter((s) => s.onboarding_status === 'live').length;
  const buildReadySchools = schools.filter((s) => s.onboarding_status === 'apk_delivered').length;
  const pendingDataSchools = schools.filter((s) => s.onboarding_status === 'pending_build').length;

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
                <Sparkles size={12} color="#0A84FF" />
                <Text style={styles.roleTagText}>Sales Management Console</Text>
              </View>
              {employeeId && (
                <View style={styles.empBadge}>
                  <Text style={styles.empBadgeText}>{employeeId}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              Sales Pipeline & Team Performance
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Monitor sales executives, territory onboarding progress, and pipeline readiness.
            </Text>
          </View>
        </View>

        {/* Operational Metrics Cards */}
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
              <School size={20} color="#0A84FF" />
            </View>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{schools.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pipeline Schools</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(100, 210, 255, 0.12)' }]}>
              <Users size={20} color="#64D2FF" />
            </View>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{executives.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sales Executives</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
              <Clock size={20} color="#FF9F0A" />
            </View>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{pendingDataSchools}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Awaiting Data</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
              <CheckCircle2 size={20} color="#30D158" />
            </View>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{liveSchools + buildReadySchools}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Build Ready / Live</Text>
          </GlassCard>
        </View>

        {/* Sales Executives Table */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Sales Executives & Territory Coverage
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/users' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Manage Team</Text>
            <ArrowUpRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <GlassCard noPad style={{ marginBottom: 24 }}>
          {executives.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>No sales executives found.</Text>
            </View>
          ) : (
            executives.map((exec, idx) => (
              <View
                key={exec.id}
                style={[
                  styles.execRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.divider },
                ]}
              >
                <View style={styles.execAvatar}>
                  <Text style={styles.execAvatarText}>
                    {exec.full_name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.execName, { color: colors.textPrimary }]}>
                      {exec.full_name}
                    </Text>
                    <View style={styles.idTag}>
                      <Text style={styles.idTagText}>{exec.employee_id}</Text>
                    </View>
                  </View>
                  <Text style={[styles.execMeta, { color: colors.textTertiary }]}>
                    {exec.email} · Territory: {exec.territory || 'Unassigned'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={styles.countPill}>
                    <School size={12} color="#0A84FF" />
                    <Text style={styles.countText}>
                      {exec.assigned_schools_count || 0} Schools
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10.5, color: colors.textTertiary }}>
                    Status: {exec.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>

        {/* Pipeline Requirements Raised by Team */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Requirements Raised by Sales Team
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/requirements' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>View All</Text>
            <ArrowUpRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <GlassCard noPad>
          {requirements.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>No pending requirements raised.</Text>
            </View>
          ) : (
            requirements.slice(0, 5).map((req, idx) => (
              <View
                key={req.id}
                style={[
                  styles.reqRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.divider },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reqTitle, { color: colors.textPrimary }]}>{req.title}</Text>
                  <Text style={[styles.reqMeta, { color: colors.textTertiary }]}>
                    School ID: {req.school_id} · Raised by: {req.raised_by_name || 'Executive'} · Priority: {req.priority}
                  </Text>
                </View>
                <View style={styles.reqStatusPill}>
                  <Text style={styles.reqStatusText}>{req.status}</Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  heroSection: {
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
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
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
    lineHeight: 18,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 130,
    padding: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  execRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  execAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  execAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A84FF',
  },
  execName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  idTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  idTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64D2FF',
  },
  execMeta: {
    fontSize: 11.5,
    marginTop: 3,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  countText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0A84FF',
  },

  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  reqTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  reqMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  reqStatusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  reqStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9F0A',
  },
});
