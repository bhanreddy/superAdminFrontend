const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { checklistServer, frontend, uiLoader, pressable, textOf } = require('./helpers.cjs');

async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  assert.fail('Screen did not settle');
}

test('frontend service matches mounted routes: fetch, idempotent init, update, reload and school isolation', async () => {
  const env = await checklistServer();
  try {
    assert.deepEqual((await env.api.getSchoolChecklist(101)).data.progress, { total: 0, completed: 0, percentage: 0 });
    const initialized = await env.api.initSchoolChecklist(101);
    assert.equal(initialized.success, true);
    assert.equal(initialized.data.schoolId, 101);
    assert.equal(initialized.data.items.length, 10);
    assert.equal((await env.api.initSchoolChecklist(101)).data.items.length, 10);
    const item = initialized.data.items[0];
    assert.ok(item.task_code && item.category && item.sort_order);
    await env.api.updateChecklistItem(101, item.id, { status: 'BLOCKED', blocker_reason: ' Awaiting data ', notes: ' Call principal ' });
    let fetched = (await env.api.getSchoolChecklist(101)).data.items[0];
    assert.equal(fetched.blocker_reason, 'Awaiting data'); assert.equal(fetched.notes, 'Call principal');
    await env.api.updateChecklistItem(101, item.id, { status: 'COMPLETED' });
    fetched = (await env.api.getSchoolChecklist(101)).data.items[0];
    assert.equal(fetched.notes, 'Call principal'); assert.equal(fetched.blocker_reason, null);
    assert.equal(fetched.completed_by, 'fixture-employee'); assert.ok(fetched.completed_at);
    assert.equal((await env.api.getSchoolChecklist(101)).data.progress.percentage, 10);
    await env.api.updateChecklistItem(101, item.id, { status: 'IN_PROGRESS', notes: '' });
    fetched = (await env.api.getSchoolChecklist(101)).data.items[0];
    assert.equal(fetched.notes, null); assert.equal(fetched.completed_at, null);
    assert.equal(env.audits.length, 3);
    await assert.rejects(env.api.updateChecklistItem(202, item.id, { status: 'COMPLETED' }), (e) => e.response.status === 404);
    assert.equal((await env.api.getSchoolChecklist(202)).data.items.length, 0);
    await assert.rejects(env.api.updateChecklistItem(101, item.id, { status: 'BLOCKED', blocker_reason: ' ' }), (e) => e.response.status === 400);
    await assert.rejects(env.api.updateChecklistItem(101, item.id, { status: 'INVALID' }), (e) => e.response.status === 400);
    await assert.rejects(env.api.getSchoolChecklist(-1), (e) => e.response.status === 400);
    assert.equal((await env.client.get('/api/super-admin/schools/101')).data.name, 'School detail');
    const legacy = '/api/super-admin/schools/101/checklist';
    assert.equal((await env.client.get(legacy)).data.data.items.length, 10);
    assert.equal((await env.client.post(`${legacy}/init`)).data.data.items.length, 10);
    await env.client.patch(`${legacy}/${item.task_code}`, { status: 'NOT_APPLICABLE' });
    assert.equal((await env.api.getSchoolChecklist(101)).data.items[0].status, 'NOT_APPLICABLE');
  } finally { await env.close(); }
});

test('all canonical checklist routes enforce authentication, permissions and assigned-school scope', async () => {
  const env = await checklistServer();
  try {
    const [item] = (await env.api.initSchoolChecklist(101)).data.items;
    const calls = [
      () => env.api.getSchoolChecklist(101), () => env.api.initSchoolChecklist(101),
      () => env.api.updateChecklistItem(101, item.id, { status: 'COMPLETED' }),
    ];
    delete env.client.defaults.headers.Authorization;
    for (const call of calls) await assert.rejects(call(), (e) => e.response.status === 401);
    env.client.defaults.headers.Authorization = 'Bearer SALES_EXECUTIVE';
    assert.equal((await calls[0]()).success, true);
    for (const call of calls.slice(1)) assert.equal((await call()).success, true);
    env.client.defaults.headers.Authorization = 'Bearer SUPPORT_EXECUTIVE';
    for (const call of calls.slice(1)) await assert.rejects(call(), (e) => e.response.status === 403);
    env.client.defaults.headers.Authorization = 'Bearer IMPLEMENTATION_EXECUTIVE';
    for (const call of calls) assert.equal((await call()).success, true);
    await assert.rejects(env.api.getSchoolChecklist(202), (e) => e.response.status === 403);
    await assert.rejects(env.api.initSchoolChecklist(202), (e) => e.response.status === 403);
    await assert.rejects(env.api.updateChecklistItem(202, item.id, { status: 'COMPLETED' }), (e) => e.response.status === 403);
  } finally { await env.close(); }
});

test('checklist screen loads, initializes, edits notes/status, persists and reloads through backend routes', async () => {
  const env = await checklistServer(); let screen;
  try {
    const load = uiLoader({ [path.join(frontend, 'src/services/apiService.ts')]: { superAdminApi: env.api } });
    const Screen = load(path.join(frontend, 'src/screens/checklist/ChecklistScreen.tsx')).default;
    await act(async () => { screen = create(React.createElement(Screen)); });
    await waitFor(() => pressable(screen.root, 'Initialize Standard SOP Checklist'));
    await act(async () => { await pressable(screen.root, 'Initialize Standard SOP Checklist').props.onPress(); });
    await waitFor(() => pressable(screen.root, 'Update'));
    await act(async () => { pressable(screen.root, 'Update').props.onPress(); });
    await act(async () => {
      pressable(screen.root, 'Completed').props.onPress();
      screen.root.findByProps({ accessibilityLabel: 'Operator notes' }).props.onChangeText('Verified in screen');
    });
    await act(async () => { await pressable(screen.root, 'Save task status').props.onPress(); });
    assert.equal((await env.api.getSchoolChecklist(101)).data.items[0].notes, 'Verified in screen');
    assert.match(textOf(screen.root), /1 of 10 deployment checkpoints completed/);
    await act(async () => { pressable(screen.root, 'Update').props.onPress(); });
    await act(async () => { screen.root.findByProps({ accessibilityLabel: 'Operator notes' }).props.onChangeText(''); });
    await act(async () => { await pressable(screen.root, 'Save task status').props.onPress(); });
    assert.equal((await env.api.getSchoolChecklist(101)).data.items[0].notes, null);
    await act(async () => { screen.unmount(); screen = create(React.createElement(Screen)); });
    await waitFor(() => pressable(screen.root, 'Update'));
    assert.match(textOf(screen.root), /1 of 10 deployment checkpoints completed/);
  } finally { if (screen) act(() => screen.unmount()); await env.close(); }
});

test('checklist load failure shows retry, never an initialize action', async () => {
  let fail = true; let screen;
  const api = {
    getSchools: async () => [{ id: 101, name: 'A', code: 'A' }],
    getSchoolChecklist: async () => { if (fail) throw new Error('Load failed'); return { success: true, data: { items: [], progress: { total: 0, completed: 0, percentage: 0 } } }; },
  };
  const Screen = uiLoader({ [path.join(frontend, 'src/services/apiService.ts')]: { superAdminApi: api } })(path.join(frontend, 'src/screens/checklist/ChecklistScreen.tsx')).default;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    assert.ok(pressable(screen.root, 'Retry checklist'));
    assert.equal(pressable(screen.root, 'Initialize Standard SOP Checklist'), undefined);
    fail = false;
    await act(async () => { await pressable(screen.root, 'Retry checklist').props.onPress(); });
    assert.ok(pressable(screen.root, 'Initialize Standard SOP Checklist'));
  } finally { act(() => screen.unmount()); }
});

test('late response for a previous school cannot overwrite the currently selected school', async () => {
  let schoolId = '101'; let resolveA; let screen;
  const payload = (id, title) => ({ success: true, data: { items: [{ id: `item-${id}`, title, category: 'CONTRACT_AND_SETUP', status: 'NOT_STARTED' }], progress: { total: 1, completed: 0, percentage: 0 } } });
  const api = {
    getSchools: async () => [{ id: 101, name: 'A', code: 'A' }, { id: 202, name: 'B', code: 'B' }],
    getSchoolChecklist: (id) => id === 101 ? new Promise((resolve) => { resolveA = resolve; }) : Promise.resolve(payload(202, 'School B task')),
  };
  const Screen = uiLoader({
    'expo-router': { useLocalSearchParams: () => ({ schoolId }) },
    [path.join(frontend, 'src/services/apiService.ts')]: { superAdminApi: api },
  })(path.join(frontend, 'src/screens/checklist/ChecklistScreen.tsx')).default;
  try {
    await act(async () => { screen = create(React.createElement(Screen)); });
    schoolId = '202';
    await act(async () => { screen.update(React.createElement(Screen)); });
    assert.match(textOf(screen.root), /School B task/);
    await act(async () => { resolveA(payload(101, 'School A task')); });
    assert.match(textOf(screen.root), /School B task/);
    assert.doesNotMatch(textOf(screen.root), /School A task/);
  } finally { act(() => screen.unmount()); }
});
