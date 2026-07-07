import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLUSTERS, ClusterConfig } from '../config/clusters';
import { superAdminClient } from '../api/superAdminClient';

const CACHE_KEY = 'nexsyrus_clusters_cache';
const CACHE_TIMESTAMP_KEY = 'nexsyrus_clusters_cache_timestamp';

// 5 seconds timeout for fetching remote clusters
const FETCH_TIMEOUT_MS = 5000;

export async function fetchRemoteClusters(): Promise<ClusterConfig[]> {
  const backendUrl = CLUSTERS[0].school_db.backend_url; // Use static fallback as the entry point
  if (!backendUrl) {
    throw new Error('No backend URL available to fetch clusters.');
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${backendUrl}/api/super-admin/clusters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`Failed to fetch clusters: ${response.status} ${response.statusText}`);
    }

    const data: ClusterConfig[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Fetched clusters data is empty or invalid.');
    }

    // Save to cache
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());

    return data;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function getCachedClusters(): Promise<ClusterConfig[] | null> {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const data: ClusterConfig[] = JSON.parse(cachedData);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (error) {
    console.warn('[clusterConfigService] Failed to parse cached clusters:', error);
  }
  return null;
}

export async function loadClusters(): Promise<ClusterConfig[]> {
  try {
    const remoteClusters = await fetchRemoteClusters();
    console.log('[clusterConfigService] Loaded clusters from remote source.');
    return remoteClusters;
  } catch (error) {
    console.warn('[clusterConfigService] Failed to fetch remote clusters, trying cache...', error);
    
    const cachedClusters = await getCachedClusters();
    if (cachedClusters) {
      console.log('[clusterConfigService] Loaded clusters from cache.');
      return cachedClusters;
    }

    console.warn('[clusterConfigService] Using static cluster config — no cache available.');
    return CLUSTERS;
  }
}

export async function invalidateClusterCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('[clusterConfigService] Failed to invalidate cluster cache:', error);
  }
}

// ── Management Functions ─────────────────────────────────────────────────────

export type NewClusterInput = {
  cluster_id: string;
  label: string;
  school_backend_url: string;
  medical_backend_url: string;
  school_supabase_url?: string;
  medical_supabase_url?: string;
  school_anon_key?: string;
  medical_anon_key?: string;
  school_service_role_key: string;
  medical_service_role_key: string;
  max_schools?: number;
};

export async function createCluster(data: NewClusterInput): Promise<ClusterConfig> {
  const response = await superAdminClient.post('/api/super-admin/clusters', data);
  return response.data;
}

export async function updateCluster(cluster_id: string, data: Partial<ClusterConfig> & { school_service_role_key?: string; medical_service_role_key?: string; }): Promise<ClusterConfig> {
  const response = await superAdminClient.patch(`/api/super-admin/clusters/${cluster_id}`, data);
  return response.data;
}

export async function updateClusterStatus(cluster_id: string, status: 'active' | 'inactive'): Promise<ClusterConfig> {
  const response = await superAdminClient.patch(`/api/super-admin/clusters/${cluster_id}/status`, { status });
  return response.data;
}

export async function validateClusterUrls(school_backend_url: string, medical_backend_url: string): Promise<{ school_reachable: boolean, medical_reachable: boolean, latency_ms: number }> {
  const response = await superAdminClient.post('/api/super-admin/clusters/validate', {
    school_backend_url,
    medical_backend_url
  });
  return response.data;
}

export async function getAllClusters(): Promise<ClusterConfig[]> {
  const response = await superAdminClient.get('/api/super-admin/clusters?all=true');
  return response.data;
}
