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

test('regional guide switches language and respects the selected school stakeholder', async () => {
  const Screen = uiLoader()(screenPath('SalesPlaybookScreen')).default;
  let screen;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    assert.match(textOf(screen.root), /Namaskaram/);
    act(() => pressable(screen.root, 'Karnataka').props.onPress());
    assert.match(textOf(screen.root), /Namaskara/);
    assert.match(textOf(screen.root), /Kannada/);
    assert.doesNotMatch(textOf(screen.root), /Namaskaram/);
    act(() => pressable(screen.root, 'Accounts team').props.onPress());
    assert.match(textOf(screen.root), /How do you reconcile payments, concessions and overdue accounts today/);
    act(() => pressable(screen.root, 'Visit planner').props.onPress());
    assert.match(textOf(screen.root), /Region: Karnataka · Conversation with: Accounts team/);
  } finally { act(() => screen?.unmount()); }
});

test('objection coaching opens the relevant psychology and original research', async () => {
  const opened = [];
  const Screen = uiLoader({
    'react-native': {
      View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TextInput: 'TextInput',
      StyleSheet: { create: (styles) => styles }, Linking: { openURL: async (url) => opened.push(url) },
    },
  })(screenPath('SalesPlaybookScreen')).default;
  let screen;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    act(() => pressable(screen.root, 'Objection lab').props.onPress());
    act(() => pressable(screen.root, '“Come back next academic year.”').props.onPress());
    assert.match(textOf(screen.root), /Accept a request to stop contacting them/);
    act(() => pressable(screen.root, 'Explore the psychology').props.onPress());
    assert.match(textOf(screen.root), /Implementation intentions/);
    await act(async () => { await screen.root.findByProps({ accessibilityLabel: 'Read research: Implementation intentions' }).props.onPress(); });
    assert.equal(opened.length, 1);
    assert.match(opened[0], /Gollwitzer/);
  } finally { act(() => screen?.unmount()); }
});

test('visit planner copies the edited school context and reports clipboard failure truthfully', async () => {
  const copied = []; let fail = false;
  const Screen = uiLoader({ 'expo-clipboard': { setStringAsync: async (value) => {
    if (fail) return false;
    copied.push(value); return true;
  } } })(screenPath('SalesPlaybookScreen')).default;
  let screen;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    act(() => {
      pressable(screen.root, 'Karnataka').props.onPress();
      pressable(screen.root, 'Prepare my next visit').props.onPress();
    });
    act(() => {
      screen.root.findByProps({ accessibilityLabel: 'School name' }).props.onChangeText('Example School');
      screen.root.findByProps({ accessibilityLabel: 'Action owner' }).props.onChangeText('Accounts lead');
      screen.root.findByProps({ accessibilityLabel: 'Review date / time' }).props.onChangeText('5 November, 11 am IST');
      screen.root.findByProps({ accessibilityLabel: 'Baseline / success measure' }).props.onChangeText('Compare weekly reconciliation time');
      pressable(screen.root, 'Existing ERP review').props.onPress();
      pressable(screen.root, 'Parent communication').props.onPress();
    });
    await act(async () => { await pressable(screen.root, 'Copy visit plan and follow-up').props.onPress(); });
    assert.equal(copied.length, 1);
    assert.match(copied[0], /School: Example School/);
    assert.match(copied[0], /Region: Karnataka/);
    assert.match(copied[0], /Priority: Parent communication/);
    assert.match(copied[0], /Compare weekly reconciliation time/);
    assert.match(copied[0], /side by side/);
    assert.match(copied[0], /Accounts lead on 5 November, 11 am IST/);
    assert.match(textOf(screen.root), /Visit plan and follow-up copied/);
    fail = true;
    await act(async () => { await pressable(screen.root, 'Copy visit plan and follow-up').props.onPress(); });
    assert.match(textOf(screen.root), /Clipboard unavailable/);
    assert.equal(copied.length, 1);
  } finally { act(() => screen?.unmount()); }
});

test('chapter deep links open training references and search reset restores the library', async () => {
  const Screen = uiLoader({ 'expo-router': {
    useLocalSearchParams: () => ({ chapter: 'pricing' }), useRouter: () => ({ push: () => {} }),
  } })(screenPath('SalesPlaybookScreen')).default;
  let screen;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    assert.equal(pressable(screen.root, 'Discuss price and measurable value').props.accessibilityState.expanded, true);
    assert.match(textOf(screen.root), /Reference pricing example/);
    act(() => screen.root.findByProps({ accessibilityLabel: 'Search sales playbook' }).props.onChangeText('no-results'));
    assert.match(textOf(screen.root), /No chapters match/);
    act(() => pressable(screen.root, 'Reset chapter filters').props.onPress());
    assert.match(textOf(screen.root), /8 chapters/);
  } finally { act(() => screen?.unmount()); }
});
