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

function fixture(width = 390) {
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
      role: 'QA',
    },
    can_manage: false,
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
        : [baseMessage(1, { reply_count: 1 })],
      has_more: false,
      last_sequence: 2,
    }),
    message: async (id) => baseMessage(Number(id.slice(1))),
    employees: async () => [],
    notifications: async () => [],
    read: async () => {},
    send: async (id, draft) => {
      sent.push({ ...draft });
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
    Platform: { OS: 'android' },
    AppState: {
      addEventListener: (_type, fn) => {
        events.foreground = fn;
        return { remove: () => {} };
      },
    },
    useWindowDimensions: () => ({ width, height: 800 }),
  };
  const load = uiLoader({
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
      useAuth: () => ({ user: { id: currentUser }, role: 'QA' }),
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
test('Connect route allows internal roles and excludes Books-only CA accounts', () => {
  for (const role of [
    'QA',
    'SALES_EXECUTIVE',
    'SUPPORT_MANAGER',
    'FOUNDER',
    'CA',
    'CA_LEAD',
  ]) {
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
      !role.startsWith('CA'),
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
