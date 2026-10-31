const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const {
  loader,
  uiLoader,
  frontend,
  textOf,
  pressable,
} = require('./helpers.cjs');
const model = loader()(
  path.join(frontend, 'src/screens/dashboard/dashboardModel.ts'),
);

test('dashboard trend aggregates monthly categories and preserves missing values and negative adjustments', () => {
  const result = model.collectionTrend(
    [
      { year: 2026, month: 9, category: 'A', total_income: '100' },
      { year: 2026, month: 9, category: 'B', total_income: '200' },
      { year: 2026, month: 10, total_income: -25 },
      { year: 2026, month: 18, total_income: 999 },
    ],
    [
      { year: 2026, month: 10, total_amount: 50 },
      { month: '2026-08', total_amount: 10 },
    ],
  );
  assert.deepEqual(
    result.map((r) => [r.key, r.collections, r.expenses]),
    [
      ['2026-08', null, 10],
      ['2026-09', 300, null],
      ['2026-10', -25, 50],
    ],
  );
  assert.deepEqual(model.collectionTrend([], []), []);
});
test('dashboard spending uses the local current calendar month and merges categories', () => {
  assert.deepEqual(
    model.spendComposition(
      [
        { year: 2026, month: 11, category: 'Travel', total_amount: 45 },
        { month: '2026-11', category: 'Travel', total_amount: 55 },
        { year: 2026, month: 10, category: 'Old', total_amount: 900 },
      ],
      new Date(2026, 10, 1),
    ),
    [{ label: 'Travel', amount: 100 }],
  );
  assert.match(model.money(1234.56), /1,234\.56/);
});
test('school filters use explicit lifecycle state instead of assuming active means live', () => {
  const schools = [
    {
      id: 1,
      name: 'Orchid Academy',
      code: 'ORC',
      is_active: true,
      onboarding_status: 'pending_build',
    },
    {
      id: 2,
      name: 'River School',
      code: 'RIV',
      is_active: true,
      onboarding_status: 'live',
    },
    {
      id: 3,
      name: 'Pause School',
      code: 'P',
      is_active: false,
      onboarding_status: 'live',
    },
  ];
  assert.equal(model.schoolState(schools[0]), 'Onboarding');
  assert.deepEqual(
    model.filterSchools(schools, ' riv ', 'Live').map((s) => s.id),
    [2],
  );
  assert.deepEqual(
    model.filterSchools(schools, '', 'Paused').map((s) => s.id),
    [3],
  );
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function resourceFixture() {
  let state;
  const load = loader({
    '@react-navigation/native': {
      useFocusEffect: (fn) => React.useEffect(fn, [fn]),
    },
    [path.join(frontend, 'src/services/apiService.ts')]: {},
    [path.join(frontend, 'src/services/founderSupabase.ts')]: {},
  });
  const { useDashboardResource } = load(
    path.join(frontend, 'src/screens/dashboard/useDashboardData.ts'),
  );
  function Harness({ scope, request }) {
    state = useDashboardResource(scope, request);
    return null;
  }
  return {
    Harness,
    get state() {
      return state;
    },
  };
}
test('period changes never publish late financial responses from a previous request', async () => {
  const f = resourceFixture(),
    old = deferred(),
    next = deferred();
  let screen;
  await act(async () => {
    screen = create(
      React.createElement(f.Harness, {
        scope: 'month',
        request: () => old.promise,
      }),
    );
  });
  await act(async () => {
    screen.update(
      React.createElement(f.Harness, {
        scope: 'year',
        request: () => next.promise,
      }),
    );
  });
  assert.equal(f.state.data, null);
  await act(async () => {
    next.resolve({ revenue: 400 });
  });
  await act(async () => {
    old.resolve({ revenue: 100 });
  });
  assert.deepEqual(f.state.data, { revenue: 400 });
  act(() => screen.unmount());
});
test('a refresh failure hides stale figures and retry can recover without resetting other sources', async () => {
  const f = resourceFixture();
  let fails = false,
    screen;
  const request = async () => {
    if (fails) throw Error('offline');
    return { revenue: 200 };
  };
  await act(async () => {
    screen = create(
      React.createElement(f.Harness, { scope: 'actor:cluster:month', request }),
    );
  });
  assert.equal(f.state.data.revenue, 200);
  fails = true;
  await act(async () => {
    await f.state.reload();
  });
  assert.equal(f.state.data, null);
  assert.equal(f.state.error, true);
  fails = false;
  await act(async () => {
    await f.state.reload();
  });
  assert.equal(f.state.data.revenue, 200);
  assert.equal(f.state.error, false);
  act(() => screen.unmount());
});
const baseNative = {
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  RefreshControl: 'RefreshControl',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (x) => x },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  Platform: { OS: 'web' },
};
function workspaceFixture({
  approve = true,
  denied = [],
  financeError = false,
} = {}) {
  const calls = [],
    resource = (data) => ({
      data,
      loading: false,
      error: false,
      updatedAt: new Date(),
      reload: async () => {},
    });
  const data = {
    stats: resource({
      total_schools: 2,
      active_schools: 2,
      total_students: 100,
      total_staff: 12,
    }),
    schools: resource([
      {
        id: 101,
        cluster_id: 'cluster-B',
        name: 'River School',
        code: 'RIV',
        is_active: true,
        onboarding_status: 'live',
      },
    ]),
    analytics: resource({
      pending: { pending_collections: 12000 },
      incomeRows: [],
      expenseV2Rows: [],
    }),
    enquiries: resource({ unassignedEnquiries: 3 }),
    expenses: resource([{}, {}]),
    units: resource([]),
    financial: {
      ...resource({
        revenue: 120000,
        expenses: 40000,
        net_profit: 80000,
        profit_margin: 66.67,
        client_billing_collected: 10000,
      }),
      error: financeError,
      data: financeError
        ? null
        : {
            revenue: 120000,
            expenses: 40000,
            net_profit: 80000,
            profit_margin: 66.67,
            client_billing_collected: 10000,
          },
    },
    refreshing: false,
    refresh: async () => {},
  };
  const load = uiLoader({
    'react-native': baseNative,
    '@react-native-picker/picker': {
      Picker: Object.assign(
        ({ children, ...props }) =>
          React.createElement('Picker', props, children),
        { Item: 'PickerItem' },
      ),
    },
    'react-native-svg': {
      __esModule: true,
      default: 'Svg',
      Line: 'Line',
      Path: 'Path',
      Circle: 'Circle',
    },
    'expo-router': {
      useRouter: () => ({ push: (route) => calls.push(route) }),
    },
    [path.join(frontend, 'src/hooks/useAuth.ts')]: {
      useAuth: () => ({
        role: 'FOUNDER',
        user: { id: 'actor' },
        currentAdmin: { full_name: 'Anika Rao' },
        can: (p) => !denied.includes(p),
      }),
    },
    [path.join(frontend, 'src/hooks/useFounderAuth.ts')]: {
      useFounderAuth: () => ({ canApproveReject: approve }),
    },
    [path.join(frontend, 'src/contexts/ClusterContext.tsx')]: {
      useCluster: () => ({
        selectedCluster: { cluster_id: 'cluster-A', label: 'Cluster A' },
      }),
    },
    [path.join(frontend, 'src/screens/dashboard/useDashboardData.ts')]: {
      useDashboardData: () => data,
    },
  });
  return {
    Screen: load(
      path.join(frontend, 'src/screens/dashboard/ExecutiveDashboard.tsx'),
    ).default,
    calls,
  };
}
test('finance failure preserves the school portfolio and shows no replacement revenue', () => {
  const f = workspaceFixture({ financeError: true });
  let screen;
  act(() => {
    screen = create(React.createElement(f.Screen));
  });
  assert.match(textOf(screen.root), /financial summary is unavailable/);
  assert.match(textOf(screen.root), /River School/);
  assert.doesNotMatch(textOf(screen.root), /1,20,000/);
  act(() => screen.unmount());
});
test('portfolio navigation preserves a school’s cluster context', () => {
  const f = workspaceFixture();
  let screen;
  act(() => {
    screen = create(React.createElement(f.Screen));
  });
  act(() =>
    pressable(screen.root, 'Open River School, RIV, Live').props.onPress(),
  );
  assert.deepEqual(f.calls[0], {
    pathname: '/(app)/schools/[id]',
    params: { id: '101', cluster_id: 'cluster-B' },
  });
  act(() => screen.unmount());
});
test('workspace directory searches real destinations and respects denied capabilities', () => {
  const f = workspaceFixture({
    denied: ['users.read.team', 'users.manage', 'schools.create'],
    approve: false,
  });
  let screen;
  act(() => {
    screen = create(React.createElement(f.Screen));
  });
  assert.equal(pressable(screen.root, 'Add school'), undefined);
  assert.doesNotMatch(textOf(screen.root), /Expense approvals/);
  act(() => pressable(screen.root, 'Browse all workspaces').props.onPress());
  assert.doesNotMatch(textOf(screen.root), /Team management/);
  const search = screen.root
    .findAllByType('TextInput')
    .find((n) => n.props.accessibilityLabel === 'Find a workspace');
  act(() => search.props.onChangeText('billing'));
  assert.match(textOf(screen.root), /Client billing/);
  assert.doesNotMatch(textOf(screen.root), /Medical shops/);
  act(() => pressable(screen.root, 'Filter Operations').props.onPress());
  assert.match(textOf(screen.root), /No matching workspace/);
  act(() => pressable(screen.root, 'Reset workspace filters').props.onPress());
  assert.doesNotMatch(textOf(screen.root), /Team management/);
  act(() => pressable(screen.root, 'Filter Finance').props.onPress());
  assert.equal(pressable(screen.root, 'Open Schools'), undefined);
  assert.ok(pressable(screen.root, 'Open Client billing'));
  act(() => search.props.onChangeText('billing'));
  act(() => pressable(screen.root, 'Open Client billing').props.onPress());
  assert.equal(f.calls[0], '/(app)/console/billing');
  act(() => screen.unmount());
});
test('unreported months remain visible gaps rather than connecting invented trend points', () => {
  const result = model.collectionTrend(
    [
      { year: 2026, month: 8, amount: 12 },
      { year: 2026, month: 10, amount: 14 },
    ],
    [],
    3,
  );
  assert.deepEqual(
    result.map((p) => [p.key, p.collections]),
    [
      ['2026-08', 12],
      ['2026-09', null],
      ['2026-10', 14],
    ],
  );
});
test('home routing preserves accountant password flow and every specialist dashboard', () => {
  let role = 'FOUNDER',
    mustChangePassword = false;
  const mocks = {
    'expo-router': {
      Redirect: (props) => React.createElement('Redirect', props),
    },
    [path.join(frontend, 'src/hooks/useAuth.ts')]: {
      useAuth: () => ({ role, mustChangePassword }),
    },
  };
  for (const [file, name] of [
    ['dashboard/ExecutiveDashboard', 'Executive'],
    ['dashboards/SalesManagerDashboard', 'SalesManager'],
    ['dashboards/SalesExecutiveDashboard', 'SalesExecutive'],
    ['dashboards/ImplementationDashboard', 'Implementation'],
    ['dashboards/SupportDashboard', 'Support'],
    ['dashboards/GenericRoleDashboard', 'Generic'],
  ])
    mocks[path.join(frontend, 'src/screens/' + file + '.tsx')] = {
      __esModule: true,
      default: () => React.createElement('RoleView', { name }),
    };
  const Screen = loader(mocks)(
    path.join(frontend, 'app/(app)/index.tsx'),
  ).default;
  for (const [r, name] of [
    ['FOUNDER', 'Executive'],
    ['SUPER_ADMIN', 'Executive'],
    ['SALES_MANAGER', 'SalesManager'],
    ['SALES_EXECUTIVE', 'SalesExecutive'],
    ['IMPLEMENTATION_EXECUTIVE', 'Implementation'],
    ['SUPPORT_MANAGER', 'Support'],
    ['TECHNICAL_SUPPORT', 'Support'],
    ['VIEW_ONLY_ADMIN', 'Generic'],
  ]) {
    role = r;
    let screen;
    act(() => {
      screen = create(React.createElement(Screen));
    });
    assert.equal(screen.root.findByType('RoleView').props.name, name);
    act(() => screen.unmount());
  }
  for (const r of ['CA', 'CA_LEAD'])
    for (const change of [true, false]) {
      role = r;
      mustChangePassword = change;
      let screen;
      act(() => {
        screen = create(React.createElement(Screen));
      });
      assert.equal(
        screen.root.findByType('Redirect').props.href,
        change ? '/(app)/books/account' : '/(app)/books',
      );
      act(() => screen.unmount());
    }
});

test('changing finance period reloads only finance and partial failures remain independent', async () => {
  const calls = {
    stats: 0,
    schools: 0,
    analytics: 0,
    enquiries: 0,
    expenses: 0,
    units: 0,
    finance: [],
  };
  let state,
    failFinancial = false;
  const load = loader({
    '@react-navigation/native': {
      useFocusEffect: (fn) => React.useEffect(fn, [fn]),
    },
    [path.join(frontend, 'src/services/apiService.ts')]: {
      superAdminApi: {
        getDashboardStats: async () => {
          calls.stats++;
          return {
            total_schools: 1,
            active_schools: 1,
            total_students: 10,
            total_staff: 2,
          };
        },
        getSchools: async () => {
          calls.schools++;
          return [];
        },
      },
      founderApi: {
        getAnalytics: async () => {
          calls.analytics++;
          return { pending: null, incomeRows: [], expenseV2Rows: [] };
        },
        getEnquiryStats: async () => {
          calls.enquiries++;
          return { enquiriesToday: 0, unassignedEnquiries: 0 };
        },
        listExpenses: async () => {
          calls.expenses++;
          return [];
        },
        listBusinessUnits: async () => {
          calls.units++;
          return [];
        },
      },
    },
    [path.join(frontend, 'src/services/founderSupabase.ts')]: {
      getFinancialSummary: async (params) => {
        calls.finance.push(params);
        return failFinancial
          ? {}
          : {
              revenue: 100,
              expenses: 20,
              net_profit: 80,
              client_billing_collected: 50,
            };
      },
    },
  });
  const { useDashboardData } = load(
    path.join(frontend, 'src/screens/dashboard/useDashboardData.ts'),
  );
  function Harness({ period, canApprove }) {
    state = useDashboardData(
      period,
      'unit-a',
      'actor:cluster',
      true,
      canApprove,
    );
    return null;
  }
  let screen;
  await act(async () => {
    screen = create(
      React.createElement(Harness, { period: 'THIS_MONTH', canApprove: false }),
    );
  });
  assert.equal(
    calls.expenses,
    0,
    'no approval queue request without approval authority',
  );
  assert.equal(state.financial.data.revenue, 100);
  failFinancial = true;
  await act(async () => {
    screen.update(
      React.createElement(Harness, { period: 'THIS_YEAR', canApprove: false }),
    );
  });
  assert.equal(calls.stats, 1);
  assert.equal(calls.schools, 1);
  assert.equal(calls.analytics, 1);
  assert.deepEqual(calls.finance, [
    { period: 'THIS_MONTH', business_unit_id: 'unit-a' },
    { period: 'THIS_YEAR', business_unit_id: 'unit-a' },
  ]);
  assert.equal(
    state.financial.error,
    true,
    'an incomplete financial payload cannot become zero revenue',
  );
  assert.equal(state.financial.data, null);
  assert.deepEqual(state.schools.data, []);
  assert.equal(state.schools.error, false);
  act(() => screen.unmount());
});

test('dashboard foreground and action colours meet normal-text contrast in both themes', () => {
  function luminance(hex) {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  function contrast(a, b) {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
  for (const isDark of [false, true]) {
    const load = uiLoader({
      'react-native': baseNative,
      [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
        useTheme: () => ({ isDark }),
      },
    });
    const p = load(
      path.join(frontend, 'src/screens/dashboard/DashboardPrimitives.tsx'),
    ).useDashboardPalette();
    const pairs = [
      [p.ink, p.canvas],
      [p.ink, p.surface],
      [p.muted, p.canvas],
      [p.muted, p.surface],
      [p.muted, p.inset],
      [p.green, p.surface],
      [p.green, p.inset],
      [p.amber, p.amberBg],
      [p.heroText, p.hero],
      ['#FFFFFF', p.greenFill],
      ['#193B2C', p.lime],
    ];
    for (const [fg, bg] of pairs)
      assert.ok(
        contrast(fg, bg) >= 4.5,
        `${isDark ? 'dark' : 'light'} ${fg}/${bg}: ${contrast(fg, bg).toFixed(2)}`,
      );
  }
});
