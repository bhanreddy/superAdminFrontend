import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { crmService } from '../../services/crmService';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

export default function SchoolProspectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { colors } = useTheme();
  const [bundle, setBundle] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    try {
      setBundle(await crmService.getProspect(accountId));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'This school is not in your scope.');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  React.useEffect(() => { load(); }, [load]);

  const account = bundle?.account;
  return (
    <ConsoleAmbientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomTabPad }}>
        <ScreenHeader title={account?.name || 'School prospect'} subtitle="Profile, contacts, and pipeline" showBack />
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <GlassCard variant="lightweight"><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text></GlassCard> : null}
        {notice ? <GlassCard variant="lightweight"><Text style={{ color: colors.success }}>{notice}</Text></GlassCard> : null}
        {account ? (
          <>
            <GlassCard>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{account.lifecycle_stage} · {account.account_type}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{bundle.profile_channel === 'no_contact_channel' ? 'No contact channel' : 'Contact channel on file'}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{bundle.pipeline === 'not_in_pipeline' ? 'Not yet in sales pipeline' : 'In the sales pipeline'}</Text>
              <Text style={{ color: colors.textTertiary, marginTop: 8 }}>UDISE {account.udise_code || 'not provided'} · version {account.row_version}</Text>
              {account.external_client_id ? <Text style={{ color: colors.importExact, marginTop: 8 }}>Linked tenant {account.cluster_id} / {account.external_client_id}. Onboarding status stays separate from the sales stage.</Text> : null}
            </GlassCard>
            <Text style={[styles.section, { color: colors.textPrimary }]}>Decision makers and contacts</Text>
            {(bundle.contacts || []).map((contact: any) => (
              <View key={contact.id} style={[styles.contact, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{contact.full_name || 'Name unknown'}</Text>
                <Text style={{ color: colors.textSecondary }}>{contact.role_title || contact.role_code || 'Role not set'}{contact.is_decision_maker ? ' · Decision maker' : ''}{contact.is_primary ? ' · Primary contact' : ''}</Text>
                <Text style={{ color: colors.textTertiary }}>{contact.phone || 'No phone'} · {contact.email || 'No email'}{contact.do_not_contact ? ' · Do not contact' : ''}</Text>
              </View>
            ))}
            {!bundle.contacts?.length ? <GlassCard variant="lightweight"><Text style={{ color: colors.textSecondary }}>No person has been added. A follow-up task can still be created once it has an owner and a due date.</Text></GlassCard> : null}
            <View style={styles.actions}>
              <Button title="Capture feedback" variant="secondary" style={{ marginBottom: 8 }} onPress={() => router.push(`/(app)/console/field-feedback?capture=1&source_type=account&source_id=${account.id}&account_id=${account.id}&customer_label=${encodeURIComponent(account.name || '')}&context_kind=visit` as never)} />
              <Button title="Create enquiry" onPress={async () => {
                try {
                  await crmService.linkProspectEnquiry(account.id, {});
                  setNotice('Enquiry linked.');
                  await load();
                } catch (err: any) {
                  setError(err?.response?.data?.error || 'Enquiry was not created.');
                }
              }} />
            </View>
            {(bundle.enquiries || []).map((enquiry: any) => (
              <Pressable
                key={enquiry.id}
                accessibilityRole="button"
                accessibilityLabel={`Open enquiry ${enquiry.name || enquiry.pipeline_stage_code || ''}`}
                onPress={() => router.push(`/(app)/console/lead/${enquiry.id}` as never)}
                style={({ pressed }) => [styles.contact, { borderColor: colors.glassBorder, opacity: pressed ? 0.84 : 1, minHeight: 44 }]}
              >
                <Text style={{ color: colors.textPrimary }}>{enquiry.name || 'Enquiry'} · {enquiry.pipeline_stage_code} · {enquiry.outcome}</Text>
              </Pressable>
            ))}
            {bundle.restricted_enquiries ? <Text style={{ color: colors.textSecondary }}>Some linked enquiries belong to another owner and are hidden.</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 18, fontWeight: '700', marginTop: 22, marginBottom: 8 },
  contact: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, marginBottom: 8, gap: 4 },
  actions: { marginVertical: 12 },
});
