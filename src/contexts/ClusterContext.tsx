import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClusterConfig } from '../config/clusters';
import { setGlobalBackendUrl } from '../api/superAdminClient';
import { clearTokens, setTokenClusterPrefix } from '../api/tokens';
import { loadClusters, invalidateClusterCache } from '../services/clusterConfigService';

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexsyrus_selected_cluster';

// ── Context shape ────────────────────────────────────────────────────────────

interface ClusterContextValue {
  /** All clusters whose status is 'active'. */
  clusters: ClusterConfig[];
  /** The currently selected cluster (null only during initial load). */
  selectedCluster: ClusterConfig | null;
  /** Select a cluster — clears auth if switching to a different one. */
  setSelectedCluster: (cluster: ClusterConfig) => Promise<void>;
  
  /** 
   * Refresh clusters list from the server.
   * CONTRACT: Must be called by screens after successful createCluster or updateCluster 
   * to ensure the global cluster state is synchronized.
   */
  refreshClusters: () => Promise<void>;
  
  /** False until the persisted cluster has been read from AsyncStorage. */
  isClusterReady: boolean;
}

const ClusterContext = createContext<ClusterContextValue>({
  clusters: [],
  selectedCluster: null,
  setSelectedCluster: async () => {},
  refreshClusters: async () => {},
  isClusterReady: false,
});

// ── Provider ─────────────────────────────────────────────────────────────────

export function ClusterProvider({ children }: { children: React.ReactNode }) {
  const [activeClusters, setActiveClusters] = useState<ClusterConfig[]>([]);
  const [selectedCluster, setCluster] = useState<ClusterConfig | null>(null);
  const [isClusterReady, setIsClusterReady] = useState(false);

  /** Ref to track initial load vs. user-driven cluster switch. */
  const isInitialLoad = useRef(true);

  /**
   * Apply a cluster: update the Axios base URL, set token namespace,
   * and update React state.
   */
  const applyCluster = useCallback((cluster: ClusterConfig) => {
    const backendUrl = cluster.school_db.backend_url;
    if (!backendUrl) {
      throw new Error(
        `[ClusterContext] backend_url is empty for cluster "${cluster.cluster_id}". ` +
        'Ensure EXPO_PUBLIC_SUPERADMIN_API_URL is set in .env and restart Expo.',
      );
    }
    setGlobalBackendUrl(backendUrl);
    setTokenClusterPrefix(cluster.cluster_id);
    setCluster(cluster);
  }, []);

  // Load remote clusters and restore persisted cluster on mount
  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadClusters();
        const activeOnly = loaded.filter(c => c.status === 'active');
        setActiveClusters(activeOnly);

        const persistedId = await AsyncStorage.getItem(STORAGE_KEY);
        const found = activeOnly.find((c) => c.cluster_id === persistedId);
        const resolved = found || activeOnly[0] || null;
        if (resolved) {
          applyCluster(resolved);
        }
      } catch (err) {
        // If everything fails, it's a critical error (shouldn't happen since loadClusters has a fallback)
        console.error('[ClusterContext] Failed to initialize clusters:', err);
      } finally {
        isInitialLoad.current = false;
        setIsClusterReady(true);
      }
    })();
  }, [applyCluster]);

  const refreshClusters = useCallback(async () => {
    try {
      await invalidateClusterCache();
      const loaded = await loadClusters();
      setActiveClusters(loaded.filter(c => c.status === 'active'));
    } catch (err) {
      console.error('[ClusterContext] Failed to refresh clusters:', err);
    }
  }, []);

  /**
   * Public setter — called by ClusterSelector screen.
   * Clears auth tokens when switching to a *different* cluster.
   */
  const setSelectedCluster = useCallback(
    async (cluster: ClusterConfig) => {
      // If switching cluster (not re-selecting current), clear auth
      if (selectedCluster && selectedCluster.cluster_id !== cluster.cluster_id) {
        await clearTokens();
      }
      await AsyncStorage.setItem(STORAGE_KEY, cluster.cluster_id);
      applyCluster(cluster);
    },
    [selectedCluster, applyCluster],
  );

  const value = useMemo<ClusterContextValue>(
    () => ({
      clusters: activeClusters,
      selectedCluster,
      setSelectedCluster,
      refreshClusters,
      isClusterReady,
    }),
    [activeClusters, selectedCluster, setSelectedCluster, refreshClusters, isClusterReady],
  );

  return (
    <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCluster(): ClusterContextValue {
  return useContext(ClusterContext);
}
