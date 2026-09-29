import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Navigation,
  FileText,
  PlusCircle,
  Users,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  fieldVisitApi,
  saveDraft,
  loadDraft,
  newClientKey,
} from '../../services/fieldVisitService';
import {
  VISIT_STAGES,
  OUTCOMES,
  NEX_PRODUCTS,
  CONTACT_ROLES,
  suggestNextAction,
} from '../../utils/fieldVisit';
import { ConsoleAmbientBackground, GlassCard } from '../founder/founderUi';

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

const CHIP = ({ selected, label, onPress, color }: any) => (
  <Pressable
    onPress={onPress}
    style={{
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: selected ? color : 'rgba(150,150,160,0.25)',
      backgroundColor: selected ? `${color}1F` : 'transparent',
      marginRight: 8,
      marginBottom: 8,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    } as any}
  >
    <Text
      style={{
        color: selected ? color : 'rgba(160,160,170,1)',
        fontWeight: '700',
        fontSize: 12.5,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

export default function FieldVisitDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [visit, setVisit] = useState<any>(null);
  const [loadingVisit, setLoadingVisit] = useState(true);
  const [stage, setStage] = useState(0);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [severity, setSeverity] = useState('MEDIUM');
  const [demoGiven, setDemoGiven] = useState<boolean | null>(null);
  const [usesErp, setUsesErp] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [completing, setCompleting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Unplanned school fields
  const [schoolName, setSchoolName] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolArea, setSchoolArea] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [anyway, setAnyway] = useState('');
  const [creating, setCreating] = useState(false);

  const loadVisitData = useCallback(async () => {
    if (!id || id === 'new') {
      setLoadingVisit(false);
      return;
    }
    setLoadingVisit(true);
    try {
      const res: any = await fieldVisitApi.getVisit(id as string);
      const v = res?.data ?? res;
      setVisit(v);
      if (v.visit_outcome) setOutcome(v.visit_outcome);
      if (v.notes) setNotes(v.notes);
      if (v.priority) setSeverity(v.priority);
    } catch {
      // Offline fallback
    } finally {
      setLoadingVisit(false);
    }

    fieldVisitApi
      .timeline(id as string)
      .then((r: any) => setTimeline(r?.data ?? r ?? []))
      .catch(() => {});

    loadDraft(id as string, 'notes').then((d) => d && setNotes(d.notes || ''));
  }, [id]);

  useEffect(() => {
    loadVisitData();
  }, [loadVisitData]);

  const completion = useMemo(() => {
    let c = 12;
    if (products.length) c += 18;
    if (demoGiven != null) c += 15;
    if (outcome) c += 25;
    if (nextAction) c += 20;
    if (notes) c += 10;
    return Math.min(100, c);
  }, [products, demoGiven, outcome, nextAction, notes]);

  const toggle = (list: string[], v: string, set: any) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // Check In handler directly from this screen
  const handleCheckInNow = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const gps = await getQuickLocation(3000);
      await fieldVisitApi.checkIn({
        client_key: newClientKey('ci'),
        visit_id: visit.id,
        school_account_id: visit.school_account_id,
        lead_id: visit.lead_id,
        checkin_lat: gps?.lat,
        checkin_lng: gps?.lng,
        gps_accuracy: gps?.accuracy,
        planned: true,
      });
      await loadVisitData();
      Alert.alert('Checked in', 'You have arrived and checked in. You can now record meeting details.');
    } catch (e: any) {
      Alert.alert('Check-in error', e?.response?.data?.error || 'Check-in saved offline.');
    } finally {
      setCheckingIn(false);
    }
  };

  const complete = async () => {
    if (!outcome) {
      Alert.alert('Outcome required', 'Select exactly one primary visit outcome.');
      return;
    }
    if (outcome === 'CLOSED_LOST' && !notes.trim()) {
      Alert.alert('Lost reason required', 'Add notes describing the lost reason.');
      return;
    }
    const action = nextAction || suggestNextAction(outcome);
    if (
      [
        'INTERESTED',
        'DEMO_COMPLETED',
        'FOLLOW_UP_REQUIRED',
        'PROPOSAL_REQUESTED',
        'PILOT_REQUESTED',
        'NEGOTIATION',
        'REVISIT_REQUIRED',
      ].includes(outcome) &&
      !dueDate
    ) {
      Alert.alert('Follow-up date required', 'Positive outcomes need a next follow-up date.');
      return;
    }
    setCompleting(true);
    try {
      await fieldVisitApi.completeVisit(id as string, {
        visit_outcome: outcome,
        notes,
        next_action: {
          action,
          due_at: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
          notes,
        },
        qualification: { engagement: products.length > 2 ? 'HIGH' : 'MEDIUM' },
      });
      router.push('/(app)/field/today' as any);
    } catch {
      Alert.alert('Saved offline', 'Visit saved on device — will sync automatically.');
      router.push('/(app)/field/today' as any);
    } finally {
      setCompleting(false);
    }
  };

  const createSchool = async (force = false) => {
    if (schoolName.trim().length < 2) {
      Alert.alert('School name required');
      return;
    }
    setCreating(true);
    try {
      const created: any = await fieldVisitApi.createSchool({
        name: schoolName.trim(),
        phone: schoolPhone,
        area: schoolArea,
        create_anyway_reason: force ? anyway : undefined,
      });
      const accountId = created?.data?.account?.id || created?.account?.id;
      if (!accountId) throw new Error('School was not created');

      const gps = await getQuickLocation(3000);

      const visitRes: any = await fieldVisitApi.checkIn({
        client_key: `unplanned_${accountId}`,
        school_account_id: accountId,
        school_lat: gps?.lat,
        school_lng: gps?.lng,
        checkin_lat: gps?.lat,
        checkin_lng: gps?.lng,
        gps_accuracy: gps?.accuracy,
        unplanned: true,
        planned: false,
      });
      const visitId = visitRes?.data?.id || visitRes?.id;
      if (visitId) router.replace(`/(app)/field/visit/${visitId}` as any);
      else router.replace('/(app)/field/today' as any);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      const found = e?.response?.data?.details?.matches || [];
      if (code === 'POSSIBLE_DUPLICATE') setMatches(found);
      else Alert.alert('Could not start visit', e?.response?.data?.error || 'Saved for retry when online.');
    } finally {
      setCreating(false);
    }
  };

  // UNPLANNED SCHOOL VIEW
  if (id === 'new') {
    return (
      <ConsoleAmbientBackground>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Pressable
            onPress={() => router.push('/(app)/field/today' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
          >
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Back to Today</Text>
          </Pressable>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Add Unplanned School</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Capture quick school info to verify duplicates and start your visit immediately.
          </Text>

          <GlassCard style={styles.card}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>School Name *</Text>
            <TextInput
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="e.g. St. Xavier's High School"
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
            <TextInput
              value={schoolPhone}
              onChangeText={setSchoolPhone}
              keyboardType="phone-pad"
              placeholder="10-digit mobile number"
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Village / Locality / Area</Text>
            <TextInput
              value={schoolArea}
              onChangeText={setSchoolArea}
              placeholder="Locality or Landmark"
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
            />

            <Pressable
              onPress={() => createSchool(false)}
              disabled={creating}
              style={[styles.primary, creating && { opacity: 0.7 }]}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Start Visit & Check In</Text>
              )}
            </Pressable>
          </GlassCard>

          {matches.length > 0 && (
            <GlassCard style={styles.card}>
              <Text style={[styles.h, { color: colors.textPrimary }]}>Possible Existing Match Found</Text>
              <Text style={[styles.meta, { color: colors.textSecondary, marginBottom: 10 }]}>
                A school with similar details already exists in the system:
              </Text>
              {matches.map((m) => (
                <View
                  key={m.id}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{m.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Match reason: {(m.reasons || []).join(', ')} {m.district ? `· ${m.district}` : ''}
                  </Text>
                </View>
              ))}

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
                Reason to create new record anyway:
              </Text>
              <TextInput
                value={anyway}
                onChangeText={setAnyway}
                placeholder="e.g. Different branch, new campus..."
                placeholderTextColor="rgba(150,150,160,0.6)"
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
              />
              <Pressable onPress={() => createSchool(true)} style={[styles.primary, { marginTop: 10 }]}>
                <Text style={styles.primaryText}>Create New Record Anyway</Text>
              </Pressable>
            </GlassCard>
          )}
        </ScrollView>
      </ConsoleAmbientBackground>
    );
  }

  const isPlanned = visit?.status === 'PLANNED';
  const isDone = visit?.status === 'COMPLETED';

  return (
    <ConsoleAmbientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }}>
        {/* Navigation Top */}
        <Pressable
          onPress={() => router.push('/(app)/field/today' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
        >
          <ArrowLeft size={16} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Back to Today's Mission</Text>
        </Pressable>

        {/* School Profile Card */}
        <GlassCard style={styles.schoolHeaderCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.schoolBadgeRow}>
                <Building2 size={13} color={colors.primary} />
                <Text style={[styles.schoolBadgeText, { color: colors.primary }]}>
                  {visit?.board || 'School'} {visit?.total_students ? `· ${visit.total_students} Students` : ''}
                </Text>
              </View>
              <Text style={[styles.schoolHeaderName, { color: colors.textPrimary }]}>
                {visit?.school_name || 'School Visit'}
              </Text>
              {visit?.school_locality && (
                <Text style={[styles.schoolLocalityText, { color: colors.textSecondary }]}>
                  📍 {visit.school_locality} {visit.city_raw ? `· ${visit.city_raw}` : ''}
                </Text>
              )}
            </View>

            {/* Quick Actions (Call / Nav) */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {visit?.school_phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${visit.school_phone}`).catch(() => {})}
                  style={[styles.quickIconBtn, { borderColor: colors.glassBorder }]}
                >
                  <Phone size={15} color="#30D158" />
                </Pressable>
              )}
              {visit?.school_name && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        visit.school_name + (visit.school_locality ? ` ${visit.school_locality}` : ''),
                      )}`,
                    ).catch(() => {})
                  }
                  style={[styles.quickIconBtn, { borderColor: colors.glassBorder }]}
                >
                  <Navigation size={15} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Research notes preview */}
          {visit?.research_note && (
            <View style={[styles.researchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.researchText, { color: colors.textSecondary }]}>
                💡 Prep note: {visit.research_note}
              </Text>
            </View>
          )}

          {/* If Planned: Prompt Check In */}
          {isPlanned && (
            <View style={styles.checkInBanner}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkInBannerTitle, { color: '#0A84FF' }]}>Not Checked In Yet</Text>
                <Text style={[styles.checkInBannerSub, { color: colors.textSecondary }]}>
                  Arrived at the school? Tap below to record arrival GPS and begin meeting.
                </Text>
              </View>
              <Pressable
                onPress={handleCheckInNow}
                disabled={checkingIn}
                style={styles.checkInNowBtn}
              >
                {checkingIn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MapPin size={15} color="#fff" />
                    <Text style={styles.checkInNowText}>Check In</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </GlassCard>

        {/* Progress Strip */}
        <View style={{ marginTop: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Visit Workspace</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
              Completion: {completion}%
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${completion}%` }]} />
          </View>
        </View>

        {/* Stage Selection Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
          {VISIT_STAGES.map((s, i) => (
            <Pressable
              key={s}
              onPress={() => setStage(i)}
              style={[
                styles.stagePill,
                {
                  borderColor: i === stage ? colors.primary : 'rgba(150,150,160,0.25)',
                  backgroundColor: i === stage ? `${colors.primary}22` : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  color: i === stage ? colors.primary : colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {i + 1}. {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* STAGE: Requirement Discovery */}
        {stage <= 3 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.h, { color: colors.textPrimary }]}>Requirement Discovery</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Need Severity</Text>
            <View style={styles.chips}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <CHIP
                  key={s}
                  label={s}
                  selected={severity === s}
                  color="#FF9F0A"
                  onPress={() => setSeverity(s)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Uses School ERP?</Text>
            <View style={styles.chips}>
              <CHIP label="Yes" selected={usesErp === true} color="#0A84FF" onPress={() => setUsesErp(true)} />
              <CHIP label="No" selected={usesErp === false} color="#30D158" onPress={() => setUsesErp(false)} />
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Demo Delivered?</Text>
            <View style={styles.chips}>
              <CHIP label="Yes" selected={demoGiven === true} color="#0A84FF" onPress={() => setDemoGiven(true)} />
              <CHIP label="No" selected={demoGiven === false} color="#8E8E93" onPress={() => setDemoGiven(false)} />
            </View>
          </GlassCard>
        )}

        {/* STAGE: Product Interest */}
        {stage === 4 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.h, { color: colors.textPrimary }]}>NexSyrus Product Interest</Text>
            <Text style={[styles.sub, { color: colors.textSecondary, marginBottom: 10 }]}>
              Select solutions the principal / management expressed interest in:
            </Text>
            <View style={styles.chips}>
              {NEX_PRODUCTS.map((p) => (
                <CHIP
                  key={p}
                  label={p}
                  selected={products.includes(p)}
                  color="#0A84FF"
                  onPress={() => toggle(products, p, setProducts)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
              Decision-Maker Roles Met
            </Text>
            <View style={styles.chips}>
              {CONTACT_ROLES.slice(0, 6).map((r) => (
                <CHIP key={r} label={r} selected={false} color="#64D2FF" onPress={() => {}} />
              ))}
            </View>
          </GlassCard>
        )}

        {/* STAGE: Outcome & Next Steps */}
        {(stage === 5 || stage === 6) && (
          <GlassCard style={styles.card}>
            <Text style={[styles.h, { color: colors.textPrimary }]}>Visit Outcome</Text>
            <View style={styles.chips}>
              {OUTCOMES.map((o) => (
                <CHIP
                  key={o}
                  label={o.replace(/_/g, ' ')}
                  selected={outcome === o}
                  color="#30D158"
                  onPress={() => {
                    setOutcome(o);
                    setNextAction(suggestNextAction(o));
                  }}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Next Action (Mandatory for positive outcomes)
            </Text>
            <TextInput
              value={nextAction}
              onChangeText={setNextAction}
              placeholder="e.g. Send Customized Proposal & Fee structure"
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Next Action Due Date</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="Due Date: YYYY-MM-DD (e.g. 2026-09-28)"
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Meeting Notes & Discussion Summary</Text>
            <TextInput
              value={notes}
              onChangeText={(t) => {
                setNotes(t);
                saveDraft(id as string, 'notes', { notes: t });
              }}
              multiline
              placeholder="Key pain points, pricing objections, decision timeline..."
              placeholderTextColor="rgba(150,150,160,0.6)"
              style={[styles.input, styles.notes, { color: colors.textPrimary, borderColor: colors.glassBorder }]}
            />
          </GlassCard>
        )}

        {/* STAGE: Review & Finalize */}
        {stage === 7 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.h, { color: colors.textPrimary }]}>Review & Complete Visit</Text>
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                marginBottom: 14,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                <Text style={{ fontWeight: '700' }}>Outcome:</Text> {outcome?.replace(/_/g, ' ') || '—'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                <Text style={{ fontWeight: '700' }}>Next Step:</Text> {nextAction || '—'}{' '}
                {dueDate ? `· Due: ${dueDate}` : ''}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                <Text style={{ fontWeight: '700' }}>Products:</Text> {products.join(', ') || 'General ERP'}
              </Text>
            </View>

            <Pressable
              onPress={complete}
              disabled={completing}
              style={[styles.primary, completing && { opacity: 0.6 }]}
            >
              <Text style={styles.primaryText}>{completing ? 'Completing Visit…' : 'Finalize & Complete Visit'}</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Timeline Events Card */}
        <GlassCard style={styles.card}>
          <Text style={[styles.h, { color: colors.textPrimary }]}>Visit History & Events</Text>
          {timeline.length === 0 && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>No previous events recorded.</Text>
          )}
          {timeline.map((e: any) => (
            <View key={e.id} style={styles.event}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>{e.label}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {new Date(e.occurred_at).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* Navigation Step Buttons */}
        <View style={styles.navRow}>
          {stage > 0 && (
            <Pressable onPress={() => setStage(stage - 1)} style={styles.ghost}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Back</Text>
            </Pressable>
          )}
          {stage < 7 && (
            <Pressable onPress={() => setStage(stage + 1)} style={styles.primary}>
              <Text style={styles.primaryText}>Continue to Next Stage</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 12.5, marginTop: 2, marginBottom: 12 },
  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 7, backgroundColor: '#30D158', borderRadius: 4 },
  stagePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8 },

  schoolHeaderCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
  },
  schoolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  schoolBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  schoolHeaderName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  schoolLocalityText: {
    fontSize: 12.5,
  },
  quickIconBtn: {
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  researchBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  researchText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  checkInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,160,0.15)',
  },
  checkInBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkInBannerSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  checkInNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  checkInNowText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  card: { padding: 16, marginBottom: 12, borderRadius: 16 },
  h: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  hint: { fontSize: 11.5, fontStyle: 'italic', marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13.5, marginTop: 4 },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  meta: { fontSize: 12.5, lineHeight: 18 },
  event: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0A84FF', marginTop: 4 },
  eventLabel: { fontSize: 13, fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primary: { backgroundColor: '#0A84FF', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, flex: 1 },
  primaryText: { color: '#fff', fontWeight: '700' },
  ghost: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(150,150,160,0.3)', minWidth: 80 },
});
