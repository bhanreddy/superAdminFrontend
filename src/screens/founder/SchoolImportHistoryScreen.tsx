import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { crmService } from '../../services/crmService';
import type { ImportBatch } from '../../types/crm';
import { ConsoleAmbientBackground, GlassCard, bottomTabPad } from './founderUi';

const HistoryRow = React.memo(function HistoryRow({ item, onPress }: { item: ImportBatch; onPress: (id: string) => void }) {
  const { colors } = useTheme();
  const counts = item.counts || {};
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item.id)} style={({ pressed }) => [styles.row, { borderColor: colors.glassBorder, backgroundColor: colors.glassLightweight, opacity: pressed ? 0.84 : 1 }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{item.original_filename || 'Import'}</Text>
      <Text style={{ color: colors.textSecondary }}>{item.status} · {counts.school_groups || 0} schools · {counts.rows || 0} rows</Text>
      {item.coverage && item.coverage.complete === false ? <Text style={{ color: colors.importConflict }}>Customer check incomplete</Text> : null}
    </Pressable>
  );
});

export default function SchoolImportHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<ImportBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setRows((await crmService.listImports()).data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Import history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Import History" subtitle="Reload a batch to resume review" showBack />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <GlassCard variant="lightweight"><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text></GlassCard> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomTabPad, gap: 8 }}
        ListEmptyComponent={!loading ? <GlassCard variant="lightweight"><Text style={{ color: colors.textSecondary }}>No imports in this scope.</Text></GlassCard> : null}
        renderItem={({ item }) => <HistoryRow item={item} onPress={(id) => router.push({ pathname: '/(app)/console/school-import', params: { batchId: id } } as never)} />}
      />
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, gap: 4 },
  title: { fontSize: 16, fontWeight: '700' },
});
