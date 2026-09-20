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
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  MessageSquare,
  PlusCircle,
  School,
  FileText,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { bottomTabPad } from '../founder/founderUi';

interface TicketItem {
  id: string;
  ticket_number: string;
  school_id: number;
  school_name?: string;
  school_code?: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CLIENT' | 'ESCALATED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';
  created_at: string;
}

const PRIORITY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  MEDIUM: { label: 'Medium', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' },
  HIGH: { label: 'High', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  CRITICAL: { label: 'Critical', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  IN_PROGRESS: { label: 'In Progress', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  WAITING_ON_CLIENT: { label: 'Waiting on School', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  ESCALATED: { label: 'Escalated', color: '#FF453A', bg: 'rgba(255, 69, 58, 0.12)' },
  REOPENED: { label: 'Reopened', color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.12)' },
  RESOLVED: { label: 'Resolved', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  CLOSED: { label: 'Closed', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
};

export default function SupportDashboard() {
  const { colors, isDark, clayShadows } = useTheme();
  const { user, employeeId, role, roleLabel, assignedSchools } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isManager = role === 'SUPPORT_MANAGER';

  const loadData = useCallback(async () => {
    try {
      const res: any = await superAdminApi.getSupportTickets();
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setTickets(list);
    } catch (err) {
      console.error('Error fetching support tickets:', err);
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

  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'REOPENED');
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS');
  const criticalTickets = tickets.filter(t =>
    (t.priority === 'CRITICAL' || t.status === 'ESCALATED') && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  );
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header Card */}
        <LinearGradient
          colors={isDark ? ['#1e1430', '#0a0815'] : ['#f5f0ff', '#ede4ff']}
          style={[styles.headerCard, { borderColor: isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(147, 51, 234, 0.25)' }]}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.roleBadgeRow}>
                <View style={[styles.rolePill, { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.35)' }]}>
                  <LifeBuoy size={13} color="#A855F7" />
                  <Text style={[styles.rolePillText, { color: '#A855F7' }]}>
                    {roleLabel.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.empPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.empText, { color: colors.textSecondary }]}>
                    {employeeId || 'SUP-TICKET'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
                {isManager ? 'Support Desk Control Room' : 'My Support Tickets'}
              </Text>
              <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
                {isManager
                  ? 'Monitor SLA compliance, school incident resolution velocity, and critical production tickets.'
                  : 'Manage client issue tickets, investigate bug reports, and record school resolution notes.'}
              </Text>
            </View>

            <View style={styles.headerActionCol}>
              <Pressable
                style={[styles.quickActionButton, { backgroundColor: '#9333EA' }]}
                onPress={() => router.push('/complaints' as any)}
              >
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.quickActionText}>Open Ticket Desk</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryActionButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                onPress={() => router.push('/schools' as any)}
              >
                <School size={15} color={colors.textPrimary} />
                <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>Partner Schools</Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={[styles.statsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{openTickets.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open Queued</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{inProgressTickets.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: criticalTickets.length > 0 ? '#EF4444' : '#10B981' }]}>
                {criticalTickets.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Critical Blocker</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{resolvedTickets.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resolved</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section: Active Complaint Tickets */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recent Production Tickets
            </Text>
          </View>
          <Pressable onPress={() => router.push('/complaints' as any)}>
            <Text style={[styles.sectionActionText, { color: colors.primary }]}>View All Desk →</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading support queue...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <CheckCircle2 size={36} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Queue Clear!</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              There are no unresolved support tickets assigned to your queue at this moment. Great job!
            </Text>
          </View>
        ) : (
          <View style={styles.ticketsList}>
            {tickets.map((t) => {
              const pBadge = PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.MEDIUM;
              const sBadge = STATUS_BADGE[t.status] || STATUS_BADGE.OPEN;

              return (
                <Pressable
                  key={t.id}
                  style={[
                    styles.ticketCard,
                    clayStyle(clayShadows.clay),
                    {
                      backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  onPress={() => router.push(`/complaints?ticketId=${t.id}` as any)}
                >
                  <View style={styles.ticketTopRow}>
                    <View style={styles.ticketIdRow}>
                      <Text style={[styles.ticketNum, { color: colors.primary }]}>{t.ticket_number}</Text>
                      <View style={[styles.badgePill, { backgroundColor: pBadge.bg, borderColor: pBadge.color + '40' }]}>
                        <Text style={[styles.badgeText, { color: pBadge.color }]}>{pBadge.label}</Text>
                      </View>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: sBadge.bg, borderColor: sBadge.color + '40' }]}>
                      <Text style={[styles.badgeText, { color: sBadge.color }]}>{sBadge.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.ticketTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={[styles.ticketDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {t.description}
                  </Text>

                  <View style={styles.ticketFooter}>
                    <View style={styles.schoolInfo}>
                      <School size={13} color={colors.textSecondary} />
                      <Text style={[styles.schoolCodeText, { color: colors.textSecondary }]}>
                        {t.school_name || `School #${t.school_id}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.actionLink, { color: colors.primary }]}>View Details</Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Section: Support SLA & Escalation Protocols */}
        <View style={[styles.guideCard, { backgroundColor: isDark ? 'rgba(30, 20, 48, 0.65)' : '#FAF5FF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={18} color="#A855F7" />
            <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
              Support Escalation & SLA Protocol
            </Text>
          </View>
          <Text style={[styles.guideText, { color: colors.textSecondary }]}>
            • Critical issues (Payment gateway failure, SMS broadcast failure, Attendance lock) must be acknowledged within 15 minutes.{'\n'}
            • Add progress notes to every ticket before changing status to WAITING_ON_CLIENT or RESOLVED.{'\n'}
            • If an issue requires a code patch or schema change, link the ticket to an Implementation requirement or escalate to Founder.
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
  ticketsList: { gap: 12, marginBottom: 24 },
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketNum: { fontSize: 13, fontWeight: '700' },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  ticketTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  ticketDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  schoolInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schoolCodeText: { fontSize: 12 },
  actionLink: { fontSize: 12, fontWeight: '600' },
  guideCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  guideTitle: { fontSize: 14, fontWeight: '700' },
  guideText: { fontSize: 12.5, lineHeight: 20 },
});
