import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import * as founderDb from '../../services/founderSupabase';
import type { ActivityLogRow } from '../../types/founder';
import {
  ConsoleAmbientBackground,
  GlassCard,
  FilterChips,
  bottomTabPad,
} from './founderUi';

export default function AuditLogsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isSuperAdmin } = useAuth();
  const { isApprover } = useFounderAuth();
  const canViewAudit = isApprover || isSuperAdmin;
  const [entity, setEntity] = useState<string | 'ALL'>('ALL');
  const [action, setAction] = useState<string | 'ALL'>('ALL');
  const [all, setAll] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canViewAudit) {
      router.replace('/(app)/console' as never);
    }
  }, [canViewAudit, router]);

  const load = useCallback(async () => {
    if (!canViewAudit) return;
    setLoading(true);
    try {
      const list = await founderDb.listActivityLogs({
        entity_type: 'ALL',
        action: 'ALL',
      });
      setAll(list);
    } finally {
      setLoading(false);
    }
  }, [canViewAudit]);

  useEffect(() => {
    load();
  }, [load]);

  const entityOpts = useMemo(() => {
    const s = new Set<string>();
    all.forEach((r) => {
      if (r.entity_type) s.add(r.entity_type);
    });
    return Array.from(s).sort();
  }, [all]);

  const actionOpts = useMemo(() => {
    const s = new Set<string>();
    all.forEach((r) => {
      if (r.action) s.add(r.action);
    });
    return Array.from(s).sort();
  }, [all]);

  const rows = useMemo(
    () =>
      all.filter(
        (r) =>
          (entity === 'ALL' || r.entity_type === entity) &&
          (action === 'ALL' || r.action === action),
      ),
    [all, entity, action],
  );

  if (!canViewAudit) {
    return null;
  }

  const entityChips: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All entities' },
    ...entityOpts.map((k) => ({ key: k, label: k })),
  ];
  const actionChips: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All actions' },
    ...actionOpts.map((k) => ({ key: k, label: k })),
  ];

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Audit logs" subtitle="Activity trail" />
      <View style={styles.pad}>
        <Text style={[styles.h, { color: colors.textSecondary }]}>Entity</Text>
        <FilterChips<string> options={entityChips} value={entity} onChange={setEntity} />
        <Text style={[styles.h, { color: colors.textSecondary }]}>Action</Text>
        <FilterChips<string> options={actionChips} value={action} onChange={setAction} />

        {loading ? (
          <ActivityIndicator color="#7C6FFF" style={{ marginTop: 24 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomTabPad }}
          >
            {rows.map((r) => (
              <GlassCard key={r.id} style={{ marginBottom: 10 }}>
                <Text style={[styles.ent, { color: '#7C6FFF' }]}>
                  {r.entity_type} · {r.action}
                </Text>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {new Date(r.created_at).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.meta, { color: colors.textPrimary }]}>
                  Actor: {r.actor_id || '—'}
                </Text>
                {r.metadata ? (
                  <Text style={[styles.json, { color: colors.textSecondary }]} numberOfLines={4}>
                    {JSON.stringify(r.metadata)}
                  </Text>
                ) : null}
              </GlassCard>
            ))}
            {rows.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
                No log rows for filters.
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: 0, paddingTop: 8 },
  h: { fontSize: 11, fontWeight: '700', marginTop: 8, marginBottom: 6, textTransform: 'uppercase' },
  ent: { fontSize: 13, fontWeight: '800' },
  time: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  json: { fontSize: 11, marginTop: 8, fontFamily: 'monospace' },
});
