const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { act, create } = require("react-test-renderer");
const { uiLoader, frontend, textOf } = require("./helpers.cjs");
const sample = {
  id: "note-1",
  event_id: "event-1",
  channel: "support",
  kind: "complaint.updated",
  priority: "high",
  title: "Ticket escalated",
  body: "Review the assigned ticket",
  created_at: "2026-11-02T12:00:00Z",
  read_at: null,
  action_path: "/complaints",
};
const channels = [
  {
    id: "support",
    label: "Support",
    description: "Ticket updates",
    mandatory: false,
    total: 1,
    unread: 1,
    inbox_enabled: true,
    email_enabled: false,
    push_enabled: false,
    sms_enabled: false,
  },
  {
    id: "security",
    label: "Account & security",
    description: "Account changes",
    mandatory: true,
    total: 0,
    unread: 0,
    inbox_enabled: true,
    email_enabled: false,
    push_enabled: false,
    sms_enabled: false,
  },
];
function fixture() {
  let actor = {
    user: { id: "employee" },
    role: "SUPPORT_EXECUTIVE",
    roleLabel: "Support Executive",
    isFounder: false,
  };
  let fail = false;
  let rows = [{ ...sample }];
  let pending = null;
  const calls = [];
  const context = {
    data: {
      channels,
      unread: 1,
      capabilities: { email: false, push: false, sms: false },
      registered_devices: 0,
    },
    refresh: async () => {},
    changed: async () => {},
    revision: 0,
    error: null,
  };
  const api = {
    bootstrap: async () => context.data,
    list: async (params) => {
      calls.push(["list", params]);
      if (pending) return pending;
      if (fail) throw Error("offline");
      return {
        data: rows.filter((n) => !params.unread || !n.read_at),
        next_cursor: null,
      };
    },
    update: async (id, operation) => {
      calls.push(["update", id, operation]);
      if (fail) throw Error("offline");
      rows = rows.map((n) => ({
        ...n,
        read_at: operation === "read" ? "2026-11-02T13:00:00Z" : null,
      }));
    },
    preferences: async (...args) => calls.push(["preferences", ...args]),
    readAll: async (...args) => calls.push(["readAll", ...args]),
    publish: async (...args) => {
      calls.push(["publish", ...args]);
      if (fail) throw Error("offline");
    },
  };
  const native = {
    View: "View",
    Text: "Text",
    ScrollView: "ScrollView",
    TextInput: "TextInput",
    Switch: "Switch",
    Pressable: "Pressable",
    ActivityIndicator: "ActivityIndicator",
    Platform: {
      OS: "ios",
      select: (options) => options.ios || options.default,
    },
    StyleSheet: { create: (s) => s },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
      ...props
    }) =>
      React.createElement(
        "FlatList",
        props,
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
        ListFooterComponent,
      ),
  };
  const load = uiLoader({
    "react-native": native,
    "@react-navigation/native": {
      useFocusEffect: (fn) => React.useEffect(fn, [fn]),
    },
    "expo-router": {
      useRouter: () => ({ push: (route) => calls.push(["navigate", route]) }),
    },
    [path.join(frontend, "src/hooks/useAuth.ts")]: { useAuth: () => actor },
    [path.join(frontend, "src/contexts/NotificationContext.tsx")]: {
      useNotifications: () => context,
    },
    [path.join(frontend, "src/services/notifications/push.ts")]: {
      nativePushSupported: false,
    },
    [path.join(frontend, "src/api/notifications.ts")]: {
      notificationApi: api,
      notificationError: () => "Connection unavailable. Retry.",
    },
  });
  const Screen = load(
    path.join(
      frontend,
      "src/screens/notifications/NotificationCenterScreen.tsx",
    ),
  ).default;
  return {
    Screen,
    calls,
    context,
    fail: (v) => {
      fail = v;
    },
    actor: (v) => {
      actor = { ...actor, ...v };
    },
    rows: (v) => {
      rows = v;
    },
    pending: (v) => {
      pending = v;
    },
  };
}
const button = (screen, label) =>
  screen.root
    .findAllByType("Pressable")
    .find((n) => n.props.accessibilityLabel === label || textOf(n) === label);
async function mount(env) {
  let screen;
  await act(async () => {
    screen = create(React.createElement(env.Screen));
  });
  return screen;
}
async function tap(screen, label) {
  const b = button(screen, label);
  assert.ok(b, label);
  await act(async () => {
    await b.props.onPress();
  });
}

test("phone inbox filters unread records and retains rows on update failure", async () => {
  const env = fixture();
  const screen = await mount(env);
  assert.match(textOf(screen.root), /Ticket escalated/);
  await tap(screen, "Unread only");
  assert.equal(env.calls.at(-1)[1].unread, "true");
  env.fail(true);
  await tap(screen, "Mark read");
  assert.match(textOf(screen.root), /Connection unavailable/);
  assert.match(textOf(screen.root), /Ticket escalated/);
  assert.equal(env.calls.filter((c) => c[0] === "update").length, 1);
  await act(async () => screen.unmount());
});
test("preferences preserve mandatory security and disable unconfigured transports", async () => {
  const env = fixture();
  const screen = await mount(env);
  await tap(screen, "Preferences");
  const switches = screen.root.findAllByType("Switch");
  assert.equal(
    switches.find(
      (n) => n.props.accessibilityLabel === "Account & security: In-app inbox",
    ).props.disabled,
    true,
  );
  assert.equal(
    switches.find((n) => n.props.accessibilityLabel === "Support: Email").props
      .disabled,
    true,
  );
  const inbox = switches.find(
    (n) => n.props.accessibilityLabel === "Support: In-app inbox",
  );
  await act(async () => inbox.props.onValueChange(false));
  assert.deepEqual(
    env.calls.find((c) => c[0] === "preferences"),
    ["preferences", "support", { inbox_enabled: false }],
  );
  assert.match(textOf(screen.root), /Preferences saved/);
  await act(async () => screen.unmount());
});
test("announcement preserves its draft and retry key after failure; changed payload gets a fresh key", async () => {
  const env = fixture();
  env.actor({ isFounder: true, role: "FOUNDER", roleLabel: "Founder" });
  const screen = await mount(env);
  await tap(screen, "Announce");
  const input = (label) =>
    screen.root
      .findAllByType("TextInput")
      .find((n) => n.props.accessibilityLabel === label);
  await act(async () => {
    input("Announcement title").props.onChangeText("Maintenance");
    input("Announcement message").props.onChangeText(
      "Review your pending work.",
    );
  });
  env.fail(true);
  await tap(screen, "Send announcement");
  assert.equal(input("Announcement title").props.value, "Maintenance");
  const first = env.calls.filter((c) => c[0] === "publish").at(-1);
  await tap(screen, "Send announcement");
  assert.equal(env.calls.filter((c) => c[0] === "publish").at(-1)[2], first[2]);
  await act(async () =>
    input("Announcement message").props.onChangeText(
      "Updated maintenance plan.",
    ),
  );
  env.fail(false);
  await tap(screen, "Send announcement");
  assert.notEqual(
    env.calls.filter((c) => c[0] === "publish").at(-1)[2],
    first[2],
  );
  assert.equal(input("Announcement title").props.value, "");
  await act(async () => screen.unmount());
});
test("specialists cannot compose announcements; unsafe destinations have no open action", async () => {
  const env = fixture();
  env.rows([{ ...sample, action_path: "https://attacker.test" }]);
  const screen = await mount(env);
  assert.equal(button(screen, "Announce"), undefined);
  assert.equal(button(screen, "Open workspace"), undefined);
  await act(async () => screen.unmount());
});
test("late response from a previous channel cannot overwrite the selected inbox", async () => {
  const env = fixture();
  let settle;
  env.pending(
    new Promise((r) => {
      settle = r;
    }),
  );
  const screen = await mount(env);
  env.pending(null);
  env.rows([
    {
      ...sample,
      id: "security-note",
      channel: "security",
      title: "Account access changed",
    },
  ]);
  await tap(screen, "Account & security");
  await act(async () => settle({ data: [sample], next_cursor: null }));
  assert.match(textOf(screen.root), /Account access changed/);
  assert.ok(!textOf(screen.root).includes("Ticket escalated"));
  await act(async () => screen.unmount());
});
