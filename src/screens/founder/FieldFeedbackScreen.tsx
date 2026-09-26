import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { ConsoleAmbientBackground, GlassCard, SkeletonPulse, bottomTabPad } from './founderUi';
import {
  commentFeedback,
  feedbackAccess,
  getFeedbackItem,
  linkFeedbackDuplicate,
  listFeedback,
  previewFeedback,
  retryFeedbackRouting,
  rerouteFeedback,
  setFeedbackOwner,
  setFeedbackStatus,
  splitFeedback,
  submitFeedback,
  type FeedbackAccess,
  type FeedbackDestinationPreview,
  type FeedbackDetail,
  type FeedbackItem,
} from '../../services/fieldFeedback';

const DRAFT_KEY = 'nexsyrus.fieldFeedback.draft.v1';
const TYPES = [
  ['feature_request', 'Feature request'],
  ['objection', 'Objection'],
  ['curriculum_finding', 'Curriculum finding'],
  ['unsure', 'Unsure'],
] as const;
const CONTEXTS = [
  ['customer_interaction', 'Customer interaction'],
  ['class_session', 'Class/session'],
  ['demo', 'Demo'],
  ['visit', 'Visit'],
  ['other', 'Other'],
] as const;
const VIEWS = [
  ['mine', 'My submissions'],
  ['triage', 'Needs triage'],
  ['product', 'Product'],
  ['sales_enablement', 'Sales/Enablement'],
  ['curriculum', 'Curriculum'],
] as const;
const STATUSES = ['new', 'needs_clarification', 'accepted', 'in_progress', 'resolved', 'duplicate', 'declined'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const URGENCIES = ['low', 'normal', 'high', 'critical'] as const;
const DESTINATIONS = [
  ['product', 'Product'],
  ['sales_enablement', 'Sales/Enablement'],
  ['curriculum', 'Curriculum'],
  ['triage', 'Triage'],
] as const;
const FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);

type Draft = {
  client_key: string;
  feedback_type: string;
  title: string;
  observation: string;
  context_kind: string;
  context_note: string;
  customer_label: string;
  account_id: string;
  product_area: string;
  course_name: string;
  module_name: string;
  lesson_name: string;
  impact: string;
  urgency: string;
  evidence: string;
  source_type: string;
  source_id: string;
  attachments: Array<{ file_name: string; content_type: string; data_base64: string }>;
};

function newKey() {
  return `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyDraft(): Draft {
  return {
    client_key: newKey(),
    feedback_type: 'feature_request',
    title: '',
    observation: '',
    context_kind: 'customer_interaction',
    context_note: '',
    customer_label: '',
    account_id: '',
    product_area: '',
    course_name: '',
    module_name: '',
    lesson_name: '',
    impact: '',
    urgency: '',
    evidence: '',
    source_type: '',
    source_id: '',
    attachments: [],
  };
}

function failureMessage(err: any) {
  if (!err?.response && /network|offline|timeout/i.test(String(err?.message || ''))) {
    return 'You appear to be offline. What you entered is still here.';
  }
  return err?.response?.data?.error || 'The server did not confirm this. What you entered is still here.';
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

async function readBase64(uri: string) {
  const response = await fetch(uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 1_000_000) throw new Error('Each attachment must be between 1 byte and 1 MB.');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return globalThis.btoa(binary);
}

const FeedbackRow = React.memo(function FeedbackRow({
  item,
  onPress,
}: {
  item: FeedbackItem;
  onPress: (id: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.status_label}, ${item.destination_label}`}
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.row, { borderColor: colors.glassBorder, opacity: pressed ? 0.84 : 1 }]}
    >
      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.title}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
        {item.category_label} · {item.destination_label} · {item.status_label}
      </Text>
      <Text style={{ color: colors.textTertiary, marginTop: 4 }}>
        {item.customer_label || 'No account'} · {item.submitter_name || 'Unknown submitter'} · {new Date(item.captured_at).toLocaleString()}
      </Text>
      {item.routing_state === 'failed' ? <Text style={{ color: colors.error, marginTop: 4 }}>Routing did not finish. It can be retried.</Text> : null}
    </Pressable>
  );
});

export default function FieldFeedbackScreen() {
  const params = useLocalSearchParams<{
    capture?: string;
    item?: string;
    source_type?: string;
    source_id?: string;
    account_id?: string;
    customer_label?: string;
    context_kind?: string;
    product_area?: string;
    course?: string;
    module?: string;
    lesson?: string;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [access, setAccess] = useState<FeedbackAccess>({ triage: false, write: true, delivery_commitment: false });
  const [view, setView] = useState<string>('mine');
  const [mode, setMode] = useState<'list' | 'capture' | 'detail'>(firstParam(params.capture) === '1' ? 'capture' : firstParam(params.item) ? 'detail' : 'list');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [counts, setCounts] = useState({ total_reports: 0, distinct_accounts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ q: '', category: '', status: '', owner: '', account: '', area: '', from: '', to: '' });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [draftReady, setDraftReady] = useState(false);
  const [preview, setPreview] = useState<FeedbackDestinationPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [detailId, setDetailId] = useState(firstParam(params.item));
  const [reason, setReason] = useState('');
  const [splitTitle, setSplitTitle] = useState('');
  const [splitCategory, setSplitCategory] = useState('feature_request');
  const [comment, setComment] = useState('');

  const views = useMemo(() => VIEWS.filter(([key]) => key !== 'triage' || access.triage), [access.triage]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextAccess, list] = await Promise.all([
        feedbackAccess(),
        listFeedback({
          view,
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(/^[0-9a-f-]{36}$/i.test(filters.owner) ? { owner: filters.owner } : {}),
          ...(/^[0-9a-f-]{36}$/i.test(filters.account) ? { account: filters.account } : {}),
          ...(filters.area ? { area: filters.area } : {}),
          ...(/^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? { from: `${filters.from}T00:00:00.000Z` } : {}),
          ...(/^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? { to: `${filters.to}T23:59:59.999Z` } : {}),
        }),
      ]);
      setAccess(nextAccess);
      setItems(list.items);
      setCounts(list.counts);
      setError('');
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setLoading(false);
    }
  }, [view, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!active) return;
      const saved = raw ? JSON.parse(raw) as Partial<Draft> : null;
      const base = saved?.client_key ? { ...emptyDraft(), ...saved, attachments: saved.attachments || [] } : emptyDraft();
      const sourceId = firstParam(params.source_id);
      if (sourceId && !base.source_id) {
        base.source_type = firstParam(params.source_type);
        base.source_id = sourceId;
        base.account_id = base.account_id || firstParam(params.account_id);
        base.customer_label = base.customer_label || firstParam(params.customer_label);
        base.context_kind = firstParam(params.context_kind) || base.context_kind;
        base.product_area = base.product_area || firstParam(params.product_area);
        base.course_name = base.course_name || firstParam(params.course);
        base.module_name = base.module_name || firstParam(params.module);
        base.lesson_name = base.lesson_name || firstParam(params.lesson);
      }
      setDraft(base);
      setDraftReady(true);
    }).catch(() => setDraftReady(true));
    return () => { active = false; };
  }, [params.account_id, params.context_kind, params.course, params.customer_label, params.lesson, params.module, params.product_area, params.source_id, params.source_type]);

  useEffect(() => {
    if (!draftReady) return;
    const handle = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {
        const { attachments, ...rest } = draft;
        AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...rest, attachments: [] })).catch(() => undefined);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [draft, draftReady]);

  useEffect(() => {
    if (!draft.feedback_type) return;
    const handle = setTimeout(() => {
      previewFeedback({ feedback_type: draft.feedback_type, observation: draft.observation })
        .then((next) => setPreview(next))
        .catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(handle);
  }, [draft.feedback_type, draft.observation]);

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    setMode('detail');
    setError('');
    try {
      setDetail(await getFeedbackItem(id));
    } catch (err) {
      setError(failureMessage(err));
    }
  }, []);

  useEffect(() => {
    const id = firstParam(params.item);
    if (id) openDetail(id);
  }, [openDetail, params.item]);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const addAttachment = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const contentType = asset.mimeType || 'application/octet-stream';
      if (!FILE_TYPES.has(contentType)) {
        setError('Attach a JPEG, PNG, WebP, PDF, or text file.');
        return;
      }
      if ((asset.size || 0) > 1_000_000) {
        setError('Each attachment must be 1 MB or smaller.');
        return;
      }
      const data = await readBase64(asset.uri);
      update({
        attachments: [...draft.attachments, { file_name: asset.name || 'attachment', content_type: contentType, data_base64: data }].slice(0, 5),
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The attachment was not added. The rest of the form is still here.');
    }
  };

  const submit = async () => {
    if (draft.title.trim().length < 3 || draft.observation.trim().length < 10) {
      setError('Add a title and the original wording before sending.');
      return;
    }
    if (!preview || preview.destination_key == null) {
      setError('The destination could not be loaded. Your draft is still here.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await submitFeedback({
        ...draft,
        urgency: draft.urgency || undefined,
        account_id: draft.account_id || undefined,
        source_type: draft.source_type || undefined,
        source_id: draft.source_id || undefined,
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      setDraft(emptyDraft());
      setMode('detail');
      setDetailId(result.item.id);
      setDetail(await getFeedbackItem(result.item.id));
      load();
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const runDetail = async (work: () => Promise<void>) => {
    setError('');
    try {
      await work();
      if (detailId) setDetail(await getFeedbackItem(detailId));
      setReason('');
      load();
    } catch (err) {
      setError(failureMessage(err));
    }
  };

  const header = (
    <ScreenHeader
      title="Field feedback"
      subtitle="Capture what you heard. Routing does not promise a delivery date."
      showBack
      rightAction={mode === 'list' && access.write ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Capture feedback" onPress={() => setMode('capture')} style={styles.headerAction}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Capture</Text>
        </Pressable>
      ) : null}
    />
  );

  return (
    <ConsoleAmbientBackground>
      {header}
      {error ? <Text accessibilityRole="alert" style={[styles.alert, { color: colors.error }]}>{error}</Text> : null}
      {mode === 'capture' ? (
        <ScrollView style={styles.fill} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Button title="Back to list" variant="ghost" onPress={() => setMode('list')} />
          <GlassCard>
            <Text style={[styles.section, { color: colors.textPrimary }]}>What kind of note is this?</Text>
            <ChipRow options={TYPES} value={draft.feedback_type} onChange={(feedback_type) => update({ feedback_type })} />
            <Input label="Short title" required value={draft.title} onChangeText={(title) => update({ title })} />
            <Input label="What was heard or observed" required value={draft.observation} onChangeText={(observation) => update({ observation })} multiline style={styles.multiline} />
            <Text style={[styles.section, { color: colors.textPrimary }]}>Context</Text>
            <ChipRow options={CONTEXTS} value={draft.context_kind} onChange={(context_kind) => update({ context_kind })} />
            <Input label="Context note" value={draft.context_note} onChangeText={(context_note) => update({ context_note })} />
            <Input label="Account, school, or customer" value={draft.customer_label} onChangeText={(customer_label) => update({ customer_label })} />
            <Input label="Product area" value={draft.product_area} onChangeText={(product_area) => update({ product_area })} />
            <Input label="Course" value={draft.course_name} onChangeText={(course_name) => update({ course_name })} />
            <Input label="Module" value={draft.module_name} onChangeText={(module_name) => update({ module_name })} />
            <Input label="Lesson" value={draft.lesson_name} onChangeText={(lesson_name) => update({ lesson_name })} />
            <Input label="Impact" value={draft.impact} onChangeText={(impact) => update({ impact })} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Urgency you heard. The owner sets priority later.</Text>
            <ChipRow options={URGENCIES.map((item) => [item, item] as const)} value={draft.urgency} onChange={(urgency) => update({ urgency })} />
            <Input label="Evidence" value={draft.evidence} onChangeText={(evidence) => update({ evidence })} multiline style={styles.multiline} />
            <Button title="Add attachment" variant="secondary" onPress={addAttachment} />
            {draft.attachments.map((file) => (
              <Text key={file.file_name} style={{ color: colors.textSecondary }}>{file.file_name}</Text>
            ))}
            {draft.source_id ? <Text style={{ color: colors.textSecondary }}>Linked to {draft.source_type} {draft.source_id}</Text> : null}
            <View style={[styles.destination, { borderColor: colors.glassBorder }]}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {preview ? `Routes to ${preview.destination_label}` : 'Checking the destination…'}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {preview ? `${preview.accountable_team}. ${preview.routing_reason === 'conflict' ? 'Rules disagree, so this waits in triage.' : 'Sending this does not promise a delivery date.'}` : 'You can keep typing. Submit stays closed until the destination is shown.'}
              </Text>
              {preview?.hint ? <Text style={{ color: colors.textPrimary, marginTop: 8 }}>{preview.hint.message}</Text> : null}
            </View>
            <Button title={submitting ? 'Saving…' : 'Submit feedback'} loading={submitting} disabled={submitting || !preview} onPress={submit} />
          </GlassCard>
        </ScrollView>
      ) : null}
      {mode === 'detail' && !detail ? <SkeletonPulse width="100%" height={160} style={{ margin: 16 }} /> : null}
      {mode === 'detail' && detail ? (
        <ScrollView style={styles.fill} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Button title="Back to list" variant="ghost" onPress={() => { setMode('list'); setDetail(null); }} />
          <GlassCard>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{detail.item.title}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{detail.item.category_label} · {detail.item.destination_label} · {detail.item.accountable_team}</Text>
            <Text style={{ color: colors.textPrimary, marginTop: 12 }}>{detail.submission.observation}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              {detail.item.context_label} · {detail.item.customer_label || 'No account'} · {detail.item.submitter_name} · {new Date(detail.item.captured_at).toLocaleString()}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              Status {detail.item.status_label}{detail.item.resolution_note ? ` · ${detail.item.resolution_note}` : ''}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              Heard urgency {detail.item.reported_urgency || 'not set'} · Owner priority {detail.item.triage_priority || 'not set'}
            </Text>
            <Text style={{ color: colors.textTertiary, marginTop: 8 }}>This record does not commit a delivery date. Routing is {detail.item.routing_state}.</Text>
            {detail.item.routing_error ? <Text style={{ color: colors.error, marginTop: 6 }}>{detail.item.routing_error}</Text> : null}
            {detail.item.source_href && detail.item.source_type ? (
              <Button title="Open source record" variant="secondary" onPress={() => router.push(detail.item.source_href as never)} />
            ) : null}
          </GlassCard>
          {detail.attachments.map((file) => <Text key={file.id} style={{ color: colors.textSecondary }}>{file.file_name}</Text>)}
          <Text style={[styles.section, { color: colors.textPrimary }]}>Comments</Text>
          {detail.comments.map((entry) => (
            <View key={entry.id} style={[styles.row, { borderColor: colors.glassBorder }]}>
              <Text style={{ color: colors.textPrimary }}>{entry.author_name || 'Teammate'} · {entry.kind === 'clarification_request' ? 'Clarification' : 'Comment'}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{entry.body}</Text>
            </View>
          ))}
          <Input label="Comment" value={comment} onChangeText={setComment} />
          <Button title="Add comment" variant="secondary" onPress={() => runDetail(() => commentFeedback(detail.item.id, { body: comment }).then(() => setComment('')))} />
          {detail.permissions.triage ? (
            <GlassCard>
              <Text style={[styles.section, { color: colors.textPrimary }]}>Triage</Text>
              <Input label="Reason" value={reason} onChangeText={setReason} />
              {detail.item.routing_state === 'failed' ? (
                <Button title="Retry routing" onPress={() => runDetail(() => retryFeedbackRouting(detail.item.id, detail.item.row_version).then(() => undefined))} />
              ) : null}
              <Button title="Ask for clarification" variant="secondary" onPress={() => runDetail(() => commentFeedback(detail.item.id, { kind: 'clarification_request', body: reason }).then(() => undefined))} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Move to</Text>
              <ChipRow options={DESTINATIONS} value="" onChange={(destination_key) => runDetail(() => rerouteFeedback(detail.item.id, { expected_version: detail.item.row_version, destination_key, reason }).then(() => undefined))} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Reclassify</Text>
              <ChipRow options={TYPES} value={detail.item.category} onChange={(category) => {
                if (category === detail.item.category) return;
                runDetail(() => rerouteFeedback(detail.item.id, { expected_version: detail.item.row_version, category, reason }).then(() => undefined));
              }} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
              <ChipRow options={STATUSES.filter((item) => item !== 'duplicate').map((item) => [item, item] as const)} value={detail.item.status} onChange={(status) => {
                if (status === detail.item.status) return;
                runDetail(() => setFeedbackStatus(detail.item.id, { expected_version: detail.item.row_version, status, reason }).then(() => undefined));
              }} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Owner priority</Text>
              <ChipRow options={PRIORITIES.map((item) => [item, item] as const)} value={detail.item.triage_priority || ''} onChange={(triage_priority) => runDetail(() => setFeedbackStatus(detail.item.id, { expected_version: detail.item.row_version, triage_priority, reason }).then(() => undefined))} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Owner</Text>
              <ChipRow options={detail.owners.map((owner) => [owner.id, owner.full_name || 'Founder'] as const)} value={detail.item.owner_founder_id || ''} onChange={(owner_founder_id) => runDetail(() => setFeedbackOwner(detail.item.id, { expected_version: detail.item.row_version, owner_founder_id, reason }).then(() => undefined))} />
              <Input label="Split title" value={splitTitle} onChangeText={setSplitTitle} />
              <ChipRow options={TYPES} value={splitCategory} onChange={setSplitCategory} />
              <Button title="Split into a linked item" variant="secondary" onPress={() => runDetail(() => splitFeedback(detail.item.id, {
                expected_version: detail.item.row_version,
                reason,
                parts: [{ category: splitCategory, title: splitTitle }],
              }).then(() => setSplitTitle('')))} />
              <Text style={[styles.section, { color: colors.textPrimary }]}>Possible duplicates</Text>
              {detail.suggestions.map((suggestion) => (
                <Pressable key={suggestion.id} accessibilityRole="button" onPress={() => runDetail(() => linkFeedbackDuplicate(detail.item.id, {
                  expected_version: detail.item.row_version,
                  duplicate_of_id: suggestion.id,
                  reason,
                }).then(() => undefined))} style={[styles.row, { borderColor: colors.glassBorder }]}>
                  <Text style={{ color: colors.textPrimary }}>{suggestion.title}</Text>
                  <Text style={{ color: colors.textSecondary }}>Link as duplicate. The original report stays.</Text>
                </Pressable>
              ))}
              {!detail.suggestions.length ? <Text style={{ color: colors.textSecondary }}>No similar open items.</Text> : null}
            </GlassCard>
          ) : null}
          <Text style={[styles.section, { color: colors.textPrimary }]}>Routing history</Text>
          {detail.history.map((entry) => (
            <Text key={entry.id} style={{ color: colors.textSecondary, marginBottom: 6 }}>
              {entry.from_destination || 'new'} → {entry.to_destination} · {entry.reason}
            </Text>
          ))}
        </ScrollView>
      ) : null}
      {mode === 'list' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={styles.fill}
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={(
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{counts.total_reports} reports · {counts.distinct_accounts} accounts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {views.map(([key, label]) => (
                  <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: view === key }} onPress={() => setView(key)} style={[styles.chip, { borderColor: view === key ? colors.primary : colors.glassBorder, minHeight: 44 }]}>
                    <Text style={{ color: colors.textPrimary }}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Input label="Search" value={filters.q} onChangeText={(q) => setFilters((current) => ({ ...current, q }))} />
              <Button title={filtersOpen ? 'Hide filters' : 'Filters'} variant="ghost" onPress={() => setFiltersOpen((current) => !current)} />
              {filtersOpen ? (
                <View style={{ gap: 8 }}>
                  <ChipRow options={[['', 'Any type'], ...TYPES]} value={filters.category} onChange={(category) => setFilters((current) => ({ ...current, category }))} />
                  <ChipRow options={[['', 'Any status'], ...STATUSES.map((item) => [item, item] as const)]} value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
                  <Input label="Owner id" value={filters.owner} onChangeText={(owner) => setFilters((current) => ({ ...current, owner }))} autoCapitalize="none" />
                  <Input label="Account id" value={filters.account} onChangeText={(account) => setFilters((current) => ({ ...current, account }))} autoCapitalize="none" />
                  <Input label="Product or course area" value={filters.area} onChangeText={(area) => setFilters((current) => ({ ...current, area }))} />
                  <Input label="From date" value={filters.from} onChangeText={(from) => setFilters((current) => ({ ...current, from }))} placeholder="YYYY-MM-DD" autoCapitalize="none" />
                  <Input label="To date" value={filters.to} onChangeText={(to) => setFilters((current) => ({ ...current, to }))} placeholder="YYYY-MM-DD" autoCapitalize="none" />
                </View>
              ) : null}
              {loading ? <SkeletonPulse width="100%" height={88} /> : null}
            </View>
          )}
          ListEmptyComponent={!loading ? <Text style={{ color: colors.textSecondary }}>Nothing in this view yet.</Text> : null}
          renderItem={({ item }) => <FeedbackRow item={item} onPress={openDetail} />}
        />
      ) : null}
    </ConsoleAmbientBackground>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<readonly [string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map(([key, label]) => (
        <Pressable key={key || 'any'} accessibilityRole="button" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)} style={[styles.chip, { borderColor: value === key ? colors.primary : colors.glassBorder }]}>
          <Text style={{ color: colors.textPrimary }}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { padding: 16, paddingBottom: bottomTabPad, gap: 12 },
  alert: { marginHorizontal: 16, marginBottom: 8 },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { marginTop: 8, marginBottom: 4 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, marginTop: 8 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  destination: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, marginVertical: 8 },
  headerAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
