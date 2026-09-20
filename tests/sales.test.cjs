const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { uiLoader, frontend, pressable, textOf } = require('./helpers.cjs');
const screenPath = (name) => path.join(frontend, `src/screens/sales/${name}.tsx`);

test('sales playbook searches source content and filters incumbent chapters', async () => {
  const Screen = uiLoader()(screenPath('SalesPlaybookScreen')).default;
  let screen;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    assert.match(textOf(screen.root), /8 chapters/);
    act(() => screen.root.findByProps({ accessibilityLabel: 'Search sales playbook' }).props.onChangeText('WhatsApp'));
    assert.ok(pressable(screen.root, 'Respond to common objections'));
    act(() => pressable(screen.root, 'Respond to common objections').props.onPress());
    assert.match(textOf(screen.root), /Sales Playbook · p. 10; Incumbent ERP Battlebook · pp. 4–6/);
    act(() => screen.root.findByProps({ accessibilityLabel: 'Search sales playbook' }).props.onChangeText(''));
    act(() => pressable(screen.root, 'Existing ERP').props.onPress());
    assert.match(textOf(screen.root), /3 chapters/);
    assert.equal(pressable(screen.root, 'Run the seven-step school demo'), undefined);
    act(() => screen.root.findByProps({ accessibilityLabel: 'Search sales playbook' }).props.onChangeText('no-such-topic'));
    assert.match(textOf(screen.root), /No chapters match/);
  } finally { act(() => screen.unmount()); }
});

test('training requires practice and a correct answer, survives reload, and isolates accounts', async () => {
  const store = new Map(); let currentId = 'alice'; let screen;
  const Screen = uiLoader({
    '@react-native-async-storage/async-storage': { getItem: async (key) => store.get(key) || null, setItem: async (key, value) => { store.set(key, value); } },
    [path.join(frontend, 'src/hooks/useAuth.ts')]: { useAuth: () => ({ user: { id: currentId } }) },
  })(screenPath('SalesTrainingScreen')).default;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    assert.equal(pressable(screen.root, 'Complete lesson').props.disabled, true);
    act(() => screen.root.findAllByProps({ accessibilityRole: 'radio' })[1].props.onPress());
    act(() => pressable(screen.root, 'Check answer').props.onPress());
    assert.match(textOf(screen.root), /Try again/);
    assert.equal(pressable(screen.root, 'Complete lesson').props.disabled, true);
    act(() => screen.root.findAllByProps({ accessibilityRole: 'radio' })[0].props.onPress());
    act(() => pressable(screen.root, 'Check answer').props.onPress());
    assert.equal(pressable(screen.root, 'Complete lesson').props.disabled, true);
    act(() => screen.root.findByProps({ accessibilityRole: 'checkbox' }).props.onPress());
    await act(async () => { await pressable(screen.root, 'Complete lesson').props.onPress(); });
    assert.match(textOf(screen.root), /1 of 6 lessons completed/);
    await act(async () => { screen.unmount(); screen = create(React.createElement(Screen)); });
    assert.match(textOf(screen.root), /1 of 6 lessons completed/);
    currentId = 'bob';
    await act(async () => screen.update(React.createElement(Screen)));
    assert.match(textOf(screen.root), /0 of 6 lessons completed/);
    assert.equal(screen.root.findByProps({ accessibilityRole: 'checkbox' }).props.accessibilityState.checked, false);
    assert.equal(store.has('schoolims:sales-training:v1:bob'), false);
  } finally { act(() => screen.unmount()); }
});

test('training storage failure is recoverable and cannot falsely complete a lesson', async () => {
  let fail = true; let screen;
  const Screen = uiLoader({ '@react-native-async-storage/async-storage': {
    getItem: async () => '{}', setItem: async () => { if (fail) throw new Error('Storage unavailable'); },
  } })(screenPath('SalesTrainingScreen')).default;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    act(() => {
      screen.root.findByProps({ accessibilityRole: 'checkbox' }).props.onPress();
      screen.root.findAllByProps({ accessibilityRole: 'radio' })[0].props.onPress();
    });
    act(() => pressable(screen.root, 'Check answer').props.onPress());
    await act(async () => { await pressable(screen.root, 'Complete lesson').props.onPress(); });
    assert.match(textOf(screen.root), /Could not save your practice progress/);
    assert.match(textOf(screen.root), /0 of 6 lessons completed/);
    fail = false;
    await act(async () => { pressable(screen.root, 'Retry progress').props.onPress(); });
    assert.doesNotMatch(textOf(screen.root), /Could not save/);
  } finally { act(() => screen.unmount()); }
});

test('sales direct links allow sales and founder roles and deny unrelated roles', () => {
  for (const pathname of ['/sales/playbook', '/sales/training']) {
    for (const role of ['SALES_EXECUTIVE', 'SALES_MANAGER', 'FOUNDER', 'SUPER_ADMIN', 'SUPPORT_EXECUTIVE']) {
      const load = uiLoader({
        'expo-router': { usePathname: () => pathname, useRouter: () => ({ replace: () => {} }) },
        [path.join(frontend, 'src/hooks/useAuth.ts')]: { useAuth: () => ({ role, roleLabel: role, isFounder: ['FOUNDER', 'SUPER_ADMIN'].includes(role), can: () => false }) },
        [path.join(frontend, 'src/components/auth/RouteGuard.tsx')]: null,
      });
      const Guard = load(path.join(frontend, 'src/components/auth/AppRouteGuard.tsx')).AppRouteGuard;
      const screen = create(React.createElement(Guard, null, React.createElement('Text', null, 'Sales content')));
      assert.equal(textOf(screen.root).includes('Sales content'), role !== 'SUPPORT_EXECUTIVE', `${role}: ${pathname}`);
      screen.unmount();
    }
  }
});
