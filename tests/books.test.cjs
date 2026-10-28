const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loader, frontend, textOf } = require('./helpers.cjs');
const p = (s) => path.join(frontend, s);
const colors = {
  primary: '#3b73c4',
  textPrimary: '#111',
  textSecondary: '#555',
  textTertiary: '#888',
  background: '#f8fafc',
  surface: '#fff',
  border: '#ddd',
  hover: '#eee',
};
const native = {
  View: 'View',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  Switch: 'Switch',
  Modal: ({ visible, children }) =>
    visible ? React.createElement('Modal', null, children) : null,
  Platform: { OS: 'web' },
  StyleSheet: { create: (x) => x },
  useWindowDimensions: () => ({ width: 1300, height: 900 }),
};
const contact = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'customer',
  name: 'School A',
  active: true,
  payment_terms: 30,
  state_code: '36',
};
function environment(overrides = {}) {
  const calls = [],
    api = {
      labels: { invoice: 'Invoices' },
      singular: { invoice: 'Invoice' },
      today: () => '2026-10-26',
      decimal: (n) => (Number(n || 0) / 100).toFixed(2),
      money: (n) => 'INR ' + (Number(n || 0) / 100).toFixed(2),
      message: (e) => e.message,
      requestKey: () => '11111111-1111-4111-8111-111111111111',
      post: async (url, body) => {
        calls.push({ url, body });
        return {
          id: 'doc',
          number: 'INV/2026/00001',
          ...body,
          status: 'draft',
        };
      },
      put: async () => {},
      get: async () => [],
      ...overrides,
    };
  const load = loader({
    'react-native': native,
    'expo-router': {
      useRouter: () => ({ setParams: () => {} }),
      useLocalSearchParams: () => ({}),
    },
    'lucide-react-native': new Proxy(
      {},
      { get: (_, k) => (k === '__esModule' ? true : () => null) },
    ),
    [p('src/contexts/ThemeContext.tsx')]: { useTheme: () => ({ colors }) },
    [p('src/api/books.ts')]: api,
    [p('src/hooks/useAuth.ts')]: { useAuth: () => ({ isFounder: true, role: 'FOUNDER', permissions: [], can: () => true, refreshSessionProfile: async () => {} }) },
    [p('src/screens/books/BooksCompanyContext.tsx')]: { useBooksAccess: () => ({ isFounder: true, role: 'FOUNDER', permissions: [], can: () => true, refreshSessionProfile: async () => {} }) },
    'expo-document-picker': {},
    'expo-file-system': {},
    ...overrides.mocks,
  });
  return { load, api, calls };
}
async function press(tree, label) {
  const b = tree.root
    .findAllByType('Pressable')
    .find((b) => b.props.accessibilityLabel === label);
  assert.ok(b, `Missing ${label}`);
  assert.ok(!b.props.disabled, `${label} is disabled`);
  await act(async () => b.props.onPress({ stopPropagation() {} }));
}
async function input(tree, label, value) {
  const f = tree.root
    .findAllByType('TextInput')
    .find((f) => f.props.accessibilityLabel === label);
  assert.ok(f, `Missing ${label}`);
  await act(async () => f.props.onChangeText(value));
}
test('statement CSV handles quoted commas, rejects malformed rows, and neutralizes spreadsheet formulas', () => {
  const { parseStatement, toCsv } = environment().load(
    p('src/screens/books/csv.ts'),
  );
  const rows = parseStatement(
    'date,description,amount,reference,external_key\r\n2026-10-26,"School A, Hyderabad",118,UPI,1',
  );
  assert.equal(rows[0].description, 'School A, Hyderabad');
  assert.throws(
    () => parseStatement('date,amount\n2026-10-26,100'),
    /description/,
  );
  assert.throws(
    () =>
      parseStatement(
        'date,description,amount,external_key\n2026-10-26,"bad,100,1',
      ),
    /Unclosed/,
  );
  assert.match(toCsv([{ name: '=HYPERLINK("bad")' }]), /\'=HYPERLINK/);
});
test('invoice editor selects a contact and preserves decimals in saved draft input', async () => {
  const env = environment();
  const Editor = env.load(p('src/screens/books/DocumentEditor.tsx')).default;
  let saved;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Editor, {
        kind: 'invoice',
        contacts: [contact],
        items: [],
        accounts: [],
        onClose() {},
        onSaved: (d) => {
          saved = d;
        },
      }),
    );
  });
  await press(tree, 'Customer');
  const option = tree.root
    .findAllByType('Pressable')
    .find((n) => textOf(n) === 'School A');
  await act(async () => option.props.onPress());
  await input(tree, 'Description 1', 'Subscription');
  await input(tree, 'Rate ₹ 1', '99.99');
  await input(tree, 'Quantity 1', '3');
  await input(tree, 'Tax % 1', '18');
  await press(tree, 'Save draft');
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].url, '/documents');
  assert.equal(env.calls[0].body.contact_id, contact.id);
  assert.equal(env.calls[0].body.lines[0].rate, '99.99');
  assert.equal(saved.status, 'draft');
  await act(async () => tree.unmount());
});
test('failed payment saves retain values and reuse the same idempotency key', async () => {
  const attempts = [];
  const env = environment({
    post: async (url, body) => {
      attempts.push({ ...body });
      throw new Error('Network unavailable');
    },
  });
  const Editor = env.load(p('src/screens/books/EntityEditor.tsx')).default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Editor, {
        type: 'payment',
        contacts: [],
        items: [],
        accounts: [{ code: '1010', name: 'Bank', is_cash: true }],
        projects: [],
        payments: [],
        document: { id: 'invoice-id', number: 'INV-1', balance: 11800 },
        onClose() {},
        onSaved() {},
      }),
    );
  });
  await input(tree, 'Amount ₹', '50.25');
  await press(tree, 'Record payment');
  assert.match(textOf(tree.toJSON()), /Network unavailable/);
  await press(tree, 'Record payment');
  assert.equal(attempts[0].amount, '50.25');
  assert.equal(attempts[0].request_key, attempts[1].request_key);
  await act(async () => tree.unmount());
});
test('new items expose inventory tracking and start without invented stock balances', async () => {
  const env = environment(),
    Editor = env.load(p('src/screens/books/EntityEditor.tsx')).default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Editor, {
        type: 'item',
        contacts: [],
        items: [],
        accounts: [],
        projects: [],
        payments: [],
        onClose() {},
        onSaved() {},
      }),
    );
  });
  assert.match(textOf(tree.toJSON()), /new items start at zero/);
  await input(tree, 'Item / service name', 'Device');
  await input(tree, 'Standard purchase cost ₹', '100');
  await act(async () =>
    tree.root.findByType('Switch').props.onValueChange(true),
  );
  await press(tree, 'Save');
  assert.equal(env.calls[0].body.track_inventory, true);
  assert.equal(env.calls[0].body.purchase_rate, '100');
  await act(async () => tree.unmount());
});
test('Books workspace loads persisted balances and navigates to invoice records', async () => {
  const report = {
    from: '2026-04-01',
    to: '2026-10-26',
    income: 10000,
    expenses: 0,
    profit: 10000,
    cash: 0,
    receivables: 11800,
    payables: 0,
    trial: [],
    cashflow: [],
    aging: [],
    taxes: [],
  };
  const env = environment({
    get: async (url) => {
      if (url === '/bootstrap')
        return {
          settings: { organization_name: 'NexSyrus', fiscal_year_month: 4 },
          stats: { contacts: 1, items: 0, documents: 1 },
        };
      if (url === '/reports' || url === '/dashboard') return report;
      if (url === '/lookups') return { contacts: [contact], items: [], accounts: [], payments: [], projects: [] };
      if (url === '/contacts') return [contact];
      if (url === '/documents')
        return {
          data: [
            {
              id: 'doc',
              number: 'INV/2026/00001',
              kind: 'invoice',
              date: '2026-10-26',
              contact_snapshot: contact,
              status: 'posted',
              total: 11800,
              balance: 11800,
            },
          ],
          total: 1,
        };
      return [];
    },
    mocks: {
      'expo-sharing': {},
      [p('src/api/superAdminClient.ts')]: { superAdminClient: {} },
      [p('src/components/ui/ScreenHeader.tsx')]: {
        ScreenHeader: ({ title, rightAction }) =>
          React.createElement(
            'View',
            null,
            React.createElement('Text', null, title),
            rightAction,
          ),
      },
    },
  });
  const Screen = env.load(p('src/screens/books/BooksScreen.tsx')).default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen));
  });
  await act(async () => new Promise((r) => setTimeout(r, 30)));
  assert.match(textOf(tree.toJSON()), /TOTAL RECEIVABLES/);
  assert.match(textOf(tree.toJSON()), /INR 118.00/);
  const invoices = tree.root
    .findAllByType('Pressable')
    .find(
      (n) => n.props.accessibilityRole === 'tab' && textOf(n) === 'Invoices',
    );
  assert.ok(invoices);
  await act(async () => invoices.props.onPress());
  await act(async () => new Promise((r) => setTimeout(r, 30)));
  assert.match(textOf(tree.toJSON()), /INV\/2026\/00001/);
  assert.match(textOf(tree.toJSON()), /New invoice/);
  await act(async () => tree.unmount());
});
test('invoice drafts preserve subject, salesperson, terms, document discount and adjustment', async () => {
  const env = environment(),
    Editor = env.load(p('src/screens/books/DocumentEditor.tsx')).default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Editor, {
        kind: 'invoice',
        contacts: [contact],
        items: [],
        accounts: [],
        onClose() {},
        onSaved() {},
      }),
    );
  });
  await input(tree, 'Subject', 'Implementation');
  await input(tree, 'Salesperson', 'Sales team');
  await input(tree, 'Terms & Conditions', 'Pay within 30 days');
  await input(tree, 'Description 1', 'Subscription');
  await input(tree, 'Rate ₹ 1', '100');
  await input(tree, 'Document discount ₹', '10');
  await input(tree, 'Adjustment ₹ (signed)', '-0.20');
  await press(tree, 'Save draft');
  const body = env.calls[0].body;
  assert.equal(body.subject, 'Implementation');
  assert.equal(body.salesperson, 'Sales team');
  assert.equal(body.terms, 'Pay within 30 days');
  assert.equal(body.discount_value, '10');
  assert.equal(body.adjustment, '-0.20');
  await act(async () => tree.unmount());
});
test('delivery challan editor exposes verified types and saves a draft without a posting request', async () => {
  const env = environment({
      labels: { invoice: 'Invoices', delivery_challan: 'Delivery challans' },
      singular: { invoice: 'Invoice', delivery_challan: 'Delivery challan' },
    }),
    Editor = env.load(p('src/screens/books/DocumentEditor.tsx')).default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Editor, {
        kind: 'delivery_challan',
        contacts: [contact],
        items: [],
        accounts: [],
        onClose() {},
        onSaved() {},
      }),
    );
  });
  await press(tree, 'Challan type');
  const job = tree.root
    .findAllByType('Pressable')
    .find((n) => textOf(n) === 'Job Work');
  assert.ok(job);
  await act(async () => job.props.onPress());
  await input(tree, 'Description 1', 'Materials');
  await input(tree, 'Rate ₹ 1', '0');
  await press(tree, 'Save draft');
  assert.equal(env.calls[0].body.challan_type, 'job_work');
  assert.equal(env.calls[0].body.kind, 'delivery_challan');
  assert.equal(env.calls.length, 1);
  await act(async () => tree.unmount());
});
test('global payment entry selects an outstanding document and uses its exact balance', async () => {
  const doc = {
    id: '22222222-2222-4222-8222-222222222222',
    number: 'INV/2026/00002',
    contact_snapshot: contact,
    balance: 5025,
  };
  const env = environment({ get: async () => ({ data: [doc] }) }),
    Editor = env.load(p('src/screens/books/EntityEditor.tsx')).default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Editor, {
        type: 'payment',
        contacts: [],
        items: [],
        accounts: [{ code: '1010', name: 'Bank', is_cash: true }],
        projects: [],
        payments: [],
        onClose() {},
        onSaved() {},
      }),
    );
  });
  await press(tree, 'Outstanding document');
  const choice = tree.root
    .findAllByType('Pressable')
    .find((n) => textOf(n).startsWith('INV/2026/00002'));
  assert.ok(choice);
  await act(async () => choice.props.onPress());
  await press(tree, 'Record payment');
  assert.equal(env.calls[0].body.document_id, doc.id);
  assert.equal(env.calls[0].body.amount, '50.25');
  await act(async () => tree.unmount());
});

function workspaceMocks(auth) {
  return {
    'expo-sharing': {},
    [p('src/hooks/useAuth.ts')]: { useAuth: () => auth },
    [p('src/screens/books/BooksCompanyContext.tsx')]: { useBooksAccess: () => auth },
    [p('src/api/superAdminClient.ts')]: { superAdminClient: {} },
    [p('src/components/ui/ScreenHeader.tsx')]: { ScreenHeader: ({ title, rightAction }) => React.createElement('View', null, React.createElement('Text', null, title), rightAction) },
  };
}
test('CA without grants sees pending access and makes no record requests', async () => {
  const calls = [], auth = { role: 'CA', isFounder: false, permissions: [], can: () => false, refreshSessionProfile: async () => calls.push('profile') };
  const env = environment({ get: async url => { calls.push(url); return []; }, mocks: workspaceMocks(auth) });
  const Screen = env.load(p('src/screens/books/BooksScreen.tsx')).default;
  let tree; await act(async () => { tree = create(React.createElement(Screen)); });
  await act(async () => new Promise(r => setTimeout(r, 10)));
  assert.match(textOf(tree.toJSON()), /Books access has not been assigned/);
  assert.deepEqual(calls, []);
  assert.equal(tree.root.findAllByType('Pressable').filter(n => n.props.accessibilityRole === 'tab').length, 0);
  await press(tree, 'Check my access'); assert.deepEqual(calls, ['profile']);
  await act(async () => tree.unmount());
});
test('reports-only CA loads scoped lookups and reports; hidden directories and create/export actions stay unavailable', async () => {
  const calls = [], permissions = ['books.reports.view'];
  const env = environment({ get: async url => {
    calls.push(url);
    if(url === '/bootstrap') return { settings: { organization_name:'Test',fiscal_year_month:4 }, stats:{} };
    if(url === '/lookups') return { contacts:[],items:[],accounts:[],payments:[],projects:[] };
    if(url === '/reports') return { income:0,expenses:0,profit:0,cash:0,receivables:0,payables:0,trial:[],aging:[],taxes:[],cashflow:[],aging_as_of:'2026-10-26' };
    throw new Error(`Unexpected request ${url}`);
  }, mocks: workspaceMocks({ role:'CA',isFounder:false,permissions,can:p=>permissions.includes(p) }) });
  const Screen = env.load(p('src/screens/books/BooksScreen.tsx')).default;
  let tree; await act(async()=>{tree=create(React.createElement(Screen));}); await act(async()=>new Promise(r=>setTimeout(r,20)));
  const tabs=tree.root.findAllByType('Pressable').filter(n=>n.props.accessibilityRole==='tab'); assert.equal(textOf(tabs[0]),'Reports'); assert.equal(tabs.some(n=>['Invoices','Customers','Vendors','Items & inventory','Dashboard','Settings'].includes(textOf(n))),false);
  assert.deepEqual(calls.sort(),['/bootstrap','/lookups','/reports']);
  assert.equal(tree.root.findAllByType('Pressable').some(n=>n.props.accessibilityLabel==='Export CSV'),false);
  assert.equal(tree.root.findAllByType('Pressable').some(n=>n.props.accessibilityLabel==='CA access'),false);
  await act(async()=>tree.unmount());
});
test('view-only document details disable posting and editing and do not fetch supporting files', async () => {
  const permissions=['books.invoice.view'];
  const env=environment({ mocks: workspaceMocks({role:'CA',isFounder:false,permissions,can:p=>permissions.includes(p)}) });
  const Detail=env.load(p('src/screens/books/DocumentDetail.tsx')).default;
  let tree; await act(async()=>{tree=create(React.createElement(Detail,{document:{id:'doc',number:'INV/1',kind:'invoice',status:'draft',date:'2026-10-26',contact_snapshot:contact,lines:[],tax_breakup:{cgst:0,sgst:0,igst:0}},onClose(){},onRefresh:async()=>{},onEdit(){},onEntity(){},onConverted(){}}));});
  const buttons=tree.root.findAllByType('Pressable');
  assert.equal(buttons.find(n=>n.props.accessibilityLabel==='Post document').props.disabled,true);
  assert.equal(buttons.find(n=>n.props.accessibilityLabel==='Void document').props.disabled,true);
  assert.equal(buttons.some(n=>n.props.accessibilityLabel==='Edit draft'),false);
  assert.equal(buttons.some(n=>n.props.accessibilityLabel==='Print / save PDF'),false);
  await act(async()=>tree.unmount());
});
test('owner grant editor starts empty, selects required viewing, saves exact choices and shows temporary password once', async () => {
  const previous=global.window; global.window={location:{origin:'http://localhost'}};
  try {
    const env=environment({ get:async url=>url==='/access/options'?{companies:[{id:'nexsyrus-id',name:'Nexsyrus'}],leads:[]}:url==='/access/catalog'?[{key:'invoice',label:'Invoices',actions:[{key:'view',label:'View',permission:'books.invoice.view'},{key:'post',label:'Post / finalize',permission:'books.invoice.post'}]}]:[], post:async(url,body)=>{env.calls.push({url,body});return{...body,temporary_password:'one-time-secret-test'};}, mocks:{...workspaceMocks({isFounder:true,role:'FOUNDER',permissions:[],can:()=>true}),'expo-clipboard':{setStringAsync:async()=>{}}} });
    const Screen=env.load(p('src/screens/books/BooksAccessScreen.tsx')).default;let tree;
    await act(async()=>{tree=create(React.createElement(Screen));}); await press(tree,'Create CA account');
    assert.equal(tree.root.findAllByType('Switch').every(s=>!s.props.value),true);
    await input(tree,'Full name','CA Murali'); await input(tree,'CA email','ca.murali@nexsyrus.com');
    await act(async()=>tree.root.findAllByType('Switch').find(s=>s.props.accessibilityLabel==='Allow Nexsyrus').props.onValueChange(true));
    const post=tree.root.findAllByType('Switch').find(s=>s.props.accessibilityLabel==='Post / finalize');await act(async()=>post.props.onValueChange(true));
    assert.equal(tree.root.findAllByType('Switch').every(s=>s.props.value),true);
    await press(tree,'Save CA access'); assert.deepEqual([...env.calls[0].body.company_access[0].permissions].sort(),['books.invoice.post','books.invoice.view']);
    assert.match(textOf(tree.toJSON()),/one-time-secret-test/); await press(tree,'I have saved it');assert.doesNotMatch(textOf(tree.toJSON()),/one-time-secret-test/);
    await act(async()=>tree.unmount());
  } finally { global.window=previous; }
});
test('CA direct routes allow Books and password settings, but deny founder access management and school pages', async () => {
  let pathname='/books';
  const env=environment({mocks:{...workspaceMocks({role:'CA',isFounder:false,permissions:[],can:()=>false,roleLabel:'Chartered Accountant'}),'expo-router':{usePathname:()=>pathname,useRouter:()=>({replace(){}})}}});
  const Guard=env.load(p('src/components/auth/AppRouteGuard.tsx')).AppRouteGuard;
  let tree;await act(async()=>{tree=create(React.createElement(Guard,null,React.createElement('Text',null,'Private child')));});assert.match(textOf(tree.toJSON()),/Private child/);
  pathname='/books/access';await act(async()=>tree.update(React.createElement(Guard,null,React.createElement('Text',null,'Private child'))));assert.match(textOf(tree.toJSON()),/Access Restricted/);assert.doesNotMatch(textOf(tree.toJSON()),/Private child/);
  pathname='/schools';await act(async()=>tree.update(React.createElement(Guard,null,React.createElement('Text',null,'Private child'))));assert.match(textOf(tree.toJSON()),/Access Restricted/);
  pathname='/books/account';await act(async()=>tree.update(React.createElement(Guard,null,React.createElement('Text',null,'Private child'))));assert.match(textOf(tree.toJSON()),/Private child/);
  await act(async()=>tree.unmount());
});

test('lead CA can open team management but remains blocked from platform user management', async () => {
  let pathname='/books/access';
  const env=environment({mocks:{...workspaceMocks({role:'CA_LEAD',isFounder:false,permissions:['books.invoice.view'],can:p=>p.startsWith('books.'),roleLabel:'Lead CA'}),'expo-router':{usePathname:()=>pathname,useRouter:()=>({replace(){}})}}});
  const Guard=env.load(p('src/components/auth/AppRouteGuard.tsx')).AppRouteGuard;
  let tree;await act(async()=>{tree=create(React.createElement(Guard,null,React.createElement('Text',null,'CA team controls')));});assert.match(textOf(tree.toJSON()),/CA team controls/);
  pathname='/users';await act(async()=>tree.update(React.createElement(Guard,null,React.createElement('Text',null,'Platform user controls'))));assert.match(textOf(tree.toJSON()),/Access Restricted/);assert.doesNotMatch(textOf(tree.toJSON()),/Platform user controls/);
  await act(async()=>tree.unmount());
});
test('lead CA team editor offers company-specific assignments without the ability to appoint leads', async () => {
  const previous=global.window;global.window={location:{origin:'http://localhost'}};
  try {
    const env=environment({ get:async url=>url==='/access/options'?{companies:[{id:'syrus',name:'Nexsyrus'},{id:'maxx',name:'Nexmaxx'}],leads:[]}:url==='/access/catalog'?[{key:'invoice',label:'Invoices',actions:[{key:'view',label:'View',permission:'books.invoice.view'}]}]:[],post:async(url,body)=>{env.calls.push({url,body});return {...body,temporary_password:'temporary'};},mocks:{...workspaceMocks({role:'CA_LEAD',isFounder:false,permissions:[],can:()=>true}),'expo-clipboard':{setStringAsync:async()=>{}}} });
    const Screen=env.load(p('src/screens/books/BooksAccessScreen.tsx')).default;let tree;await act(async()=>{tree=create(React.createElement(Screen));});await press(tree,'Create CA account');
    assert.equal(tree.root.findAllByType('Pressable').some(b=>b.props.accessibilityLabel==='Accounting role'),false);
    await input(tree,'Full name','Team CA');await input(tree,'CA email','team@example.test');
    await act(async()=>tree.root.findAllByType('Switch').find(s=>s.props.accessibilityLabel==='Allow Nexmaxx').props.onValueChange(true));
    await act(async()=>tree.root.findAllByType('Switch').find(s=>s.props.accessibilityLabel==='View').props.onValueChange(true));
    await press(tree,'Save CA access');assert.equal(env.calls[0].body.role,'CA');assert.deepEqual(env.calls[0].body.company_access,[{company_id:'maxx',permissions:['books.invoice.view']}]);
    await act(async()=>tree.unmount());
  } finally {global.window=previous;}
});
test('company switching remounts records under the new API scope and uses that company permissions', async () => {
  const scopes=[],seen=[];
  const auth={user:{id:'lead'},role:'CA_LEAD',permissions:['books.invoice.view'],mustChangePassword:false};
  const env=environment({setBooksCompany:id=>scopes.push(id),get:async()=>[{id:'maxx',code:'nexmaxx',name:'Nexmaxx',permissions:['books.reports.view']},{id:'syrus',code:'nexsyrus',name:'Nexsyrus',permissions:['books.invoice.view']}],mocks:{...workspaceMocks(auth)}});
  // Load the real provider for this test, rather than the screen-boundary mock.
  const mocks={...workspaceMocks(auth)};delete mocks[p('src/screens/books/BooksCompanyContext.tsx')];
  const load=loader({'expo-router':{useLocalSearchParams:()=>({company:'nexsyrus'})},'react-native':native,'lucide-react-native':new Proxy({},{get:()=>()=>null}),[p('src/contexts/ThemeContext.tsx')]:{useTheme:()=>({colors})},[p('src/api/books.ts')]:env.api,...mocks});
  const {default:Workspace,useBooksAccess}=load(p('src/screens/books/BooksCompanyContext.tsx'));
  function Records(){const {can}=useBooksAccess();React.useEffect(()=>{seen.push('mounted');return()=>seen.push('unmounted');},[]);return React.createElement('Text',null,can('books.invoice.view')?'Invoice records':'Report records');}
  let tree;await act(async()=>{tree=create(React.createElement(Workspace,null,React.createElement(Records)));});assert.match(textOf(tree.toJSON()),/Invoice records/);assert.equal(scopes.at(-1),'syrus');
  await press(tree,'Company books');const option=tree.root.findAllByType('Pressable').find(b=>textOf(b)==='Nexmaxx');assert.ok(option);await act(async()=>option.props.onPress());assert.match(textOf(tree.toJSON()),/Report records/);assert.equal(scopes.at(-1),'maxx');assert.deepEqual(seen,['mounted','unmounted','mounted']);
  await act(async()=>tree.unmount());
});
test('finance connections review retains the import dialog on failure and updates counts after retry', async () => {
  let attempts=0;
  const snapshot={summary:[{source_type:'expense',label:'Operating expenses',eligible:2,unlinked:2,unlinked_amount:'10000'}],rows:[],limit:200};
  const env=environment({get:async()=>snapshot,post:async()=>{attempts++;if(attempts===1)throw new Error('Import unavailable');return{...snapshot,imported:2,summary:[{...snapshot.summary[0],unlinked:0}]};}});
  const Component=env.load(p('src/screens/books/FinanceConnections.tsx')).default;
  let tree;await act(async()=>{tree=create(React.createElement(Component));});
  await press(tree,'Review existing records');assert.match(textOf(tree.toJSON()),/opening balances/);
  await press(tree,'Connect next 200 records');assert.match(textOf(tree.toJSON()),/Import unavailable/);
  await press(tree,'Connect next 200 records');assert.equal(attempts,2);assert.match(textOf(tree.toJSON()),/2 existing record/);assert.match(textOf(tree.toJSON()),/Up to date/);
  await act(async()=>tree.unmount());
});
test('finance connection viewing grants do not expose historical import actions', async () => {
  const auth={role:'CA',isFounder:false,can:p=>p==='books.connections.view',permissions:['books.connections.view']};
  const env=environment({get:async()=>({summary:[{source_type:'expense',label:'Expenses',eligible:1,unlinked:1,unlinked_amount:'10000'}],rows:[],limit:200}),mocks:workspaceMocks(auth)});
  const Component=env.load(p('src/screens/books/FinanceConnections.tsx')).default;
  let tree;await act(async()=>{tree=create(React.createElement(Component));});
  assert.equal(tree.root.findAllByType('Pressable').some(b=>b.props.accessibilityLabel==='Review existing records'),false);
  await act(async()=>tree.unmount());
});
