const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loader, frontend } = require("./helpers.cjs");
function fixture() {
  let granted = false;
  let grantOnRequest = false;
  let session = "session-a";
  let requestCount = 0;
  let enabled = false;
  let responseHandler;
  let initial = null;
  let switchDuringPrompt = false;
  const calls = [];
  const sdk = {
    AndroidImportance: { HIGH: 4, DEFAULT: 3 },
    AndroidNotificationVisibility: { PRIVATE: 0 },
    setNotificationChannelAsync: async (...args) =>
      calls.push(["channel", ...args]),
    getPermissionsAsync: async () => ({ granted }),
    requestPermissionsAsync: async () => {
      requestCount++;
      if (switchDuringPrompt) session = "session-b";
      return { granted: granted || grantOnRequest };
    },
    getExpoPushTokenAsync: async () => ({
      data: "ExponentPushToken[device-token]",
    }),
    setNotificationHandler: () => {},
    getLastNotificationResponseAsync: async () => initial,
    addNotificationReceivedListener: () => ({
      remove: () => calls.push(["remove"]),
    }),
    addPushTokenListener: () => ({ remove: () => calls.push(["remove"]) }),
    addNotificationResponseReceivedListener: (fn) => {
      responseHandler = fn;
      return { remove: () => calls.push(["remove"]) };
    },
  };
  const load = loader({
    "react-native": { Platform: { OS: "android" } },
    "expo-constants": {
      __esModule: true,
      default: { easConfig: { projectId: "test-project" } },
    },
    "expo-notifications": sdk,
    [path.join(frontend, "src/api/tokens.ts")]: {
      getStoredAccessToken: async () => session,
    },
    [path.join(frontend, "src/api/notifications.ts")]: {
      notificationApi: {
        registerDevice: async (...args) => {
          calls.push(["register", ...args]);
          enabled = true;
          return { id: "device-id" };
        },
        deviceStatus: async () => ({ enabled }),
        removeSessionDevices: async () => {
          calls.push(["disable"]);
          enabled = false;
        },
      },
    },
  });
  return {
    push: load(
      path.join(frontend, "src/services/notifications/push.native.ts"),
    ),
    calls,
    grant: (v) => {
      granted = v;
    },
    switchDuringPrompt: () => {
      switchDuringPrompt = true;
      grantOnRequest = true;
    },
    emit: (response) => responseHandler(response),
    initial: (v) => {
      initial = v;
    },
    requests: () => requestCount,
  };
}
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
test("native enrolment creates named Android channels; denied permission never registers a token", async () => {
  const env = fixture();
  await assert.rejects(
    env.push.enableDevicePush([
      { id: "security", label: "Security", mandatory: true },
    ]),
    /not granted/,
  );
  assert.equal(env.calls.filter((c) => c[0] === "register").length, 0);
  assert.equal(env.requests(), 1);
  env.grant(true);
  await env.push.enableDevicePush([
    { id: "support", label: "Support", mandatory: false },
  ]);
  assert.equal(env.calls.filter((c) => c[0] === "register").length, 1);
  assert.equal(env.requests(), 1);
  assert.ok(await env.push.devicePushEnabled());
  await env.push.disableDevicePush();
  assert.equal(await env.push.devicePushEnabled(), false);
});
test("account switch during permission request prevents token registration", async () => {
  const env = fixture();
  env.switchDuringPrompt();
  env.grant(false);
  await assert.rejects(env.push.enableDevicePush([]), /session changed/);
  assert.equal(env.calls.filter((c) => c[0] === "register").length, 0);
});
test("push taps ignore another account, navigate only once and detach on disposal", async () => {
  const env = fixture();
  let opens = 0;
  let received = 0;
  const dispose = env.push.watchDevicePush(
    "user-a",
    () => received++,
    () => opens++,
  );
  await settle();
  const response = (user_id) => ({
    notification: {
      request: {
        identifier: "push-id",
        content: { data: { user_id, path: "https://unsafe.test" } },
      },
    },
  });
  env.emit(response("user-b"));
  assert.equal(opens, 0);
  env.emit(response("user-a"));
  env.emit(response("user-a"));
  assert.equal(opens, 1);
  assert.equal(received, 1);
  dispose();
  env.emit({
    notification: {
      request: {
        identifier: "another",
        content: { data: { user_id: "user-a" } },
      },
    },
  });
  assert.equal(opens, 1);
  assert.equal(env.calls.filter((c) => c[0] === "remove").length, 3);
});
