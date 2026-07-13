/**
 * Static cluster registry — Phase 1.
 *
 * Each cluster maps to ONE backend instance that serves both school and
 * medical verticals.  The `supabase_url` / `supabase_anon_key` fields are
 * metadata-only — the frontend never creates a Supabase client directly;
 * all calls are proxied through the Express backend.
 *
 * Adding Cluster B = appending one object to the CLUSTERS array.
 */

import { Platform } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VerticalDbConfig {
  /** Supabase project URL (metadata — frontend never uses directly) */
  supabase_url: string;
  /** Supabase anon key (metadata — frontend never uses directly) */
  supabase_anon_key: string;
  /** Express backend URL that the frontend Axios client actually hits */
  backend_url: string;
}

export interface ClusterConfig {
  cluster_id: string;
  label: string;
  status: 'active' | 'inactive';
  school_db: VerticalDbConfig;
  medical_db: VerticalDbConfig;
  max_schools?: number;
  school_count?: number;
  medical_count?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the primary backend URL from environment variables, applying the
 * same web-rewrite logic used by the rest of the app.
 */
function resolveEnvBackendUrl(): string {
  const primary = (process.env.EXPO_PUBLIC_SUPERADMIN_API_URL || '').trim();
  if (Platform.OS !== 'web') return primary.replace(/\/+$/, '');
  const webOverride = (process.env.EXPO_PUBLIC_SUPERADMIN_API_URL_WEB || '').trim();
  if (webOverride) return webOverride.replace(/\/+$/, '');
  return primary
    .replace(/10\.0\.2\.2/g, '127.0.0.1')
    .replace(/10\.0\.3\.2/g, '127.0.0.1')
    .replace(/\/+$/, '');
}

// ── Cluster Definitions ──────────────────────────────────────────────────────

const BACKEND_URL = resolveEnvBackendUrl();

/**
 * FALLBACK ONLY — source of truth is backend /api/super-admin/clusters
 * 
 * This static array is used as a last resort if the remote fetch fails 
 * and no cached configuration is available in AsyncStorage.
 */
export const CLUSTERS: ClusterConfig[] = [
  {
    cluster_id: 'cluster_a',
    label: 'Cluster A',
    status: 'active',
    school_db: {
      supabase_url: (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim(),
      supabase_anon_key: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
      backend_url: BACKEND_URL,
    },
    medical_db: {
      supabase_url: (process.env.EXPO_PUBLIC_MEDICAL_SUPABASE_URL || '').trim(),
      supabase_anon_key: (process.env.EXPO_PUBLIC_MEDICAL_SUPABASE_ANON_KEY || '').trim(),
      backend_url: BACKEND_URL,
    },
    max_schools: 40,
    school_count: 0,
  },
];

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns only clusters whose status is 'active'. */
export function getActiveClusters(): ClusterConfig[] {
  return CLUSTERS.filter((c) => c.status === 'active');
}
