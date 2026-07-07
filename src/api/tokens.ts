import { Platform } from 'react-native';

let _TokenStore: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

if (Platform.OS === 'web') {
  _TokenStore = {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => {
      localStorage.setItem(key, value);
    },
    removeItem: async (key) => {
      localStorage.removeItem(key);
    },
  };
} else {
  const SecureStore = require('expo-secure-store');
  _TokenStore = {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

export const TokenStore = _TokenStore;

// ── Cluster-namespaced token keys ────────────────────────────────────────────

/** Current cluster prefix — set by ClusterContext on cluster selection. */
let _clusterIdPrefix = '';

/**
 * Set the cluster prefix used to namespace token storage keys.
 * Must be called before any token read/write after a cluster switch.
 */
export function setTokenClusterPrefix(clusterId: string): void {
  _clusterIdPrefix = clusterId;
}

/** Backward-compatible key: uses namespaced key when prefix is set. */
function accessKey(): string {
  return _clusterIdPrefix
    ? `nexsyrus_${_clusterIdPrefix}_access_token`
    : 'superadmin_access_token';
}

function refreshKey(): string {
  return _clusterIdPrefix
    ? `nexsyrus_${_clusterIdPrefix}_refresh_token`
    : 'superadmin_refresh_token';
}

export async function getStoredAccessToken(): Promise<string | null> {
  return TokenStore.getItem(accessKey());
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return TokenStore.getItem(refreshKey());
}

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await TokenStore.setItem(accessKey(), accessToken);
  await TokenStore.setItem(refreshKey(), refreshToken);
}

export async function clearTokens(): Promise<void> {
  await TokenStore.removeItem(accessKey());
  await TokenStore.removeItem(refreshKey());
}
