const { test } = require('node:test');
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
const native = {
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'ios', select: (options) => options.default },
  StyleSheet: { create: (value) => value },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
};
const load = loader({ 'react-native': native });
const { lightTheme, darkTheme } = load(
  path.join(frontend, 'src/constants/theme.ts'),
);
const design = load(path.join(frontend, 'src/constants/workspaceDesign.ts'));
const flatten = (styles) =>
  Object.assign({}, ...[styles].flat(Infinity).filter(Boolean));
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .slice(0, 3)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('module accents and labelled status colours meet normal-text contrast in light and dark modes', () => {
  for (const [name, palette] of Object.entries(design.workspaceModules)) {
    assert.ok(contrast(palette.light, palette.tint) >= 4.5, `${name} light`);
    assert.ok(contrast(palette.dark, palette.night) >= 4.5, `${name} dark`);
    assert.ok(contrast('#FFFFFF', palette.fill) >= 4.5, `${name} action`);
  }
  for (const theme of [lightTheme, darkTheme]) {
    const colors = theme.colors;
    for (const surface of ['background', 'card', 'inputBg']) {
      for (const text of ['textPrimary', 'textSecondary', 'textTertiary'])
        assert.ok(
          contrast(colors[text], colors[surface]) >= 4.5,
          `${text} on ${surface}`,
        );
    }
    for (const status of ['success', 'warning', 'error', 'info'])
      assert.ok(
        contrast(colors[status], colors[`${status}Dim`]) >= 4.5,
        status,
      );
    assert.ok(contrast(colors.sidebarTextMuted, colors.sidebarBg) >= 4.5);
  }
});

test('nested routes use one deepest active navigation item and reject prefix lookalikes', () => {
  const routes = [
    '/(app)/',
    '/(app)/schools/',
    '/(app)/books',
    '/(app)/books/access',
  ];
  assert.equal(
    design.activeWorkspaceRoute('/schools/101/features', routes),
    '/(app)/schools/',
  );
  assert.equal(
    design.activeWorkspaceRoute('/books/access', routes),
    '/(app)/books/access',
  );
  assert.equal(
    design.activeWorkspaceRoute('/books-lookalike', routes),
    undefined,
  );
  assert.equal(
    design.activeWorkspaceRoute('/schools-lookalike', routes),
    undefined,
  );
  assert.equal(design.activeWorkspaceRoute('/', routes), '/(app)/');
  assert.equal(
    design.getWorkspaceModule('/(app)/console/billing?period=month'),
    'finance',
  );
  assert.equal(design.getWorkspaceModule('/connect'), 'connect');
  assert.equal(design.getWorkspaceModule('/schools/101'), 'schools');
  assert.equal(design.getWorkspaceModule('/users'), 'team');
});

test('screen palette changes preserve status meanings and inherit dark/light preference', () => {
  const providerLoad = loader({ 'react-native': native });
  const { ThemeProvider, WorkspaceThemeProvider, useTheme } = providerLoad(
    path.join(frontend, 'src/contexts/ThemeContext.tsx'),
  );
  let current;
  function Capture() {
    current = useTheme();
    return null;
  }
  let screen;
  const render = (route) =>
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        WorkspaceThemeProvider,
        { path: route },
        React.createElement(Capture),
      ),
    );
  act(() => {
    screen = create(render('/books'));
  });
  try {
    assert.equal(current.isDark, true);
    const status = current.colors.error;
    assert.equal(current.colors.primary, design.workspaceModules.finance.dark);
    act(() => screen.update(render('/users')));
    assert.equal(current.colors.primary, design.workspaceModules.team.dark);
    assert.equal(current.colors.error, status);
    act(() => current.toggleTheme());
    assert.equal(current.colors.primary, design.workspaceModules.team.light);
    assert.equal(current.colors.error, lightTheme.colors.error);
  } finally {
    act(() => screen.unmount());
  }
});

test('shared form fields preserve values, multiline editing and visible labels through focus', () => {
  const ui = uiLoader({
    'react-native': native,
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({ ...lightTheme, isDark: false }),
    },
  });
  const { Input } = ui(path.join(frontend, 'src/components/ui/Input.tsx'));
  let screen,
    value = 'First line\nSecond line';
  const render = () =>
    React.createElement(Input, {
      label: 'Notes',
      required: true,
      multiline: true,
      value,
      onChangeText: (next) => (value = next),
    });
  act(() => {
    screen = create(render());
  });
  try {
    const field = () => screen.root.findByType('TextInput');
    const original = field();
    assert.equal(field().props.accessibilityLabel, 'Notes');
    assert.equal(flatten(field().props.style).fontSize, 16);
    assert.ok(flatten(field().props.style).minHeight >= 112);
    act(() => field().props.onFocus({}));
    assert.match(textOf(screen.root), /NotesRequired/);
    act(() => field().props.onChangeText('Edited\nMultiline'));
    act(() => screen.update(render()));
    assert.equal(field(), original);
    assert.equal(field().props.value, 'Edited\nMultiline');
    assert.equal(field().props.underlineColorAndroid, 'transparent');
  } finally {
    act(() => screen.unmount());
  }
});

test('loading actions disable duplicate submission and retain an accessible name', () => {
  const ui = uiLoader({
    'react-native': native,
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({ ...darkTheme, isDark: true }),
    },
  });
  const { Button } = ui(path.join(frontend, 'src/components/ui/Button.tsx'));
  let screen;
  act(() => {
    screen = create(
      React.createElement(Button, { title: 'Save details', loading: true }),
    );
  });
  try {
    const button = screen.root.findByType('Pressable');
    assert.equal(button.props.disabled, true);
    assert.equal(button.props.accessibilityLabel, 'Save details');
    assert.equal(button.props.accessibilityState.busy, true);
    assert.ok(flatten(button.props.style({})).minHeight >= 44);
  } finally {
    act(() => screen.unmount());
  }
});

test('navigation finder filters permitted pages and closes the mobile menu on navigation', () => {
  let destination,
    closed = 0;
  const ui = uiLoader({
    'react-native': native,
    'expo-router': {
      usePathname: () => '/schools/101',
      useRouter: () => ({ push: (route) => (destination = route) }),
    },
    [path.join(frontend, 'assets/logo.png')]: {},
    [path.join(frontend, 'src/hooks/useAuth.ts')]: {
      useAuth: () => ({
        role: 'FOUNDER',
        roleLabel: 'Founder',
        isFounder: true,
        can: () => true,
        isSuperAdmin: true,
      }),
    },
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({ ...lightTheme, isDark: false }),
    },
  });
  const { Sidebar } = ui(
    path.join(frontend, 'src/components/layout/Sidebar.tsx'),
  );
  let screen;
  act(() => {
    screen = create(
      React.createElement(Sidebar, {
        collapsed: false,
        onToggle() {},
        onNavigate: () => closed++,
      }),
    );
  });
  try {
    assert.equal(
      pressable(screen.root, 'Dashboard').props.accessibilityState.selected,
      false,
    );
    assert.equal(
      pressable(screen.root, 'Schools').props.accessibilityState.selected,
      true,
    );
    act(() => screen.root.findByType('TextInput').props.onChangeText('books'));
    assert.equal(pressable(screen.root, 'Schools'), undefined);
    act(() => pressable(screen.root, 'Books & Accounting').props.onPress());
    assert.equal(destination, '/(app)/books');
    assert.equal(closed, 1);
  } finally {
    act(() => screen.unmount());
  }
});

test('narrow KPI cards keep complete currency values in a single accessible text node', () => {
  const ui = uiLoader({ 'react-native': native });
  const { MetricValue } = ui(
    path.join(frontend, 'src/components/ui/MetricValue.tsx'),
  );
  let screen;
  act(() => {
    screen = create(React.createElement(MetricValue, { value: '₹12,48,000' }));
  });
  try {
    const value = () => screen.root.findByType('Text');
    act(() =>
      value().props.onLayout({ nativeEvent: { layout: { width: 100 } } }),
    );
    assert.equal(value().props.numberOfLines, 1);
    assert.equal(value().props.accessibilityLabel, '₹12,48,000');
    assert.equal(textOf(value()), '₹12,48,000');
    assert.ok(flatten(value().props.style).fontSize <= 20);
    act(() =>
      value().props.onLayout({ nativeEvent: { layout: { width: 260 } } }),
    );
    assert.ok(flatten(value().props.style).fontSize >= 28);
  } finally {
    act(() => screen.unmount());
  }
});
