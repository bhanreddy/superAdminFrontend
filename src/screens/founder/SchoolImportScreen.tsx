import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { crmService } from '../../services/crmService';
import type { ImportBatch, ImportRow } from '../../types/crm';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

const STEPS = ['Upload', 'Map', 'Review', 'Confirm', 'Results'];

function stepForStatus(status: string) {
  if (['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(status)) return 4;
  if (['PREVIEW_READY', 'CONFIRMED', 'PROCESSING'].includes(status)) return 3;
  if (status === 'AWAITING_MAPPING' || status === 'PREVIEW_QUEUED' || status === 'PREVIEWING') return 2;
  return 1;
}

export default function SchoolImportScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ batchId?: string }>();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<any>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    crmService.importTemplate().then(setTemplate).catch(() => setError('Import template could not be loaded.'));
  }, []);

  useEffect(() => {
    const batchId = Array.isArray(params.batchId) ? params.batchId[0] : params.batchId;
    if (!batchId) return;
    let cancelled = false;
    crmService.getImport(batchId).then(async (current) => {
      if (cancelled) return;
      setBatch(current);
      if (current.status === 'PREVIEW_READY' || current.status === 'PARTIAL' || current.status === 'COMPLETED') {
        const page = await crmService.importRows(batchId, { limit: 40 });
        if (!cancelled) setRows(page.data);
      }
      if (!cancelled) setStep(stepForStatus(current.status));
    }).catch((err) => {
      if (!cancelled) fail(err);
    });
    return () => { cancelled = true; };
  }, [params.batchId]);

  const fail = (err: any) => {
    const data = err?.response?.data;
    if (!err?.response) setError('The network did not answer. Refresh the batch before assuming the import failed.');
    else setError(data?.error || 'The import step was not accepted.');
  };

  const refresh = async (id: string) => {
    const next = await crmService.getImport(id);
    setBatch(next);
    if (next.status === 'PREVIEW_READY' || next.status === 'PARTIAL' || next.status === 'COMPLETED') {
      const page = await crmService.importRows(id, { limit: 40 });
      setRows(page.data);
    }
    return next;
  };

  const upload = async () => {
    setBusy(true);
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'], copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const created = await crmService.uploadImport({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: (asset as { file?: Blob }).file });
      setBatch(created);
      setStep(1);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const mapSuggested = async () => {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      let current = await refresh(batch.id);
      for (let i = 0; i < 8 && current.status === 'PARSING'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        current = await refresh(batch.id);
      }
      const headers: string[] = current.structure?.sheets?.[0]?.headers || [];
      const columns: Record<string, string> = {};
      headers.forEach((header, index) => {
        const label = String(header || '').trim().toLowerCase();
        const known: Record<string, string> = {
          'school name': 'school_name', udise: 'udise', country: 'country', state: 'state', district: 'district', city: 'city',
          'organization phone': 'organization_phone', phone: 'organization_phone', 'contact 1 name': 'contact_1_name', 'contact 1 phone': 'contact_1_phone',
        };
        if (known[label]) columns[String(index)] = known[label];
      });
      if (!Object.values(columns).includes('school_name')) columns['0'] = 'school_name';
      await crmService.saveImportMapping(batch.id, { columns, header_row: 1, defaults: { country_code: 'IN', create_enquiry: true } });
      await crmService.queueImportPreview(batch.id);
      setStep(2);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const review = async () => {
    if (!batch) return;
    setBusy(true);
    try {
      let current = await refresh(batch.id);
      for (let i = 0; i < 10 && !['PREVIEW_READY', 'FAILED'].includes(current.status); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        current = await refresh(batch.id);
      }
      if (current.coverage && current.coverage.complete === false) setError('Customer check is incomplete. New schools stay blocked until every cluster refresh is fresh.');
      setStep(3);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!batch?.preview_hash) return;
    setBusy(true);
    setError(null);
    try {
      await crmService.confirmImport(batch.id, {
        expected_version: batch.row_version,
        preview_revision: batch.preview_revision,
        preview_hash: batch.preview_hash,
        idempotency_key: `import-${batch.id}`,
        accept_new: true,
        import_valid_only: false,
      });
      let current = await refresh(batch.id);
      for (let i = 0; i < 12 && !['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(current.status); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        current = await refresh(batch.id);
      }
      setStep(4);
    } catch (err) {
      fail(err);
      await refresh(batch.id).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const counts = batch?.counts || {};
  return (
    <ConsoleAmbientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomTabPad }}>
        <ScreenHeader title="Import Schools" subtitle="Preview never writes accounts" showBack />
        <GlassCard>
          <Text style={{ color: colors.textSecondary }}>{template?.guidance || 'CSV up to 25 MiB. XLSX up to 10 MiB compressed.'}</Text>
          <Text style={{ color: colors.textTertiary, marginTop: 6 }}>{template?.features?.importExecute ? 'Execution is enabled.' : 'Execution is disabled until CRM_FEATURE_IMPORT_EXECUTE is turned on.'}</Text>
        </GlassCard>
        <View style={styles.steps}>
          {STEPS.map((label, index) => (
            <Text key={label} style={{ color: index === step ? colors.primary : colors.textTertiary, minWidth: 64 }}>{label}</Text>
          ))}
        </View>
        {error ? <GlassCard variant="lightweight"><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text></GlassCard> : null}
        {busy ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
        {step === 0 ? <Button title="Choose CSV or XLSX" onPress={upload} /> : null}
        {step === 1 ? <Button title="Use suggested mapping" onPress={mapSuggested} /> : null}
        {step === 2 ? <Button title="Load review" onPress={review} /> : null}
        {step >= 2 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <GlassCard variant="lightweight">
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Rows {counts.rows || 0} · Schools {counts.school_groups || 0}</Text>
              <Text style={{ color: colors.importNew }}>New {counts.new || 0}</Text>
              <Text style={{ color: colors.importExact }}>Exact {counts.exact_duplicate || 0}</Text>
              <Text style={{ color: colors.importPossible }}>Possible {counts.possible_duplicate || 0} · Check incomplete {counts.check_incomplete || 0}</Text>
              <Text style={{ color: colors.importConflict }}>Conflict {counts.conflict || 0} · Invalid {counts.invalid || 0}</Text>
              <Text style={{ color: colors.textSecondary }}>Confirmed customers {counts.confirmed_customer || 0}</Text>
            </GlassCard>
            {rows.map((row) => (
              <View key={row.id} style={[styles.row, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Row {row.row_number} · {row.normalized?.school_name || 'Unmapped'}</Text>
                <Text style={{ color: colors.textSecondary }}>{row.classification} · {row.customer_status}</Text>
                <Text style={{ color: colors.textTertiary }}>{(row.candidates || []).map((item) => item.code || item.rule).join(', ') || 'No match evidence'}</Text>
                {row.classification === 'POSSIBLE_DUPLICATE' ? (
                  <Pressable accessibilityRole="button" style={styles.action} onPress={() => crmService.saveImportDecisions(batch!.id, { expected_version: batch!.row_version, decisions: [{ row_id: row.id, action: 'SKIP', reason: 'Needs review' }] }).then(() => refresh(batch!.id)).catch(fail)}>
                    <Text style={{ color: colors.primary }}>Skip this possible duplicate</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        {step === 3 ? <View style={{ marginTop: 12 }}><Button title="Confirm new schools" onPress={confirm} /></View> : null}
        {step === 4 ? <GlassCard variant="lightweight"><Text style={{ color: colors.textPrimary }}>Status {batch?.status}. Schools created {counts.schools_created || 0}. Contacts added {counts.contacts_added || 0}. Skipped {counts.skipped || 0}. Blocked {counts.blocked || 0}. Failed {counts.failed || 0}.</Text></GlassCard> : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 12, gap: 4 },
  action: { minHeight: 44, justifyContent: 'center' },
});
