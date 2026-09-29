import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { ConsoleAmbientBackground, GlassCard, SkeletonActionList, bottomTabPad } from './founderUi';
import {
  INTAKE_STATUS,
  intakeErrorMessage,
  schoolIntakeApi,
  type IntakeStatus,
  type SchoolIntake,
} from '../../services/schoolIntakeService';
import { useToast } from '../../components/ui/Toast';

const FILTERS: { id: 'waiting' | 'returned' | 'done' | 'all'; label: string }[] = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'returned', label: 'Returned' },
  { id: 'done', label: 'Onboarded' },
  { id: 'all', label: 'All' },
];

function matches(item: SchoolIntake, filter: string) {
  if (filter === 'waiting') return item.status === 'SUBMITTED' || item.status === 'FAILED';
  if (filter === 'returned') return item.status === 'CHANGES_REQUESTED';
  if (filter === 'done') return item.status === 'ONBOARDED';
  return true;
}

export default function SchoolIntakeDeskScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<SchoolIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('waiting');

  const load = useCallback(async () => {
    try {
      setItems(await schoolIntakeApi.list());
    } catch (err) {
      showToast(intakeErrorMessage(err, 'Could not load the intake desk.'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => matches(item, filter)), [items, filter]);
  const waiting = items.filter((item) => item.status === 'SUBMITTED' || item.status === 'FAILED').length;

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="School intake" subtitle="You are the last check before a school exists" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <GlassCard variant="lightweight" style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={[styles.icon, { backgroundColor: 'rgba(10,132,255,0.12)' }]}>
              <ShieldCheck size={20} color="#0A84FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{waiting}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Dossiers waiting for you. Approval creates the school, assigns it, and provisions the admin.
              </Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={({ pressed }) => [
                  styles.filter,
                  { backgroundColor: active ? colors.primary : 'rgba(127,127,127,0.12)', transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text style={{ color: active ? '#FFF' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? <SkeletonActionList count={4} /> : null}
        {!loading && visible.length === 0 ? (
          <GlassCard variant="lightweight" style={styles.card}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>Queue is clear</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
              New school dossiers from sales executives will land here. Nothing is created until you approve it.
            </Text>
          </GlassCard>
        ) : null}
        {visible.map((item) => {
          const meta = INTAKE_STATUS[item.status as IntakeStatus] || INTAKE_STATUS.SUBMITTED;
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/(app)/console/school-intake/${item.id}` as any)}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}
            >
              <GlassCard variant="lightweight" style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                      {item.code} · {item.submitted_by_name || 'Sales executive'} · {item.score}%
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </View>
                <View style={[styles.pill, { backgroundColor: `${meta.color}22` }]}>
                  <Text style={{ color: meta.color, fontSize: 11, fontWeight: '800' }}>{meta.label}</Text>
                </View>
                {item.brief ? <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>{item.brief}</Text> : null}
              </GlassCard>
            </Pressable>
          );
        })}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  hero: { padding: 16 },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 36, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
