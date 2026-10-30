import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useCluster } from './ClusterContext';
import {
  consumePasswordAuthentication, disableFingerprint, enableFingerprint, fingerprintAccountKey,
  getFingerprintPreference, supportsFingerprint, verifyFingerprint,
} from '../services/fingerprintService';
import type { FingerprintPreference } from '../services/fingerprintService';

interface FingerprintContextValue {
  supported: boolean; enabled: boolean; ready: boolean; busy: boolean;
  locked: boolean; covered: boolean; error: string | null;
  setEnabled: (next: boolean) => Promise<void>;
  unlock: () => Promise<void>; lock: () => void; usePassword: () => Promise<boolean>;
}
const FingerprintContext = createContext<FingerprintContextValue | null>(null);

export function FingerprintProvider({ children }: { children: React.ReactNode }) {
  const { user, session, signOut } = useAuth();
  const { selectedCluster, isClusterReady } = useCluster();
  const supported = supportsFingerprint();
  const account = user && session && isClusterReady
    ? { userId: user.id, clusterId: selectedCluster?.cluster_id || 'default' } : null;
  const key = account ? fingerprintAccountKey(account) : null;
  const [preference, setPreference] = useState<{ key: string | null; value: FingerprintPreference }>({ key: null, value: 'off' });
  const [unlockGrant, setUnlockGrant] = useState<{ key: string | null; revision: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [covered, setCovered] = useState(AppState.currentState !== 'active');
  const [error, setError] = useState<string | null>(null);
  const currentKey = useRef(key);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const prompting = useRef(false);
  // Invalidate any pending scan immediately when the account changes.
  if (currentKey.current !== key) { currentKey.current = key; generation.current += 1; }
  const ready = !supported || !account || (preference.key === key && preference.value !== 'unknown');
  const enabled = preference.key === key && preference.value === 'on';
  const locked = Boolean(supported && account && (!ready || (enabled &&
    (unlockGrant?.key !== key || unlockGrant?.revision !== generation.current))));

  useEffect(() => {
    let cancelled = false;
    if (!supported || !account) { setUnlockGrant(null); setError(null); return; }
    const target = account;
    const revision = generation.current;
    const ticket = session && consumePasswordAuthentication(target.userId, session.access_token);
    void getFingerprintPreference(target).then(value => {
      if (cancelled) return;
      const validTicket = ticket && generation.current === revision;
      setPreference({ key, value });
      if (validTicket) setUnlockGrant({ key, revision });
      if (validTicket && value === 'unknown') {
        // Password proof permits recovery even when the local marker is corrupt.
        setPreference({ key, value: 'off' });
      }
      setError(value === 'unknown' && !validTicket ? 'Could not read fingerprint protection. Sign in with your account password.' : null);
    });
    return () => { cancelled = true; };
  }, [key, supported, session?.access_token]);

  useEffect(() => {
    if (!supported) return;
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') {
        generation.current += 1;
        setCovered(true);
        setUnlockGrant(null);
      } else if (next === 'inactive') {
        if (!prompting.current) setCovered(true);
      } else if (next === 'active') setCovered(false);
    });
    return () => subscription.remove();
  }, [supported]);

  useEffect(() => () => { generation.current += 1; }, []);

  const run = useCallback(async (action: 'unlock' | 'enable' | 'disable') => {
    if (!account || !supported || inFlight.current) return;
    inFlight.current = true;
    prompting.current = true;
    const targetKey = key;
    const revision = generation.current;
    setBusy(true); setError(null);
    try {
      const result = action === 'enable' ? await enableFingerprint(account)
        : action === 'disable' ? await disableFingerprint(account) : await verifyFingerprint(account);
      if (currentKey.current !== targetKey) return;
      if (result.success) {
        if (action !== 'unlock') setPreference({ key: targetKey, value: action === 'enable' ? 'on' : 'off' });
        // Backgrounding during a prompt never authorizes the later resume.
        if (generation.current === revision) setUnlockGrant({ key: targetKey, revision });
      } else setError(result.message || 'Fingerprint verification failed. Please try again.');
    } catch {
      if (currentKey.current === targetKey) setError('Fingerprint authentication is unavailable. Use your account password.');
    } finally {
      inFlight.current = false; prompting.current = false; setBusy(false);
    }
  }, [key, supported]);

  return <FingerprintContext.Provider value={{
    supported, enabled, ready, busy, locked, covered: supported && Boolean(account) && covered, error,
    setEnabled: next => run(next ? 'enable' : 'disable'), unlock: () => run('unlock'),
    lock: () => { generation.current += 1; setError(null); setUnlockGrant(null); },
    usePassword: async () => {
      if (inFlight.current) return false;
      inFlight.current = true;
      generation.current += 1;
      setBusy(true);
      try { await signOut(); return true; }
      catch { setError('Could not sign out. Please try again.'); return false; }
      finally { inFlight.current = false; setBusy(false); }
    },
  }}>{children}</FingerprintContext.Provider>;
}

export function useFingerprint() {
  const context = useContext(FingerprintContext);
  if (!context) throw new Error('useFingerprint must be used within FingerprintProvider');
  return context;
}
