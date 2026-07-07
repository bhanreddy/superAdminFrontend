import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import {
  listPosters,
  createPoster,
  updatePoster,
  deletePoster,
  POSTER_APPS,
  type FestivalPoster,
} from '../../api/posters';
import {
  ConsoleAmbientBackground,
  GlassCard,
  PrimaryGradientButton,
  SectionTitle,
  bottomTabPad,
} from './founderUi';
import { pressableWebStyles } from '../../utils/webPressable';
import { safePressHandler } from '../../utils/safePressHandler';
import { Trash2, ImagePlus, Power } from 'lucide-react-native';

const APP_LABELS: Record<string, string> = {
  schoolims: 'SchoolIMS',
  medipos: 'MediPOS',
  paperforge: 'PaperForge',
};

const STATUS_COLORS: Record<FestivalPoster['status'], string> = {
  live: '#00D4AD',
  upcoming: '#FFB020',
  expired: '#8A8A98',
  disabled: '#FF6B7A',
};

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateInput(s: string, endOfDay: boolean): string | null {
  const m = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

/** Alert.alert is a silent no-op on React Native Web — fall back to window.alert there. */
function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function FestivalPostersScreen() {
  const { colors, isDark } = useTheme();
  const { founder } = useFounderAuth();
  const [rows, setRows] = useState<FestivalPoster[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState(toDateInput(new Date()));
  const [endsAt, setEndsAt] = useState(toDateInput(new Date(Date.now() + 7 * 24 * 3600 * 1000)));
  const [targetApps, setTargetApps] = useState<string[]>([...POSTER_APPS]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPosters());
    } catch (e: any) {
      notify('Error', e?.response?.data?.error || e?.message || 'Failed to load posters');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickImage = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setPreviewUri(a.uri);
    setPickedMime(a.mimeType || 'image/jpeg');
  };

  const toggleApp = (app: string) => {
    setTargetApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app],
    );
  };

  const resetForm = () => {
    setTitle('');
    setPreviewUri(null);
    setPickedMime(null);
    setStartsAt(toDateInput(new Date()));
    setEndsAt(toDateInput(new Date(Date.now() + 7 * 24 * 3600 * 1000)));
    setTargetApps([...POSTER_APPS]);
  };

  const submit = async () => {
    if (!title.trim()) { notify('Validation', 'Enter a poster title.'); return; }
    if (!previewUri || !pickedMime) { notify('Validation', 'Pick a poster image.'); return; }
    if (targetApps.length === 0) { notify('Validation', 'Select at least one app.'); return; }
    const startsIso = parseDateInput(startsAt, false);
    const endsIso = parseDateInput(endsAt, true);
    if (!startsIso || !endsIso) { notify('Validation', 'Dates must be in YYYY-MM-DD format.'); return; }
    if (Date.parse(endsIso) <= Date.parse(startsIso)) {
      notify('Validation', 'End date must be after start date.');
      return;
    }

    setSaving(true);
    try {
      await createPoster({
        localUri: previewUri,
        mimeType: pickedMime,
        title: title.trim(),
        targetApps,
        startsAt: startsIso,
        endsAt: endsIso,
        createdBy: founder?.id ?? null,
      });
      setFormOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      const base = e?.response?.data?.error || e?.message || 'Failed to create poster';
      const details = e?.response?.data?.details;
      notify('Error', details ? `${base}\n${details}` : base);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: FestivalPoster) => {
    try {
      await updatePoster(p.id, { is_active: !p.is_active });
      load();
    } catch (e: any) {
      notify('Error', e?.response?.data?.error || e?.message || 'Update failed');
    }
  };

  const remove = (p: FestivalPoster) => {
    const doDelete = async () => {
      try {
        await deletePoster(p.id);
        load();
      } catch (e: any) {
        notify('Error', e?.response?.data?.error || e?.message || 'Delete failed');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`Delete poster "${p.title}"?`)) doDelete();
      return;
    }
    Alert.alert('Delete poster?', p.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const inputStyle = useMemo(
    () => [
      st.input,
      {
        color: colors.textPrimary,
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      },
    ],
    [colors.textPrimary, isDark],
  );

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingBottom: bottomTabPad }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Festival Posters"
          subtitle="Popup posters shown once per user in client apps"
          showBack
        />

        <View style={st.newBtnWrap}>
          <PrimaryGradientButton label="＋ New Poster" onPress={() => setFormOpen(true)} />
        </View>

        <SectionTitle title="All posters" />

        {loading ? (
          <ActivityIndicator color="#7C6FFF" style={{ marginTop: 32 }} />
        ) : rows.length === 0 ? (
          <GlassCard>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }}>
              No posters yet. Upload one to show a festival popup in the apps.
            </Text>
          </GlassCard>
        ) : (
          rows.map((p) => (
            <GlassCard key={p.id} style={st.card}>
              <View style={st.cardRow}>
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={st.thumb} resizeMode="cover" />
                ) : (
                  <View style={[st.thumb, st.thumbEmpty]} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={st.titleRow}>
                    <Text style={[st.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <View style={[st.badge, { backgroundColor: `${STATUS_COLORS[p.status]}22` }]}>
                      <Text style={[st.badgeText, { color: STATUS_COLORS[p.status] }]}>
                        {p.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[st.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {new Date(p.starts_at).toLocaleDateString()} → {new Date(p.ends_at).toLocaleDateString()}
                  </Text>
                  <Text style={[st.meta, { color: colors.textTertiary }]} numberOfLines={1}>
                    {p.target_apps.map((a) => APP_LABELS[a] || a).join(' · ')}
                  </Text>
                </View>
                <View style={st.actions}>
                  <Pressable
                    onPress={safePressHandler(() => toggleActive(p))}
                    hitSlop={8}
                    style={({ pressed }) => pressableWebStyles(pressed, {})}
                  >
                    <Power size={18} color={p.is_active ? '#00D4AD' : '#8A8A98'} strokeWidth={2.2} />
                  </Pressable>
                  <Pressable
                    onPress={safePressHandler(() => remove(p))}
                    hitSlop={8}
                    style={({ pressed }) => pressableWebStyles(pressed, {})}
                  >
                    <Trash2 size={18} color="#FF6B7A" strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={st.modalBackdrop}>
          <View style={[st.modalCard, { backgroundColor: isDark ? '#17171F' : '#FFFFFF' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[st.modalTitle, { color: colors.textPrimary }]}>New Festival Poster</Text>

              <Pressable
                onPress={safePressHandler(pickImage)}
                style={({ pressed }) => [
                  st.pickArea,
                  { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' },
                  ...pressableWebStyles(pressed, {}),
                ]}
              >
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={st.pickPreview} resizeMode="contain" />
                ) : (
                  <View style={st.pickEmpty}>
                    <ImagePlus size={28} color={colors.textTertiary} strokeWidth={1.6} />
                    <Text style={{ color: colors.textTertiary, marginTop: 6, fontSize: 13 }}>
                      Tap to pick poster image (png / jpg / webp, max 2 MB)
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={[st.label, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Happy Diwali 2026"
                placeholderTextColor={colors.textTertiary}
                style={inputStyle}
                maxLength={120}
              />

              <View style={st.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: colors.textSecondary }]}>Starts (YYYY-MM-DD)</Text>
                  <TextInput
                    value={startsAt}
                    onChangeText={setStartsAt}
                    placeholder="2026-10-20"
                    placeholderTextColor={colors.textTertiary}
                    style={inputStyle}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: colors.textSecondary }]}>Ends (YYYY-MM-DD)</Text>
                  <TextInput
                    value={endsAt}
                    onChangeText={setEndsAt}
                    placeholder="2026-10-25"
                    placeholderTextColor={colors.textTertiary}
                    style={inputStyle}
                  />
                </View>
              </View>

              <Text style={[st.label, { color: colors.textSecondary }]}>Show in apps</Text>
              <View style={st.chipRow}>
                {POSTER_APPS.map((app) => {
                  const on = targetApps.includes(app);
                  return (
                    <Pressable
                      key={app}
                      onPress={safePressHandler(() => toggleApp(app))}
                      style={({ pressed }) => [
                        st.chip,
                        {
                          backgroundColor: on ? 'rgba(124,111,255,0.18)' : 'transparent',
                          borderColor: on ? '#7C6FFF' : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                        },
                        ...pressableWebStyles(pressed, {}),
                      ]}
                    >
                      <Text style={{ color: on ? '#7C6FFF' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                        {APP_LABELS[app]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: 18 }} />
              <PrimaryGradientButton
                label={saving ? 'Uploading…' : 'Publish Poster'}
                onPress={submit}
                disabled={saving}
              />
              <Pressable
                onPress={safePressHandler(() => { if (!saving) { setFormOpen(false); } })}
                style={({ pressed }) => [st.cancelBtn, ...pressableWebStyles(pressed, {})]}
              >
                <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

const st = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingVertical: 16, paddingHorizontal: 0, maxWidth: '100%', width: '100%', alignSelf: 'center' },
  newBtnWrap: { marginTop: 8, marginBottom: 4 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  thumbEmpty: { backgroundColor: 'rgba(128,128,140,0.2)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  meta: { fontSize: 12, marginTop: 3 },
  actions: { gap: 16, alignItems: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  pickArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  pickPreview: { width: '100%', height: 200 },
  pickEmpty: { alignItems: 'center', padding: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8, letterSpacing: 0.3 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dateRow: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cancelBtn: { alignSelf: 'center', padding: 12, marginTop: 4 },
});
