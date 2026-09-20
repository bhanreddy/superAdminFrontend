import { superAdminClient } from '../api/superAdminClient';
import { storeTokens, clearTokens, getStoredAccessToken } from './apiService';
import { SuperAdmin } from '../types/superAdmin';
import { FounderRow } from '../types/founder';
import { InternalUser, Session, User } from '../types/auth';
import { Role } from '../constants/rbac';

export interface LoginResult {
  user: User | null;
  session: Session | null;
  internalUser: InternalUser | null;
  role: Role | null;
  employeeId: string | null;
  permissions: string[];
  assignedSchools: number[];
  status: string | null;
  isSuperAdmin: boolean;
  admin: SuperAdmin | null;
  founder: FounderRow | null;
  error: { message: string } | null;
}

export interface ProfileResult {
  user: any;
  role: Role;
  permissions: string[];
  assignedSchools: number[];
  isSuperAdmin: boolean;
  admin: SuperAdmin | null;
  founder: FounderRow | null;
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
  /**
   * Sign in via the backend with Email, Phone, or Employee ID.
   */
  async signIn(identifier: string, password: string): Promise<LoginResult> {
    try {
      const response = await superAdminClient.post('/api/super-admin/auth/login', {
        identifier,
        email: identifier, // backwards compatibility
        password,
      });
      const data = response.data;

      if (data.session) {
        await storeTokens(data.session.access_token, data.session.refresh_token);
      }

      const userData = data.user || null;
      const role = (data.role || userData?.role || null) as Role | null;
      const employeeId = userData?.employee_id || userData?.employeeId || null;
      const permissions = Array.isArray(data.permissions) ? data.permissions : [];
      const assignedSchools = Array.isArray(data.assignedSchools) ? data.assignedSchools : [];

      return {
        user: userData,
        session: data.session || null,
        internalUser: userData,
        role,
        employeeId,
        permissions,
        assignedSchools,
        status: userData?.status || 'ACTIVE',
        isSuperAdmin: Boolean(data.isSuperAdmin),
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
        internalUser: null,
        role: null,
        employeeId: null,
        permissions: [],
        assignedSchools: [],
        status: null,
        isSuperAdmin: false,
        admin: null,
        founder: null,
        error: { message: msg },
      };
    }
  },

  /** Sign out — clear local tokens and notify backend */
  async signOut(): Promise<void> {
    try {
      await superAdminClient.post('/api/super-admin/auth/logout');
    } catch {
      // ignore
    } finally {
      await clearTokens();
    }
  },

  /** Check if we have a stored session (token exists) */
  async getSession(): Promise<{ access_token: string } | null> {
    const token = await getStoredAccessToken();
    if (!token) return null;
    return { access_token: token };
  },

  /** Fetch current authenticated profile & effective permissions from the backend */
  async getProfile(): Promise<ProfileResult | null> {
    try {
      const response = await superAdminClient.get('/api/super-admin/auth/me');
      return response.data;
    } catch {
      return null;
    }
  },

  /** Legacy helper */
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

  /** Token refresh */
  async refreshSession(): Promise<{ access_token: string } | null> {
    const token = await getStoredAccessToken();
    return token ? { access_token: token } : null;
  },

  /** Change current user's password via the backend */
  async changePassword(newPassword: string): Promise<void> {
    await superAdminClient.post('/api/super-admin/auth/change-password', { newPassword });
  },
};
