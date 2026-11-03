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
  status:
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'WAITING_ON_CLIENT'
    | 'ESCALATED'
    | 'REOPENED'
    | 'RESOLVED'
    | 'CLOSED';
  created_at: string;
}





export default function SupportDashboard() {
  const { colors, isDark, clayShadows } = useTheme();
  const PRIORITY_BADGE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
    LOW: { label: 'Low', color: colors.success, bg: colors.successDim },
    MEDIUM: { label: 'Medium', color: colors.info, bg: colors.infoDim },
    HIGH: { label: 'High', color: colors.warning, bg: colors.warningDim },
    CRITICAL: { label: 'Critical', color: colors.error, bg: colors.errorDim }
  };
  const STATUS_BADGE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
    OPEN: { label: 'Open', color: colors.info, bg: colors.infoDim },
    IN_PROGRESS: { label: 'In Progress', color: colors.info, bg: colors.infoDim },
    WAITING_ON_CLIENT: { label: 'Waiting on School', color: colors.warning, bg: colors.warningDim },
    ESCALATED: { label: 'Escalated', color: colors.error, bg: colors.errorDim },
    REOPENED: { label: 'Reopened', color: colors.warning, bg: colors.warningDim },
    RESOLVED: { label: 'Resolved', color: colors.success, bg: colors.successDim },
    CLOSED: { label: 'Closed', color: colors.info, bg: colors.infoDim }
  };
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user, employeeId, role, roleLabel, assignedSchools } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isManager = role === 'SUPPORT_MANAGER';

  const loadData = useCallback(async () => {
    try {
      const res: any = await superAdminApi.getSupportTickets();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
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

  const openTickets = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'REOPENED',
  );
  const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const criticalTickets = tickets.filter(
    (t) =>
      (t.priority === 'CRITICAL' || t.status === 'ESCALATED') &&
      t.status !== 'RESOLVED' &&
      t.status !== 'CLOSED',
  );
  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');

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
        {/* Header Card */}
        <View>
          <ScreenHeader
            eyebrow={[roleLabel, employeeId].filter(Boolean).join(' · ')}
            title={isManager ? 'Support Desk Control Room' : 'My Support Tickets'}
            subtitle={isManager ? 'Review school incidents, critical tickets, and team resolution progress.' : 'Investigate school issues and keep resolution notes up to date.'}
            rightAction={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button title="Open Ticket Desk" onPress={() => router.push('/complaints' as any)} />
              <Button title="Partner Schools" variant="outline" onPress={() => router.push('/schools' as any)} />
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
              <Text style={[styles.statValue, { color: brandColors.red }]}>
                {openTickets.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Open Queued
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {inProgressTickets.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                In Progress
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text
                style={[
                  styles.statValue,
                  { color: criticalTickets.length > 0 ? brandColors.red : brandColors.blue },
                ]}
              >
                {criticalTickets.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Critical Blocker
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: brandColors.blue }]}>
                {resolvedTickets.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Resolved
              </Text>
            </View>
          </View>
          </Card>
        </View>

        {/* Section: Active Complaint Tickets */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recent Production Tickets
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/complaints' as any)}>
            <Text style={[styles.sectionActionText, { color: colors.primary }]}>
              View All Desk →
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading support queue...
            </Text>
          </View>
        ) : tickets.length === 0 ? (
          <Card noPadding
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
              },
            ]}
          >
            <CheckCircle2 size={36} color={brandColors.blue} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Queue Clear!
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              There are no unresolved support tickets assigned to your queue at
              this moment. Great job!
            </Text>
          </Card>
        ) : (
          <View style={styles.ticketsList}>
            {tickets.map((t) => {
              const pBadge =
                PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.MEDIUM;
              const sBadge = STATUS_BADGE[t.status] || STATUS_BADGE.OPEN;

              return (
                <Card noPadding accessibilityRole="button"
                  key={t.id}
                  style={[
                    styles.ticketCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(22, 27, 34, 0.85)'
                        : '#FFFFFF',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  onPress={() =>
                    router.push(`/complaints?ticketId=${t.id}` as any)
                  }
                >
                  <View style={styles.ticketTopRow}>
                    <View style={styles.ticketIdRow}>
                      <Text
                        style={[styles.ticketNum, { color: colors.primary }]}
                      >
                        {t.ticket_number}
                      </Text>
                      <View
                        style={[
                          styles.badgePill,
                          {
                            backgroundColor: pBadge.bg,
                            borderColor: pBadge.color + '40',
                          },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: pBadge.color }]}
                        >
                          {pBadge.label}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: sBadge.bg,
                          borderColor: sBadge.color + '40',
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: sBadge.color }]}>
                        {sBadge.label}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.ticketTitle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {t.title}
                  </Text>
                  <Text
                    style={[styles.ticketDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {t.description}
                  </Text>

                  <View style={styles.ticketFooter}>
                    <View style={styles.schoolInfo}>
                      <School size={13} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.schoolCodeText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t.school_name || `School #${t.school_id}`}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text
                        style={[styles.actionLink, { color: colors.primary }]}
                      >
                        View Details
                      </Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Section: Support SLA & Escalation Protocols */}
        <Card noPadding
          style={[
            styles.guideCard,
            {
              backgroundColor: isDark ? 'rgba(30, 20, 48, 0.65)' : '#FAF5FF',
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
              Support Escalation & SLA Protocol
            </Text>
          </View>
          <Text style={[styles.guideText, { color: colors.textSecondary }]}>
            • Critical issues (Payment gateway failure, SMS broadcast failure,
            Attendance lock) must be acknowledged within 15 minutes.{'\n'}• Add
            progress notes to every ticket before changing status to
            WAITING_ON_CLIENT or RESOLVED.{'\n'}• If an issue requires a code
            patch or schema change, link the ticket to an Implementation
            requirement or escalate to Founder.
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
  ticketsList: { gap: 12, marginBottom: 24 },
  ticketCard: {
    borderRadius: workspaceUi.cardRadius,
    borderWidth: 1,
    padding: workspaceUi.cardPadding,
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
    borderRadius: workspaceUi.cardRadius,
    borderWidth: 1,
    padding: workspaceUi.cardPadding,
  },
  guideTitle: { fontSize: 14, fontWeight: '700' },
  guideText: { fontSize: 12.5, lineHeight: 20 },
});
