import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { clearTokens, getStoredAccessToken, getStoredRefreshToken, storeTokens } from './tokens';
import { resolveSuperAdminApiBaseUrl } from './resolveBaseUrls';

// ── Mutable base URL — updated by ClusterContext on cluster switch ───────────

let _currentBaseUrl = resolveSuperAdminApiBaseUrl();
let _onAuthInvalidated: (() => void) | null = null;
let _refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

export function setAuthInvalidationHandler(handler: (() => void) | null): void {
  _onAuthInvalidated = handler;
}

/**
 * Update the Axios base URL at runtime. Called by ClusterContext when the
 * selected cluster changes.
 */
export function setGlobalBackendUrl(url: string): void {
  _currentBaseUrl = url.trim().replace(/\/+$/, '');
  superAdminClient.defaults.baseURL = _currentBaseUrl;
}

export const superAdminClient = axios.create({
  baseURL: _currentBaseUrl,
  timeout: 30000,
});

superAdminClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

superAdminClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      const refreshToken = await getStoredRefreshToken();
      if (refreshToken && !error.config.__isRetry) {
        try {
          if (!_refreshPromise) {
            _refreshPromise = axios.post(`${_currentBaseUrl}/api/super-admin/auth/refresh`, {
              refresh_token: refreshToken,
            }).then(async (refreshRes) => {
              const { access_token, refresh_token: newRefreshToken } = refreshRes.data;
              await storeTokens(access_token, newRefreshToken);
              return { accessToken: access_token, refreshToken: newRefreshToken };
            }).finally(() => {
              _refreshPromise = null;
            });
          }
          const { accessToken } = await _refreshPromise;
          error.config.__isRetry = true;
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return superAdminClient(error.config);
        } catch {
          await clearTokens();
          _onAuthInvalidated?.();
        }
      } else {
        await clearTokens();
        _onAuthInvalidated?.();
      }
    }
    return Promise.reject(error);
  },
);
