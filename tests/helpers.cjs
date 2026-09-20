const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../SuperAdminBackend');

// Load the real TS/TSX modules with explicit boundaries for native UI and infrastructure.
function loader(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (Object.hasOwn(mocks, filename)) return mocks[filename];
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    const localRequire = createRequire(filename);
    function requireModule(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (!id.startsWith('.')) return localRequire(id);
      const base = path.resolve(path.dirname(filename), id);
      const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.js`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      if (!resolved) throw new Error(`Cannot resolve ${id} from ${filename}`);
      return load(resolved);
    }
    const source = fs.readFileSync(filename, 'utf8');
    const code = /\.tsx?$/.test(filename) ? ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    }, fileName: filename }).outputText : source;
    vm.runInThisContext(`(function(require,module,exports,__dirname,__filename){${code}\n})`, { filename })(requireModule, mod, mod.exports, path.dirname(filename), filename);
    return mod.exports;
  }
  return load;
}

async function checklistServer() {
  const backendRequire = createRequire(path.join(backend, 'package.json'));
  const express = backendRequire('express');
  const rows = [];
  const audits = [];
  let failReads = false;
  function sql(strings, ...values) {
    const query = strings.join('?').replace(/\s+/g, ' ').trim();
    if (query.startsWith('id =') || query.startsWith('task_key =')) return { query, value: values[0] };
    if (query.startsWith('INSERT INTO school_onboarding_checklists')) {
      const [school_id, task_key, title, category] = values;
      if (!rows.some((item) => item.school_id === school_id && item.task_key === task_key)) rows.push({
        id: `item-${rows.length + 1}`, school_id, task_key, task_code: task_key, title, category,
        status: 'NOT_STARTED', notes: null, blocker_reason: null, sort_order: rows.length + 1,
      });
      return Promise.resolve([]);
    }
    if (query.startsWith('SELECT c.id')) {
      if (failReads) return Promise.reject(new Error('Simulated storage outage'));
      return Promise.resolve(rows.filter((item) => item.school_id === values[0]).map((item) => ({ ...item })));
    }
    if (query.startsWith('SELECT id, task_key, notes')) {
      const [schoolId, lookup] = values;
      return Promise.resolve(rows.filter((item) => item.school_id === schoolId && (lookup.query.startsWith('id =') ? item.id : item.task_key) === lookup.value));
    }
    if (query.startsWith('UPDATE school_onboarding_checklists')) {
      const [status, blocker_reason, notes, completed_by, completed_at, id] = values;
      const item = rows.find((row) => row.id === id);
      Object.assign(item, { status, blocker_reason, notes, completed_by, completed_at });
      return Promise.resolve([{ ...item }]);
    }
    throw new Error(`Unexpected SQL in checklist fixture: ${query}`);
  }
  const mocks = {
    [path.join(backend, 'src/config/db.js')]: sql,
    [path.join(backend, 'src/config/env.js')]: { schoolSupabase: { jwtSecret: 'test-only' } },
    [path.join(backend, 'src/config/supabase.js')]: {},
    [path.join(backend, 'src/services/auditLogger.js')]: { logAudit: async (event) => audits.push(event) },
  };
  const realRbac = loader(mocks)(path.join(backend, 'src/middleware/rbac.js'));
  const { getRolePermissions } = loader(mocks)(path.join(backend, 'src/config/rbac.js'));
  // Only token/session lookup is stubbed; real permission and school-scope checks run.
  mocks[path.join(backend, 'src/middleware/rbac.js')] = { ...realRbac, authenticateUser: (req, res, next) => {
    const role = req.headers.authorization?.replace('Bearer ', '');
    if (!role) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: 'fixture-employee', role, isFounder: role === 'FOUNDER', permissions: getRolePermissions(role), assignedSchoolIds: [101] };
    next();
  } };
  const routesDir = path.join(backend, 'src/routes');
  for (const folder of ['superadmin', 'medical']) {
    for (const file of fs.readdirSync(path.join(routesDir, folder))) {
      if (file.endsWith('.js') && file !== 'checklist.js') mocks[path.join(routesDir, folder, file)] = express.Router();
    }
  }
  const schools = mocks[path.join(routesDir, 'superadmin/schools.js')];
  schools.get('/', (req, res) => res.json([{ id: 101, name: 'School A', code: 'A' }, { id: 202, name: 'School B', code: 'B' }]));
  schools.get('/:id', (req, res) => res.json({ id: Number(req.params.id), name: 'School detail' }));
  mocks[path.join(routesDir, 'public.js')] = express.Router();
  const health = express.Router(); health.sendHealth = (req, res) => res.json({ ok: true });
  mocks[path.join(routesDir, 'health.js')] = health;
  const routes = loader(mocks)(path.join(routesDir, 'index.js'));
  const app = express(); app.use(express.json()); app.use(routes);
  const server = await new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const axios = require('axios');
  const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, headers: { Authorization: 'Bearer FOUNDER' } });
  const load = loader({
    [path.join(frontend, 'src/api/superAdminClient.ts')]: { superAdminClient: client },
    [path.join(frontend, 'src/api/tokens.ts')]: {},
  });
  const api = load(path.join(frontend, 'src/services/apiService.ts')).superAdminApi;
  return { client, api, rows, audits, failReads: (value) => { failReads = value; }, close: () => new Promise((resolve) => server.close(resolve)) };
}

const React = require('react');
const native = {
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator', Modal: ({ visible, children }) => visible ? React.createElement('Modal', null, children) : null,
  Platform: { OS: 'ios' }, Alert: { alert: () => {} }, StyleSheet: { create: (styles) => styles },
};
function uiLoader(overrides = {}) {
  const colors = { primary: '#1765B2', textPrimary: '#111111', textSecondary: '#555555', border: '#DDDDDD', background: '#F5F7FA' };
  const mocks = {
    'react-native': native,
    'lucide-react-native': new Proxy({}, { get: (_, key) => key === '__esModule' ? true : () => null }),
    'expo-router': { useLocalSearchParams: () => ({}), useRouter: () => ({ push: () => {} }), usePathname: () => '/sales/playbook' },
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: { useTheme: () => ({ colors, isDark: false, clayShadows: {} }), clayStyle: () => ({}) },
    [path.join(frontend, 'src/hooks/useAuth.ts')]: { useAuth: () => ({ user: { id: 'employee-a' }, can: () => true, role: 'SALES_EXECUTIVE', isFounder: false }) },
    [path.join(frontend, 'src/screens/founder/founderUi.tsx')]: { bottomTabPad: 80 },
    [path.join(frontend, 'src/components/auth/RouteGuard.tsx')]: { RouteGuard: ({ children }) => children },
    ...overrides,
  };
  for (const key of Object.keys(mocks)) if (mocks[key] === null) delete mocks[key];
  return loader(mocks);
}
function textOf(node) { return typeof node === 'string' ? node : (node?.children || []).map(textOf).join(''); }
function pressable(root, label) { return root.findAllByType('Pressable').find((node) => node.props.accessibilityLabel === label || textOf(node) === label); }
module.exports = { loader, uiLoader, frontend, backend, checklistServer, textOf, pressable };
