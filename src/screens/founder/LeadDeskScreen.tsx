import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { crmService } from '../../services/crmService';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

const FALLBACK_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'PILOT'];

function failureMessage(err: any) {
  if (!err?.response && /network|offline/i.test(String(err?.message || ''))) {
    return 'You appear to be offline. Nothing was saved.';
  }
  return err?.response?.data?.error || 'The server did not confirm this change.';
}

export default function LeadDeskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { colors } = useTheme();
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const [note, setNote] = useState('Qualification call');
  const [due, setDue] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('BUDGET');
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('10:00');
  const [demoLocation, setDemoLocation] = useState('');
  const [stages, setStages] = useState<string[]>(FALLBACK_STAGES);
  const [pilotWrite, setPilotWrite] = useState(false);
  const [canWrite, setCanWrite] = useState(true);

  const load = useCallback(async (options?: { keepError?: boolean }) => {
    if (!leadId) return;
    if (!options?.keepError) setError(null);
    try {
      const nextBundle = await crmService.getLead(leadId);
      setBundle(nextBundle);
      setCanWrite(nextBundle?.permissions?.write_sales !== false);
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    crmService.catalog().then((catalog: { stages?: Array<{ code: string; archived_at?: string | null }>; sales_command?: { pilot_write_enabled?: boolean } }) => {
      const codes = (catalog.stages || []).filter((stage) => !stage.archived_at).map((stage) => stage.code);
      if (codes.length) setStages(codes);
      setPilotWrite(Boolean(catalog.sales_command?.pilot_write_enabled));
    }).catch(() => undefined);
  }, []);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await work();
      setNotice(done);
      setPanel(null);
      await load();
    } catch (err) {
      setError(failureMessage(err));
      await load({ keepError: true });
    } finally {
      setBusy(false);
    }
  };

  const lead = bundle?.lead;
  const version = lead?.row_version;
  const next = lead?.next_action_task_id;
  const handoff = bundle?.onboarding?.[0];

  return (
    <ConsoleAmbientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomTabPad }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={lead?.name || 'Lead'} subtitle="Pipeline, next action, and SchoolIMS handoff" showBack />
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> : null}
        {error ? <GlassCard><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text><Button title="Retry" variant="secondary" onPress={() => { load(); }} /></GlassCard> : null}
        {notice ? <GlassCard><Text style={{ color: colors.success }}>{notice}</Text></GlassCard> : null}
        {!loading && !lead && !error ? <GlassCard><Text style={{ color: colors.textSecondary }}>This lead is not in your scope.</Text></GlassCard> : null}
        {lead ? (
          <>
            <GlassCard>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{lead.pipeline_stage_code} · {lead.outcome}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
                {lead.owner_name || 'Unassigned'} · {lead.territory_name || lead.territory_code || 'No territory'} · {lead.channel_label || lead.website_source || 'No source'}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
                {lead.currency || 'INR'} {lead.value_amount ?? lead.deal_value ?? '—'} · version {lead.row_version}
              </Text>
              {lead.account_id ? (
                <Pressable accessibilityRole="button" onPress={() => router.push(`/(app)/console/school-prospects/${lead.account_id}` as never)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Open school prospect and decision makers</Text>
                </Pressable>
              ) : <Text style={{ color: colors.textTertiary, marginTop: 8 }}>This enquiry is not linked to a school prospect yet.</Text>}
              <Text style={{ color: colors.textPrimary, marginTop: 12 }}>
                Next action: {lead.next_action_title || 'Missing'}
                {lead.next_action_due_at ? ` · due ${new Date(lead.next_action_due_at).toLocaleString()}` : ''}
                {lead.next_action_assignee_name ? ` · ${lead.next_action_assignee_name}` : ''}
              </Text>
            </GlassCard>

            <View style={{ marginHorizontal: 16, marginTop: 12 }}>
              <Button title="Capture feedback" variant="secondary" onPress={() => router.push(`/(app)/console/field-feedback?capture=1&source_type=enquiry&source_id=${lead.id}&account_id=${lead.account_id || ''}&customer_label=${encodeURIComponent(lead.organization || lead.name || '')}&context_kind=customer_interaction` as never)} />
            </View>
            <View style={styles.actions}>
              {canWrite ? stages.map((stage) => (
                <Pressable
                  key={stage}
                  accessibilityRole="button"
                  accessibilityLabel={`Move stage to ${stage}`}
                  disabled={busy}
                  onPress={() => run(() => crmService.moveStage(lead.id, version, stage), `Stage is ${stage}.`)}
                  style={({ pressed }) => [styles.chip, { borderColor: colors.border, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                >
                  <Text style={{ color: stage === lead.pipeline_stage_code ? colors.primary : colors.textSecondary }}>{stage}</Text>
                </Pressable>
              )) : null}
            </View>

            {canWrite ? <View style={styles.actions}>
              <Button title="Log call" onPress={() => setPanel('activity')} />
              <Button title="Complete action" variant="secondary" onPress={() => setPanel('complete')} />
              <Button title="Demo" variant="secondary" onPress={() => setPanel('demo')} />
              <Button title="Proposal" variant="secondary" onPress={() => setPanel('proposal')} />
              <Button title="Close" variant="secondary" onPress={() => setPanel('close')} />
              <Button title="Reopen" variant="ghost" onPress={() => setPanel('reopen')} />
              {pilotWrite ? <Button title="Pilot" variant="ghost" onPress={() => setPanel('pilot')} /> : null}
            </View> : <Text style={{ color: colors.textSecondary }}>You can review this lead. Stage, demo, proposal, and pilot changes are hidden for read-only access.</Text>}

            {panel === 'activity' ? (
              <GlassCard>
                <Input label="Call summary" value={note} onChangeText={setNote} accessibilityLabel="Call summary" />
                <Input label="Follow-up due (ISO time)" value={due} onChangeText={setDue} placeholder="2026-09-26T10:00:00.000Z" accessibilityLabel="Follow-up due time" />
                <Button title={busy ? 'Saving…' : 'Save call'} disabled={busy} onPress={() => run(() => crmService.logActivity(lead.id, {
                  expected_version: version,
                  activity_type: 'CALL',
                  contact_outcome: 'CONNECTED',
                  direction: 'OUTBOUND',
                  summary: note,
                  occurred_at: new Date().toISOString(),
                  follow_up: due ? { title: 'Follow up', due_at: due, task_type: 'FOLLOW_UP', assignee_founder_id: lead.assigned_to } : undefined,
                }), 'Call saved.')} />
              </GlassCard>
            ) : null}
            {panel === 'complete' && next ? (
              <GlassCard>
                <Input label="Replacement due (ISO time)" value={due} onChangeText={setDue} accessibilityLabel="Replacement due time" />
                <Button title={busy ? 'Saving…' : 'Complete and replace'} disabled={busy} onPress={() => run(() => crmService.completeTask(lead.id, next, {
                  expected_version: version,
                  replacement: due ? { title: 'Next follow-up', due_at: due, task_type: 'FOLLOW_UP', assignee_founder_id: lead.assigned_to } : undefined,
                }), 'Next action updated.')} />
              </GlassCard>
            ) : null}
            {panel === 'demo' ? (
              <GlassCard>
                <Input label="Demo date (YYYY-MM-DD)" value={demoDate} onChangeText={setDemoDate} accessibilityLabel="Demo date" />
                <Input label="Start time (HH:mm, Asia/Kolkata)" value={demoTime} onChangeText={setDemoTime} accessibilityLabel="Demo time" />
                <Input label="Location" value={demoLocation} onChangeText={setDemoLocation} accessibilityLabel="Demo location" />
                <Button title={busy ? 'Saving…' : 'Schedule demo'} disabled={busy} onPress={() => {
                  const start = new Date(`${demoDate}T${demoTime}:00+05:30`);
                  const end = new Date(start.getTime() + 45 * 60 * 1000);
                  if (Number.isNaN(start.getTime())) {
                    setError('Enter a demo date as YYYY-MM-DD and a time as HH:mm.');
                    return;
                  }
                  return run(() => crmService.scheduleDemo(lead.id, {
                    expected_version: version,
                    starts_at: start.toISOString(),
                    ends_at: end.toISOString(),
                    timezone: 'Asia/Kolkata',
                    location: demoLocation || null,
                  }), 'Demo scheduled. The stage did not change.');
                }} />
                {(bundle.demos || []).filter((demo: any) => demo.status === 'SCHEDULED').slice(0, 3).map((demo: any) => (
                  <Button key={demo.id} title="Mark completed" variant="secondary" disabled={busy} onPress={() => run(() => crmService.finishDemo(demo.id, { expected_version: version, status: 'COMPLETED', result: 'Completed', occurred_at: new Date().toISOString() }), 'Demo completed.')} />
                ))}
              </GlassCard>
            ) : null}
            {panel === 'proposal' ? (
              <GlassCard>
                <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="Proposal amount" />
                <Button title={busy ? 'Saving…' : 'Issue draft'} disabled={busy} onPress={() => run(async () => {
                  const created = await crmService.createProposal(lead.id, { expected_version: version, amount, currency: 'INR', notes: 'Commercial proposal' });
                  await crmService.transitionProposal(created.version?.id || created.id, { expected_version: created.lead?.row_version || version, status: 'SENT', delivery_state: 'RECORDED_SENT' });
                }, 'Proposal recorded as sent. This is not email delivery.')} />
              </GlassCard>
            ) : null}
            {panel === 'close' ? (
              <GlassCard>
                <Input label="Reason code" value={reason} onChangeText={setReason} accessibilityLabel="Close reason" />
                <Input label="Confirmed value" value={amount} onChangeText={setAmount} accessibilityLabel="Confirmed value" />
                <Button title="Won" disabled={busy} onPress={() => run(() => crmService.closeLead(lead.id, { expected_version: version, outcome: 'WON', value_amount: amount || lead.value_amount, currency: lead.currency || 'INR' }), 'Closed won.')} />
                <Button title="Lost" variant="secondary" disabled={busy} onPress={() => run(() => crmService.closeLead(lead.id, { expected_version: version, outcome: 'LOST', reason_code: reason }), 'Closed lost.')} />
              </GlassCard>
            ) : null}
            {panel === 'reopen' ? (
              <GlassCard>
                <Input label="Reopen reason" value={note} onChangeText={setNote} accessibilityLabel="Reopen reason" />
                <Input label="Next action due" value={due} onChangeText={setDue} accessibilityLabel="Reopen next action due" />
                <Button title={busy ? 'Saving…' : 'Reopen'} disabled={busy} onPress={() => run(() => crmService.reopenLead(lead.id, {
                  expected_version: version,
                  reason: note,
                  next_action: { title: 'Reopened follow-up', due_at: due, assignee_founder_id: lead.assigned_to },
                }), 'Lead reopened. Prior closure remains.')} />
              </GlassCard>
            ) : null}
            {panel === 'pilot' && canWrite ? (
              <GlassCard>
                <Input label="Pilot objective" value={note} onChangeText={setNote} accessibilityLabel="Pilot objective" />
                <Button title={busy ? 'Saving…' : 'Start pilot'} disabled={busy} onPress={() => run(async () => {
                  const created = await crmService.createPilot(lead.id, {
                    expected_version: version,
                    idempotency_key: `pilot-${lead.id}-${version}`,
                    objective: note,
                    planned_start_at: new Date().toISOString(),
                    planned_end_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
                  });
                  await crmService.transitionPilot(created.pilot.id, {
                    action: 'START',
                    expected_version: created.lead_version || version,
                    pilot_expected_version: created.pilot.row_version,
                    idempotency_key: `pilot-start-${created.pilot.id}`,
                    occurred_at: new Date().toISOString(),
                  });
                }, 'Pilot started and the stage moved to PILOT.')} />
              </GlassCard>
            ) : null}

            <GlassCard>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Onboarding</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
                {handoff ? `${handoff.status} · cluster ${handoff.cluster_id || 'pending'} · school ${handoff.target_school_id || 'not created'}` : 'No handoff yet. A won school stays ONBOARDING until it is live with defaults and an admin.'}
              </Text>
              {handoff?.failure_reason ? <Text style={{ color: colors.error, marginTop: 6 }}>{handoff.failure_reason}</Text> : null}
              {lead.outcome === 'WON' && lead.product_vertical !== 'MEDICAL' ? (
                <Button title="Start school handoff" onPress={() => router.push({ pathname: '/(app)/schools/add', params: { enquiryId: lead.id, accountId: lead.account_id || '', name: lead.organization || lead.name || '' } } as any)} />
              ) : null}
              {handoff?.status === 'FAILED' ? (
                <Button title="Resume handoff" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: '/(app)/schools/add', params: { enquiryId: lead.id, accountId: lead.account_id || '', name: lead.organization || lead.name || '' } } as any)} />
              ) : null}
              {lead.account_id && handoff?.status === 'SUCCEEDED' ? (
                <Button title="Sync activation" variant="secondary" disabled={busy} onPress={() => run(() => crmService.syncActivation(lead.account_id, {}), 'Activation checked against live readiness.')} />
              ) : null}
            </GlassCard>

            <Text style={[styles.section, { color: colors.textPrimary }]}>Timeline</Text>
            {(bundle.activities || []).map((item: any) => (
              <View key={item.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.activity_type}</Text>
                <Text style={{ color: colors.textSecondary }}>{item.summary}</Text>
                <Text style={{ color: colors.textTertiary }}>{item.visibility} · {item.occurred_at ? new Date(item.occurred_at).toLocaleString() : ''}</Text>
              </View>
            ))}
            {!bundle.activities?.length ? <Text style={{ color: colors.textTertiary, marginHorizontal: 20 }}>No activities yet.</Text> : null}

            <Text style={[styles.section, { color: colors.textPrimary }]}>Proposals</Text>
            {(bundle.proposals || []).map((item: any) => (
              <View key={item.version_id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.textPrimary }}>{item.proposal_number} v{item.version_no} · {item.status}</Text>
                <Text style={{ color: colors.textSecondary }}>{item.currency} {item.amount} · {item.delivery_state || 'not sent'}</Text>
                {item.status === 'DRAFT' || item.status === 'SENT' ? (
                  <Button title={item.status === 'DRAFT' ? 'Record as sent' : 'Accept'} variant="ghost" disabled={busy} onPress={() => run(() => crmService.transitionProposal(item.version_id, { status: item.status === 'DRAFT' ? 'SENT' : 'ACCEPTED', delivery_state: item.status === 'DRAFT' ? 'RECORDED_SENT' : undefined }), 'Proposal updated.')} />
                ) : null}
                {item.status !== 'DRAFT' ? (
                  <Button title="Revise" variant="ghost" disabled={busy} onPress={() => run(() => crmService.reviseProposal(item.id, { expected_version: version, amount: item.amount, currency: item.currency, notes: 'Revised' }), 'New proposal version created.')} />
                ) : null}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 8, marginHorizontal: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  row: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
});
