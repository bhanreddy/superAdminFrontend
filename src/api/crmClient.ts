import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getStoredAccessToken, getStoredRefreshToken, storeTokens } from './tokens';
import { resolveSuperAdminApiBaseUrl } from './resolveBaseUrls';

/**
 * Central CRM traffic always uses the SuperAdmin API from the environment.
 * Cluster switching updates the school client and must not send CRM requests
 * to a cluster backend that does not own the dedicated CRM database.
 */
const crmBaseUrl = resolveSuperAdminApiBaseUrl();

export function getCrmBaseUrl(): string {
  return crmBaseUrl;
}

export const crmClient = axios.create({
  baseURL: crmBaseUrl,
  timeout: 30000,
});

crmClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getStoredAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

crmClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      const refreshToken = await getStoredRefreshToken();
      if (refreshToken && !error.config?.__isRetry) {
        try {
          const refreshRes = await axios.post(`${crmBaseUrl}/api/super-admin/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefreshToken } = refreshRes.data;
          await storeTokens(access_token, newRefreshToken);
          error.config.__isRetry = true;
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return crmClient(error.config);
        } catch {
          await clearTokens();
        }
      } else {
        await clearTokens();
      }
    }
    return Promise.reject(error);
  },
);
