import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, FlatList, Image, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { ConsoleAmbientBackground, GlassCard, SkeletonPulse, bottomTabPad } from './founderUi';
import { createTrackLink, createTrackLinksBulk, fetchTrackQr, listTrackLinks, setTrackLinkStatus, type TrackLink } from '../../services/trackingLinks';

const emptyForm = { destination_url: '', medium: 'QR', purpose: 'BROCHURE', notes: '' };

export default function TrackingLinksScreen() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<TrackLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<TrackLink | null>(null);
  const [qr, setQr] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
    return () => sub?.remove?.();
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await listTrackLinks();
      if (signal?.aborted) return;
      setRows(data);
      setError('');
    } catch (err: any) {
      if (signal?.aborted) return;
      setError(err?.response?.data?.error || 'Tracking links could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const create = async () => {
    setError('');
    const urls = form.destination_url.split(/\n/).map((item) => item.trim()).filter(Boolean);
    if (!urls.length) {
      setError('Add at least one https destination.');
      return;
    }
    if (urls.length > 100) {
      setError('Bulk create accepts at most 100 links. Nothing was saved.');
      return;
    }
    const invalid = urls.findIndex((url) => !url.startsWith('https://'));
    if (invalid >= 0) {
      setError(`Row ${invalid + 1} must be an https URL. Nothing was saved.`);
      return;
    }
    try {
      if (urls.length === 1) {
        const created = await createTrackLink({
          destination_url: urls[0],
          medium: form.medium,
          purpose: form.purpose,
          notes: form.notes,
          idempotency_key: `link-${Date.now()}`,
          change_reason: 'Issued',
        });
        setRows((current) => [created, ...current]);
        setForm(emptyForm);
        await openQr(created);
        return;
      }
      const created = await createTrackLinksBulk({
        medium: form.medium,
        purpose: form.purpose,
        notes: form.notes,
        idempotency_key: `bulk-${Date.now()}`,
        links: urls.map((destination_url) => ({ destination_url })),
      });
      setRows((current) => [...created.links].reverse().concat(current));
      setForm(emptyForm);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The link was not created.');
    }
  };

  const openQr = async (link: TrackLink) => {
    setSelected(link);
    setQr('');
    try {
      setQr(await fetchTrackQr(link.id, 'png'));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The QR image could not be prepared.');
    }
  };

  const share = async (link: TrackLink) => {
    await Share.share(Platform.OS === 'ios' ? { url: link.stable_url } : { message: link.stable_url });
  };

  const download = (link: TrackLink) => {
    if (Platform.OS !== 'web' || !qr || typeof document === 'undefined') return;
    const anchor = document.createElement('a');
    anchor.href = qr;
    anchor.download = `${link.short_code}.png`;
    anchor.click();
  };

  const toggle = async (link: TrackLink) => {
    const next = link.status === 'ACTIVE' ? 'disable' : 'enable';
    const updated = await setTrackLinkStatus(link.id, next, link.row_version);
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    if (selected?.id === updated.id) setSelected(updated);
  };

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Tracking Links" subtitle="Brochure and demo links" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomTabPad, gap: 12 }}
        ListHeaderComponent={(
          <View style={{ gap: 12 }}>
            {error ? <GlassCard variant="lightweight"><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text></GlassCard> : null}
            <GlassCard>
              <Text style={[styles.title, { color: colors.textPrimary }]}>New link</Text>
              <Text style={{ color: colors.textSecondary }}>The printed code stays the same when you change the destination later. A click is a link open, not a verified scan. If a visitor names a different school, that enquiry is flagged for review and the original target stays unchanged.</Text>
              <TextInput
                accessibilityLabel="Destination URLs"
                value={form.destination_url}
                onChangeText={(destination_url) => setForm((current) => ({ ...current, destination_url }))}
                placeholder="One https URL per line, up to 100"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                multiline
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder, minHeight: 72 }]}
              />
              <View style={styles.row}>
                {(['QR', 'LINK'] as const).map((medium) => (
                  <Pressable key={medium} accessibilityRole="button" onPress={() => setForm((current) => ({ ...current, medium }))} style={[styles.chip, { minHeight: 44, borderColor: form.medium === medium ? colors.primary : colors.glassBorder }]}>
                    <Text style={{ color: colors.textPrimary }}>{medium}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.row}>
                {(['BROCHURE', 'DEMO', 'EVENT', 'LANDING'] as const).map((purpose) => (
                  <Pressable key={purpose} accessibilityRole="button" onPress={() => setForm((current) => ({ ...current, purpose }))} style={[styles.chip, { minHeight: 44, borderColor: form.purpose === purpose ? colors.primary : colors.glassBorder }]}>
                    <Text style={{ color: colors.textPrimary }}>{purpose}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Create tracking link" onPress={create} style={[styles.primary, { backgroundColor: colors.primary, opacity: reduceMotion ? 1 : undefined }]}>
                <Text style={styles.primaryText}>Create link</Text>
              </Pressable>
            </GlassCard>
            {selected ? (
              <GlassCard>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{selected.short_code}</Text>
                <Text style={{ color: colors.textSecondary }}>{selected.stable_url}</Text>
                <Text style={{ color: colors.textSecondary }}>{selected.destination_class} · {selected.coverage === 'owned_site' ? 'Owned site can attribute a form' : 'Conversion coverage unavailable'}</Text>
                {qr ? <Image source={{ uri: qr }} style={styles.qr} accessibilityLabel="QR code for the stable link" /> : <SkeletonPulse width={180} height={180} borderRadius={12} />}
                <View style={styles.row}>
                  <Pressable accessibilityRole="button" onPress={() => share(selected)} style={[styles.chip, { minHeight: 44, borderColor: colors.glassBorder }]}><Text style={{ color: colors.textPrimary }}>Share URL</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => download(selected)} style={[styles.chip, { minHeight: 44, borderColor: colors.glassBorder }]}><Text style={{ color: colors.textPrimary }}>Download QR</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => toggle(selected)} style={[styles.chip, { minHeight: 44, borderColor: colors.glassBorder }]}><Text style={{ color: colors.textPrimary }}>{selected.status === 'ACTIVE' ? 'Disable' : 'Enable'}</Text></Pressable>
                </View>
              </GlassCard>
            ) : null}
            {loading ? <SkeletonPulse width="100%" height={72} /> : null}
            {!loading && rows.length === 0 ? <GlassCard variant="lightweight"><Text style={{ color: colors.textSecondary }}>No tracking links yet.</Text></GlassCard> : null}
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.short_code} ${item.status}`} onPress={() => openQr(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: reduceMotion ? 1 : pressed ? 0.985 : 1 }] }]}>
            <GlassCard variant="lightweight">
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.short_code}</Text>
              <Text style={{ color: colors.textSecondary }}>{item.status} · {item.purpose} · {item.destination_class}</Text>
              {item.target_school_name_snapshot ? <Text style={{ color: colors.textSecondary }}>Target {item.target_school_name_snapshot}</Text> : null}
            </GlassCard>
          </Pressable>
        )}
      />
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 44, paddingHorizontal: 12, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  primary: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  qr: { width: 180, height: 180, marginTop: 12, backgroundColor: '#fff' },
});
