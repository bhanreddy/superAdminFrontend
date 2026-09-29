import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useToast } from '../../../../src/components/ui/Toast';
import { ScreenHeader } from '../../../../src/components/ui/ScreenHeader';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { PERMISSIONS } from '../../../../src/constants/rbac';
import { superAdminApi } from '../../../../src/services/apiService';
import {
  diffSchoolRevisions,
  generateSchoolPackage,
  getBuildConfig,
  getSchoolConfiguration,
  getSchoolPackageJob,
  listSchoolPackages,
  retrySchoolPackage,
  saveSchoolConfiguration,
  updateOnboardingStatus,
  uploadSchoolAsset,
  type BuildConfig,
  type OnboardingStatus,
  type SchoolConfiguration,
} from '../../../../src/services/schoolOnboardingService';
import { downloadAuthorizedFile } from '../../../../src/utils/downloadFile';

const STEPS = ['Identity', 'Branding', 'Application', 'Infrastructure', 'Prerequisites', 'Review'] as const;
type StepName = typeof STEPS[number];

const STATUS: OnboardingStatus[] = ['pending_build', 'apk_delivered', 'live', 'suspended'];

function field(config: Record<string, any>, suggestions: Record<string, any>, key: string) {
  const value = config?.[key];
  if (value !== undefined && value !== null && value !== '') return String(value);
  const suggested = suggestions?.[key];
  return suggested ? String(suggested) : '';
}

export default function BuildConfigScreen() {
  const { id, section, cluster_id: clusterParam } = useLocalSearchParams<{ id: string; section?: string; cluster_id?: string }>();
  const clusterId = Array.isArray(clusterParam) ? clusterParam[0] : clusterParam;
  const { colors } = useTheme();
  const { can } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const canEdit = can(PERMISSIONS.CONFIGS_MODIFY);
  const canGenerate = can(PERMISSIONS.BUILDS_TRIGGER);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>(null);
  const [draft, setDraft] = useState<SchoolConfiguration | null>(null);
  const [legacy, setLegacy] = useState<BuildConfig | null>(null);
  const [step, setStep] = useState<StepName>(section === 'env' ? 'Infrastructure' : section === 'appjson' || section === 'easjson' ? 'Application' : 'Identity');
  const [form, setForm] = useState<Record<string, string>>({});
  const [platforms, setPlatforms] = useState<string[]>(['android', 'web']);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<SchoolConfiguration['latest_job']>(null);
  const [artifacts, setArtifacts] = useState<Array<{ id: string; revision: number; file_name: string; sha256: string }>>([]);
  const [diffText, setDiffText] = useState('');
  const idempotency = useRef(`pkg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const load = useCallback(async () => {
    if (!clusterId) {
      setLoading(false);
      return;
    }
    const [configuration, schoolData, snippets, packages] = await Promise.all([
      getSchoolConfiguration(id, clusterId),
      superAdminApi.getSchool(parseInt(id, 10), clusterId),
      getBuildConfig(id, clusterId),
      listSchoolPackages(id, clusterId),
    ]);
    setDraft(configuration);
    setSchool(schoolData);
    setLegacy(snippets);
    setJob(configuration.latest_job);
    setArtifacts(packages.artifacts || []);
    const config = configuration.config || {};
    const suggestions = configuration.suggestions || {};
    setPlatforms(config.platforms?.length ? config.platforms : []);
    setForm({
      official_name: field(config, suggestions, 'official_name'),
      app_display_name: field(config, suggestions, 'app_display_name'),
      short_name: field(config, suggestions, 'short_name'),
      school_code: field(config, suggestions, 'school_code'),
      address: field(config, suggestions, 'address'),
      contact_phone: field(config, suggestions, 'contact_phone'),
      contact_email: field(config, suggestions, 'contact_email'),
      website: field(config, suggestions, 'website'),
      tagline: field(config, suggestions, 'tagline'),
      motto: field(config, suggestions, 'motto'),
      affiliation_label: field(config, suggestions, 'affiliation_label'),
      recognition_line: field(config, suggestions, 'recognition_line'),
      recognition_no: field(config, suggestions, 'recognition_no'),
      primary: field(config, suggestions, 'primary') || '#1A73E8',
      secondary: field(config, suggestions, 'secondary') || '#F5921B',
      accent: field(config, suggestions, 'accent') || '#F9A825',
      slug: field(config, suggestions, 'slug'),
      scheme: field(config, suggestions, 'scheme'),
      android_package: field(config, suggestions, 'android_package'),
      ios_bundle_id: field(config, suggestions, 'ios_bundle_id'),
      eas_project_id: field(config, suggestions, 'eas_project_id'),
      version: field(config, suggestions, 'version') || '1.0.0',
      worker_name: field(config, suggestions, 'worker_name'),
      web_domain: field(config, suggestions, 'web_domain'),
      owner: field(config, suggestions, 'owner') || 'nexsyrus',
    });
  }, [clusterId, id]);

  useEffect(() => {
    load().catch(() => {
      Alert.alert('Error', 'Failed to load school setup');
      if (router.canGoBack()) router.back();
    }).finally(() => setLoading(false));
  }, [load, router]);

  useEffect(() => {
    if (!job || !clusterId || (job.status !== 'QUEUED' && job.status !== 'RUNNING')) return undefined;
    const timer = setInterval(async () => {
      try {
        const next = await getSchoolPackageJob(id, clusterId, job.id);
        setJob(next);
        if (next.status === 'SUCCEEDED' || next.status === 'FAILED') {
          const packages = await listSchoolPackages(id, clusterId);
          setArtifacts(packages.artifacts || []);
          if (next.status === 'SUCCEEDED') showToast(`Package revision ${next.revision} is ready.`, 'success');
        }
      } catch (err) {
        // Keep the last known job state. The next poll retries.
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [clusterId, id, job, showToast]);

  const preview = draft?.preview || {};
  const blockers = draft?.readiness?.blockers || [];
  const primary = form.primary || '#1A73E8';

  const save = async (extra: Record<string, any> = {}) => {
    if (!draft || !clusterId) return;
    setSaving(true);
    try {
      const config = {
        official_name: form.official_name,
        app_display_name: form.app_display_name,
        short_name: form.short_name,
        school_code: form.school_code,
        address: form.address,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        website: form.website,
        tagline: form.tagline,
        motto: form.motto,
        affiliation_label: form.affiliation_label,
        recognition_line: form.recognition_line,
        recognition_no: form.recognition_no,
        primary: form.primary,
        secondary: form.secondary,
        accent: form.accent,
        slug: form.slug,
        scheme: form.scheme,
        android_package: form.android_package,
        ios_bundle_id: form.ios_bundle_id,
        eas_project_id: form.eas_project_id,
        version: form.version,
        worker_name: form.worker_name,
        web_domain: form.web_domain,
        owner: form.owner,
        platforms,
        ...(step === 'Application' || step === 'Review' ? {
          version_confirmed: Boolean(form.version),
          scheme_confirmed: Boolean(form.scheme),
          identifiers_confirmed: Boolean(form.slug || form.android_package),
        } : {}),
        ...extra,
      };
      const next = await saveSchoolConfiguration(id, clusterId, draft.version, config);
      setDraft(next);
      showToast('Configuration saved.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pickAsset = async (slot: string, type: string) => {
    if (!draft || !clusterId) return;
    const picked = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true, multiple: false });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const file = Platform.OS === 'web'
      ? (asset as any).file
      : { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' };
    try {
      const uploaded = await uploadSchoolAsset(id, clusterId, slot, file, draft.version);
      const refreshed = await getSchoolConfiguration(id, clusterId);
      setDraft({ ...refreshed, version: uploaded.version || refreshed.version });
      showToast(`${slot.replace(/_/g, ' ')} uploaded.`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Upload failed', 'error');
    }
  };

  const generate = async () => {
    if (!clusterId) return;
    try {
      const created = await generateSchoolPackage(id, clusterId, idempotency.current);
      setJob({ id: created.job_id, revision: created.revision, status: created.status, attempt_count: 0, error: null });
      idempotency.current = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      showToast('Package generation started. The school record is unchanged.', 'success');
    } catch (err: any) {
      const blockersText = (err?.response?.data?.blockers || []).map((item: any) => item.message).join('\n');
      showToast(blockersText || err?.response?.data?.error || 'Generation failed', 'error');
    }
  };

  const download = async (artifact: { id: string; file_name: string }) => {
    if (!clusterId) return;
    await downloadAuthorizedFile(
      `/api/super-admin/schools/${id}/packages/${artifact.id}/download?cluster_id=${encodeURIComponent(clusterId)}`,
      artifact.file_name,
    );
  };

  const showDiff = async () => {
    if (!clusterId || !draft?.latest_revision || draft.latest_revision.revision < 2) return;
    const revision = draft.latest_revision.revision;
    const result = await diffSchoolRevisions(id, clusterId, revision, revision - 1);
    setDiffText(result.config.map((change) => `${change.field}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`).join('\n') || 'No configuration differences.');
  };

  const platformSummary = useMemo(() => {
    const state = draft?.readiness?.platforms || {};
    return ['android', 'ios', 'web'].map((platform) => {
      const row = state[platform];
      if (!row || row.status === 'unselected') return `${platform}: not selected`;
      if (row.status === 'ready') return `${platform}: ready`;
      return `${platform}: blocked (${(row.missing || []).join(', ')})`;
    }).join(' · ');
  }, [draft]);

  if (!clusterId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Choose the school cluster</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>Open this school from its cluster so setup cannot mix two schools that share a numeric id.</Text>
      </View>
    );
  }

  if (loading || !draft) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="School setup" subtitle={school?.name || form.official_name || 'Configuration'} />

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>School status</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Live status is separate from configuration completeness and from package generation.</Text>
        <View style={styles.row}>
          {STATUS.map((status) => (
            <Pressable
              key={status}
              onPress={async () => {
                await updateOnboardingStatus(id, status, clusterId);
                setSchool({ ...school, onboarding_status: status });
              }}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: school?.onboarding_status === status ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: school?.onboarding_status === status ? colors.textInverse : colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{status.replace(/_/g, ' ')}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Readiness · draft v{draft.version}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{platformSummary}</Text>
        {blockers.slice(0, 6).map((item) => (
          <Text key={`${item.field}-${item.platform}`} style={{ color: colors.error, fontSize: 13 }}>{item.platform ? `${item.platform}: ` : ''}{item.message}</Text>
        ))}
      </View>

      <View style={styles.row}>
        {STEPS.map((name) => (
          <Pressable key={name} onPress={() => setStep(name)} style={[styles.chip, { borderColor: colors.border, backgroundColor: step === name ? colors.primary : colors.card }]}>
            <Text style={{ color: step === name ? colors.textInverse : colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {step === 'Identity' ? (
          <>
            {['official_name', 'app_display_name', 'short_name', 'school_code', 'address', 'contact_phone', 'contact_email', 'website', 'tagline', 'motto', 'affiliation_label', 'recognition_line', 'recognition_no'].map((key) => (
              <Field key={key} label={key.replace(/_/g, ' ')} value={form[key] || ''} onChangeText={(value) => setForm({ ...form, [key]: key === 'school_code' ? value.toUpperCase() : value })} colors={colors} editable={canEdit} />
            ))}
          </>
        ) : null}
        {step === 'Branding' ? (
          <>
            <View style={[styles.letterhead, { backgroundColor: primary }]}>
              <Text style={styles.letterheadTitle}>{form.official_name || 'School name'}</Text>
              <Text style={styles.letterheadSub}>{form.tagline || 'Tagline'}</Text>
              <Text style={styles.letterheadSub}>{form.address || 'Address'}</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Header preview uses the primary color. The letterhead name is the official name, which can differ from the shorter app name “{form.app_display_name || 'App'}”.</Text>
            {['primary', 'secondary', 'accent'].map((key) => (
              <Field key={key} label={key} value={form[key] || ''} onChangeText={(value) => setForm({ ...form, [key]: value })} colors={colors} editable={canEdit} />
            ))}
            <View style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: form.primary || '#1A73E8' }]} />
              <View style={[styles.swatch, { backgroundColor: form.secondary || '#F5921B' }]} />
              <View style={[styles.swatch, { backgroundColor: form.accent || '#F9A825' }]} />
            </View>
            {canEdit ? (
              <View style={{ gap: 8 }}>
                <Button title={draft.assets.logo ? 'Replace logo' : 'Upload logo'} variant="secondary" onPress={() => pickAsset('logo', 'image/*')} />
                <Button title={draft.assets.app_icon ? 'Replace app icon' : 'Upload app icon'} variant="secondary" onPress={() => pickAsset('app_icon', 'image/*')} />
                <Button title={draft.assets.campus_photo ? 'Replace campus photo' : 'Upload campus photo'} variant="secondary" onPress={() => pickAsset('campus_photo', 'image/*')} />
              </View>
            ) : <Text style={{ color: colors.textSecondary }}>You can review branding. Editing requires configuration permission.</Text>}
          </>
        ) : null}
        {step === 'Application' ? (
          <>
            {['slug', 'scheme', 'android_package', 'ios_bundle_id', 'eas_project_id', 'version', 'owner'].map((key) => (
              <Field key={key} label={key.replace(/_/g, ' ')} value={form[key] || ''} onChangeText={(value) => setForm({ ...form, [key]: value })} colors={colors} editable={canEdit && (key !== 'owner' || can('schools.update.all'))} />
            ))}
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Suggestions are filled from the school name. Confirm them before generating. The EAS project ID comes from Expo and is never invented.</Text>
            <View style={styles.row}>
              {['android', 'ios', 'web'].map((platform) => {
                const selected = platforms.includes(platform);
                return (
                  <Pressable key={platform} onPress={() => canEdit && setPlatforms(selected ? platforms.filter((item) => item !== platform) : [...platforms, platform])} style={[styles.chip, { borderColor: colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>
                    <Text style={{ color: selected ? colors.textInverse : colors.textPrimary, fontWeight: '700' }}>{platform}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
        {step === 'Infrastructure' ? (
          <>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>Cluster {draft.cluster_id}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>API URL and the public Supabase client settings are taken from this cluster when a package is generated. They are not typed here.</Text>
            <Field label="worker name" value={form.worker_name || ''} onChangeText={(value) => setForm({ ...form, worker_name: value })} colors={colors} editable={canEdit} />
            <Field label="intended web domain" value={form.web_domain || ''} onChangeText={(value) => setForm({ ...form, web_domain: value })} colors={colors} editable={canEdit} />
            {legacy ? <CodeBlock title=".env preview" body={legacy.env_file} colors={colors} /> : null}
          </>
        ) : null}
        {step === 'Prerequisites' ? (
          <>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Upload the Firebase file for each selected native platform. Files for other schools inside a shared JSON are removed. Placeholders are rejected.</Text>
            {canEdit ? (
              <View style={{ gap: 8 }}>
                <Button title={draft.assets.google_services ? 'Replace google-services.json' : 'Upload google-services.json'} variant="secondary" onPress={() => pickAsset('google_services', 'application/json')} />
                <Button title={draft.assets.google_service_info_plist ? 'Replace GoogleService-Info.plist' : 'Upload GoogleService-Info.plist'} variant="secondary" onPress={() => pickAsset('google_service_info_plist', '*/*')} />
              </View>
            ) : null}
          </>
        ) : null}
        {step === 'Review' ? (
          <>
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{form.official_name} · app name {form.app_display_name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{form.slug} · {form.android_package} · {platforms.join(', ') || 'no platforms'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Files: app.json, eas.json, wrangler.jsonc, .env, schoolConfig.ts, assets. school.ts stays in the checkout.</Text>
            {legacy ? (
              <>
                <CodeBlock title="app.json changes" body={JSON.stringify(legacy.app_json_changes, null, 2)} colors={colors} />
                <CodeBlock title="eas.json profile" body={JSON.stringify(legacy.eas_profile, null, 2)} colors={colors} />
              </>
            ) : null}
            {canGenerate ? <Button title={job?.status === 'RUNNING' || job?.status === 'QUEUED' ? 'Generating…' : 'Generate package'} onPress={generate} loading={job?.status === 'RUNNING' || job?.status === 'QUEUED'} /> : <Text style={{ color: colors.textSecondary }}>Package generation requires build trigger permission.</Text>}
            {job?.status === 'FAILED' ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.error }}>{job.error?.message || 'Generation failed. The school was not duplicated.'}</Text>
                {canGenerate ? <Button title="Retry generation" variant="secondary" onPress={async () => { const next = await retrySchoolPackage(id, clusterId, job.id); setJob({ ...job, status: next.status }); }} /> : null}
              </View>
            ) : null}
            {artifacts.map((artifact) => (
              <View key={artifact.id} style={styles.artifact}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Revision {artifact.revision}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{artifact.sha256.slice(0, 12)}</Text>
                </View>
                <Button title="Download" size="sm" variant="secondary" onPress={() => download(artifact)} />
              </View>
            ))}
            {draft.latest_revision && draft.latest_revision.revision > 1 ? <Button title="Show revision diff" variant="ghost" onPress={showDiff} /> : null}
            {diffText ? <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{diffText}</Text> : null}
          </>
        ) : null}
        {canEdit && step !== 'Review' ? <Button title="Save step" onPress={() => save()} loading={saving} /> : null}
      </View>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, editable }: { label: string; value: string; onChangeText: (value: string) => void; colors?: unknown; editable: boolean }) {
  return (
    <Input
      label={label}
      value={value}
      editable={editable}
      onChangeText={onChangeText}
      autoCapitalize="none"
      containerStyle={{ marginBottom: 4 }}
    />
  );
}

function CodeBlock({ title, body, colors }: { title: string; body: string; colors: any }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{title}</Text>
        <Button title="Copy" size="sm" variant="ghost" onPress={() => Clipboard.setStringAsync(body)} />
      </View>
      <Text selectable style={{ color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  letterhead: { borderRadius: 16, padding: 16, gap: 4 },
  letterheadTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  letterheadSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13 },
  swatch: { width: 36, height: 36, borderRadius: 12 },
  artifact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
