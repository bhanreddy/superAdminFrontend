import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { crmService } from '../../services/crmService';
import type { SchoolProspect } from '../../types/crm';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

const ProspectRow = React.memo(function ProspectRow({ item, onPress }: { item: SchoolProspect; onPress: (id: string) => void }) {
  const { colors } = useTheme();
  const channel = item.has_contact ? 'Has a contact' : 'No contact channel';
  const pipeline = item.sales_stage ? item.sales_stage : 'Not yet in sales pipeline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.row, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight, opacity: pressed ? 0.82 : 1, minHeight: 72 }]}
    >
      <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {item.udise_code || 'No UDISE'} · {item.city_normalized || item.state_normalized || 'Location incomplete'}
      </Text>
      <Text style={[styles.meta, { color: item.has_contact ? colors.importExact : colors.importPossible }]}>{channel} · {pipeline}</Text>
    </Pressable>
  );
});

export default function SchoolProspectsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ without_enquiry?: string; owner?: string }>();
  const withoutEnquiry = (Array.isArray(params.without_enquiry) ? params.without_enquiry[0] : params.without_enquiry) === 'true';
  const owner = Array.isArray(params.owner) ? params.owner[0] : params.owner;
  const [rows, setRows] = useState<SchoolProspect[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next?: string | null) => {
    setError(null);
    try {
      const page = await crmService.listProspects({
        search: search || undefined,
        missing_contact: missing ? 'true' : undefined,
        without_enquiry: withoutEnquiry ? 'true' : undefined,
        owner: owner || undefined,
        cursor: next || undefined,
        limit: 30,
      });
      setRows((current) => next ? [...current, ...page.data] : page.data);
      setCursor(page.page.next_cursor);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Prospects could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [missing, search, withoutEnquiry, owner]);

  React.useEffect(() => { setLoading(true); load(null); }, [load]);

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="School Prospects" subtitle="Directory search stays on the server" showBack />
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, UDISE, phone, or email"
          placeholderTextColor={colors.textTertiary}
          style={[styles.search, { color: colors.textPrimary, borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight }]}
          accessibilityLabel="Search prospects"
        />
        <Pressable accessibilityRole="button" onPress={() => setMissing((value) => !value)} style={[styles.chip, { minHeight: 44, borderColor: colors.glassBorder }]}>
          <Text style={{ color: missing ? colors.importPossible : colors.textSecondary }}>{missing ? 'Missing contact' : 'All schools'}</Text>
        </Pressable>
      </View>
      {error ? <GlassCard variant="lightweight"><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text></GlassCard> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(null)} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: bottomTabPad, gap: 8 }}
          onEndReached={() => { if (cursor) load(cursor); }}
          ListEmptyComponent={<GlassCard variant="lightweight"><Text style={{ color: colors.textSecondary }}>No school prospects in this scope.</Text></GlassCard>}
          renderItem={({ item }) => <ProspectRow item={item} onPress={(id) => router.push(`/(app)/console/school-prospects/${id}` as never)} />}
        />
      )}
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  toolbar: { gap: 8, marginBottom: 12 },
  search: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 14 },
  chip: { alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14 },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, gap: 4 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
});
