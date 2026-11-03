const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loader, uiLoader, frontend, textOf } = require('./helpers.cjs');
const native = {
  View: 'View', Text: 'Text', TextInput: 'TextInput', Image: 'Image',
  Pressable: 'Pressable', ScrollView: 'ScrollView', FlatList: 'FlatList',
  RefreshControl: 'RefreshControl', ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 } },
  Platform: { OS: 'web', select: values => values.web ?? values.default },
  Dimensions: { get: () => ({ width: 320, height: 844 }) },
  useWindowDimensions: () => ({ width: 320, height: 844 }),
};
const load = loader({ 'react-native': native });
const { lightTheme, darkTheme } = load(path.join(frontend, 'src/constants/theme.ts'));
const { workspaceUi } = load(path.join(frontend, 'src/constants/layout.ts'));
const { getRoleWorkspaceModule, getWorkspaceModule, workspaceTones } = load(path.join(frontend, 'src/constants/workspaceDesign.ts'));
const { dashboardWorkspaces } = load(path.join(frontend, 'src/screens/dashboard/dashboardWorkspaces.ts'));
const { getCardTone } = load(path.join(frontend, 'src/constants/experienceColors.ts'));
const { ROLES, getRolePermissions } = require('../../SuperAdminBackend/src/config/rbac');
const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));

test('every workspace destination keeps the same category accent as its dashboard card', () => {
  const categories = {
    Operations: 'blue', Finance: 'honey', Growth: 'crimson',
    'People & content': 'lavender', Administration: 'slate',
  };
  for (const workspace of dashboardWorkspaces) {
    assert.equal(workspaceTones[getWorkspaceModule(workspace.route)], categories[workspace.category], workspace.title);
  }
});

test('legacy semantic surfaces retain an explicit warning colour when wrapped in shared cards', () => {
  const ui = uiLoader({
    'react-native': native,
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({ ...lightTheme, isDark: false, workspaceModule: 'finance' }),
      clayStyle: () => ({}),
    },
  });
  const { ClayView } = ui(path.join(frontend, 'src/components/ui/ClayPrimitives.tsx'));
  let screen;
  act(() => { screen = create(React.createElement(ClayView, { color: lightTheme.colors.warningDim, flat: true }, 'Warning')); });
  try {
    assert.equal(flatten(screen.root.findByType('View').props.style).backgroundColor, lightTheme.colors.warningDim);
    assert.equal(screen.root.findAllByType('LinearGradient').length, 0);
  } finally { act(() => screen.unmount()); }
});

for (const isDark of [false, true]) {
  test(`every role inherits shared cards, category accents, and keyboard feedback in ${isDark ? 'dark' : 'light'} mode`, () => {
    for (const role of Object.values(ROLES)) {
      const base = isDark ? darkTheme : lightTheme;
      const workspaceModule = getRoleWorkspaceModule(role);
      const paint = getCardTone(workspaceTones[workspaceModule], isDark);
      const ui = uiLoader({
        'react-native': native,
        [path.join(frontend, 'src/screens/founder/founderUi.tsx')]: null,
        [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
          useTheme: () => ({ ...base, isDark, workspaceModule, reducedMotion: true }),
          clayStyle: () => ({}),
        },
      });
      const { Card } = ui(path.join(frontend, 'src/components/ui/Card.tsx'));
      let screen, presses = 0;
      act(() => { screen = create(React.createElement(Card, { onPress: () => presses++, accessibilityLabel: 'Open workspace' }, 'Content')); });
      try {
        const button = screen.root.findByType('Pressable');
        assert.equal(flatten(button.props.style).borderRadius, workspaceUi.cardRadius, role);
        assert.equal(screen.root.findByType('LinearGradient').props.colors[1], paint.panel, role);
        act(() => button.props.onFocus({}));
        assert.equal(flatten(screen.root.findByType('Pressable').props.style).borderColor, paint.accent, role);
        act(() => button.props.onPress());
        assert.equal(presses, 1, role);
      } finally { act(() => screen.unmount()); }
    }
  });
}

const specialistRoles = [
  ['SALES_MANAGER', 'SalesManagerDashboard', 'Sales Pipeline & Team Performance'],
  ['SALES_EXECUTIVE', 'SalesExecutiveDashboard', 'My Assigned Schools'],
  ['IMPLEMENTATION_MANAGER', 'ImplementationDashboard', 'Implementation Operations Desk'],
  ['IMPLEMENTATION_EXECUTIVE', 'ImplementationDashboard', 'My Assigned Deployments'],
  ['SUPPORT_MANAGER', 'SupportDashboard', 'Support Desk Control Room'],
  ['SUPPORT_EXECUTIVE', 'SupportDashboard', 'My Support Tickets'],
  ['TECHNICAL_SUPPORT', 'SupportDashboard', 'My Support Tickets'],
  ['OPERATIONS_MANAGER', 'GenericRoleDashboard', 'Welcome, QA'],
  ['VIEW_ONLY_ADMIN', 'GenericRoleDashboard', 'Welcome, QA'],
];
for (const isDark of [false, true]) {
  test(`specialist dashboards render their shared phone header and retain role capabilities in ${isDark ? 'dark' : 'light'} mode`, async () => {
    for (const [role, name, title] of specialistRoles) {
      const base = isDark ? darkTheme : lightTheme;
      const permissions = getRolePermissions(role);
      const ui = uiLoader({
        'react-native': native,
        [path.join(frontend, 'src/screens/founder/founderUi.tsx')]: null,
        [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
          useTheme: () => ({ ...base, isDark, reducedMotion: true, workspaceModule: getRoleWorkspaceModule(role) }),
          clayStyle: () => ({}),
        },
        [path.join(frontend, 'src/hooks/useAuth.ts')]: { useAuth: () => ({
          user: { id: 'qa', user_metadata: { full_name: 'QA' } }, employeeId: 'QA-001',
          role, roleLabel: role, assignedSchools: [101], can: permission => permissions.includes(permission),
        }) },
        [path.join(frontend, 'src/services/apiService.ts')]: {
          superAdminApi: {
            getSchools: async () => [{ id: 101, name: 'QA School', code: 'QA101', onboarding_status: 'live', is_active: true }],
            getSupportTickets: async () => [{ id: 'qa-ticket', ticket_number: 'QA-001', title: 'QA school support', description: 'Synthetic fixture', status: 'OPEN', priority: 'CRITICAL', school_id: 101, school_name: 'QA School', school_code: 'QA101', created_at: new Date().toISOString() }],
          },
        },
        [path.join(frontend, 'src/api/superAdminClient.ts')]: { superAdminClient: { get: async () => ({ data: [] }) } },
        [path.join(frontend, 'src/services/schoolIntakeService.ts')]: { schoolIntakeApi: { list: async () => [] }, INTAKE_STATUS: {} },
      });
      const Screen = ui(path.join(frontend, `src/screens/dashboards/${name}.tsx`)).default;
      const { ScreenHeader } = ui(path.join(frontend, 'src/components/ui/ScreenHeader.tsx'));
      let screen;
      await act(async () => { screen = create(React.createElement(Screen)); });
      try {
        const header = screen.root.findByType(ScreenHeader.type);
        assert.equal(header.props.title, title, role);
        const titleNode = screen.root.findAllByType('Text').find(node => node.props.accessibilityRole === 'header' && textOf(node) === title);
        assert.equal(flatten(titleNode.props.style).fontSize, workspaceUi.phoneTitle.fontSize, role);
        assert.ok(!textOf(screen.root).includes('Expense approvals'), role);
        if (name === 'GenericRoleDashboard' && !permissions.includes('students.import')) {
          assert.ok(!textOf(screen.root).includes('Data Imports'), role);
        }
      } finally { act(() => screen.unmount()); }
    }
  });
}
