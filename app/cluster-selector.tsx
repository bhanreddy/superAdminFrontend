import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Layers, Moon, RefreshCw, Server, Sun } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCluster } from '../src/contexts/ClusterContext';
import { useTheme } from '../src/contexts/ThemeContext';
import type { ClusterConfig } from '../src/config/clusters';
import { Button } from '../src/components/ui/Button';

export default function ClusterSelectorScreen() {
  const { clusters, selectedCluster, setSelectedCluster, refreshClusters } = useCluster();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('nexsyrus_clusters_cache_timestamp').then(value => {
      if (active && value && Number.isFinite(Date.parse(value))) setLastUpdated(new Date(value).toLocaleString());
    }).catch(() => {});
    return () => { active = false; };
  }, [clusters]);
  async function select(cluster: ClusterConfig) {
    if (selecting || cluster.status !== 'active') return;
    setSelecting(cluster.cluster_id); setError('');
    try { await setSelectedCluster(cluster); router.replace('/(auth)/login'); }
    catch { setError('Could not select this cluster. Please try again.'); }
    finally { setSelecting(null); }
  }
  async function refresh() {
    setRefreshing(true); setError('');
    try { await refreshClusters(); }
    catch { setError('Could not refresh clusters. Check your connection and retry.'); }
    finally { setRefreshing(false); }
  }
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <View style={styles.page}>
      <View style={styles.toolbar}>
        <View style={[styles.logo, { backgroundColor: colors.primaryMuted }]}><Layers color={colors.primary} size={28} /></View>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'} onPress={toggleTheme} style={styles.icon}>
          {isDark ? <Sun color={colors.textSecondary} size={22} /> : <Moon color={colors.textSecondary} size={22} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh clusters" accessibilityState={{ busy: refreshing, disabled: refreshing }} aria-busy={refreshing} disabled={refreshing} onPress={() => void refresh()} style={styles.icon}>
          {refreshing ? <ActivityIndicator color={colors.primary} /> : <RefreshCw color={colors.textSecondary} size={22} />}
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>Select a cluster</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose the workspace you want to manage.</Text>
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.error, lineHeight: 22 }}>{error}</Text>}
      {clusters.length ? clusters.map(cluster => {
        const selected = selectedCluster?.cluster_id === cluster.cluster_id;
        const busy = selecting === cluster.cluster_id;
        return <Pressable key={cluster.cluster_id} accessibilityRole="button" accessibilityLabel={`${cluster.label}, ${cluster.status}${selected ? ', selected' : ''}`} accessibilityState={{ selected, busy, disabled: Boolean(selecting) || cluster.status !== 'active' }} disabled={Boolean(selecting) || cluster.status !== 'active'} onPress={() => void select(cluster)} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 }]}>
          <Server size={24} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{cluster.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{cluster.cluster_id}</Text>
            <Text style={{ color: cluster.status === 'active' ? colors.success : colors.textSecondary, fontSize: 13 }}>{cluster.status === 'active' ? 'Active' : 'Inactive'}{cluster.school_count != null ? ` · ${cluster.school_count} schools` : ''}</Text>
          </View>
          {busy ? <ActivityIndicator color={colors.primary} /> : selected ? <CheckCircle2 size={24} color={colors.primary} /> : null}
        </Pressable>;
      }) : <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '600' }}>No clusters are available</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>Check your connection, then refresh the cluster list.</Text>
        <Button title="Refresh clusters" loading={refreshing} onPress={() => void refresh()} />
      </View>}
      {!!lastUpdated && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Last updated: {lastUpdated}</Text>}
      <Text style={{ color: colors.textTertiary, fontSize: 12 }}>NexSyrus SuperAdmin</Text>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { width: '100%', maxWidth: 600, gap: 20 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 24, borderWidth: 1, borderRadius: 16, minHeight: 112 },
  label: { fontSize: 18, fontWeight: '600' },
  empty: { padding: 24, borderWidth: 1, borderRadius: 16, gap: 18 },
});
