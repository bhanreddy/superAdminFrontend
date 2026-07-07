import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Layers,
  CheckCircle2,
  ChevronRight,
  Server,
  RefreshCw,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCluster } from '../src/contexts/ClusterContext';
import { theme } from '../src/constants/theme';
import type { ClusterConfig } from '../src/config/clusters';

// ── Cluster Card ─────────────────────────────────────────────────────────────

function ClusterCard({
  cluster,
  isSelected,
  onPress,
}: {
  cluster: ClusterConfig;
  isSelected: boolean;
  onPress: () => void;
}) {
  const accentColor = cluster.status === 'active' ? '#34D399' : '#6B7280';
  const borderColor = isSelected ? theme.colors.primary : `${accentColor}40`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        st.cardPressable,
        {
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        Platform.OS === 'web'
          ? ({
              cursor: 'pointer',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
            } as any)
          : {},
      ]}
    >
      <LinearGradient
        colors={
          isSelected
            ? [`${theme.colors.primary}28`, `${theme.colors.primary}08`]
            : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.card, { borderColor }]}
      >
        {/* Top accent line */}
        <LinearGradient
          colors={[accentColor, `${accentColor}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={st.cardAccentLine}
        />

        <View style={st.cardHeader}>
          <View
            style={[
              st.cardIconWrap,
              {
                backgroundColor: `${accentColor}22`,
                shadowColor: accentColor,
                shadowOpacity: 0.6,
                shadowRadius: 10,
              },
            ]}
          >
            <Server size={22} color={accentColor} strokeWidth={1.8} />
          </View>

          <View style={st.cardTitleCol}>
            <Text style={st.cardLabel}>{cluster.label}</Text>
            <Text style={st.cardId}>{cluster.cluster_id}</Text>
          </View>

          {isSelected ? (
            <View
              style={[
                st.selectedBadge,
                {
                  backgroundColor: `${theme.colors.primary}22`,
                  borderColor: `${theme.colors.primary}50`,
                },
              ]}
            >
              <CheckCircle2
                size={14}
                color={theme.colors.primary}
                strokeWidth={2.5}
              />
              <Text style={[st.selectedText, { color: theme.colors.primary }]}>
                Selected
              </Text>
            </View>
          ) : (
            <View
              style={[
                st.selectArrow,
                {
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}30`,
                },
              ]}
            >
              <ChevronRight size={16} color={accentColor} strokeWidth={2.5} />
            </View>
          )}
        </View>

        {/* Status badge */}
        <View style={st.cardFooter}>
          <View
            style={[
              st.statusDot,
              {
                backgroundColor: accentColor,
                shadowColor: accentColor,
                shadowOpacity: 0.8,
                shadowRadius: 4,
              },
            ]}
          />
          <Text style={st.statusText}>
            {cluster.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ClusterSelectorScreen() {
  const { clusters, selectedCluster, setSelectedCluster, refreshClusters } = useCluster();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('nexsyrus_clusters_cache_timestamp').then(val => {
      if (val) {
        const date = new Date(val);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
          setLastUpdated('Just now');
        } else if (diffMins < 60) {
          setLastUpdated(`${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`);
        } else {
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24) {
            setLastUpdated(`${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`);
          } else {
            setLastUpdated(date.toLocaleDateString());
          }
        }
      }
    });
  }, [clusters]);

  const handleSelect = async (cluster: ClusterConfig) => {
    await setSelectedCluster(cluster);
    router.replace('/(auth)/login');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshClusters();
    setIsRefreshing(false);
  };

  return (
    <View style={st.root}>
      <LinearGradient
        colors={['#06060F', '#0D1126', '#0A0A18']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow */}
      <View style={st.glowOrb1} />
      <View style={st.glowOrb2} />

      <ScrollView
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={st.header}>
          <Pressable
            onPress={handleRefresh}
            disabled={isRefreshing}
            style={({ pressed, hovered }: any) => [
              st.refreshBtn,
              { opacity: pressed || isRefreshing ? 0.7 : 1, backgroundColor: hovered ? 'rgba(255,255,255,0.05)' : 'transparent' }
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <RefreshCw size={20} color={theme.colors.primary} />
            )}
          </Pressable>

          <View style={st.logoIconWrap}>
            <Layers size={28} color={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={st.title}>Select Cluster</Text>
          <Text style={st.subtitle}>
            Choose which cluster to manage
          </Text>

          {/* Decorative line */}
          <LinearGradient
            colors={['transparent', `${theme.colors.primary}60`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={st.decorLine}
          />
        </View>

        {/* Cluster list */}
        <View style={st.list}>
          {clusters.length === 0 ? (
            <View style={st.emptyState}>
              <Text style={st.emptyText}>Unable to load clusters. Check your connection.</Text>
              <Pressable style={st.retryBtn} onPress={handleRefresh}>
                <Text style={st.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            clusters.map((cluster) => (
              <ClusterCard
                key={cluster.cluster_id}
                cluster={cluster}
                isSelected={
                  selectedCluster?.cluster_id === cluster.cluster_id
                }
                onPress={() => handleSelect(cluster)}
              />
            ))
          )}
        </View>

        {lastUpdated && clusters.length > 0 && (
          <Text style={st.lastUpdatedText}>
            Last updated: {lastUpdated}
          </Text>
        )}

        <Text style={st.footerText}>
          NexSyrus · Cluster Architecture v1
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06060F',
  },
  glowOrb1: {
    position: 'absolute',
    top: '15%',
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(108, 99, 255, 0.06)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '10%',
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(52, 211, 153, 0.04)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `rgba(108, 99, 255, 0.12)`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6C63FF',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(153, 153, 187, 0.7)',
    marginTop: 6,
  },
  refreshBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  decorLine: {
    width: 120,
    height: 1,
    marginTop: 20,
  },

  // List
  list: {
    width: '100%',
    maxWidth: 440,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyText: {
    color: 'rgba(153,153,187,0.8)',
    fontSize: 14,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Card
  cardPressable: {},
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleCol: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardId: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(153, 153, 187, 0.6)',
    marginTop: 2,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(153, 153, 187, 0.6)',
  },

  // Footer
  lastUpdatedText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(153, 153, 187, 0.5)',
    marginTop: 24,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(153, 153, 187, 0.35)',
    marginTop: 16,
    letterSpacing: 0.5,
  },
});
