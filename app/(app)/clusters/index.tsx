import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { getAllClusters, updateClusterStatus, invalidateClusterCache } from '../../../src/services/clusterConfigService';
import type { ClusterConfig } from '../../../src/config/clusters';
import { Server, Edit2, ShieldAlert, CheckCircle2, Activity, Link as LinkIcon, Store } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { pressableWebStyles } from '../../../src/utils/webPressable';
import { useCluster } from '../../../src/contexts/ClusterContext';

type ClusterWithHealth = ClusterConfig & {
  health?: { school_reachable: boolean; latency_ms: number; status: 'loading' | 'success' | 'error' };
};

export default function ClustersScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { selectedCluster, refreshClusters: refreshGlobalClusters } = useCluster();
  
  const [clusters, setClusters] = useState<ClusterWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllClusters();
      const withHealth = data.map(c => ({ ...c, health: { school_reachable: false, latency_ms: 0, status: 'loading' as const } }));
      setClusters(withHealth);
      
      // Fetch health asynchronously
      withHealth.forEach(async (cluster) => {
        try {
          const start = Date.now();
          const target = `${cluster.school_db.backend_url}/health`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 5000);
          
          const res = await fetch(target, { signal: controller.signal }).catch(() => null);
          clearTimeout(id);
          
          const latency_ms = Date.now() - start;
          const school_reachable = !!(res && res.ok);

          setClusters(prev => prev.map(p => 
            p.cluster_id === cluster.cluster_id 
              ? { ...p, health: { school_reachable, latency_ms, status: school_reachable ? 'success' : 'error' } } 
              : p
          ));
        } catch {
          setClusters(prev => prev.map(p => 
            p.cluster_id === cluster.cluster_id 
              ? { ...p, health: { school_reachable: false, latency_ms: 0, status: 'error' } } 
              : p
          ));
        }
      });

    } catch (err) {
      Alert.alert('Error', 'Failed to load clusters.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleStatus = async (cluster: ClusterWithHealth) => {
    if (cluster.cluster_id === selectedCluster?.cluster_id && cluster.status === 'active') {
      Alert.alert('Warning', 'You cannot deactivate the currently connected cluster.');
      return;
    }

    const newStatus = cluster.status === 'active' ? 'inactive' : 'active';
    
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Cluster?`,
      `Are you sure you want to ${newStatus} ${cluster.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: newStatus === 'active' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateClusterStatus(cluster.cluster_id, newStatus);
              await invalidateClusterCache();
              await refreshGlobalClusters(); // Update global context immediately
              onRefresh();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update status');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Cluster Management</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary }, ...pressableWebStyles(pressed)]}
          onPress={() => router.push('/(app)/clusters/add' as any)}
        >
          <Text style={styles.addBtnText}>+ Add Cluster</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {clusters.map(cluster => {
          const isActive = cluster.status === 'active';
          return (
            <LinearGradient
              key={cluster.cluster_id}
              colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : [colors.surface, colors.surface]}
              style={[styles.card, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleCol}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{cluster.label}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isActive ? `${colors.success}20` : `${colors.textSecondary}20` }]}>
                      <Text style={[styles.statusText, { color: isActive ? colors.success : colors.textSecondary }]}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardId, { color: colors.textSecondary }]}>{cluster.cluster_id}</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.background }, ...pressableWebStyles(pressed)]}
                    onPress={() => router.push(`/(app)/clusters/${cluster.cluster_id}/edit` as any)}
                  >
                    <Edit2 size={16} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, { backgroundColor: isActive ? `${colors.error}20` : `${colors.success}20` }, ...pressableWebStyles(pressed)]}
                    onPress={() => handleToggleStatus(cluster)}
                  >
                    <Activity size={16} color={isActive ? colors.error : colors.success} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.cardBody, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                <View style={styles.infoRow}>
                  <Server size={14} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {cluster.school_count || 0} / {cluster.max_schools || 40} schools
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Store size={14} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {cluster.medical_count || 0} / {cluster.max_schools || 40} medical shops
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <LinkIcon size={14} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {cluster.school_db.backend_url}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooter, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : colors.background }]}>
                <View style={styles.healthRow}>
                  {cluster.health?.status === 'loading' ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : cluster.health?.status === 'success' ? (
                    <>
                      <CheckCircle2 size={14} color={colors.success} />
                      <Text style={[styles.healthText, { color: colors.success }]}>Online ({cluster.health.latency_ms}ms)</Text>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={14} color={colors.error} />
                      <Text style={[styles.healthText, { color: colors.error }]}>Unreachable</Text>
                    </>
                  )}
                </View>
              </View>
            </LinearGradient>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  content: { paddingVertical: 20, paddingHorizontal: 0, gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  cardTitleCol: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardId: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, flex: 1 },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthText: { fontSize: 12, fontWeight: '500' },
});
