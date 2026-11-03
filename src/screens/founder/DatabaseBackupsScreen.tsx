import { workspaceUi } from '../../constants/layout';
import { brandColors, experienceColors } from '../../constants/experienceColors';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Database,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Play,
  Activity,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import {
  GlassCard,
  SkeletonPulse,
  founderGradients,
} from './founderUi';
import {
  backupApi,
  BackupJob,
  BackupEvent,
  BackupStats,
} from '../../services/backupService';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// ─── Local UI Components ───────────────────────────────────────────────────
function GlassBadge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badgeBase, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  gradient,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: readonly [string, string];
}) {
  const { colors, isDark } = useTheme();

  return (
    <GlassCard style={styles.statCard}>
      <LinearGradient
        colors={[...gradient]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.statCardInner}>
        <View style={styles.statTopRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            {icon}
          </View>
        </View>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </GlassCard>
  );
}

export function DatabaseBackupsScreen() {
  const { colors, isDark } = useTheme();

  // State
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modals
  const [selectedJob, setSelectedJob] = useState<BackupJob | null>(null);
  const [selectedJobEvents, setSelectedJobEvents] = useState<BackupEvent[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccessMsg, setTriggerSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch Stats & Jobs
  const fetchData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setLoadError(null);
      const [statsData, jobsData] = await Promise.all([
        backupApi.getStats(),
        backupApi.getBackups({
          page,
          limit: 15,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          type: selectedType !== 'all' ? selectedType : undefined,
        }),
      ]);

      setStats(statsData);
      setJobs(jobsData.data || []);
      setPagination(jobsData.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err: any) {
      console.error('Failed to load backup data:', err);
      setLoadError(err?.message || 'Failed to load backup data from Founder Console API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus, selectedType]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(pagination.page);
  };

  // Open Details Modal
  const handleOpenDetails = async (job: BackupJob) => {
    setSelectedJob(job);
    setSelectedJobEvents([]);
    setDetailsLoading(true);
    try {
      const details = await backupApi.getBackupDetails(job.id);
      setSelectedJob(details.job);
      setSelectedJobEvents(details.events || []);
    } catch (err) {
      console.error('Failed to load job events:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text?: string, fieldName = 'value') => {
    if (!text) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Trigger Manual Backup
  const handleTriggerBackup = async () => {
    try {
      setTriggering(true);
      setTriggerSuccessMsg('');
      const res = await backupApi.triggerManualBackup();
      setTriggerSuccessMsg(res.message || 'Backup pipeline triggered successfully');
      setTimeout(() => {
        setShowTriggerModal(false);
        setTriggerSuccessMsg('');
        fetchData(1);
      }, 1500);
    } catch (err: any) {
      alert(`Failed to trigger backup: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={{ gap: 4, flexGrow: 1, flexShrink: 1, flexBasis: 320, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Database Backups</Text>
            <View style={[styles.infraBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.infraBadgeText, { color: colors.primary }]}>INFRASTRUCTURE</Text>
            </View>
          </View>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Automated PostgreSQL logical snapshots, encryption, and disaster recovery
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button"
            style={[styles.refreshButton, { borderColor: colors.border }]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              color={colors.textSecondary}
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
            />
            <Text style={[styles.refreshText, { color: colors.textSecondary }]}>Refresh</Text>
          </Pressable>

          <Pressable accessibilityRole="button"
            style={styles.runManualBtn}
            onPress={() => setShowTriggerModal(true)}
          >
            <LinearGradient
              colors={[...founderGradients.primary]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Play size={15} color="#FFF" />
            <Text style={styles.runManualBtnText}>Run Manual Backup</Text>
          </Pressable>
        </View>
      </View>

      {loadError ? (
        <View style={[styles.failureAlert, { backgroundColor: colors.errorDim, borderColor: brandColors.red }]}>
          <AlertTriangle size={20} color={brandColors.red} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.failureTitle, { color: brandColors.red }]}>Unable to load backup metadata</Text>
            <Text style={[styles.failureText, { color: colors.textSecondary }]}>{loadError}</Text>
          </View>
        </View>
      ) : null}

      {stats?.staleBackup?.isStale ? (
        <View style={[styles.failureAlert, { backgroundColor: colors.warningDim, borderColor: brandColors.amber }]}>
          <AlertTriangle size={20} color={brandColors.amber} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.failureTitle, { color: brandColors.amber }]}>Backup freshness alert</Text>
            <Text style={[styles.failureText, { color: colors.textSecondary }]}>{stats.staleBackup.message}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.failureAlert, { backgroundColor: colors.infoDim, borderColor: colors.primary }]}>
        <ShieldCheck size={20} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.failureTitle, { color: colors.primary }]}>PostgreSQL backup scope</Text>
          <Text style={[styles.failureText, { color: colors.textSecondary }]}>
            These archives protect the SchoolIMS database only. Student photos, documents, and other Supabase Storage files are not included.
          </Text>
        </View>
      </View>

      {/* ── Top Metrics Grid ──────────────────────────────────────────────── */}
      {loading && !stats ? (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonPulse key={i} width="23%" height={120} borderRadius={20} />
          ))}
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {/* Card 1: Last Successful Backup */}
          <StatCard
            label="Last Successful Backup"
            value={stats?.lastSuccessfulBackup ? `${stats.lastSuccessfulBackup.age_hours}h ago` : 'None'}
            subtitle={stats?.lastSuccessfulBackup ? formatDate(stats.lastSuccessfulBackup.completed_at) : 'No successful backups yet'}
            icon={<CheckCircle2 size={20} color={brandColors.blue} />}
            gradient={[colors.infoDim, colors.infoDim]}
          />

          <StatCard
            label="Current Status"
            value={stats?.currentStatus?.status ? stats.currentStatus.status.replace('_', ' ') : 'Idle'}
            subtitle={stats?.currentStatus?.backup_id || 'No backup jobs recorded'}
            icon={<Activity size={20} color={brandColors.violet} />}
            gradient={[colors.infoDim, colors.infoDim]}
          />

          <StatCard
            label="Next Scheduled Run"
            value="02:00 IST"
            subtitle={stats?.nextScheduledBackup || 'Daily Cloud Scheduler trigger'}
            icon={<Clock size={20} color={brandColors.violet} />}
            gradient={[colors.infoDim, colors.infoDim]}
          />

          <StatCard
            label="30-Day Health"
            value={stats?.thirtyDayStats.successRatePercent == null ? '—' : `${stats.thirtyDayStats.successRatePercent}%`}
            subtitle={`${stats?.thirtyDayStats.successfulRuns ?? 0} successful / ${stats?.thirtyDayStats.failedRuns ?? 0} failed`}
            icon={<ShieldCheck size={20} color={colors.info} />}
            gradient={[colors.infoDim, colors.infoDim]}
          />

          {/* Card 4: Total Storage Used */}
          <StatCard
            label="30-Day Archive Volume"
            value={formatBytes(stats?.thirtyDayStats.totalStorageBytes)}
            subtitle={`Avg duration: ${stats?.thirtyDayStats.averageDurationSeconds ?? 0}s`}
            icon={<Database size={20} color={brandColors.violet} />}
            gradient={[colors.infoDim, colors.infoDim]}
          />
        </View>
      )}

      {/* ── 30-Day Health Visualizer ───────────────────────────────────────── */}
      {stats?.thirtyDayStats?.dailyTimeline && (
        <GlassCard style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color={colors.primary} />
              <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>
                30-Day Backup Timeline
              </Text>
            </View>
            <View style={styles.timelineLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: brandColors.blue }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Success</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: brandColors.red }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Failed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: isDark ? experienceColors.dark.surface : brandColors.paperDeep }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Idle</Text>
              </View>
            </View>
          </View>

          <View style={styles.timelineBlocks}>
            {stats.thirtyDayStats.dailyTimeline.map((day, idx) => {
              const bg =
                day.status === 'success'
                  ? brandColors.blue
                  : day.status === 'failed'
                  ? brandColors.red
                  : isDark ? experienceColors.dark.surface : brandColors.paperDeep;

              return (
                <View
                  key={idx}
                  style={[styles.timelineBlock, { backgroundColor: bg }]}
                />
              );
            })}
          </View>
        </GlassCard>
      )}

      {/* ── Recent Failures Alert (if any) ────────────────────────────────── */}
      {stats?.recentFailures && stats.recentFailures.length > 0 && (
        <View style={[styles.failureAlert, { backgroundColor: colors.errorDim, borderColor: brandColors.red }]}>
          <AlertTriangle size={20} color={brandColors.red} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.failureTitle, { color: brandColors.red }]}>
              Recent Backup Failure Detected
            </Text>
            {stats.recentFailures.slice(0, 2).map((fail) => (
              <Text key={fail.id} style={[styles.failureText, { color: colors.textSecondary }]}>
                {fail.backup_id} ({formatDate(fail.started_at)}): {fail.error_message || 'Unspecified failure'}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* ── Filters & Table Controls ───────────────────────────────────────── */}
      <View style={styles.tableControls}>
        <View>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Backup Archive History</Text>
          <Text style={[styles.sectionSubheading, { color: colors.textSecondary }]}>
            Verified immutable archives stored in private Google Cloud Storage
          </Text>
        </View>

        <View style={styles.filterPills}>
          {['all', 'daily', 'weekly', 'monthly', 'manual'].map((t) => (
            <Pressable accessibilityRole="button"
              key={t}
              style={[
                styles.filterPill,
                selectedType === t && { backgroundColor: colors.primaryFill },
                { borderColor: colors.border },
              ]}
              onPress={() => setSelectedType(t)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: selectedType === t ? '#FFF' : colors.textSecondary },
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Backup History Table ─────────────────────────────────────────── */}
      <GlassCard style={styles.tableCard}>
        <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tableHeaderCell, { flex: 2, color: colors.textSecondary }]}>DATE & TIME</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2.2, color: colors.textSecondary }]}>BACKUP ID</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.textSecondary }]}>TYPE</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.2, color: colors.textSecondary }]}>STATUS</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.2, color: colors.textSecondary }]}>SIZE</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.textSecondary }]}>DURATION</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.2, color: colors.textSecondary }]}>VERIFICATION</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right', color: colors.textSecondary }]}>ACTIONS</Text>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading backup registry...</Text>
          </View>
        ) : jobs.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Database size={40} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>No backups found</Text>
            <Text style={{ marginTop: 4, color: colors.textSecondary, textAlign: 'center' }}>
              No automated or manual backups have completed matching your filter criteria.
            </Text>
          </View>
        ) : (
          jobs.map((job, idx) => {
            const isSuccess = job.status === 'success';
            const isFailed = job.status === 'failed';
            const isVerified = job.verification_status === 'verified';

            return (
              <View
                key={job.id}
                style={[
                  styles.tableRow,
                  { borderBottomColor: colors.border },
                  idx % 2 === 1 && { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' },
                ]}
              >
                <Text style={[styles.tableCell, { flex: 2, color: colors.textPrimary }]}>
                  {formatDate(job.started_at)}
                </Text>

                <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.tableCellMono, { color: colors.textPrimary }]}>{job.backup_id}</Text>
                  <Pressable accessibilityLabel="Copy details" accessibilityRole="button" onPress={() => handleCopy(job.backup_id, `id-${job.id}`)}>
                    {copiedField === `id-${job.id}` ? (
                      <Check size={14} color={brandColors.blue} />
                    ) : (
                      <Copy size={14} color={colors.textSecondary} />
                    )}
                  </Pressable>
                </View>

                <View style={{ flex: 1 }}>
                  <GlassBadge
                    text={job.backup_type}
                    color={job.backup_type === 'manual' ? '#EC4899' : brandColors.violet}
                  />
                </View>

                <View style={{ flex: 1.2 }}>
                  <GlassBadge
                    text={job.status.toUpperCase()}
                    color={isSuccess ? brandColors.blue : isFailed ? brandColors.red : colors.warning}
                  />
                </View>

                <Text style={[styles.tableCell, { flex: 1.2, color: colors.textPrimary }]}>
                  {formatBytes(job.file_size_bytes)}
                </Text>

                <Text style={[styles.tableCell, { flex: 1, color: colors.textSecondary }]}>
                  {job.duration_seconds ? `${job.duration_seconds}s` : '—'}
                </Text>

                <View style={{ flex: 1.2 }}>
                  <GlassBadge
                    text={isVerified ? 'VERIFIED' : job.verification_status.toUpperCase()}
                    color={isVerified ? brandColors.blue : isFailed ? brandColors.red : '#9CA3AF'}
                  />
                </View>

                <View style={{ flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <Pressable accessibilityRole="button"
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => handleOpenDetails(job)}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                      Details
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* ── Pagination Footer ────────────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <View style={styles.paginationRow}>
            <Text style={[styles.paginationText, { color: colors.textSecondary }]}>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total runs)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable accessibilityLabel="Previous page" accessibilityRole="button"
                disabled={pagination.page <= 1}
                style={[
                  styles.pageBtn,
                  { borderColor: colors.border, opacity: pagination.page <= 1 ? 0.4 : 1 },
                ]}
                onPress={() => fetchData(pagination.page - 1)}
              >
                <ChevronLeft size={16} color={colors.textPrimary} />
              </Pressable>
              <Pressable accessibilityLabel="Next page" accessibilityRole="button"
                disabled={pagination.page >= pagination.totalPages}
                style={[
                  styles.pageBtn,
                  { borderColor: colors.border, opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 },
                ]}
                onPress={() => fetchData(pagination.page + 1)}
              >
                <ChevronRight size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        )}
      </GlassCard>

      {/* ── Details Modal / Drawer ─────────────────────────────────────────── */}
      <Modal visible={!!selectedJob} transparent animationType="fade" onRequestClose={() => setSelectedJob(null)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Backup Details</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedJob?.backup_id}
                </Text>
              </View>
              <Pressable accessibilityLabel="Close dialog" accessibilityRole="button" style={styles.modalCloseBtn} onPress={() => setSelectedJob(null)}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedJob && (
              <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>STATUS</Text>
                    <GlassBadge
                      text={selectedJob.status.toUpperCase()}
                      color={selectedJob.status === 'success' ? brandColors.blue : brandColors.red}
                    />
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>TYPE</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedJob.backup_type.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>VERIFICATION</Text>
                    <GlassBadge
                      text={(selectedJob.verification_status || 'unverified').toUpperCase()}
                      color={selectedJob.verification_status === 'verified' ? brandColors.blue : selectedJob.verification_status === 'failed' ? brandColors.red : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>STARTED AT</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {formatDate(selectedJob.started_at)}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>COMPLETED AT</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {formatDate(selectedJob.completed_at)}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SIZE</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {formatBytes(selectedJob.file_size_bytes)}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DURATION</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedJob.duration_seconds ? `${selectedJob.duration_seconds} seconds` : '—'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DATABASE ENGINE</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedJob.database_version || '—'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ENCRYPTION</Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      AES-256-GCM (Authenticated)
                    </Text>
                  </View>
                </View>

                {/* Storage Path */}
                <View style={[styles.metaBlock, { borderColor: colors.border }]}>
                  <Text style={[styles.metaBlockLabel, { color: colors.textSecondary }]}>
                    STORAGE PATH (GCS)
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.metaBlockValue, { color: colors.textPrimary }]}>
                      {selectedJob.storage_path || '—'}
                    </Text>
                    <Pressable accessibilityLabel="Copy details" accessibilityRole="button" onPress={() => handleCopy(selectedJob.storage_path, 'storage_path')}>
                      {copiedField === 'storage_path' ? (
                        <Check size={16} color={brandColors.blue} />
                      ) : (
                        <Copy size={16} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* SHA-256 Checksum */}
                <View style={[styles.metaBlock, { borderColor: colors.border }]}>
                  <Text style={[styles.metaBlockLabel, { color: colors.textSecondary }]}>
                    SHA-256 INTEGRITY CHECKSUM
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.metaBlockValue, { color: colors.textPrimary, fontSize: 12 }]}>
                      {selectedJob.checksum_sha256 || '—'}
                    </Text>
                    <Pressable accessibilityLabel="Copy details" accessibilityRole="button" onPress={() => handleCopy(selectedJob.checksum_sha256, 'checksum')}>
                      {copiedField === 'checksum' ? (
                        <Check size={16} color={brandColors.blue} />
                      ) : (
                        <Copy size={16} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Failure message if failed */}
                {selectedJob.error_message && (
                  <View style={[styles.failureBlock, { borderColor: brandColors.red, backgroundColor: colors.errorDim }]}>
                    <Text style={{ fontWeight: '700', color: brandColors.red, marginBottom: 4 }}>
                      EXECUTION ERROR
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
                      {selectedJob.error_message}
                    </Text>
                  </View>
                )}

                {/* Event Audit Trail */}
                <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginTop: 24, marginBottom: 12 }]}>
                  Chronological Event Stream
                </Text>

                {detailsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
                ) : selectedJobEvents.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                    No fine-grained event logs found for this job.
                  </Text>
                ) : (
                  <View style={styles.eventTimeline}>
                    {selectedJobEvents.map((evt) => (
                      <View key={evt.id} style={styles.timelineItem}>
                        <View style={[styles.eventBullet, { backgroundColor: evt.event_type.includes('FAIL') ? brandColors.red : brandColors.blue }]} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[styles.eventType, { color: colors.textPrimary }]}>{evt.event_type}</Text>
                            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                              {new Date(evt.created_at).toLocaleTimeString()}
                            </Text>
                          </View>
                          {evt.message ? (
                            <Text style={[styles.eventMsg, { color: colors.textSecondary }]}>{evt.message}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </GlassCard>
        </View>
      </Modal>

      {/* ── Manual Backup Confirmation Modal ───────────────────────────────── */}
      <Modal visible={showTriggerModal} transparent animationType="fade" onRequestClose={() => setShowTriggerModal(false)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.triggerModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Trigger Manual Backup</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Immediate logical dump to Google Cloud Storage
                </Text>
              </View>
              <Pressable accessibilityLabel="Close dialog" accessibilityRole="button" style={styles.modalCloseBtn} onPress={() => setShowTriggerModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ marginVertical: 16, gap: 12 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>
                This action initiates a full logical PostgreSQL backup via pg_dump, encrypts the snapshot with AES-256-GCM, generates a SHA-256 checksum, and uploads it to private GCS storage.
              </Text>
              <View style={[styles.warningBox, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }}>
                  • Private Cloud Run Job executes independently of this dashboard{'\n'}
                  • Idempotent: Never overwrites existing archives{'\n'}
                  • Refresh this page to see persisted job status and events
                </Text>
              </View>

              {triggerSuccessMsg ? (
                <View style={[styles.warningBox, { backgroundColor: colors.infoDim, borderColor: brandColors.blue }]}>
                  <Text style={{ color: brandColors.blue, fontWeight: '600' }}>{triggerSuccessMsg}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <Pressable accessibilityRole="button"
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowTriggerModal(false)}
                disabled={triggering}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </Pressable>

              <Pressable accessibilityRole="button"
                style={[styles.runManualBtn, { opacity: triggering ? 0.7 : 1 }]}
                onPress={handleTriggerBackup}
                disabled={triggering}
              >
                <LinearGradient
                  colors={[...founderGradients.primary]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                {triggering ? <ActivityIndicator size="small" color="#FFF" /> : <Play size={16} color="#FFF" />}
                <Text style={styles.runManualBtnText}>
                  {triggering ? 'Initiating Pipeline...' : 'Confirm & Run Backup'}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  pageTitle: {
    fontSize: workspaceUi.pageTitle.fontSize,
    fontWeight: workspaceUi.pageTitle.fontWeight,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
  },
  infraBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  infraBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: workspaceUi.controlRadius,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
  runManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: workspaceUi.controlRadius,
    overflow: 'hidden',
  },
  runManualBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    padding: workspaceUi.cardPadding,
    borderRadius: workspaceUi.cardRadius,
    overflow: 'hidden',
  },
  statCardInner: {
    gap: 6,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statSubtitle: {
    fontSize: 12,
  },
  timelineCard: {
    padding: workspaceUi.cardPadding,
    borderRadius: workspaceUi.cardRadius,
    gap: 14,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  timelineLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineBlocks: {
    flexDirection: 'row',
    gap: 6,
    height: 28,
  },
  timelineBlock: {
    flex: 1,
    height: '100%',
    borderRadius: 6,
  },
  failureAlert: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  failureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  failureText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tableControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubheading: {
    fontSize: 13,
    marginTop: 2,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableCard: {
    borderRadius: workspaceUi.cardRadius,
    overflow: 'hidden',
    padding: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 13,
    fontWeight: '500',
  },
  tableCellMono: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  badgeBase: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: workspaceUi.controlRadius,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  paginationText: {
    fontSize: 13,
  },
  pageBtn: {
    padding: 8,
    borderRadius: workspaceUi.controlRadius,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalCard: {
    width: '100%',
    maxWidth: 680,
    padding: workspaceUi.cardPadding,
    borderRadius: workspaceUi.cardRadius,
  },
  triggerModalCard: {
    width: '100%',
    maxWidth: 520,
    padding: workspaceUi.cardPadding,
    borderRadius: workspaceUi.cardRadius,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: workspaceUi.sectionTitle.fontSize,
    fontWeight: workspaceUi.sectionTitle.fontWeight,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: workspaceUi.controlRadius,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    width: '47%',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  metaBlockLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaBlockValue: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
  failureBlock: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  eventTimeline: {
    gap: 16,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(129,140,248,0.2)',
    marginLeft: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginLeft: -14,
  },
  eventType: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 11,
  },
  eventMsg: {
    fontSize: 12,
  },
  warningBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: workspaceUi.controlRadius,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DatabaseBackupsScreen;
