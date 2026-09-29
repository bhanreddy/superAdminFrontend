import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Sparkles,
  UserRound,
} from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../contexts/ThemeContext';
import { ConsoleAmbientBackground, GlassCard, SkeletonActionList, bottomTabPad } from '../founder/founderUi';
import {
  INTAKE_STATUS,
  SCHOOL_BOARDS,
  intakeErrorMessage,
  schoolIntakeApi,
  type IntakeIntelligence,
  type IntakeStatus,
  type SchoolIntake,
} from '../../services/schoolIntakeService';

const STEPS = [
  { label: 'School', icon: Building2 },
  { label: 'People', icon: UserRound },
  { label: 'Brand', icon: Sparkles },
  { label: 'Send', icon: ClipboardCheck },
];

const COLORS = ['#1A73E8', '#0A84FF', '#30D158', '#AF52DE', '#FF9F0A', '#1C1C1E'];

type FormState = {
  name: string;
  code: string;
  board: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  principal_name: string;
  principal_phone: string;
  principal_email: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_phone: string;
  estimated_students: string;
  logo_url: string;
  android_package: string;
  ios_bundle_id: string;
  primary_color: string;
  notes: string;
  documents: { label: string; url: string }[];
};

const EMPTY: FormState = {
  name: '',
  code: '',
  board: 'CBSE',
  address: '',
  city: '',
  state: '',
  pincode: '',
  principal_name: '',
  principal_phone: '',
  principal_email: '',
  admin_first_name: '',
  admin_last_name: '',
  admin_email: '',
  admin_phone: '',
  estimated_students: '',
  logo_url: '',
  android_package: '',
  ios_bundle_id: '',
  primary_color: '#1A73E8',
  notes: '',
  documents: [],
};

function suggestCode(name: string) {
  const stop = new Set(['SCHOOL', 'PUBLIC', 'HIGH', 'THE', 'OF', 'AND', 'VIDYALAYA', 'ACADEMY']);
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((word) => word && !stop.has(word));
  let code = words.map((word) => word[0]).join('');
  if (code.length < 3) code = (words[0] || name.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 8);
  return code.slice(0, 12);
}

function suggestPackage(name: string) {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sanitized ? `com.nexsyrus.schoolims.${sanitized}` : '';
}

function fromIntake(item: SchoolIntake): FormState {
  const dossier = item.dossier || ({} as SchoolIntake['dossier']);
  return {
    ...EMPTY,
    ...dossier,
    estimated_students: dossier.estimated_students ? String(dossier.estimated_students) : '',
    documents: dossier.documents || [],
    board: dossier.board || 'CBSE',
    primary_color: dossier.primary_color || '#1A73E8',
  };
}

export default function SchoolIntakeComposerScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [mode, setMode] = useState<'new' | 'sent'>(params.tab === 'sent' ? 'sent' : 'new');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [codeTouched, setCodeTouched] = useState(false);
  const [packageTouched, setPackageTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [preview, setPreview] = useState<IntakeIntelligence | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [queue, setQueue] = useState<SchoolIntake[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      setQueue(await schoolIntakeApi.list());
    } catch (err) {
      showToast(intakeErrorMessage(err, 'Could not load your school dossiers.'), 'error');
    } finally {
      setQueueLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (mode === 'sent') loadQueue();
  }, [mode, loadQueue]);

  const onName = (text: string) => {
    setForm((current) => {
      const next = { ...current, name: text };
      if (!codeTouched) next.code = suggestCode(text);
      if (!packageTouched) {
        const pkg = suggestPackage(text);
        next.android_package = pkg;
        next.ios_bundle_id = pkg;
      }
      return next;
    });
  };

  const payload = useMemo(() => ({
    ...form,
    estimated_students: form.estimated_students.trim() ? Number(form.estimated_students) : null,
  }), [form]);

  const runPreview = async () => {
    setChecking(true);
    setErrorMsg('');
    try {
      const result = await schoolIntakeApi.preview(payload, editingId || undefined);
      setPreview(result.intelligence);
      setForm((current) => ({
        ...current,
        code: current.code || result.dossier.code,
        android_package: current.android_package || result.dossier.android_package,
        ios_bundle_id: current.ios_bundle_id || result.dossier.ios_bundle_id,
      }));
    } catch (err) {
      setErrorMsg(intakeErrorMessage(err, 'Could not check this school yet.'));
    } finally {
      setChecking(false);
    }
  };

  const goNext = async () => {
    if (step === 0 && form.name.trim().length < 3) {
      setErrorMsg('Enter the school name before continuing.');
      return;
    }
    setErrorMsg('');
    if (step === 2) {
      setStep(3);
      await runPreview();
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  };

  const submit = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const saved = editingId
        ? await schoolIntakeApi.resubmit(editingId, payload)
        : await schoolIntakeApi.submit(payload);
      showToast(`${saved.name} is with the founder for review.`, 'success');
      setForm(EMPTY);
      setEditingId(null);
      setReviewNote('');
      setCodeTouched(false);
      setPackageTouched(false);
      setPreview(null);
      setStep(0);
      setMode('sent');
      await loadQueue();
    } catch (err: any) {
      const intelligence = err?.response?.data?.intelligence as IntakeIntelligence | undefined;
      if (intelligence) setPreview(intelligence);
      setErrorMsg(intakeErrorMessage(err, 'Could not send this school.'));
    } finally {
      setSaving(false);
    }
  };

  const editReturned = (item: SchoolIntake) => {
    setForm(fromIntake(item));
    setEditingId(item.id);
    setReviewNote(item.review_note || '');
    setCodeTouched(true);
    setPackageTouched(true);
    setPreview(null);
    setStep(0);
    setMode('new');
  };

  return (
    <ConsoleAmbientBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ScreenHeader
          title="School onboarding"
          subtitle="The school is created only after the founder checks it"
        />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]} keyboardShouldPersistTaps="handled">
          <View style={styles.segment}>
            {(['new', 'sent'] as const).map((item) => {
              const active = mode === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={({ pressed }) => [
                    styles.segmentBtn,
                    { backgroundColor: active ? colors.primary : 'transparent', opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={{ color: active ? '#FFF' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                    {item === 'new' ? 'New dossier' : 'Sent for review'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'sent' ? (
            <Queue
              loading={queueLoading}
              items={queue}
              colors={colors}
              onEdit={editReturned}
              onOpenSchool={(id) => router.push(`/(app)/schools/${id}` as any)}
            />
          ) : (
            <>
              {reviewNote ? (
                <GlassCard variant="lightweight" style={styles.noteCard}>
                  <Text style={[styles.noteTitle, { color: '#64D2FF' }]}>Founder asked for changes</Text>
                  <Text style={[styles.noteBody, { color: colors.textPrimary }]}>{reviewNote}</Text>
                </GlassCard>
              ) : null}

              <View style={styles.rail}>
                {STEPS.map((item, index) => {
                  const Icon = item.icon;
                  const active = index === step;
                  const done = index < step;
                  return (
                    <View key={item.label} style={styles.railItem}>
                      <View style={[styles.railDot, { backgroundColor: active || done ? colors.primary : colors.border }]}>
                        {done ? <CheckCircle2 size={14} color="#FFF" /> : <Icon size={14} color={active ? '#FFF' : colors.textSecondary} />}
                      </View>
                      <Text style={{ color: active ? colors.textPrimary : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>

              <GlassCard variant="lightweight" style={styles.formCard}>
                {step === 0 && (
                  <>
                    <Input label="School name" required placeholder="Sunrise Public School" value={form.name} onChangeText={onName} />
                    <Input label="School code" required autoCapitalize="characters" value={form.code} onChangeText={(text) => { setCodeTouched(true); setField('code', text.toUpperCase()); }} containerStyle={styles.gap} />
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Board</Text>
                    <View style={styles.chips}>
                      {SCHOOL_BOARDS.map((board) => {
                        const active = form.board === board;
                        return (
                          <Pressable key={board} onPress={() => setField('board', board)} style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}22` : 'transparent' }]}>
                            <Text style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{board}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Input label="Address" value={form.address} onChangeText={(text) => setField('address', text)} containerStyle={styles.gap} />
                    <View style={styles.row}>
                      <Input label="City" value={form.city} onChangeText={(text) => setField('city', text)} containerStyle={styles.half} />
                      <Input label="State" value={form.state} onChangeText={(text) => setField('state', text)} containerStyle={styles.half} />
                    </View>
                    <View style={styles.row}>
                      <Input label="PIN code" keyboardType="number-pad" value={form.pincode} onChangeText={(text) => setField('pincode', text)} containerStyle={styles.half} />
                      <Input label="Students" keyboardType="number-pad" value={form.estimated_students} onChangeText={(text) => setField('estimated_students', text.replace(/\D/g, ''))} containerStyle={styles.half} />
                    </View>
                  </>
                )}

                {step === 1 && (
                  <>
                    <Text style={[styles.section, { color: colors.textPrimary }]}>Principal</Text>
                    <Input label="Name" value={form.principal_name} onChangeText={(text) => setField('principal_name', text)} />
                    <Input label="Phone" keyboardType="phone-pad" value={form.principal_phone} onChangeText={(text) => setField('principal_phone', text)} containerStyle={styles.gap} />
                    <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={form.principal_email} onChangeText={(text) => setField('principal_email', text)} containerStyle={styles.gap} />
                    <Text style={[styles.section, { color: colors.textPrimary }]}>First school admin</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>The founder approval creates this login. You do not set the password.</Text>
                    <View style={styles.row}>
                      <Input label="First name" value={form.admin_first_name} onChangeText={(text) => setField('admin_first_name', text)} containerStyle={styles.half} />
                      <Input label="Last name" value={form.admin_last_name} onChangeText={(text) => setField('admin_last_name', text)} containerStyle={styles.half} />
                    </View>
                    <Input label="Admin email" autoCapitalize="none" keyboardType="email-address" value={form.admin_email} onChangeText={(text) => setField('admin_email', text)} containerStyle={styles.gap} />
                    <Input label="Admin phone" keyboardType="phone-pad" value={form.admin_phone} onChangeText={(text) => setField('admin_phone', text)} containerStyle={styles.gap} />
                  </>
                )}

                {step === 2 && (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Brand color</Text>
                    <View style={styles.chips}>
                      {COLORS.map((color) => (
                        <Pressable key={color} onPress={() => setField('primary_color', color)} style={[styles.swatch, { backgroundColor: color, borderColor: form.primary_color === color ? colors.textPrimary : 'transparent' }]} />
                      ))}
                    </View>
                    <Input label="Logo link" autoCapitalize="none" value={form.logo_url} onChangeText={(text) => setField('logo_url', text)} containerStyle={styles.gap} />
                    <Input label="Android package" autoCapitalize="none" value={form.android_package} onChangeText={(text) => { setPackageTouched(true); setField('android_package', text); }} containerStyle={styles.gap} />
                    <Input label="iOS bundle id" autoCapitalize="none" value={form.ios_bundle_id} onChangeText={(text) => { setPackageTouched(true); setField('ios_bundle_id', text); }} containerStyle={styles.gap} />
                    <Input label="Notes for the founder" multiline numberOfLines={4} value={form.notes} onChangeText={(text) => setField('notes', text)} containerStyle={styles.gap} />
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Supporting links</Text>
                    {form.documents.map((doc, index) => (
                      <View key={`${index}`} style={styles.docRow}>
                        <Input label="Label" value={doc.label} onChangeText={(text) => setForm((current) => {
                          const documents = [...current.documents];
                          documents[index] = { ...documents[index], label: text };
                          return { ...current, documents };
                        })} containerStyle={styles.half} />
                        <Input label="Link" autoCapitalize="none" value={doc.url} onChangeText={(text) => setForm((current) => {
                          const documents = [...current.documents];
                          documents[index] = { ...documents[index], url: text };
                          return { ...current, documents };
                        })} containerStyle={styles.half} />
                      </View>
                    ))}
                    {form.documents.length < 6 ? (
                      <Button title="Add a link" variant="secondary" onPress={() => setForm((current) => ({ ...current, documents: [...current.documents, { label: '', url: '' }] }))} />
                    ) : null}
                  </>
                )}

                {step === 3 && (
                  <ReviewPanel checking={checking} preview={preview} colors={colors} onRefresh={runPreview} />
                )}

                {errorMsg ? <Text style={[styles.error, { color: colors.error }]}>{errorMsg}</Text> : null}

                <View style={styles.actions}>
                  {step > 0 ? (
                    <Button title="Back" variant="secondary" onPress={() => setStep((current) => current - 1)} style={styles.action} />
                  ) : null}
                  {step < 3 ? (
                    <Button title="Continue" onPress={goNext} style={styles.action} />
                  ) : (
                    <Button
                      title={editingId ? 'Send updates' : 'Send to founder'}
                      onPress={submit}
                      loading={saving}
                      disabled={checking || !preview || preview.grade === 'BLOCKED' || saving}
                      style={styles.action}
                    />
                  )}
                </View>
              </GlassCard>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ConsoleAmbientBackground>
  );
}

function ReviewPanel({
  checking,
  preview,
  colors,
  onRefresh,
}: {
  checking: boolean;
  preview: IntakeIntelligence | null;
  colors: any;
  onRefresh: () => void;
}) {
  if (checking && !preview) return <SkeletonActionList count={3} />;
  if (!preview) {
    return <Button title="Run checks" variant="secondary" onPress={onRefresh} />;
  }
  const tone = preview.grade === 'BLOCKED' ? '#FF453A' : preview.grade === 'READY' ? '#30D158' : '#FF9F0A';
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: tone }]}>{preview.score}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tone, fontWeight: '800', fontSize: 13 }}>{preview.grade}</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20, marginTop: 4 }}>{preview.brief}</Text>
        </View>
      </View>
      {preview.cluster ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Likely cluster: {preview.cluster.label}. {preview.cluster.headroom} seats free.
        </Text>
      ) : null}
      {preview.blockers.map((item) => (
        <Text key={item.code + item.message} style={{ color: '#FF453A', fontSize: 13 }}>{item.message}</Text>
      ))}
      {preview.warnings.map((item) => (
        <Text key={item.code + item.message} style={{ color: '#FF9F0A', fontSize: 13 }}>{item.message}</Text>
      ))}
      <Text style={[styles.section, { color: colors.textPrimary }]}>What happens after approval</Text>
      {preview.auto_steps.map((step) => (
        <View key={step} style={styles.checkRow}>
          <ChevronRight size={14} color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const Queue = React.memo(function Queue({
  loading,
  items,
  colors,
  onEdit,
  onOpenSchool,
}: {
  loading: boolean;
  items: SchoolIntake[];
  colors: any;
  onEdit: (item: SchoolIntake) => void;
  onOpenSchool: (id: number) => void;
}) {
  if (loading) return <SkeletonActionList count={3} />;
  if (!items.length) {
    return (
      <GlassCard variant="lightweight" style={styles.formCard}>
        <Text style={[styles.section, { color: colors.textPrimary }]}>Nothing sent yet</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          A dossier stays here until the founder approves it. Approval creates the school and assigns it back to you.
        </Text>
      </GlassCard>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {items.map((item) => {
        const meta = INTAKE_STATUS[item.status as IntakeStatus] || INTAKE_STATUS.SUBMITTED;
        return (
          <GlassCard key={item.id} variant="lightweight" style={styles.queueCard}>
            <View style={styles.queueTop}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.code} · {item.score}% ready</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: `${meta.color}22` }]}>
                <Text style={{ color: meta.color, fontSize: 11, fontWeight: '800' }}>{meta.label}</Text>
              </View>
            </View>
            {item.review_note ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>{item.review_note}</Text> : null}
            {item.failure_reason ? <Text style={{ color: '#FF6B7A', fontSize: 13, marginTop: 8 }}>{item.failure_reason}</Text> : null}
            {item.status === 'CHANGES_REQUESTED' ? (
              <Button title="Update and resend" variant="secondary" onPress={() => onEdit(item)} style={{ marginTop: 12 }} />
            ) : null}
            {item.status === 'ONBOARDED' && item.school_id ? (
              <Button title="Open school" variant="secondary" onPress={() => onOpenSchool(item.school_id as number)} style={{ marginTop: 12 }} />
            ) : null}
          </GlassCard>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4, backgroundColor: 'rgba(127,127,127,0.12)' },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rail: { flexDirection: 'row', justifyContent: 'space-between' },
  railItem: { alignItems: 'center', gap: 6, flex: 1 },
  railDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formCard: { padding: 16, gap: 4 },
  queueCard: { padding: 16 },
  noteCard: { padding: 16, gap: 6 },
  noteTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  noteBody: { fontSize: 14, lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  gap: { marginTop: 12 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flex: 1 },
  error: { marginTop: 12, fontSize: 13, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  score: { fontSize: 32, fontWeight: '800', letterSpacing: -1, width: 64 },
  checkRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  queueTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  docRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
});
