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
import { AuthState } from '../types/auth';
import { useCluster } from './ClusterContext';

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  currentAdmin: null,
  founder: null,
};

const loggedOutState: AuthState = {
  user: null,
  session: null,
  loading: false,
  isSuperAdmin: false,
  currentAdmin: null,
  founder: null,
};

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  refreshSessionProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { selectedCluster } = useCluster();
  const [state, setState] = useState<AuthState>(initialState);
  const mountedRef = useRef(true);

  /**
   * Validate an existing access token by calling the backend /verify then /me
   * endpoints.  Returns null when the token is invalid / expired.
   */
  const validateAndBuildState = useCallback(
    async (accessToken: string): Promise<AuthState | null> => {
      try {
        // isSuperAdmin calls GET /api/super-admin/verify via authService
        const { isSuperAdmin, admin } = await authService.isSuperAdmin('', '');
        const founder = await authService.fetchFounderByUserId('');
        const founderOk = founder && founder.is_active === true;

        if (!isSuperAdmin && !founderOk) {
          return null; // not authorized
        }

        const userObj = admin
          ? {
              id: admin.id,
              email: admin.email,
              user_metadata: { full_name: admin.full_name },
            }
          : founder
          ? {
              id: founder.user_id || founder.id,
              email: founder.email || '',
              user_metadata: { full_name: founder.full_name },
            }
          : null;

        return {
          user: userObj as any,
          session: { access_token: accessToken, user: userObj } as any,
          loading: false,
          isSuperAdmin,
          currentAdmin: admin,
          founder: founderOk ? founder : null,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  /** Restore session from the locally stored JWT.  Called on mount. */
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
      // Token was invalid / user not authorized – clean up silently
      await clearTokens();
      setState(loggedOutState);
    }
  }, [validateAndBuildState]);

  /** Refresh after a login or external change. */
  const refreshSessionProfile = useCallback(async () => {
    await restoreSession();
  }, [restoreSession]);

  const signOut = useCallback(async () => {
    await clearTokens();
    setState(loggedOutState);
  }, []);

  // On mount + on cluster change – restore session
  useEffect(() => {
    mountedRef.current = true;
    restoreSession();
    return () => {
      mountedRef.current = false;
    };
  }, [restoreSession, selectedCluster?.cluster_id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signOut,
      refreshSessionProfile,
    }),
    [state, signOut, refreshSessionProfile],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
