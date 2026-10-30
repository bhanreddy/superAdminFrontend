import { Platform } from 'react-native';
import type * as SecureStoreModule from 'expo-secure-store';
import type * as AuthenticationModule from 'expo-local-authentication';

export interface FingerprintAccount { clusterId: string; userId: string }
export type FingerprintPreference = 'on' | 'off' | 'unknown';
export interface FingerprintResult { success: boolean; message?: string }

export const supportsFingerprint = () => Platform.OS === 'android' || Platform.OS === 'ios';

// Encode every character so punctuation in account/cluster IDs cannot collide.
export function fingerprintAccountKey(account: FingerprintAccount): string {
  const encode = (value: string) => Array.from(value, c => c.codePointAt(0)!.toString(16)).join('-');
  return `nexsyrus_fp_v1.${encode(account.clusterId)}.${encode(account.userId)}`;
}

// Load native modules only when needed; the web app never invokes them.
const store = () => require('expo-secure-store') as typeof SecureStoreModule;
const authentication = () => require('expo-local-authentication') as typeof AuthenticationModule;
const proofOptions = (account: FingerprintAccount): SecureStoreModule.SecureStoreOptions => ({
  keychainService: `${fingerprintAccountKey(account)}.protected`,
  requireAuthentication: true,
});

export async function getFingerprintPreference(account: FingerprintAccount): Promise<FingerprintPreference> {
  if (!supportsFingerprint()) return 'off';
  try {
    const value = await store().getItemAsync(`${fingerprintAccountKey(account)}.enabled`);
    return value === null ? 'off' : value === '1' ? 'on' : 'unknown';
  } catch {
    return 'unknown'; // An unreadable preference must never bypass an existing lock.
  }
}

export async function fingerprintUnavailableMessage(): Promise<string | null> {
  if (!supportsFingerprint()) return 'Fingerprint unlock is available in the Android and iOS app.';
  try {
    const auth = authentication();
    if (!await auth.hasHardwareAsync()) return 'This device does not have a fingerprint scanner.';
    if (!(await auth.supportedAuthenticationTypesAsync()).includes(auth.AuthenticationType.FINGERPRINT)) {
      return 'This device does not support fingerprint authentication.';
    }
    if (!await auth.isEnrolledAsync()) return 'Add a fingerprint in your device settings, then try again.';
    return null;
  } catch {
    return 'Fingerprint authentication is unavailable. Use your account password.';
  }
}

function failure(error: unknown): FingerprintResult {
  const detail = error instanceof Error ? error.message.toLowerCase() : '';
  if (detail.includes('cancel') || detail.includes('authentication failed')) {
    return { success: false, message: 'Fingerprint verification was cancelled or failed. Try again or use your account password.' };
  }
  return { success: false, message: 'Could not verify your fingerprint. Try again or use your account password. If your enrolled fingerprints changed, sign in with your password and enable fingerprint unlock again.' };
}

let operationInFlight = false;
async function exclusive(action: () => Promise<FingerprintResult>): Promise<FingerprintResult> {
  if (operationInFlight) return { success: false, message: 'Fingerprint verification is already in progress.' };
  operationInFlight = true;
  try { return await action(); }
  catch (error) { return failure(error); }
  finally { operationInFlight = false; }
}

export async function enableFingerprint(account: FingerprintAccount): Promise<FingerprintResult> {
  return exclusive(async () => {
    const unavailable = await fingerprintUnavailableMessage();
    if (unavailable) return { success: false, message: unavailable };
    const secure = store();
    const key = fingerprintAccountKey(account);
    // iOS does not authenticate on creation. Android's protected write itself
    // prompts with BIOMETRIC_STRONG (SDK 50's generic auth prompt allows weak face).
    if (Platform.OS === 'ios') {
      const result = await authentication().authenticateAsync({
        promptMessage: 'Enable fingerprint unlock', cancelLabel: 'Cancel',
        disableDeviceFallback: true, fallbackLabel: '',
      });
      if (!result.success) return failure(new Error(result.error));
    }
    // Recreate the protected value so a password-authenticated user can recover
    // after changing fingerprint enrollment. The opt-in marker is written last.
    await secure.deleteItemAsync(`${key}.proof`, proofOptions(account));
    await secure.setItemAsync(`${key}.proof`, JSON.stringify(account), {
      ...proofOptions(account),
      authenticationPrompt: 'Enable fingerprint unlock',
      keychainAccessible: secure.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await secure.setItemAsync(`${key}.enabled`, '1');
    return { success: true };
  });
}

export async function verifyFingerprint(account: FingerprintAccount): Promise<FingerprintResult> {
  return exclusive(async () => {
    const unavailable = await fingerprintUnavailableMessage();
    if (unavailable) return { success: false, message: unavailable };
    if (await getFingerprintPreference(account) !== 'on') {
      return { success: false, message: 'Fingerprint protection could not be read. Sign in with your account password.' };
    }
    const proof = await store().getItemAsync(`${fingerprintAccountKey(account)}.proof`, {
      ...proofOptions(account), authenticationPrompt: 'Unlock NexSyrus Super Admin',
    });
    if (proof) {
      const saved = JSON.parse(proof) as FingerprintAccount;
      if (saved.clusterId === account.clusterId && saved.userId === account.userId) return { success: true };
    }
    return { success: false, message: 'Fingerprint enrollment has changed. Sign in with your password and enable fingerprint unlock again.' };
  });
}

export async function disableFingerprint(account: FingerprintAccount): Promise<FingerprintResult> {
  if (!supportsFingerprint()) return { success: false };
  try {
    const key = fingerprintAccountKey(account);
    await store().deleteItemAsync(`${key}.proof`, proofOptions(account));
    await store().deleteItemAsync(`${key}.enabled`);
    return { success: true };
  } catch (error) { return failure(error); }
}

// A successful password login is already sufficient authentication. This
// single-use, in-memory ticket is tied to the exact server session and user.
let passwordTicket: { userId: string; token: string; expires: number } | null = null;
export function recordPasswordAuthentication(userId: string, token: string): void {
  passwordTicket = { userId, token, expires: Date.now() + 30_000 };
}
export function consumePasswordAuthentication(userId: string, token: string): boolean {
  const ticket = passwordTicket;
  passwordTicket = null;
  return Boolean(ticket && ticket.userId === userId && ticket.token === token && ticket.expires > Date.now());
}
