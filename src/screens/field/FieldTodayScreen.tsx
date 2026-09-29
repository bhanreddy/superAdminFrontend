import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Navigation,
  PlusCircle,
  PlayCircle,
  WifiOff,
  CheckCircle2,
  Route as RouteIcon,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Target,
  Award,
  Car,
  Check,
  StopCircle,
  RotateCcw,
  Building2,
  UserCheck,
  X,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import {
  fieldVisitApi,
  syncQueue,
  getQueue,
  newClientKey,
} from '../../services/fieldVisitService';
import { ConsoleAmbientBackground, GlassCard, SkeletonKpiGrid } from '../founder/founderUi';

async function getQuickLocation(
  timeoutMs = 2500,
): Promise<{ lat: number; lng: number; accuracy: number | null } | null> {
  if (typeof navigator === 'undefined' || !(navigator as any)?.geolocation) return null;
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    try {
      (navigator as any).geolocation.getCurrentPosition(
        (pos: any) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              lat: pos.coords?.latitude,
              lng: pos.coords?.longitude,
              accuracy: pos.coords?.accuracy ?? null,
            });
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
      );
    } catch {
      resolve(null);
    }
  });
}

export default function FieldTodayScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  // Action states
  const [startingDay, setStartingDay] = useState(false);
  const [endingDay, setEndingDay] = useState(false);
  const [reopeningDay, setReopeningDay] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warn' } | null>(null);

  // Modals
  const [endDayModalOpen, setEndDayModalOpen] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipTarget, setSkipTarget] = useState<any>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipping, setSkipping] = useState(false);

  // Remote check-in fallback modal
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [remoteTarget, setRemoteTarget] = useState<any>(null);
  const [remoteReason, setRemoteReason] = useState('');

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const load = useCallback(async () => {
    try {
      const res: any = await fieldVisitApi.today();
      const payload = res?.data ?? res;
      setData(payload);
      setOffline(false);
      const q = await getQueue();
      setPending(q.filter((i) => i.status === 'pending' || i.status === 'failed').length);
      syncQueue().catch(() => {});
    } catch {
      setOffline(true);
      const q = await getQueue();
      setPending(q.filter((i) => i.status === 'pending' || i.status === 'failed').length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const day = data?.day;
  const visits: any[] = data?.visits || [];
  const t = data?.totals || {};

  const dayStatus: 'PLANNED' | 'ACTIVE' | 'COMPLETED' = day?.status || 'PLANNED';
  const isDayActive = dayStatus === 'ACTIVE';
  const isDayCompleted = dayStatus === 'COMPLETED';
  const isDayNotStarted = !day || dayStatus === 'PLANNED';

  const plannedCount = t.planned ?? visits.filter((v) => v.planned && v.status !== 'SKIPPED').length;
  const visitedCount = t.visited ?? visits.filter((v) => v.status === 'COMPLETED').length;
  const qualifiedCount = t.qualified ?? visits.filter((v) => v.priority === 'HIGH').length;
  const distanceKm = t.distance_km ?? Number(day?.total_distance_km || 0);
  const demosCount = t.demos ?? (day?.demo_count || 0);

  const progress = plannedCount > 0 ? Math.min(100, Math.round((visitedCount / plannedCount) * 100)) : 0;

  // Next upcoming planned stop
  const nextStop = useMemo(() => {
    return visits.find((v) => v.status === 'PLANNED' || v.status === 'CHECKED_IN');
  }, [visits]);

  // Handler: Start My Day
  const handleStartDay = async () => {
    if (startingDay) return;
    setStartingDay(true);
    showToast('Starting your field day...', 'info');

    try {
      const key = newClientKey('day');
      const gps = await getQuickLocation(2500);

      await fieldVisitApi.startDay({
        client_key: key,
        lat: gps?.lat,
        lng: gps?.lng,
      });

      showToast('🚀 Field mission started! Have a great day.', 'success');
      await load();
    } catch (e: any) {
      showToast('Day started (offline mode enabled)', 'warn');
      await load();
    } finally {
      setStartingDay(false);
    }
  };

  // Handler: End My Day
  const handleEndDay = async () => {
    if (endingDay) return;
    setEndingDay(true);
    try {
      const gps = await getQuickLocation(2000);
      await fieldVisitApi.endDay({
        lat: gps?.lat,
        lng: gps?.lng,
      });
      setEndDayModalOpen(false);
      showToast('🎉 Mission completed for today! Great work.', 'success');
      await load();
    } catch (e: any) {
      showToast('Could not end day: ' + (e?.message || 'Error'), 'warn');
    } finally {
      setEndingDay(false);
    }
  };

  // Handler: Reopen / Resume Day
  const handleReopenDay = async () => {
    if (reopeningDay) return;
    setReopeningDay(true);
    try {
      await fieldVisitApi.reopenDay();
      showToast('Day resumed. You can continue field visits.', 'success');
      await load();
    } catch (e: any) {
      showToast('Could not reopen day', 'warn');
    } finally {
      setReopeningDay(false);
    }
  };

  // Handler: Quick Check In
  const handleCheckIn = async (visit: any, overrideRemoteReason?: string) => {
    if (checkingInId) return;
    setCheckingInId(visit.id);
    showToast(`Checking in to ${visit.school_name || 'school'}...`, 'info');

    try {
      const gps = await getQuickLocation(3000);
      const payload: any = {
        client_key: newClientKey('ci'),
        visit_id: visit.status === 'PLANNED' ? visit.id : undefined,
        school_account_id: visit.school_account_id,
        lead_id: visit.lead_id,
        checkin_lat: gps?.lat,
        checkin_lng: gps?.lng,
        gps_accuracy: gps?.accuracy,
        planned: true,
        remote_reason: overrideRemoteReason,
      };

      const res: any = await fieldVisitApi.checkIn(payload);
      const checkedInId = res?.data?.id || res?.id || visit.id;

      showToast(`📍 Checked in successfully! Opening workspace...`, 'success');
      await load();
      router.push(`/(app)/field/visit/${checkedInId}` as any);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === 'REMOTE_REASON_REQUIRED') {
        setRemoteTarget(visit);
        setRemoteReason('');
        setRemoteModalOpen(true);
      } else {
        showToast(e?.response?.data?.error || 'Check-in saved offline.', 'warn');
        router.push(`/(app)/field/visit/${visit.id}` as any);
      }
    } finally {
      setCheckingInId(null);
    }
  };

  // Handler: Submit Remote Check In
  const handleConfirmRemoteCheckIn = async () => {
    if (!remoteTarget || !remoteReason.trim()) return;
    setRemoteModalOpen(false);
    await handleCheckIn(remoteTarget, remoteReason.trim());
    setRemoteTarget(null);
    setRemoteReason('');
  };

  // Handler: Skip Visit
  const handleConfirmSkip = async () => {
    if (!skipTarget || !skipReason.trim()) return;
    setSkipping(true);
    try {
      await fieldVisitApi.skipVisit(skipTarget.id, skipReason.trim());
      setSkipModalOpen(false);
      setSkipTarget(null);
      setSkipReason('');
      showToast('Stop skipped.', 'info');
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Could not skip visit', 'warn');
    } finally {
      setSkipping(false);
    }
  };

  // Formatting strings
  const name = (user as any)?.full_name || (user as any)?.email?.split('@')[0] || 'Executive';
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const startedTimeStr = day?.started_at
    ? new Date(day.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const endedTimeStr = day?.ended_at
    ? new Date(day.ended_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Floating Toast Notification */}
        {toast && (
          <View
            style={[
              styles.toastBox,
              toast.type === 'success' && { backgroundColor: '#10B981' },
              toast.type === 'warn' && { backgroundColor: '#F59E0B' },
              toast.type === 'info' && { backgroundColor: '#0A84FF' },
            ]}
          >
            <Sparkles size={16} color="#fff" />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}

        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
                <Building2 size={11} color={colors.primary} />
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Sales Executive</Text>
              </View>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{todayFormatted}</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Today's Mission</Text>
            <Text style={[styles.greet, { color: colors.textSecondary }]}>
              Welcome back, <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{name}</Text>
            </Text>
          </View>

          <Pressable
            onPress={() => {
              setRefreshing(true);
              load();
            }}
            style={[styles.iconButton, { borderColor: colors.glassBorder }]}
          >
            <RefreshCw size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Offline / Sync Banner */}
        {(offline || pending > 0) && (
          <GlassCard style={[styles.banner, { borderColor: '#FF9F0A55', backgroundColor: '#FF9F0A11' }]}>
            <WifiOff size={16} color="#FF9F0A" />
            <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
              {offline
                ? 'Offline Mode — Changes saved on device and will sync automatically.'
                : `${pending} operations queued — Syncing with server...`}
            </Text>
          </GlassCard>
        )}

        {/* ── HERO MISSION CONTROL CARD ─────────────────────────────── */}
        <GlassCard style={[styles.heroCard, { borderColor: isDayActive ? '#30D15844' : isDayCompleted ? '#0A84FF33' : colors.glassBorder }]}>
          {/* STATE 1: Day NOT Started */}
          {isDayNotStarted && (
            <View style={styles.heroContent}>
              <View style={styles.heroStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#FF9F0A' }]} />
                <Text style={[styles.statusTitle, { color: '#FF9F0A' }]}>DAY NOT STARTED</Text>
              </View>
              <Text style={[styles.heroHeading, { color: colors.textPrimary }]}>
                Ready to launch today's field run?
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                {plannedCount > 0
                  ? `You have ${plannedCount} school${plannedCount > 1 ? 's' : ''} planned for today. Tap below to begin tracking your visits and route.`
                  : 'No visits planned for today yet. Start your day to log unplanned visits or research schools in the planner.'}
              </Text>

              <Pressable
                onPress={handleStartDay}
                disabled={startingDay}
                style={[
                  styles.ctaButton,
                  styles.ctaPrimary,
                  Platform.OS === 'web' && ({ cursor: 'pointer', userSelect: 'none' } as any),
                  startingDay && { opacity: 0.8 },
                ]}
              >
                {startingDay ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.ctaPrimaryText}>Starting Mission...</Text>
                  </>
                ) : (
                  <>
                    <PlayCircle size={20} color="#fff" />
                    <Text style={styles.ctaPrimaryText}>Start My Day</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* STATE 2: Day ACTIVE */}
          {isDayActive && (
            <View style={styles.heroContent}>
              <View style={styles.heroStatusRow}>
                <View style={[styles.pulseBeacon, { backgroundColor: '#30D158' }]} />
                <Text style={[styles.statusTitle, { color: '#30D158' }]}>MISSION IN PROGRESS</Text>
                {startedTimeStr && (
                  <Text style={[styles.startedTimeText, { color: colors.textSecondary }]}>
                    · Started at {startedTimeStr}
                  </Text>
                )}
              </View>

              <Text style={[styles.heroHeading, { color: colors.textPrimary }]}>
                {visitedCount === plannedCount && plannedCount > 0
                  ? 'All planned stops finished! 🎉'
                  : `${visitedCount} of ${plannedCount} visits completed`}
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Travel: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{distanceKm} KM</Text> logged ·{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{qualifiedCount}</Text> qualified leads
              </Text>

              {/* Action Buttons */}
              <View style={styles.heroActionGrid}>
                {nextStop && nextStop.status === 'PLANNED' && (
                  <Pressable
                    onPress={() => handleCheckIn(nextStop)}
                    disabled={Boolean(checkingInId)}
                    style={[
                      styles.ctaButton,
                      styles.ctaSuccess,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                  >
                    {checkingInId === nextStop.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MapPin size={18} color="#fff" />
                    )}
                    <Text style={styles.ctaPrimaryText}>
                      {checkingInId === nextStop.id ? 'Checking In…' : `Check In: ${nextStop.school_name || 'Next Stop'}`}
                    </Text>
                  </Pressable>
                )}

                <View style={styles.heroSecondaryActions}>
                  <Pressable
                    onPress={() => router.push('/(app)/field/route' as any)}
                    style={[styles.ctaButton, styles.ctaOutline, { borderColor: colors.glassBorder }]}
                  >
                    <RouteIcon size={16} color={colors.primary} />
                    <Text style={[styles.ctaOutlineText, { color: colors.primary }]}>View Route Map</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push('/(app)/field/visit/new' as any)}
                    style={[styles.ctaButton, styles.ctaOutline, { borderColor: colors.glassBorder }]}
                  >
                    <PlusCircle size={16} color="#30D158" />
                    <Text style={[styles.ctaOutlineText, { color: '#30D158' }]}>Add Unplanned</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setEndDayModalOpen(true)}
                    style={[styles.ctaButton, styles.ctaDangerOutline, { borderColor: 'rgba(255, 69, 58, 0.4)' }]}
                  >
                    <StopCircle size={16} color="#FF453A" />
                    <Text style={[styles.ctaOutlineText, { color: '#FF453A' }]}>End My Day</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* STATE 3: Day COMPLETED */}
          {isDayCompleted && (
            <View style={styles.heroContent}>
              <View style={styles.heroStatusRow}>
                <CheckCircle2 size={16} color="#30D158" />
                <Text style={[styles.statusTitle, { color: '#30D158' }]}>DAY COMPLETED</Text>
                {endedTimeStr && (
                  <Text style={[styles.startedTimeText, { color: colors.textSecondary }]}>
                    · Ended at {endedTimeStr}
                  </Text>
                )}
              </View>
              <Text style={[styles.heroHeading, { color: colors.textPrimary }]}>
                Mission finished for today!
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Great effort today: {visitedCount} schools visited, {demosCount} demos delivered, and {distanceKm} KM covered.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={handleReopenDay}
                  disabled={reopeningDay}
                  style={[styles.ctaButton, styles.ctaOutline, { borderColor: colors.glassBorder, flex: 1 }]}
                >
                  <RotateCcw size={16} color={colors.primary} />
                  <Text style={[styles.ctaOutlineText, { color: colors.primary }]}>
                    {reopeningDay ? 'Reopening…' : 'Resume Day'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(app)/field/planner' as any)}
                  style={[styles.ctaButton, styles.ctaPrimary, { flex: 1 }]}
                >
                  <Calendar size={16} color="#fff" />
                  <Text style={styles.ctaPrimaryText}>Plan Tomorrow</Text>
                </Pressable>
              </View>
            </View>
          )}
        </GlassCard>

        {/* ── KPI METRICS STRIP ────────────────────────────────────── */}
        {loading ? (
          <SkeletonKpiGrid />
        ) : (
          <GlassCard style={styles.kpiCard}>
            <View style={styles.kpiRow}>
              <KpiBox
                icon={<Target size={16} color={colors.textPrimary} />}
                label="Planned"
                value={String(plannedCount)}
                color={colors.textPrimary}
              />
              <View style={styles.kpiDivider} />
              <KpiBox
                icon={<CheckCircle2 size={16} color="#30D158" />}
                label="Visited"
                value={`${visitedCount}`}
                color="#30D158"
              />
              <View style={styles.kpiDivider} />
              <KpiBox
                icon={<Award size={16} color="#0A84FF" />}
                label="Qualified"
                value={String(qualifiedCount)}
                color="#0A84FF"
              />
              <View style={styles.kpiDivider} />
              <KpiBox
                icon={<Car size={16} color="#64D2FF" />}
                label="KM"
                value={String(distanceKm)}
                color="#64D2FF"
              />
            </View>

            {/* Day Progress Track */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressLabelsRow}>
                <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
                  Day Progress: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{progress}%</Text>
                </Text>
                <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
                  {visitedCount} of {plannedCount} stops completed
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* ── NEXT STOP SPOTLIGHT (If day active and next stop exists) ── */}
        {isDayActive && nextStop && nextStop.status === 'PLANNED' && (
          <GlassCard style={[styles.nextStopCard, { borderColor: '#0A84FF55', backgroundColor: '#0A84FF0D' }]}>
            <View style={styles.nextStopHeader}>
              <View style={styles.spotlightTag}>
                <Sparkles size={12} color="#0A84FF" />
                <Text style={styles.spotlightTagText}>NEXT UP</Text>
              </View>
              {nextStop.appointment_at && (
                <View style={styles.timeTag}>
                  <Clock size={12} color="#FF9F0A" />
                  <Text style={styles.timeTagText}>
                    {new Date(nextStop.appointment_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.nextSchoolName, { color: colors.textPrimary }]}>
              {nextStop.school_name || 'Upcoming School Stop'}
            </Text>

            {nextStop.school_locality && (
              <Text style={[styles.nextSchoolArea, { color: colors.textSecondary }]}>
                📍 {nextStop.school_locality}
              </Text>
            )}

            {nextStop.research_note ? (
              <View style={[styles.noteBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={2}>
                  Prep Note: {nextStop.research_note}
                </Text>
              </View>
            ) : null}

            {/* Quick Actions Row */}
            <View style={styles.spotlightActions}>
              <Pressable
                onPress={() => handleCheckIn(nextStop)}
                disabled={Boolean(checkingInId)}
                style={[styles.spotlightCheckInBtn, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
              >
                {checkingInId === nextStop.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MapPin size={16} color="#fff" />
                )}
                <Text style={styles.spotlightCheckInText}>
                  {checkingInId === nextStop.id ? 'Locating & Checking In…' : 'Check In to School'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      nextStop.school_name + (nextStop.school_locality ? ` ${nextStop.school_locality}` : ''),
                    )}`,
                  ).catch(() => {})
                }
                style={[styles.spotlightActionBtn, { borderColor: colors.glassBorder }]}
              >
                <Navigation size={16} color={colors.primary} />
                <Text style={[styles.spotlightActionText, { color: colors.primary }]}>Directions</Text>
              </Pressable>

              {(nextStop.school_phone || nextStop.contact_phone) && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${nextStop.contact_phone || nextStop.school_phone}`).catch(() => {})}
                  style={[styles.spotlightActionBtn, { borderColor: colors.glassBorder }]}
                >
                  <Phone size={16} color="#30D158" />
                </Pressable>
              )}
            </View>
          </GlassCard>
        )}

        {/* ── TODAY'S JOURNEY TIMELINE ─────────────────────────────── */}
        <View style={styles.journeyHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Today's Journey ({visits.length})
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/field/planner' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Planner</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        {visits.map((v: any, index: number) => {
          const isDone = v.status === 'COMPLETED';
          const isInProgress = v.status === 'CHECKED_IN' || v.status === 'IN_PROGRESS';
          const isSkipped = v.status === 'SKIPPED';
          const isPlanned = v.status === 'PLANNED';

          return (
            <GlassCard key={v.id || index} style={styles.journeyCard}>
              <View style={styles.cardMainRow}>
                {/* Step Index Badge */}
                <View
                  style={[
                    styles.stepBadge,
                    isDone && { backgroundColor: '#30D15822', borderColor: '#30D158' },
                    isInProgress && { backgroundColor: '#FF9F0A22', borderColor: '#FF9F0A' },
                    isPlanned && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary },
                    isSkipped && { backgroundColor: 'rgba(150,150,150,0.15)', borderColor: 'rgba(150,150,150,0.4)' },
                  ]}
                >
                  {isDone ? (
                    <Check size={14} color="#30D158" strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        {
                          color: isInProgress
                            ? '#FF9F0A'
                            : isPlanned
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Main Stop Info */}
                <View style={{ flex: 1 }}>
                  <View style={styles.stopTitleRow}>
                    <Text style={[styles.schoolTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {v.school_name || v.lead_id?.slice(0, 8) || 'School Visit'}
                    </Text>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.stopStatusBadge,
                        isDone && { backgroundColor: '#30D1581F', borderColor: '#30D15855' },
                        isInProgress && { backgroundColor: '#FF9F0A1F', borderColor: '#FF9F0A55' },
                        isPlanned && { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` },
                        isSkipped && { backgroundColor: 'rgba(150,150,150,0.15)', borderColor: 'rgba(150,150,150,0.3)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stopStatusText,
                          {
                            color: isDone
                              ? '#30D158'
                              : isInProgress
                              ? '#FF9F0A'
                              : isPlanned
                              ? colors.primary
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {isDone
                          ? v.visit_outcome?.replace(/_/g, ' ') || 'COMPLETED'
                          : isInProgress
                          ? 'IN PROGRESS'
                          : isSkipped
                          ? 'SKIPPED'
                          : 'PLANNED'}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata Row */}
                  <View style={styles.stopMetaRow}>
                    {v.appointment_at && (
                      <View style={styles.metaItem}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {new Date(v.appointment_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}

                    {(v.route_distance_km || v.straight_distance_km) && (
                      <View style={styles.metaItem}>
                        <RouteIcon size={12} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {v.route_distance_km ?? v.straight_distance_km} KM
                        </Text>
                      </View>
                    )}

                    {v.priority === 'HIGH' && (
                      <View style={[styles.priorityTag, { backgroundColor: '#FF9F0A1A', borderColor: '#FF9F0A44' }]}>
                        <Text style={styles.priorityText}>High Priority</Text>
                      </View>
                    )}

                    {v.unplanned && (
                      <View style={[styles.priorityTag, { backgroundColor: '#30D1581A', borderColor: '#30D15844' }]}>
                        <Text style={[styles.priorityText, { color: '#30D158' }]}>Unplanned</Text>
                      </View>
                    )}
                  </View>

                  {/* Locality & Contact */}
                  {(v.school_locality || v.contact_name) && (
                    <Text style={[styles.localityText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {v.school_locality ? `📍 ${v.school_locality}` : ''}
                      {v.school_locality && v.contact_name ? ' · ' : ''}
                      {v.contact_name ? `Contact: ${v.contact_name}` : ''}
                    </Text>
                  )}

                  {/* Research Note preview */}
                  {v.research_note ? (
                    <Text style={[styles.stopPrepNote, { color: colors.textSecondary }]} numberOfLines={1}>
                      💡 {v.research_note}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Action Strip on Card */}
              <View style={[styles.cardActionStrip, { borderTopColor: colors.glassBorder }]}>
                {isPlanned && (
                  <>
                    <Pressable
                      onPress={() => handleCheckIn(v)}
                      disabled={Boolean(checkingInId)}
                      style={[
                        styles.inlineCheckInBtn,
                        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                      ]}
                    >
                      {checkingInId === v.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MapPin size={14} color="#fff" />
                      )}
                      <Text style={styles.inlineCheckInText}>
                        {checkingInId === v.id ? 'Locating…' : 'Check In'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        Linking.openURL(
                          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            v.school_name + (v.school_locality ? ` ${v.school_locality}` : ''),
                          )}`,
                        ).catch(() => {})
                      }
                      style={[styles.inlineGhostBtn, { borderColor: colors.glassBorder }]}
                    >
                      <Navigation size={14} color={colors.primary} />
                      <Text style={[styles.inlineGhostText, { color: colors.primary }]}>Directions</Text>
                    </Pressable>

                    {(v.contact_phone || v.school_phone) && (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${v.contact_phone || v.school_phone}`).catch(() => {})}
                        style={[styles.inlineIconBtn, { borderColor: colors.glassBorder }]}
                      >
                        <Phone size={14} color="#30D158" />
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => {
                        setSkipTarget(v);
                        setSkipReason('');
                        setSkipModalOpen(true);
                      }}
                      style={[styles.inlineIconBtn, { borderColor: colors.glassBorder }]}
                    >
                      <Text style={{ fontSize: 12, color: colors.textTertiary }}>Skip</Text>
                    </Pressable>
                  </>
                )}

                {isInProgress && (
                  <Pressable
                    onPress={() => router.push(`/(app)/field/visit/${v.id}` as any)}
                    style={[styles.inlineResumeBtn, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
                  >
                    <Building2 size={14} color="#fff" />
                    <Text style={styles.inlineCheckInText}>Open Visit Workspace</Text>
                  </Pressable>
                )}

                {isDone && (
                  <Pressable
                    onPress={() => router.push(`/(app)/field/visit/${v.id}` as any)}
                    style={[styles.inlineGhostBtn, { borderColor: colors.glassBorder, flex: 1 }]}
                  >
                    <CheckCircle2 size={14} color="#30D158" />
                    <Text style={[styles.inlineGhostText, { color: colors.textPrimary }]}>View Visit Summary</Text>
                  </Pressable>
                )}

                {isSkipped && (
                  <Text style={[styles.skippedNote, { color: colors.textTertiary }]}>
                    Skipped: {v.notes || 'No reason specified'}
                  </Text>
                )}
              </View>
            </GlassCard>
          );
        })}

        {/* Empty State */}
        {visits.length === 0 && !loading && (
          <GlassCard style={styles.emptyCard}>
            <Navigation size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Route Scheduled</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Plan your route from the planner, or add an unplanned school visit right away.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => router.push('/(app)/field/planner' as any)}
                style={[styles.ctaButton, styles.ctaPrimary]}
              >
                <Calendar size={16} color="#fff" />
                <Text style={styles.ctaPrimaryText}>Open Planner</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/field/visit/new' as any)}
                style={[styles.ctaButton, styles.ctaOutline, { borderColor: colors.glassBorder }]}
              >
                <PlusCircle size={16} color={colors.primary} />
                <Text style={[styles.ctaOutlineText, { color: colors.primary }]}>Add School</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* ── MODAL: END DAY CONFIRMATION ──────────────────────────── */}
      <Modal visible={endDayModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                <StopCircle size={24} color="#FF453A" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>End Field Day?</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                Ending your day locks today's metrics and prepares your daily route report.
              </Text>
            </View>

            {/* Achievements Summary in Modal */}
            <View style={[styles.modalStatsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: '#30D158' }]}>{visitedCount}</Text>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Schools Visited</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: '#0A84FF' }]}>{demosCount}</Text>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Demos</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: '#64D2FF' }]}>{distanceKm} km</Text>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Distance</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEndDayModalOpen(false)}
                style={[styles.modalBtn, styles.modalGhostBtn, { borderColor: colors.glassBorder }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleEndDay}
                disabled={endingDay}
                style={[styles.modalBtn, styles.modalDangerBtn]}
              >
                {endingDay ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Yes, Complete Day</Text>
                )}
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── MODAL: SKIP STOP ─────────────────────────────────────── */}
      <Modal visible={skipModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Skip {skipTarget?.school_name || 'Stop'}?
              </Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                Please state the reason why this planned visit could not take place.
              </Text>
            </View>

            {/* Quick Reason Chips */}
            <View style={styles.chipRow}>
              {['Principal Unavailable', 'School Closed / Holiday', 'Rescheduled with Trustee', 'Traffic / Time Limit'].map(
                (reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setSkipReason(reason)}
                    style={[
                      styles.reasonChip,
                      {
                        borderColor: skipReason === reason ? colors.primary : colors.glassBorder,
                        backgroundColor: skipReason === reason ? `${colors.primary}22` : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: skipReason === reason ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <TextInput
              value={skipReason}
              onChangeText={setSkipReason}
              placeholder="Or type another reason..."
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[
                styles.modalInput,
                { color: colors.textPrimary, borderColor: colors.glassBorder },
              ]}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setSkipModalOpen(false)}
                style={[styles.modalBtn, styles.modalGhostBtn, { borderColor: colors.glassBorder }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmSkip}
                disabled={skipping || !skipReason.trim()}
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary, opacity: skipReason.trim() ? 1 : 0.5 },
                ]}
              >
                {skipping ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirm Skip</Text>
                )}
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── MODAL: REMOTE CHECK-IN REASON ────────────────────────── */}
      <Modal visible={remoteModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <ShieldAlert size={24} color="#FF9F0A" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Remote Check-In</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                GPS indicates you are outside 500m of the school coordinates. Please enter a brief reason to proceed.
              </Text>
            </View>

            <View style={styles.chipRow}>
              {['Met Management Off-Campus', 'Indoor GPS Signal Drift', 'Head Office / Trust Office', 'Virtual Meeting'].map(
                (r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRemoteReason(r)}
                    style={[
                      styles.reasonChip,
                      {
                        borderColor: remoteReason === r ? colors.primary : colors.glassBorder,
                        backgroundColor: remoteReason === r ? `${colors.primary}22` : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: remoteReason === r ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <TextInput
              value={remoteReason}
              onChangeText={setRemoteReason}
              placeholder="Reason (e.g. Meeting principal off-campus)..."
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[
                styles.modalInput,
                { color: colors.textPrimary, borderColor: colors.glassBorder },
              ]}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRemoteModalOpen(false)}
                style={[styles.modalBtn, styles.modalGhostBtn, { borderColor: colors.glassBorder }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmRemoteCheckIn}
                disabled={!remoteReason.trim()}
                style={[
                  styles.modalBtn,
                  { backgroundColor: '#0A84FF', opacity: remoteReason.trim() ? 1 : 0.5 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Submit & Check In</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

function KpiBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <View style={styles.kpiBox}>
      <View style={{ marginBottom: 4 }}>{icon}</View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greet: {
    fontSize: 13,
    marginTop: 2,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  bannerText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },

  heroCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroContent: {
    gap: 6,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseBeacon: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  startedTimeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  heroHeading: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  heroActionGrid: {
    gap: 10,
    marginTop: 6,
  },
  heroSecondaryActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  ctaPrimary: {
    backgroundColor: '#0A84FF',
  },
  ctaSuccess: {
    backgroundColor: '#10B981',
  },
  ctaOutline: {
    borderWidth: 1,
    flex: 1,
    minWidth: 120,
  },
  ctaDangerOutline: {
    borderWidth: 1,
    flex: 1,
    minWidth: 110,
  },
  ctaPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ctaOutlineText: {
    fontWeight: '700',
    fontSize: 13,
  },

  kpiCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  kpiBox: {
    alignItems: 'center',
    flex: 1,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    color: 'rgba(150,150,160,1)',
    marginTop: 2,
    fontWeight: '600',
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(150,150,160,0.15)',
  },

  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#0A84FF',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressSub: {
    fontSize: 11.5,
  },

  nextStopCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 18,
  },
  nextStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spotlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A84FF20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spotlightTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9F0A1A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  nextSchoolName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  nextSchoolArea: {
    fontSize: 12.5,
    marginBottom: 8,
  },
  noteBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  spotlightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  spotlightCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 2,
  },
  spotlightCheckInText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  spotlightActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  spotlightActionText: {
    fontWeight: '600',
    fontSize: 12.5,
  },

  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  journeyCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  schoolTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  stopStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  stopStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  stopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  localityText: {
    fontSize: 12,
    marginBottom: 4,
  },
  stopPrepNote: {
    fontSize: 11.5,
    fontStyle: 'italic',
    marginTop: 2,
  },

  cardActionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inlineCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  inlineCheckInText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  inlineResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF9F0A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
  },
  inlineGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inlineGhostText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inlineIconBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skippedNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
    borderRadius: 18,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    borderRadius: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalStatsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalStatLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGhostBtn: {
    borderWidth: 1,
  },
  modalDangerBtn: {
    backgroundColor: '#FF453A',
  },
  modalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
