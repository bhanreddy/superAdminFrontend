const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const {
  loader,
  uiLoader,
  frontend,
  pressable,
  textOf,
} = require('./helpers.cjs');
const ROLES = Object.values(
  loader()(path.join(frontend, 'src/constants/rbac.ts')).ROLES,
);
const apiPath = path.join(frontend, 'src/services/connect/api.ts');
const realtimePath = path.join(frontend, 'src/services/connect/realtime.ts');
const dummyClient = { get: async () => ({ data: {} }) };
const loadCore = () =>
  loader({
    [path.join(frontend, 'src/api/superAdminClient.ts')]: {
      superAdminClient: dummyClient,
    },
    '@supabase/supabase-js': {
      createClient: () => {
        throw new Error('Network not expected');
      },
    },
  });
const baseMessage = (sequence, extra = {}) => ({
  id: 'm' + sequence,
  sequence,
  conversation_id: 'general-id',
  sender_id: 'employee-b',
  sender_name: 'Colleague',
  client_id: 'client' + sequence,
  parent_id: null,
  body: 'Message ' + sequence,
  created_at: '2026-10-30T08:30:00Z',
  edited_at: null,
  deleted_at: null,
  reply_count: 0,
  reactions: [],
  mentions: [],
  ...extra,
});

test('reconciliation recovers more than one missed page, old edits/deletes and duplicate delivery without loss', async () => {
  const load = loadCore();
  const { reconcileHistory } = load(realtimePath);
  const { mergeMessages } = load(apiPath);
  const all = Array.from({ length: 215 }, (_, i) => baseMessage(i + 1));
  all[1] = { ...all[1], body: '', deleted_at: '2026-10-30T09:00Z' };
  all[2] = {
    ...all[2],
    body: 'Edited while offline',
    edited_at: '2026-10-30T09:00Z',
  };
  const calls = [];
  const api = {
    history: async (id, { after, limit }) => {
      calls.push(after);
      const rows = all.filter((m) => m.sequence > after);
      return { messages: rows.slice(0, limit), has_more: rows.length > limit };
    },
  };
  const merged = await reconcileHistory(
    'general-id',
    [baseMessage(1), baseMessage(2), baseMessage(3)],
    api,
  );
  assert.equal(merged.length, 215);
  assert.equal(merged[1].body, '');
  assert.equal(merged[2].body, 'Edited while offline');
  assert.deepEqual(calls, [0, 100, 200]);
  assert.equal(mergeMessages(merged, [all[214], all[214]]).length, 215);
});
test('reconciliation refuses a nonadvancing server cursor', async () => {
  const { reconcileHistory } = loadCore()(realtimePath);
  await assert.rejects(
    reconcileHistory('general-id', [], {
      history: async () => ({ messages: [], has_more: true }),
    }),
    /did not advance/,
  );
});
test('late stale message responses cannot restore deleted text or undo newer reactions', () => {
  const { mergeMessages } = loadCore()(apiPath);
  const newest = baseMessage(1, {
      revision: 5,
      body: '',
      deleted_at: '2026-10-30T10:00Z',
    }),
    stale = baseMessage(1, { revision: 4, body: 'Private text' });
  assert.equal(mergeMessages([newest], [stale])[0].body, '');
  assert.equal(
    mergeMessages(
      [
        baseMessage(2, {
          revision: 8,
          reactions: [{ user_id: 'b', emoji: '👍' }],
        }),
      ],
      [baseMessage(2, { revision: 7, reactions: [] })],
    )[0].reactions.length,
    1,
  );
});
test('realtime subscription authenticates before joining, reports connection changes and disposes on logout', async () => {
  const { watchConnect } = loadCore()(realtimePath);
  const calls = [],
    states = [];
  let status, event;
  const client = {
    realtime: {
      setAuth: async (token) => calls.push(token),
      disconnect: () => calls.push('disconnect'),
    },
    removeAllChannels: async () => calls.push('remove'),
    channel: () => ({
      on: (_type, options, fn) => {
        assert.equal(options.table, 'collaboration_events');
        event = fn;
        return {
          subscribe: (fn) => {
            status = fn;
          },
        };
      },
    }),
  };
  let rejoins = 0,
    received;
  const stop = watchConnect(
    (e) => (received = e),
    (s) => states.push(s),
    () => rejoins++,
    {
      api: {
        realtimeSession: async () => ({
          url: 'https://example.test',
          anon_key: 'public',
          token: 'memory-only',
          expires_in: 120,
        }),
      },
      clientFactory: () => client,
    },
  );
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls, ['memory-only']);
  status('SUBSCRIBED');
  assert.equal(rejoins, 1);
  status('CHANNEL_ERROR');
  assert.deepEqual(states, ['connecting', 'live', 'offline']);
  event({ new: { conversation_id: 'general-id' } });
  assert.equal(received.conversation_id, 'general-id');
  stop();
  assert.ok(calls.includes('remove'));
  assert.ok(calls.includes('disconnect'));
});
test('late realtime session response cannot subscribe after disposal', async () => {
  const { watchConnect } = loadCore()(realtimePath);
  let resolve,
    created = false;
  const stop = watchConnect(
    () => {},
    () => {},
    () => {},
    {
      api: { realtimeSession: () => new Promise((r) => (resolve = r)) },
      clientFactory: () => {
        created = true;
      },
    },
  );
  stop();
  resolve({
    url: 'https://example.test',
    anon_key: 'public',
    token: 'nope',
    expires_in: 120,
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(created, false);
});

function fixture(width = 390, platform = 'android', role = 'QA', config = {}) {
  let currentUser = 'employee-a',
    failSend = false,
    denied = false,
    pickedForm = null;
  const sent = [],
    params = {},
    events = {},
    uploads = [];
  const channel = {
    id: 'general-id',
    name: 'general',
    purpose: 'Team collaboration',
    description: 'Company channel',
    visibility: 'public',
    category: 'company',
    joined: true,
    can_manage: false,
    archived_at: null,
    unread_count: 1,
  };
  const context = {
    organization: { id: 'org', name: 'NexSyrus' },
    self: {
      id: currentUser,
      full_name: 'Employee',
      employee_id: 'EMP-A',
      role,
    },
    can_manage: !!config.canManage,
    channels: [channel],
    direct_messages: [],
    unread_notifications: 0,
    preferences: { mode: 'mentions', push_enabled: false },
  };
  const api = {
    bootstrap: async () => {
      if (denied)
        throw {
          response: { status: 403, data: { error: 'Company access revoked' } },
        };
      return {
        ...context,
        self: { ...context.self, id: currentUser },
      };
    },
    history: async (_id, options = {}) => ({
      messages: options.parent
        ? [baseMessage(2, { parent_id: 'm1', body: 'Thread reply' })]
        : Array.from({ length: config.messageCount || 1 }, (_, index) =>
            baseMessage(index + 1, { reply_count: index === 0 ? 1 : 0 }),
          ),
      has_more: false,
      last_sequence: 2,
    }),
    message: async (id) => baseMessage(Number(id.slice(1))),
    employees: async () => [],
    notifications: async () => [],
    search: async () => ({ messages: [], channels: [], employees: [] }),
    read: async () => {},
    send: async (id, draft) => {
      sent.push({ ...draft });
      if (config.sendGate) await config.sendGate;
      if (failSend) throw new Error('Connection lost');
      return baseMessage(3, { ...draft, id: 'sent', sender_id: currentUser });
    },
    edit: async () => {},
    react: async () => baseMessage(1),
    upload: async (id, form) => {
      uploads.push({ id, form });
    },
  };
  const core = loadCore()(apiPath);
  const native = {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Modal: ({ visible, children }) =>
      visible ? React.createElement('Modal', null, children) : null,
    FlatList: React.forwardRef(
      ({ data, renderItem, ListHeaderComponent, ListEmptyComponent }, ref) => {
        React.useImperativeHandle(ref, () => ({
          scrollToEnd() {},
          scrollToIndex() {},
          scrollToOffset() {},
        }));
        return React.createElement(
          'FlatList',
          null,
          ListHeaderComponent,
          data.length
            ? data.map((item, index) =>
                React.createElement(
                  React.Fragment,
                  { key: item.id },
                  renderItem({ item, index }),
                ),
              )
            : ListEmptyComponent,
        );
      },
    ),
    StyleSheet: { create: (x) => x },
    Platform: { OS: platform },
    AppState: {
      addEventListener: (_type, fn) => {
        events.foreground = fn;
        return { remove: () => {} };
      },
    },
    useWindowDimensions: () => ({ width, height: 800 }),
  };
  const load = uiLoader({
    ...(config.metrics
      ? {
          react: {
            ...React,
            memo: (component, compare) =>
              React.memo(function Traced(props) {
                if (component.name === 'ConnectMessageRow')
                  config.metrics.rows = (config.metrics.rows || 0) + 1;
                if (component.name === 'ConnectMessageBody')
                  config.metrics.bodies = (config.metrics.bodies || 0) + 1;
                return component(props);
              }, compare),
          },
        }
      : {}),
    'react-native': native,
    'expo-linking': { createURL: () => '' },
    'expo-router': {
      useLocalSearchParams: () => params,
      useRouter: () => ({ setParams: (x) => Object.assign(params, x) }),
    },
    [path.join(frontend, 'src/contexts/ClusterContext.tsx')]: {
      useCluster: () => ({ selectedCluster: { cluster_id: 'local' } }),
    },
    [path.join(frontend, 'src/hooks/useAuth.ts')]: {
      useAuth: () => ({ user: { id: currentUser }, role }),
    },
    [path.join(frontend, 'src/services/connect/files.ts')]: {
      pickConnectFile: async () => pickedForm,
      downloadConnectFile: async () => {},
    },
    [apiPath]: { ...core, connectApi: api },
    [realtimePath]: {
      watchConnect: (_event, state) => {
        state('offline', 'Test connection unavailable');
        return () => {};
      },
      reconcileHistory: async (_id, rows) => rows,
    },
  });
  const Screen = load(
    path.join(frontend, 'src/screens/connect/ConnectScreen.tsx'),
  ).default;
  return {
    Screen,
    sent,
    params,
    events,
    setUser: (id) => (currentUser = id),
    fail: (value) => (failSend = value),
    deny: (value) => (denied = value),
    pick: (form) => (pickedForm = form),
    uploads,
  };
}
const flush = () => new Promise((r) => setImmediate(r));
test('mobile navigation opens channels then dedicated thread and returns in order', async () => {
  const f = fixture();
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    assert.ok(pressable(screen.root, 'Open general, 1 unread'));
    assert.equal(
      screen.root.findAllByProps({ testID: 'connect-conversation' }).length,
      0,
    );
    await act(async () => {
      pressable(screen.root, 'Open general, 1 unread').props.onPress();
      await flush();
    });
    assert.match(textOf(screen.root), /Message 1/);
    await act(async () => {
      pressable(screen.root, '1 reply').props.onPress();
      await flush();
    });
    assert.match(textOf(screen.root), /Thread reply/);
    assert.ok(screen.root.findByProps({ testID: 'connect-thread' }));
    act(() => pressable(screen.root, 'Back to conversation').props.onPress());
    assert.equal(
      screen.root.findAllByProps({ testID: 'connect-thread' }).length,
      0,
    );
    act(() => pressable(screen.root, 'Back to channels').props.onPress());
    assert.ok(screen.root.findByProps({ testID: 'connect-conversations' }));
  } finally {
    act(() => screen?.unmount());
  }
});
test('desktop keeps navigation and conversation visible; failed send retries the same client UUID', async () => {
  const f = fixture(1440);
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    assert.ok(screen.root.findByProps({ testID: 'connect-conversations' }));
    assert.ok(screen.root.findByProps({ testID: 'connect-conversation' }));
    act(() =>
      screen.root
        .findByProps({ accessibilityLabel: 'Message composer' })
        .props.onChangeText('Reliable draft'),
    );
    f.fail(true);
    await act(async () => {
      pressable(screen.root, 'Send message').props.onPress();
      await flush();
    });
    assert.match(textOf(screen.root), /Connection lost/);
    f.fail(false);
    await act(async () => {
      pressable(screen.root, 'Retry failed message').props.onPress();
      await flush();
    });
    assert.equal(f.sent.length, 2);
    assert.equal(f.sent[0].client_id, f.sent[1].client_id);
    assert.equal(pressable(screen.root, 'Retry failed message'), undefined);
  } finally {
    act(() => screen?.unmount());
  }
});
test('switching employee identity removes prior messages and failed drafts', async () => {
  const f = fixture();
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    await act(async () => {
      pressable(screen.root, 'Open general, 1 unread').props.onPress();
      await flush();
    });
    act(() =>
      screen.root
        .findByProps({ accessibilityLabel: 'Message composer' })
        .props.onChangeText('Private pending draft'),
    );
    f.fail(true);
    await act(async () => {
      pressable(screen.root, 'Send message').props.onPress();
      await flush();
    });
    assert.match(textOf(screen.root), /Private pending draft/);
    f.setUser('employee-b');
    await act(async () => {
      screen.update(React.createElement(f.Screen));
      await flush();
    });
    assert.doesNotMatch(textOf(screen.root), /Private pending draft|Message 1/);
    f.deny(true);
    await act(async () => {
      f.events.foreground('active');
      await flush();
    });
    assert.match(textOf(screen.root), /Connect could not open/);
    assert.equal(pressable(screen.root, 'Open general, 1 unread'), undefined);
  } finally {
    act(() => screen?.unmount());
  }
});
test('Connect route allows all application roles and denies missing or unknown roles', () => {
  for (const role of [...ROLES, null, 'UNKNOWN']) {
    const load = uiLoader({
      'expo-router': {
        usePathname: () => '/connect',
        useRouter: () => ({ replace: () => {} }),
      },
      [path.join(frontend, 'src/hooks/useAuth.ts')]: {
        useAuth: () => ({
          role,
          isFounder: role === 'FOUNDER',
          permissions: [],
          can: () => false,
        }),
      },
      [path.join(frontend, 'src/components/auth/RouteGuard.tsx')]: null,
    });
    const Guard = load(
      path.join(frontend, 'src/components/auth/AppRouteGuard.tsx'),
    ).AppRouteGuard;
    const screen = create(
      React.createElement(
        Guard,
        null,
        React.createElement('Text', null, 'Company messages'),
      ),
    );
    assert.equal(
      textOf(screen.root).includes('Company messages'),
      ROLES.includes(role),
    );
    screen.unmount();
  }
});
test('an incoming message link opens its conversation when Connect is already mounted', async () => {
  const f = fixture();
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    Object.assign(f.params, { conversation: 'general-id', message: 'm1' });
    await act(async () => {
      screen.update(React.createElement(f.Screen));
      await flush();
    });
    assert.ok(screen.root.findByProps({ testID: 'connect-conversation' }));
    assert.match(textOf(screen.root), /Message 1/);
  } finally {
    act(() => screen?.unmount());
  }
});
test('a failed send retains its file across navigation and retry preserves the next composer draft', async () => {
  const f = fixture();
  let screen;
  const form = new FormData();
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    await act(async () => {
      pressable(screen.root, 'Open general, 1 unread').props.onPress();
      await flush();
    });
    f.pick(form);
    await act(async () => {
      pressable(screen.root, 'Attach a file').props.onPress();
      await flush();
    });
    f.fail(true);
    await act(async () => {
      pressable(screen.root, 'Send message').props.onPress();
      await flush();
    });
    act(() => pressable(screen.root, 'Back to channels').props.onPress());
    await act(async () => {
      pressable(screen.root, 'Open general, 1 unread').props.onPress();
      await flush();
    });
    act(() =>
      screen.root
        .findByProps({ accessibilityLabel: 'Message composer' })
        .props.onChangeText('Next draft'),
    );
    f.fail(false);
    await act(async () => {
      pressable(screen.root, 'Retry failed message').props.onPress();
      await flush();
    });
    assert.equal(f.uploads.length, 1);
    assert.equal(f.uploads[0].form, form);
    assert.equal(f.sent[0].client_id, f.sent[1].client_id);
    assert.equal(
      screen.root.findByProps({ accessibilityLabel: 'Message composer' }).props
        .value,
      'Next draft',
    );
  } finally {
    act(() => screen?.unmount());
  }
});

test('Slack sidebar sections collapse without changing the selected conversation or exposing channel creation', async () => {
  const f = fixture(1280);
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    assert.ok(pressable(screen.root, 'Open general, 1 unread'));
    assert.equal(pressable(screen.root, 'Create'), undefined);
    act(() => pressable(screen.root, 'Collapse Channels').props.onPress());
    assert.equal(pressable(screen.root, 'Open general, 1 unread'), undefined);
    assert.ok(screen.root.findByProps({ testID: 'connect-conversation' }));
    assert.match(textOf(screen.root), /Message 1/);
    act(() => pressable(screen.root, 'Expand Channels').props.onPress());
    assert.ok(pressable(screen.root, 'Open general, 1 unread'));
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('composer formats the selected text, inserts emoji, sends the result and renders formatting', async () => {
  const f = fixture(1280);
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    const input = () =>
      screen.root.findByProps({ accessibilityLabel: 'Message composer' });
    act(() => {
      input().props.onChangeText('Release ready');
      input().props.onSelectionChange({
        nativeEvent: { selection: { start: 0, end: 7 } },
      });
    });
    act(() => pressable(screen.root, 'Bold text').props.onPress());
    assert.equal(input().props.value, '*Release* ready');
    act(() => pressable(screen.root, 'Insert emoji').props.onPress());
    act(() => pressable(screen.root, 'Insert 🚀').props.onPress());
    assert.equal(input().props.value, '*Release* ready🚀');
    await act(async () => {
      pressable(screen.root, 'Send message').props.onPress();
      await flush();
    });
    assert.equal(f.sent[0].body, '*Release* ready🚀');
    assert.equal(input().props.value, '');
    assert.ok(
      screen.root
        .findAllByType('Text')
        .some(
          (node) =>
            node.props.style?.fontWeight === '700' &&
            textOf(node) === 'Release',
        ),
    );
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('Connect fills the app area and returning to the console restores its navigation shell', () => {
  let pathname = '/connect';
  const load = uiLoader({
    'react-native': {
      View: 'View',
      Pressable: 'Pressable',
      Platform: { OS: 'android' },
      StyleSheet: { create: (x) => x },
      useWindowDimensions: () => ({ width: 1280 }),
    },
    'expo-router': { usePathname: () => pathname },
    'expo-status-bar': { StatusBar: () => null },
    [path.join(frontend, 'src/components/layout/Sidebar.tsx')]: {
      Sidebar: () => React.createElement('Sidebar'),
    },
    [path.join(frontend, 'src/components/layout/TopBar.tsx')]: {
      TopBar: () => React.createElement('TopBar'),
    },
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({
        colors: {},
        layout: { mobileBreakpoint: 900, topbarHeight: 60 },
        zIndex: {},
      }),
    },
  });
  const { DashboardLayout } = load(
    path.join(frontend, 'src/components/layout/DashboardLayout.tsx'),
  );
  let screen;
  const render = () =>
    React.createElement(
      DashboardLayout,
      null,
      React.createElement('Content', { route: pathname }),
    );
  try {
    act(() => {
      screen = create(render());
    });
    assert.equal(screen.root.findAllByType('Sidebar').length, 0);
    assert.equal(screen.root.findAllByType('TopBar').length, 0);
    assert.equal(screen.root.findByType('Content').props.route, '/connect');
    pathname = '/';
    act(() => screen.update(render()));
    assert.equal(screen.root.findAllByType('Sidebar').length, 1);
    assert.equal(screen.root.findAllByType('TopBar').length, 1);
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('web composer sends on Enter while preserving Shift+Enter and composition input', async () => {
  const previousDocument = global.document;
  global.document = {
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
  };
  const f = fixture(1280, 'web');
  let screen,
    prevented = 0;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    const input = () =>
      screen.root.findByProps({ accessibilityLabel: 'Message composer' });
    act(() => input().props.onChangeText('A keyboard message'));
    const event = (extra = {}) => ({
      nativeEvent: { key: 'Enter', ...extra },
      preventDefault: () => prevented++,
    });
    act(() => input().props.onKeyPress(event({ shiftKey: true })));
    act(() => input().props.onKeyPress(event({ isComposing: true })));
    act(() => input().props.onKeyPress(event({ keyCode: 229 })));
    assert.equal(f.sent.length, 0);
    assert.equal(prevented, 0);
    await act(async () => {
      input().props.onKeyPress(event());
      await flush();
    });
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].body, 'A keyboard message');
    assert.equal(prevented, 1);
  } finally {
    if (screen) act(() => screen.unmount());
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});

test('every application role loads the workspace and sends messages, including accountants and read-only admins', async () => {
  for (const role of ROLES) {
    const f = fixture(1280, 'android', role);
    let screen;
    try {
      await act(async () => {
        screen = create(React.createElement(f.Screen));
        await flush();
      });
      assert.ok(
        screen.root.findByProps({ testID: 'connect-conversation' }),
        role,
      );
      const input = screen.root.findByProps({
        accessibilityLabel: 'Message composer',
      });
      act(() => input.props.onChangeText('Hello from ' + role));
      await act(async () => {
        pressable(screen.root, 'Send message').props.onPress();
        await flush();
      });
      assert.equal(f.sent[0].body, 'Hello from ' + role);
    } finally {
      if (screen) act(() => screen.unmount());
    }
  }
});

test('the directory retains CA and Lead CA colleagues in both supported response formats', async () => {
  const people = ROLES.map((role) => ({ id: role, role, full_name: role }));
  for (const data of [people, { data: people }]) {
    const load = loader({
      [path.join(frontend, 'src/api/superAdminClient.ts')]: {
        superAdminClient: { get: async () => ({ data }) },
      },
    });
    assert.deepEqual(await load(apiPath).connectApi.directory(), people);
  }
});

test('each role can reach Connect from its navigation menu without gaining founder navigation', () => {
  for (const role of ROLES) {
    const root = ['FOUNDER', 'SUPER_ADMIN'].includes(role);
    let destination;
    const load = uiLoader({
      'react-native': {
        View: 'View',
        Text: 'Text',
        Pressable: 'Pressable',
        ScrollView: 'ScrollView',
        Image: 'Image',
        Platform: {
          OS: 'android',
          select: (options) => options.android ?? options.default,
        },
        StyleSheet: { create: (x) => x },
        Animated: {
          View: 'AnimatedView',
          Value: class {
            constructor(value) {
              this.value = value;
            }
          },
          spring: () => ({ start() {} }),
        },
      },
      'expo-router': {
        useSegments: () => ['(app)'],
        useRouter: () => ({ push: (route) => (destination = route) }),
      },
      [path.join(frontend, 'assets/logo.png')]: {},
      [path.join(frontend, 'src/hooks/useAuth.ts')]: {
        useAuth: () => ({ role, isFounder: root, can: () => false }),
      },
      [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
        useTheme: () => ({
          colors: {},
          layout: { sidebarWidth: 250, sidebarCollapsedWidth: 68 },
          clayShadows: {},
        }),
        clayStyle: () => ({}),
      },
    });
    const Sidebar = load(
      path.join(frontend, 'src/components/layout/Sidebar.tsx'),
    ).Sidebar;
    let screen;
    try {
      act(() => {
        screen = create(
          React.createElement(Sidebar, { collapsed: false, onToggle() {} }),
        );
      });
      assert.ok(pressable(screen.root, 'NexSyrus Connect'), role);
      act(() => pressable(screen.root, 'NexSyrus Connect').props.onPress());
      assert.equal(destination, '/(app)/connect');
      if (!root) assert.doesNotMatch(textOf(screen.root), /Cluster Management/);
    } finally {
      if (screen) act(() => screen.unmount());
    }
  }
});

test('caret movement makes no screen commits and typing leaves 120 memoized message rows untouched', async () => {
  const metrics = { rows: 0 };
  const f = fixture(1280, 'android', 'QA', { messageCount: 120, metrics });
  let screen,
    commits = 0;
  try {
    await act(async () => {
      screen = create(
        React.createElement(
          React.Profiler,
          { id: 'workspace', onRender: () => commits++ },
          React.createElement(f.Screen),
        ),
      );
      await flush();
    });
    assert.equal(metrics.rows, 120);
    const input = () =>
      screen.root.findByProps({ accessibilityLabel: 'Message composer' });
    const initialCommits = commits,
      initialRows = metrics.rows,
      initialBodies = metrics.bodies;
    for (let i = 0; i < 30; i++)
      act(() =>
        input().props.onSelectionChange({
          nativeEvent: { selection: { start: i, end: i } },
        }),
      );
    assert.equal(commits, initialCommits, 'caret updates stay in a ref');
    for (let i = 0; i < 30; i++)
      act(() => input().props.onChangeText('Typing message ' + i));
    assert.equal(
      metrics.rows,
      initialRows,
      'typing does not re-render history rows',
    );
    assert.equal(
      metrics.bodies,
      initialBodies,
      'typing does not re-render message bodies',
    );
    const row = screen.root
      .findAllByType('Pressable')
      .find((node) => node.props.onHoverIn && node.props.onLongPress);
    act(() => row.props.onHoverIn());
    assert.equal(
      metrics.rows,
      initialRows + 1,
      'hover updates only its own row',
    );
    assert.equal(
      metrics.bodies,
      initialBodies,
      'hover keeps message text memoized',
    );
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('the mobile composer stays editable and preserves a new draft while the previous send succeeds or fails', async () => {
  for (const fail of [false, true]) {
    let release;
    const sendGate = new Promise((resolve) => (release = resolve));
    const f = fixture(390, 'android', 'QA', { sendGate });
    let screen;
    try {
      await act(async () => {
        screen = create(React.createElement(f.Screen));
        await flush();
        pressable(screen.root, 'Open general, 1 unread').props.onPress();
        await flush();
      });
      const input = () =>
        screen.root.findByProps({ accessibilityLabel: 'Message composer' });
      const form = new FormData();
      if (fail) {
        f.pick(form);
        await act(async () => {
          pressable(screen.root, 'Attach a file').props.onPress();
          await flush();
        });
      }
      act(() => input().props.onChangeText('First message'));
      f.fail(fail);
      await act(async () => {
        const send = pressable(screen.root, 'Send message').props.onPress;
        send();
        send();
        await flush();
      });
      assert.equal(input().props.editable, true);
      assert.equal(f.sent.length, 1, 'rapid taps send only one request');
      act(() => input().props.onChangeText('Next message stays here'));
      await act(async () => {
        release();
        await flush();
        await flush();
      });
      assert.equal(f.sent[0].body, 'First message');
      assert.equal(input().props.value, 'Next message stays here');
      if (fail) {
        assert.ok(pressable(screen.root, 'Retry failed message'));
        assert.equal(
          pressable(screen.root, 'Remove file'),
          undefined,
          'failed request owns its old attachment',
        );
        f.fail(false);
        await act(async () => {
          pressable(screen.root, 'Retry failed message').props.onPress();
          await flush();
          await flush();
        });
        assert.equal(f.sent[1].client_id, f.sent[0].client_id);
        assert.equal(f.uploads[0].form, form);
        assert.equal(input().props.value, 'Next message stays here');
      }
    } finally {
      if (screen) act(() => screen.unmount());
    }
  }
});

test('mobile editor keeps its input mounted, grows within bounds, and exposes formatting with touch-sized controls', async () => {
  const f = fixture(390);
  let screen;
  const flatten = (style) =>
    Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
      pressable(screen.root, 'Open general, 1 unread').props.onPress();
      await flush();
    });
    const input = () =>
      screen.root.findByProps({ accessibilityLabel: 'Message composer' });
    const original = input();
    assert.equal(input().props.blurOnSubmit, false);
    assert.equal(flatten(input().props.style).fontSize, 16);
    act(() =>
      input().props.onContentSizeChange({
        nativeEvent: { contentSize: { height: 900 } },
      }),
    );
    assert.equal(flatten(input().props.style).height, 132);
    act(() =>
      input().props.onContentSizeChange({
        nativeEvent: { contentSize: { height: 30 } },
      }),
    );
    assert.equal(flatten(input().props.style).height, 52);
    assert.equal(input(), original);
    assert.equal(pressable(screen.root, 'Bold text'), undefined);
    act(() => pressable(screen.root, 'Formatting options').props.onPress());
    const bold = pressable(screen.root, 'Bold text');
    assert.ok(flatten(bold.props.style({ pressed: false })).minHeight >= 44);
    assert.ok(
      flatten(pressable(screen.root, 'Send message').props.style).height >= 44,
    );
    act(() => input().props.onChangeText('A line\nAnother line'));
    assert.equal(input().props.value, 'A line\nAnother line');
    assert.equal(input(), original);
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('mobile message actions expose thread replies without covering the message with three controls', async () => {
  const f = fixture(390);
  let screen;
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
      pressable(screen.root, 'Open general, 1 unread').props.onPress();
      await flush();
    });
    assert.equal(pressable(screen.root, 'Add a reaction'), undefined);
    act(() => pressable(screen.root, 'Message actions').props.onPress());
    assert.ok(pressable(screen.root, 'Reply in thread'));
    await act(async () => {
      pressable(screen.root, 'Reply in thread').props.onPress();
      await flush();
    });
    assert.ok(screen.root.findByProps({ testID: 'connect-thread' }));
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('channel forms keep labels and typed text across option changes, with multiline description', async () => {
  const f = fixture(1280, 'android', 'FOUNDER', { canManage: true });
  let screen;
  const flatten = (style) =>
    Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    act(() => pressable(screen.root, 'Create').props.onPress());
    const field = (label) =>
      screen.root
        .findAllByType('TextInput')
        .find((node) => node.props.accessibilityLabel === label);
    act(() => field('Channel name').props.onChangeText('mobile-team'));
    act(() => field('Channel purpose').props.onChangeText('Shipping together'));
    act(() =>
      field('Channel description').props.onChangeText('Line one\nLine two'),
    );
    act(() =>
      pressable(screen.root, 'Public · employees can join').props.onPress(),
    );
    assert.equal(field('Channel name').props.value, 'mobile-team');
    assert.equal(field('Channel purpose').props.value, 'Shipping together');
    assert.equal(
      field('Channel description').props.value,
      'Line one\nLine two',
    );
    assert.equal(field('Channel description').props.multiline, true);
    for (const label of [
      'Channel name',
      'Channel purpose',
      'Channel description',
    ]) {
      assert.match(textOf(screen.root), new RegExp(label));
      assert.equal(flatten(field(label).props.style).fontSize, 16);
      assert.ok(flatten(field(label).props.style).height >= 48);
    }
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('web multiline input remeasures both growth and shrinkage without remounting', async () => {
  const previousDocument = global.document;
  global.document = {
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
  };
  const f = fixture(1280, 'web');
  let screen;
  const flatten = (style) =>
    Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
  try {
    await act(async () => {
      screen = create(React.createElement(f.Screen));
      await flush();
    });
    const input = () =>
      screen.root.findByProps({ accessibilityLabel: 'Message composer' });
    const original = input();
    const node = { tagName: 'TEXTAREA', style: {}, scrollHeight: 500 };
    act(() => input().props.onChange({ target: node }));
    assert.equal(flatten(input().props.style).height, 132);
    assert.equal(node.style.height, '132px');
    node.scrollHeight = 48;
    act(() => input().props.onChange({ target: node }));
    assert.equal(flatten(input().props.style).height, 52);
    assert.equal(node.style.height, '52px');
    assert.equal(input(), original);
  } finally {
    if (screen) act(() => screen.unmount());
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
