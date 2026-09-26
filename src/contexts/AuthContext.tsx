import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authService } from '../services/authService';
import { getStoredAccessToken, clearTokens } from '../services/apiService';
import { setAuthInvalidationHandler } from '../api/superAdminClient';
import { AuthState } from '../types/auth';
import {
  Role,
  ROLE_LABELS,
  isFounderOrSuperAdmin,
  isSalesRole,
  isImplementationRole,
  isSupportRole,
} from '../constants/rbac';
import { useCluster } from './ClusterContext';
import { setAnalyticsActor } from '../services/founderSupabase';
import { clearSalesCommandCache } from '../hooks/useSalesCommand';

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  currentAdmin: null,
  founder: null,
  internalUser: null,
  role: null,
  employeeId: null,
  permissions: [],
  assignedSchools: [],
  status: null,
};

const loggedOutState: AuthState = {
  user: null,
  session: null,
  loading: false,
  isSuperAdmin: false,
  currentAdmin: null,
  founder: null,
  internalUser: null,
  role: null,
  employeeId: null,
  permissions: [],
  assignedSchools: [],
  status: null,
};

export type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  refreshSessionProfile: () => Promise<void>;
  can: (permission: string) => boolean;
  canAccessSchool: (schoolId: number | string) => boolean;
  isFounder: boolean;
  isSales: boolean;
  isImplementation: boolean;
  isSupport: boolean;
  roleLabel: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { selectedCluster } = useCluster();
  const [state, setState] = useState<AuthState>(initialState);
  const mountedRef = useRef(true);

  /**
   * Validate an existing access token by calling the backend /auth/me
   * endpoint. Returns null when the token is invalid / expired or user deactivated.
   */
  const validateAndBuildState = useCallback(
    async (accessToken: string): Promise<AuthState | null> => {
      try {
        const profile = await authService.getProfile();
        if (!profile || !profile.user) {
          return null;
        }

        const rawUser = profile.user;
        const status = rawUser.status || 'ACTIVE';
        if (status !== 'ACTIVE') {
          return null;
        }

        const role = (profile.role || rawUser.role || null) as Role | null;
        if (!role) return null;
        const employeeId = rawUser.employeeId || rawUser.employee_id || null;
        const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
        const assignedSchools = Array.isArray(profile.assignedSchools) ? profile.assignedSchools : [];
        const isFounder = isFounderOrSuperAdmin(role);

        return {
          user: {
            id: rawUser.id,
            email: rawUser.email,
            user_metadata: { full_name: rawUser.fullName || rawUser.full_name },
          },
          session: {
            access_token: accessToken,
            user: rawUser,
          },
          loading: false,
          isSuperAdmin: isFounder,
          currentAdmin: profile.admin || {
            id: rawUser.id,
            email: rawUser.email,
            full_name: rawUser.fullName || rawUser.full_name,
            is_active: true,
          } as any,
          founder: profile.founder,
          internalUser: rawUser,
          role,
          employeeId,
          permissions,
          assignedSchools,
          status,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  /** Restore session from the locally stored JWT. Called on mount. */
  const restoreSession = useCallback(async () => {
    const token = await getStoredAccessToken();
    if (!token) {
      if (mountedRef.current) setState(loggedOutState);
      return;
    }

    const resolved = await validateAndBuildState(token);
    if (!mountedRef.current) return;

    if (resolved) {
      setState(resolved);
    } else {
      await clearTokens();
      setState(loggedOutState);
    }
  }, [validateAndBuildState]);

  /** Refresh after a login or external change. */
  const refreshSessionProfile = useCallback(async () => {
    await restoreSession();
  }, [restoreSession]);

  const signOut = useCallback(async () => {
    setAnalyticsActor(null);
    clearSalesCommandCache();
    await authService.signOut();
    setState(loggedOutState);
  }, []);

  useEffect(() => {
    setAnalyticsActor(state.user?.id || null);
    if (!state.user) clearSalesCommandCache();
  }, [state.user?.id]);

  // On mount + on cluster change – restore session
  useEffect(() => {
    mountedRef.current = true;
    restoreSession();
    return () => {
      mountedRef.current = false;
    };
  }, [restoreSession, selectedCluster?.cluster_id]);

  useEffect(() => {
    setAuthInvalidationHandler(() => {
      if (mountedRef.current) setState(loggedOutState);
    });
    return () => setAuthInvalidationHandler(null);
  }, []);

  // Centralized permission check helper: can("students.import")
  const can = useCallback(
    (permission: string): boolean => {
      if (!state.role) return false;
      if (isFounderOrSuperAdmin(state.role)) return true;
      return state.permissions.includes(permission);
    },
    [state.role, state.permissions],
  );

  // Centralized school tenant access check: canAccessSchool(schoolId)
  const canAccessSchool = useCallback(
    (schoolId: number | string): boolean => {
      if (!state.role) return false;
      if (isFounderOrSuperAdmin(state.role) || state.permissions.includes('schools.read.all')) {
        return true;
      }
      return state.assignedSchools.includes(Number(schoolId));
    },
    [state.role, state.permissions, state.assignedSchools],
  );

  const isFounder = useMemo(() => isFounderOrSuperAdmin(state.role), [state.role]);
  const isSales = useMemo(() => isSalesRole(state.role), [state.role]);
  const isImplementation = useMemo(() => isImplementationRole(state.role), [state.role]);
  const isSupport = useMemo(() => isSupportRole(state.role), [state.role]);
  const roleLabel = useMemo(
    () => (state.role ? ROLE_LABELS[state.role] || state.role : 'Authorized User'),
    [state.role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signOut,
      refreshSessionProfile,
      can,
      canAccessSchool,
      isFounder,
      isSales,
      isImplementation,
      isSupport,
      roleLabel,
    }),
    [
      state,
      signOut,
      refreshSessionProfile,
      can,
      canAccessSchool,
      isFounder,
      isSales,
      isImplementation,
      isSupport,
      roleLabel,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
