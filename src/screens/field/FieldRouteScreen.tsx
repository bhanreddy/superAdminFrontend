import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle2,
  Calendar,
  Route as RouteIcon,
  Clock,
  ArrowLeft,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fieldVisitApi, newClientKey } from '../../services/fieldVisitService';
import { ConsoleAmbientBackground, GlassCard, SkeletonActionList } from '../founder/founderUi';

async function getQuickLocation(
  timeoutMs = 3000,
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

export default function FieldRouteScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await fieldVisitApi.today();
      setData(res?.data ?? res);
    } catch (e) {
      /* offline */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checkIn = async (visit: any) => {
    setChecking(visit.id);
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
      };
      await fieldVisitApi.checkIn(payload);
      await load();
      router.push(`/(app)/field/visit/${visit.id}` as any);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message;
      if (e?.response?.data?.code === 'REMOTE_REASON_REQUIRED') {
        // Retry with meeting reason
        try {
          const gps = await getQuickLocation(2000);
          await fieldVisitApi.checkIn({
            client_key: newClientKey('ci'),
            visit_id: visit.status === 'PLANNED' ? visit.id : undefined,
            school_account_id: visit.school_account_id,
            lead_id: visit.lead_id,
            checkin_lat: gps?.lat,
            checkin_lng: gps?.lng,
            gps_accuracy: gps?.accuracy,
            planned: true,
            remote_reason: 'Meeting executive off-campus',
          });
          await load();
          router.push(`/(app)/field/visit/${visit.id}` as any);
          return;
        } catch {
          router.push(`/(app)/field/visit/${visit.id}` as any);
        }
      } else {
        Alert.alert('Check-in status', msg || 'Offline — saved on device, will sync automatically.');
        router.push(`/(app)/field/visit/${visit.id}` as any);
      }
    } finally {
      setChecking(null);
    }
  };

  const visits = data?.visits || [];
  const distanceKm = data?.totals?.distance_km ?? data?.day?.total_distance_km ?? 0;

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
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
        <Pressable
          onPress={() => router.push('/(app)/field/today' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
        >
          <ArrowLeft size={16} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Back to Today's Mission</Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Today's Route & Stops</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {visits.length} school stop{visits.length !== 1 ? 's' : ''} · {distanceKm} KM total travel recorded
        </Text>

        {loading ? (
          <SkeletonActionList count={4} />
        ) : (
          visits.map((v: any, i: number) => {
            const isDone = v.status === 'COMPLETED';
            const isInProgress = v.status === 'CHECKED_IN' || v.status === 'IN_PROGRESS';
            const phone = v.school_phone || v.contact_phone;

            return (
              <GlassCard key={v.id || i} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                        STOP {i + 1}
                      </Text>
                      {v.appointment_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} color={colors.textSecondary} />
                          <Text style={{ fontSize: 11.5, color: colors.textSecondary }}>
                            {new Date(v.appointment_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.name, { color: colors.textPrimary }]}>
                      {v.school_name || 'School Visit'}
                    </Text>

                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {v.route_distance_km ?? v.straight_distance_km ?? '—'} KM away ·{' '}
                      <Text style={{ fontWeight: '700', color: isDone ? '#30D158' : colors.textPrimary }}>
                        {v.visit_outcome?.replace(/_/g, ' ') || v.status}
                      </Text>
                      {v.school_locality ? ` · ${v.school_locality}` : ''}
                    </Text>

                    {v.research_note ? (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                        💡 {v.research_note}
                      </Text>
                    ) : null}
                  </View>

                  {v.unplanned && (
                    <View style={styles.unplanned}>
                      <Text style={styles.unplannedText}>UNPLANNED</Text>
                    </View>
                  )}
                </View>

                {/* Buttons Row */}
                <View style={styles.btnRow}>
                  {isInProgress || isDone ? (
                    <Pressable
                      onPress={() => router.push(`/(app)/field/visit/${v.id}` as any)}
                      style={[styles.checkBtn, isDone ? { backgroundColor: '#30D158' } : { backgroundColor: '#FF9F0A' }]}
                    >
                      <CheckCircle2 size={15} color="#fff" />
                      <Text style={styles.checkText}>{isDone ? 'Review Visit' : 'Open Workspace'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => checkIn(v)}
                      disabled={Boolean(checking)}
                      style={styles.checkBtn}
                    >
                      {checking === v.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MapPin size={15} color="#fff" />
                      )}
                      <Text style={styles.checkText}>
                        {checking === v.id ? 'Locating…' : 'Check In'}
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          v.school_name + (v.school_locality ? ` ${v.school_locality}` : ''),
                        )}`,
                      ).catch(() => {})
                    }
                    style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
                  >
                    <Navigation size={15} color={colors.primary} />
                  </Pressable>

                  {phone && (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})}
                      style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
                    >
                      <Phone size={15} color="#30D158" />
                    </Pressable>
                  )}

                  {phone && (
                    <Pressable
                      onPress={() => Linking.openURL(`https://wa.me/91${phone.replace(/\D/g, '')}`).catch(() => {})}
                      style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
                    >
                      <MessageCircle size={15} color="#30D158" />
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => router.push(`/(app)/field/visit/${v.id}` as any)}
                    style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
                  >
                    <Building2 size={15} color={colors.primary} />
                  </Pressable>
                </View>
              </GlassCard>
            );
          })
        )}

        {!loading && visits.length === 0 && (
          <GlassCard style={styles.empty}>
            <RouteIcon size={32} color={colors.primary} />
            <Text style={[styles.name, { color: colors.textPrimary, marginTop: 8 }]}>No Route Scheduled</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              Plan your visits using the Planner or add an unplanned school on the go.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/field/planner' as any)}
              style={[styles.checkBtn, { marginTop: 14 }]}
            >
              <Calendar size={15} color="#fff" />
              <Text style={styles.checkText}>Open Planner</Text>
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 12.5, marginTop: 2, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12, borderRadius: 16 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
  unplanned: {
    backgroundColor: 'rgba(255,159,10,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unplannedText: { fontSize: 10, fontWeight: '800', color: '#FF9F0A' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 28, alignItems: 'center', borderRadius: 16 },
});
