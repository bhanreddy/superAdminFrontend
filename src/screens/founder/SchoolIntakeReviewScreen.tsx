import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../contexts/ThemeContext';
import { ConsoleAmbientBackground, GlassCard, SkeletonActionList, bottomTabPad } from './founderUi';
import {
  INTAKE_STATUS,
  intakeErrorMessage,
  schoolIntakeApi,
  type IntakeStatus,
  type SchoolIntake,
} from '../../services/schoolIntakeService';

function Row({ label, value, color }: { label: string; value?: string | number | null; color: string }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, { color }]}>{String(value)}</Text>
    </View>
  );
}

export default function SchoolIntakeReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const intakeId = Array.isArray(id) ? id[0] : id;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [item, setItem] = useState<SchoolIntake | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'changes' | 'reject' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!intakeId) return;
    try {
      setItem(await schoolIntakeApi.get(intakeId));
    } catch (err) {
      showToast(intakeErrorMessage(err, 'Could not open this dossier.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [intakeId, showToast]);

  useEffect(() => { load(); }, [load]);

  const decide = async (kind: 'changes' | 'reject') => {
    if (!intakeId || note.trim().length < 4) {
      showToast('Write a short note first.', 'warning');
      return;
    }
    setBusy(kind);
    try {
      const next = kind === 'changes'
        ? await schoolIntakeApi.requestChanges(intakeId, note.trim())
        : await schoolIntakeApi.reject(intakeId, note.trim());
      setItem(next);
      setNote('');
      showToast(kind === 'changes' ? 'Sent back to the executive.' : 'Dossier closed.', 'success');
    } catch (err) {
      showToast(intakeErrorMessage(err, 'Could not update this dossier.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    if (!intakeId) return;
    setBusy('approve');
    try {
      const result = await schoolIntakeApi.approve(intakeId);
      setItem(result.data);
      setPassword(result.temporary_password);
      setAdminEmail(result.admin_email);
      setConfirming(false);
      showToast(`${result.data.name} is onboarded.`, 'success');
    } catch (err) {
      showToast(intakeErrorMessage(err, 'Onboarding did not finish.'), 'error');
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading || !item) {
    return (
      <ConsoleAmbientBackground>
        <ScreenHeader title="Review dossier" showBack />
        <View style={{ padding: 16 }}><SkeletonActionList count={4} /></View>
      </ConsoleAmbientBackground>
    );
  }

  const meta = INTAKE_STATUS[item.status as IntakeStatus] || INTAKE_STATUS.SUBMITTED;
  const dossier = item.dossier || {};
  const report = item.intelligence;
  const canAct = item.status === 'SUBMITTED' || item.status === 'FAILED';
  const tone = report?.grade === 'BLOCKED' ? '#FF453A' : report?.grade === 'READY' ? '#30D158' : '#FF9F0A';

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title={item.name || 'Review dossier'} subtitle={item.code} showBack />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}>
        <GlassCard variant="lightweight" style={styles.card}>
          <View style={styles.top}>
            <Text style={[styles.score, { color: tone }]}>{item.score}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[styles.pill, { backgroundColor: `${meta.color}22` }]}>
                <Text style={{ color: meta.color, fontWeight: '800', fontSize: 11 }}>{meta.label}</Text>
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>{item.brief}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                From {item.submitted_by_name}{item.submitted_by_employee_id ? ` · ${item.submitted_by_employee_id}` : ''}
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard variant="lightweight" style={styles.card}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Automatic onboarding</Text>
          {(report?.auto_steps || []).map((step) => (
            <View key={step} style={styles.step}>
              <ShieldCheck size={14} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 13 }}>{step}</Text>
            </View>
          ))}
          {(item.provision_steps || []).map((step) => (
            <View key={step.id} style={styles.step}>
              <CheckCircle2 size={14} color={step.status === 'done' ? '#30D158' : '#FF9F0A'} />
              <Text style={{ color: colors.textPrimary, flex: 1, fontSize: 13 }}>{step.detail || step.id}</Text>
            </View>
          ))}
          {report?.cluster ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Planned cluster: {report.cluster.label}, {report.cluster.headroom} seats free.
            </Text>
          ) : null}
        </GlassCard>

        {(report?.blockers || []).length || (report?.warnings || []).length ? (
          <GlassCard variant="lightweight" style={styles.card}>
            {(report?.blockers || []).map((flag) => (
              <View key={flag.message} style={styles.step}>
                <CircleAlert size={14} color="#FF453A" />
                <Text style={{ color: '#FF453A', flex: 1, fontSize: 13 }}>{flag.message}</Text>
              </View>
            ))}
            {(report?.warnings || []).map((flag) => (
              <View key={flag.message} style={styles.step}>
                <CircleAlert size={14} color="#FF9F0A" />
                <Text style={{ color: '#FF9F0A', flex: 1, fontSize: 13 }}>{flag.message}</Text>
              </View>
            ))}
          </GlassCard>
        ) : null}

        <GlassCard variant="lightweight" style={styles.card}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Dossier</Text>
          <Row label="Board" value={dossier.board} color={colors.textPrimary} />
          <Row label="Address" value={[dossier.address, dossier.city, dossier.state, dossier.pincode].filter(Boolean).join(', ')} color={colors.textPrimary} />
          <Row label="Students" value={dossier.estimated_students} color={colors.textPrimary} />
          <Row label="Principal" value={[dossier.principal_name, dossier.principal_phone, dossier.principal_email].filter(Boolean).join(' · ')} color={colors.textPrimary} />
          <Row label="First admin" value={[dossier.admin_first_name, dossier.admin_last_name, dossier.admin_email].filter(Boolean).join(' ')} color={colors.textPrimary} />
          <Row label="Package" value={dossier.android_package} color={colors.textPrimary} />
          <Row label="Notes" value={dossier.notes} color={colors.textPrimary} />
          {(dossier.documents || []).map((doc) => (
            <Row key={doc.url || doc.label} label={doc.label || 'Link'} value={doc.url} color={colors.primary} />
          ))}
        </GlassCard>

        {password ? (
          <GlassCard variant="lightweight" style={styles.card}>
            <Text style={[styles.heading, { color: '#30D158' }]}>One-time admin password</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Shown once for {adminEmail}. It is not stored again.</Text>
            <Text selectable style={[styles.password, { color: colors.textPrimary }]}>{password}</Text>
            <Button title="Copy password" variant="secondary" onPress={async () => { await Clipboard.setStringAsync(password); showToast('Password copied.', 'success'); }} />
          </GlassCard>
        ) : null}

        {item.school_id ? (
          <GlassCard variant="lightweight" style={styles.card}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              School #{item.school_id} on {item.cluster_id}. It is assigned to the executive who submitted it.
            </Text>
            <Button
              title="Open school setup"
              onPress={() => router.push(`/(app)/schools/${item.school_id}/build-config?cluster_id=${encodeURIComponent(item.cluster_id || '')}` as any)}
            />
          </GlassCard>
        ) : null}

        {(item.events || []).length ? (
          <GlassCard variant="lightweight" style={styles.card}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Timeline</Text>
            {item.events?.map((event) => (
              <View key={event.id} style={styles.event}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{event.event_type.replace(/_/g, ' ')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{event.actor_name || 'System'} · {new Date(event.created_at).toLocaleString()}</Text>
                {event.note ? <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{event.note}</Text> : null}
              </View>
            ))}
          </GlassCard>
        ) : null}

        {canAct ? (
          <GlassCard variant="lightweight" style={styles.card}>
            {confirming ? (
              <>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>Onboard {item.name}?</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  This creates the school, places it on the freest cluster, assigns it to {item.submitted_by_name || 'the executive'}, and provisions the first admin when the dossier has one.
                </Text>
                <View style={styles.actions}>
                  <Button title="Cancel" variant="secondary" onPress={() => setConfirming(false)} style={styles.action} />
                  <Button title="Approve and onboard" onPress={approve} loading={busy === 'approve'} disabled={report?.grade === 'BLOCKED'} style={styles.action} />
                </View>
              </>
            ) : (
              <Button title="Approve and onboard" onPress={() => setConfirming(true)} disabled={report?.grade === 'BLOCKED'} />
            )}
            <Input label="Note to the executive" multiline value={note} onChangeText={setNote} containerStyle={{ marginTop: 12 }} />
            <View style={styles.actions}>
              <Button title="Request changes" variant="secondary" onPress={() => decide('changes')} loading={busy === 'changes'} style={styles.action} />
              <Button title="Reject" variant="danger" onPress={() => decide('reject')} loading={busy === 'reject'} style={styles.action} />
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { padding: 16, gap: 8 },
  top: { flexDirection: 'row', gap: 12 },
  score: { fontSize: 34, fontWeight: '800', letterSpacing: -1, width: 64 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heading: { fontSize: 16, fontWeight: '800' },
  step: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  fact: { gap: 2, paddingVertical: 4 },
  factLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3 },
  factValue: { fontSize: 14, lineHeight: 20 },
  password: { fontSize: 20, fontWeight: '800', letterSpacing: 0.4 },
  event: { gap: 2, paddingVertical: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  action: { flex: 1 },
});
