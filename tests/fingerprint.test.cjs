const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loader, frontend } = require('./helpers.cjs');
const p = value => path.join(frontend, value);
const account = { clusterId: 'cluster-a', userId: 'admin-a' };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function serviceFixture(os = 'android') {
  const values = new Map(), calls = [];
  const secure = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
    getItemAsync: async (key, options) => { calls.push(['get', key, options]); return values.get(key) ?? null; },
    setItemAsync: async (key, value, options) => { calls.push(['set', key, options]); values.set(key, value); },
    deleteItemAsync: async key => { calls.push(['delete', key]); values.delete(key); },
  };
  const auth = {
    AuthenticationType: { FINGERPRINT: 1 }, hasHardwareAsync: async () => true,
    supportedAuthenticationTypesAsync: async () => [1, 2], isEnrolledAsync: async () => true,
    authenticateAsync: async options => { calls.push(['authenticate', options]); return { success: true }; },
  };
  const service = loader({ 'react-native': { Platform: { OS: os } },
    'expo-secure-store': secure, 'expo-local-authentication': auth,
  })(p('src/services/fingerprintService.ts'));
  return { service, values, calls, secure, auth };
}

test('fingerprint opt-in verifies before persistence and unlock reads an OS-protected account proof', async () => {
  const { service, values, calls } = serviceFixture();
  assert.equal(await service.getFingerprintPreference(account), 'off');
  assert.equal((await service.enableFingerprint(account)).success, true);
  assert.equal(await service.getFingerprintPreference(account), 'on');
  const proofWrite = calls.find(c => c[0] === 'set' && c[1].endsWith('.proof'));
  assert.equal(proofWrite[2].requireAuthentication, true);
  assert.equal(proofWrite[2].keychainAccessible, 7);
  assert.match(proofWrite[2].keychainService, /\.protected$/);
  assert.ok(calls.indexOf(proofWrite) < calls.findIndex(c => c[0] === 'set' && c[1].endsWith('.enabled')));
  assert.equal((await service.verifyFingerprint(account)).success, true);
  assert.equal(calls.find(c => c[0] === 'get' && c[1].endsWith('.proof'))[2].requireAuthentication, true);
  assert.equal(await service.getFingerprintPreference({ ...account, clusterId: 'cluster-b' }), 'off');
  assert.equal(await service.getFingerprintPreference({ ...account, userId: 'admin-b' }), 'off');
  const key = service.fingerprintAccountKey(account);
  values.set(`${key}.proof`, JSON.stringify({ ...account, userId: 'admin-b' }));
  assert.equal((await service.verifyFingerprint(account)).success, false);
  assert.notEqual(service.fingerprintAccountKey({ clusterId: 'a/b', userId: 'c' }), service.fingerprintAccountKey({ clusterId: 'a_b', userId: 'c' }));
});

test('unsupported platforms and unenrolled devices never enable fingerprint protection', async () => {
  const web = serviceFixture('web');
  assert.equal((await web.service.enableFingerprint(account)).success, false);
  assert.equal(await web.service.getFingerprintPreference(account), 'off');
  assert.equal(web.calls.length, 0);
  const native = serviceFixture();
  native.auth.isEnrolledAsync = async () => false;
  assert.match((await native.service.enableFingerprint(account)).message, /Add a fingerprint/);
  assert.equal(native.values.size, 0);
  native.auth.isEnrolledAsync = async () => true;
  native.auth.supportedAuthenticationTypesAsync = async () => [2];
  assert.equal((await native.service.enableFingerprint(account)).success, false);
});

test('cancelled enrollment cannot claim to be enabled; iOS confirmation disallows device passcode', async () => {
  const env = serviceFixture();
  env.secure.setItemAsync = async () => { throw new Error('User cancelled'); };
  assert.equal((await env.service.enableFingerprint(account)).success, false);
  assert.equal(await env.service.getFingerprintPreference(account), 'off');
  const ios = serviceFixture('ios');
  ios.auth.authenticateAsync = async options => {
    assert.equal(options.disableDeviceFallback, true);
    assert.equal(options.fallbackLabel, '');
    return { success: false, error: 'user_cancel' };
  };
  assert.equal((await ios.service.enableFingerprint(account)).success, false);
  assert.equal(ios.values.size, 0);
});

test('unreadable preferences, cancelled scans and invalidated enrollment fail closed', async () => {
  const env = serviceFixture();
  await env.service.enableFingerprint(account);
  const key = env.service.fingerprintAccountKey(account);
  env.values.delete(`${key}.proof`); // OS invalidates keys when fingerprint enrollment changes.
  assert.equal((await env.service.verifyFingerprint(account)).success, false);
  assert.equal(await env.service.getFingerprintPreference(account), 'on');
  env.values.set(`${key}.enabled`, 'corrupt');
  assert.equal(await env.service.getFingerprintPreference(account), 'unknown');
  env.secure.getItemAsync = async () => { throw new Error('Unavailable'); };
  assert.equal(await env.service.getFingerprintPreference(account), 'unknown');
  assert.equal((await env.service.verifyFingerprint(account)).success, false);
});

test('one prompt at a time, account-specific disable and single-use password tickets', async () => {
  const env = serviceFixture();
  const other = { ...account, userId: 'admin-b' };
  await env.service.enableFingerprint(account);
  await env.service.enableFingerprint(other);
  const pending = deferred();
  const get = env.secure.getItemAsync;
  env.secure.getItemAsync = async (key, options) => options?.requireAuthentication ? pending.promise : get(key, options);
  const scan = env.service.verifyFingerprint(account);
  assert.equal((await env.service.verifyFingerprint(other)).success, false);
  pending.resolve(JSON.stringify(account));
  assert.equal((await scan).success, true);
  assert.equal((await env.service.disableFingerprint(account)).success, true);
  assert.equal(await env.service.getFingerprintPreference(account), 'off');
  assert.equal(await env.service.getFingerprintPreference(other), 'on');
  env.service.recordPasswordAuthentication(account.userId, 'session-a');
  assert.equal(env.service.consumePasswordAuthentication(account.userId, 'session-b'), false);
  env.service.recordPasswordAuthentication(account.userId, 'session-a');
  assert.equal(env.service.consumePasswordAuthentication(account.userId, 'session-a'), true);
  assert.equal(env.service.consumePasswordAuthentication(account.userId, 'session-a'), false);
});

function providerFixture() {
  let stateListener, current, screen;
  const auth = { user: { id: account.userId }, session: { access_token: 'session-a' }, signOut: async () => { auth.user = null; auth.session = null; render(); } };
  const cluster = { selectedCluster: { cluster_id: account.clusterId }, isClusterReady: true };
  const service = {
    supportsFingerprint: () => true, fingerprintAccountKey: a => `${a.clusterId}:${a.userId}`,
    getFingerprintPreference: async () => 'on', consumePasswordAuthentication: () => false,
    verifyFingerprint: async () => ({ success: true }), enableFingerprint: async () => ({ success: true }),
    disableFingerprint: async () => ({ success: true }),
  };
  const { FingerprintProvider, useFingerprint } = loader({
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, listener) => { stateListener = listener; return { remove() {} }; } } },
    [p('src/contexts/AuthContext.tsx')]: { useAuth: () => auth },
    [p('src/contexts/ClusterContext.tsx')]: { useCluster: () => cluster },
    [p('src/services/fingerprintService.ts')]: service,
  })(p('src/contexts/FingerprintContext.tsx'));
  function Probe() { current = useFingerprint(); return null; }
  const tree = () => React.createElement(FingerprintProvider, null, React.createElement(Probe));
  function render() { screen.update(tree()); }
  return { auth, cluster, service, get current() { return current; },
    mount: async () => { await act(async () => { screen = create(tree()); }); },
    render: async () => { await act(async () => render()); },
    event: async state => { await act(async () => stateListener(state)); },
    close: () => act(() => screen.unmount()),
  };
}

test('opted-in sessions lock on cold start, manual lock and every real background resume', async () => {
  const env = providerFixture();
  await env.mount();
  assert.equal(env.current.locked, true);
  await act(async () => env.current.unlock());
  assert.equal(env.current.locked, false);
  await env.event('inactive');
  assert.equal(env.current.covered, true);
  await env.event('active');
  assert.equal(env.current.locked, false);
  await env.event('background');
  await env.event('active');
  assert.equal(env.current.locked, true);
  env.service.verifyFingerprint = async () => ({ success: false, message: 'Cancelled' });
  await act(async () => env.current.unlock());
  assert.equal(env.current.locked, true);
  assert.equal(env.current.error, 'Cancelled');
  env.service.verifyFingerprint = async () => ({ success: true });
  await act(async () => env.current.unlock());
  act(() => env.current.lock());
  assert.equal(env.current.locked, true);
  await act(async () => env.current.usePassword());
  assert.equal(env.current.locked, false);
  env.close();
});

test('scans cannot unlock a different account or a session backgrounded during verification', async () => {
  const env = providerFixture();
  await env.mount();
  let pending = deferred();
  env.service.verifyFingerprint = () => pending.promise;
  let scan;
  act(() => { scan = env.current.unlock(); });
  env.auth.user = { id: 'admin-b' };
  await env.render();
  await act(async () => { pending.resolve({ success: true }); await scan; });
  assert.equal(env.current.locked, true);
  pending = deferred();
  act(() => { scan = env.current.unlock(); });
  await env.event('background');
  await env.event('active');
  await act(async () => { pending.resolve({ success: true }); await scan; });
  assert.equal(env.current.locked, true);
  env.close();
});

test('password-authenticated sessions skip the initial lock; opt-out remains optional', async () => {
  const env = providerFixture();
  env.service.consumePasswordAuthentication = () => true;
  await env.mount();
  assert.equal(env.current.locked, false);
  await env.event('background');
  await env.event('active');
  assert.equal(env.current.locked, true);
  env.close();
  const off = providerFixture();
  off.service.getFingerprintPreference = async () => 'off';
  await off.mount();
  assert.equal(off.current.enabled, false);
  assert.equal(off.current.locked, false);
  await act(async () => off.current.setEnabled(true));
  assert.equal(off.current.enabled, true);
  assert.equal(off.current.locked, false);
  await act(async () => off.current.setEnabled(false));
  assert.equal(off.current.enabled, false);
  off.close();
});

test('unknown or still-loading preferences block entry; backgrounding invalidates a pending password grant', async () => {
  const env = providerFixture(), pending = deferred();
  env.service.getFingerprintPreference = () => pending.promise;
  env.service.consumePasswordAuthentication = () => true;
  await env.mount();
  assert.equal(env.current.locked, true);
  await env.event('background');
  await env.event('active');
  await act(async () => pending.resolve('on'));
  assert.equal(env.current.locked, true);
  env.close();
  const unknown = providerFixture();
  unknown.service.getFingerprintPreference = async () => 'unknown';
  await unknown.mount();
  assert.equal(unknown.current.locked, true);
  assert.match(unknown.current.error, /password/);
  unknown.close();
});

test('fingerprint controls expose opt-in, retry, errors and the CA password fallback', async () => {
  const { uiLoader, pressable, textOf } = require('./helpers.cjs');
  let enabled = false, unlocked = false, passwordUsed = false, route;
  const state = { supported: true, enabled: false, ready: true, busy: false, locked: true, covered: false,
    error: 'Scan cancelled', setEnabled: async next => { enabled = next; },
    unlock: async () => { unlocked = true; }, usePassword: async () => { passwordUsed = true; return true; }, lock() {},
  };
  const load = uiLoader({
    'react-native': { View: 'View', Text: 'Text', Switch: 'Switch', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: value => value }, Modal: ({ visible, children }) => visible ? React.createElement('Modal', null, children) : null },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useRouter: () => ({ replace: value => { route = value; } }) },
    [p('src/hooks/useAuth.ts')]: { useAuth: () => ({ role: 'CA' }) },
    [p('src/contexts/FingerprintContext.tsx')]: { useFingerprint: () => state },
  });
  const { FingerprintSettings, FingerprintLockGate } = load(p('src/components/auth/FingerprintSecurity.tsx'));
  let screen;
  await act(async () => { screen = create(React.createElement(FingerprintSettings)); });
  assert.match(textOf(screen.toJSON()), /Scan cancelled/);
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Enable fingerprint unlock' }).props.onValueChange(true));
  assert.equal(enabled, true);
  await act(async () => screen.update(React.createElement(FingerprintLockGate)));
  await act(async () => pressable(screen.root, 'Unlock with fingerprint').props.onPress());
  assert.equal(unlocked, true);
  await act(async () => pressable(screen.root, 'Use account password').props.onPress());
  assert.equal(passwordUsed, true);
  assert.equal(route, '/(auth)/ca-login');
  state.busy = true;
  await act(async () => screen.update(React.createElement(FingerprintLockGate)));
  assert.equal(pressable(screen.root, 'Unlock with fingerprint'), undefined);
  await act(async () => screen.unmount());
});

test('fingerprint settings and the lock gate stay hidden on web', async () => {
  const { uiLoader } = require('./helpers.cjs');
  const load = uiLoader({
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    [p('src/contexts/FingerprintContext.tsx')]: { useFingerprint: () => ({ supported: false, locked: false, covered: false }) },
  });
  const { FingerprintSettings, FingerprintLockGate } = load(p('src/components/auth/FingerprintSecurity.tsx'));
  let screen;
  await act(async () => { screen = create(React.createElement(FingerprintSettings)); });
  assert.equal(screen.toJSON(), null);
  await act(async () => screen.update(React.createElement(FingerprintLockGate)));
  assert.equal(screen.toJSON(), null);
  await act(async () => screen.unmount());
});
