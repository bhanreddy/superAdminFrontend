import { Platform } from 'react-native';

/**
 * Android emulators use 10.0.2.2 / 10.0.3.2 to reach the dev machine.
 * Web can override via *_WEB env; otherwise rewrite common emulator hosts to loopback.
 */
function resolveWithWebRewrite(primaryEnv: string | undefined, webOverrideEnv: string | undefined): string {
  const primary = (primaryEnv || '').trim();
  if (Platform.OS !== 'web') {
    return primary.replace(/\/+$/, '');
  }
  const webOnly = (webOverrideEnv || '').trim();
  if (webOnly) {
    return webOnly.replace(/\/+$/, '');
  }
  return primary
    .replace(/10\.0\.2\.2/g, '127.0.0.1')
    .replace(/10\.0\.3\.2/g, '127.0.0.1')
    .replace(/\/+$/, '');
}

export function resolveSchoolApiBaseUrl(): string {
  return resolveWithWebRewrite(process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_API_URL_WEB);
}

export function resolveMedicalApiBaseUrl(): string {
  return resolveWithWebRewrite(
    process.env.EXPO_PUBLIC_MEDICAL_API_URL,
    process.env.EXPO_PUBLIC_MEDICAL_API_URL_WEB,
  );
}

export function resolveSuperAdminApiBaseUrl(): string {
  return resolveWithWebRewrite(
    process.env.EXPO_PUBLIC_SUPERADMIN_API_URL,
    process.env.EXPO_PUBLIC_SUPERADMIN_API_URL_WEB,
  );
}
