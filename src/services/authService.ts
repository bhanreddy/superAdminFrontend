import { superAdminClient } from '../api/superAdminClient';
import { storeTokens, clearTokens, getStoredAccessToken } from './apiService';
import { SuperAdmin } from '../types/superAdmin';
import { FounderRow } from '../types/founder';

export interface LoginResult {
  user: { id: string; email: string; user_metadata?: any } | null;
  session: { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number } | null;
  isSuperAdmin: boolean;
  admin: SuperAdmin | null;
  founder: FounderRow | null;
  error: { message: string } | null;
}

/** Coerce API / Axios / Supabase error payloads into a renderable string. */
function toErrorMessage(value: unknown, fallback = 'Login failed'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error.trim();
    if (typeof obj.details === 'string' && obj.details.trim()) return obj.details.trim();
    if (obj.error != null && obj.error !== obj) return toErrorMessage(obj.error, fallback);
  }
  return fallback;
}

export const authService = {
  /** Sign in via the backend (server-side Supabase auth) */
  async signIn(email: string, password: string): Promise<LoginResult> {
    try {
      const response = await superAdminClient.post('/api/super-admin/auth/login', { email, password });
      const data = response.data;

      if (data.session) {
        await storeTokens(data.session.access_token, data.session.refresh_token);
      }

      return {
        user: data.user || null,
        session: data.session || null,
        isSuperAdmin: data.isSuperAdmin ?? false,
        admin: data.admin || null,
        founder: data.founder || null,
        error: null,
      };
    } catch (err: any) {
      const payload = err.response?.data;
      const msg = toErrorMessage(
        payload?.error ?? payload?.message ?? payload ?? err.message,
        'Login failed',
      );
      return {
        user: null,
        session: null,
        isSuperAdmin: false,
        admin: null,
        founder: null,
        error: { message: msg },
      };
    }
  },

  /** Sign out — clear local tokens */
  async signOut(): Promise<void> {
    await clearTokens();
  },

  /** Check if we have a stored session (token exists) */
  async getSession(): Promise<{ access_token: string } | null> {
    const token = await getStoredAccessToken();
    if (!token) return null;
    return { access_token: token };
  },

  /** Verify if the current user is a super admin and get admin+founder info */
  async isSuperAdmin(
    _userId: string,
    _jwt: string,
  ): Promise<{ isSuperAdmin: boolean; admin: SuperAdmin | null }> {
    try {
      const response = await superAdminClient.get('/api/super-admin/verify');
      return {
        isSuperAdmin: response.data.isSuperAdmin === true,
        admin: response.data.admin || null,
      };
    } catch {
      return { isSuperAdmin: false, admin: null };
    }
  },

  /** Fetch founder row from the backend */
  async fetchFounderByUserId(_userId: string): Promise<FounderRow | null> {
    try {
      const response = await superAdminClient.get('/api/super-admin/auth/me');
      return response.data.founder || null;
    } catch {
      return null;
    }
  },

  /** No-op — token refresh is handled by the school HTTP client 401 interceptor */
  async refreshSession(): Promise<{ access_token: string } | null> {
    const token = await getStoredAccessToken();
    return token ? { access_token: token } : null;
  },

  /** Change current user's password via the backend */
  async changePassword(newPassword: string): Promise<void> {
    await superAdminClient.post('/api/super-admin/auth/change-password', { newPassword });
  },
};
