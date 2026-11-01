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

test('module navigation preserves a consistent crimson action and inherits dark/light preference', () => {
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
    assert.equal(current.colors.primary, darkTheme.colors.primary);
    act(() => screen.update(render('/users')));
    assert.equal(current.colors.primary, darkTheme.colors.primary);
    assert.equal(current.colors.error, status);
    act(() => current.toggleTheme());
    assert.equal(current.colors.primary, lightTheme.colors.primary);
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
    assert.ok(flatten(typeof button.props.style === 'function' ? button.props.style({}) : button.props.style).minHeight >= 44);
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

test('sidebar groups keep secondary routes searchable and allow the active group to close', () => {
  let pathname = '/console/school-intake';
  const ui = uiLoader({
    'react-native': native,
    'expo-router': {
      usePathname: () => pathname,
      useRouter: () => ({ push() {} }),
    },
    [path.join(frontend, 'assets/logo.png')]: {},
    [path.join(frontend, 'src/hooks/useAuth.ts')]: {
      useAuth: () => ({
        role: 'FOUNDER',
        isFounder: true,
        isSuperAdmin: false,
        can: () => true,
      }),
    },
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({ ...lightTheme, isDark: false }),
    },
  });
  const { Sidebar } = ui(
    path.join(frontend, 'src/components/layout/Sidebar.tsx')
  );
  let screen;
  const render = () =>
    React.createElement(Sidebar, { collapsed: false, onToggle() {} });
  act(() => {
    screen = create(render());
  });
  try {
    assert.ok(pressable(screen.root, 'School Intake'));
    assert.equal(pressable(screen.root, 'Database Backups'), undefined);
    act(() =>
      pressable(screen.root, 'Collapse Schools & operations').props.onPress()
    );
    assert.equal(pressable(screen.root, 'School Intake'), undefined);
    const finder = screen.root.findByType('TextInput');
    act(() => finder.props.onChangeText('backups'));
    assert.ok(pressable(screen.root, 'Database Backups'));
    act(() => finder.props.onChangeText('content studio'));
    assert.equal(
      pressable(screen.root, 'Content Studio'),
      undefined,
      'super-admin-only routes remain filtered out'
    );
    act(() => finder.props.onChangeText(''));
    pathname = '/console/settings';
    act(() => screen.update(render()));
    assert.equal(
      pressable(screen.root, 'Settings').props.accessibilityState.selected,
      true
    );
    assert.ok(pressable(screen.root, 'Collapse Platform & security'));
  } finally {
    act(() => screen.unmount());
  }
});

test('section transitions retain the same input and draft, avoid motion during typing, and honor reduced motion', () => {
  let reducedMotion = false;
  let transitions = 0;
  const sectionLoader = uiLoader({
    'react-native': native,
    'react-native-reanimated': {
      __esModule: true,
      default: { View: 'View' },
      useSharedValue: value => React.useRef({ value }).current,
      useAnimatedStyle: fn => fn(),
      withTiming: value => { transitions++; return value; },
      cancelAnimation() {},
    },
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: { useTheme: () => ({ reducedMotion }) },
  });
  const { MotionSection } = sectionLoader(path.join(frontend, 'src/components/ui/MotionSection.tsx'));
  function Draft() {
    const [value, setValue] = React.useState('Unsent message');
    return React.createElement('TextInput', { value, onChangeText: setValue });
  }
  const render = section => React.createElement(MotionSection, { transitionKey: section }, React.createElement(Draft));
  let screen;
  act(() => { screen = create(render('conversation')); });
  try {
    const input = screen.root.findByType('TextInput');
    transitions = 0;
    act(() => input.props.onChangeText('Keep my draft'));
    act(() => screen.update(render('conversation')));
    assert.equal(transitions, 0, 'typing does not replay the section animation');
    act(() => screen.update(render('thread')));
    assert.equal(transitions, 2);
    assert.equal(screen.root.findByType('TextInput'), input);
    assert.equal(input.props.value, 'Keep my draft');
    reducedMotion = true;
    transitions = 0;
    act(() => screen.update(render('conversation')));
    assert.equal(transitions, 0);
    assert.equal(screen.root.findByType('View').props.entering, undefined);
    assert.equal(input.props.value, 'Keep my draft');
  } finally { act(() => screen.unmount()); }
});

test('reduced motion cancels card movement and controls preserve interaction callbacks', () => {
  let reducedMotion = false;
  const calls = [],
    values = [];
  const useSharedValue = (initial) => {
    const ref = React.useRef();
    if (!ref.current) {
      ref.current = { value: initial };
      values.push(ref.current);
    }
    return ref.current;
  };
  const ui = uiLoader({
    'react-native': native,
    'react-native-reanimated': {
      __esModule: true,
      default: { createAnimatedComponent: (component) => component },
      useSharedValue,
      useAnimatedStyle: (fn) => fn(),
      withTiming: (value) => {
        calls.push('timing');
        return value;
      },
      withSpring: (value) => {
        calls.push('spring');
        return value;
      },
      cancelAnimation: () => calls.push('cancel'),
    },
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: {
      useTheme: () => ({ reducedMotion }),
    },
  });
  const { MotionPressable } = ui(
    path.join(frontend, 'src/components/ui/MotionPressable.tsx')
  );
  let screen,
    pressIn = 0,
    pressOut = 0;
  const render = (disabled) =>
    React.createElement(
      MotionPressable,
      {
        disabled,
        lift: true,
        onPressIn: () => pressIn++,
        onPressOut: () => pressOut++,
      },
      'Open workspace'
    );
  act(() => {
    screen = create(render(false));
  });
  try {
    act(() => screen.root.findByType('Pressable').props.onHoverIn({}));
    assert.ok(
      values.some((v) => v.value < 0),
      'cards lift on hover'
    );
    act(() => screen.root.findByType('Pressable').props.onPressIn({}));
    assert.equal(pressIn, 1);
    reducedMotion = true;
    calls.length = 0;
    act(() => screen.update(render(false)));
    assert.deepEqual(
      values.map((v) => v.value),
      [1, 0]
    );
    assert.ok(calls.includes('cancel'));
    assert.ok(!calls.includes('timing') && !calls.includes('spring'));
    act(() => screen.root.findByType('Pressable').props.onPressOut({}));
    assert.equal(pressOut, 1);
    act(() => screen.update(render(true)));
    assert.equal(screen.root.findByType('Pressable').props.disabled, true);
  } finally {
    act(() => screen.unmount());
  }
});

test('colourful cards keep text readable on their surfaces and illustrated covers in both themes', () => {
  const { cardTones } = load(path.join(frontend, 'src/constants/experienceColors.ts'));
  for (const [name, modes] of Object.entries(cardTones)) {
    for (const [mode, paint] of Object.entries(modes)) {
      const theme = mode === 'dark' ? darkTheme : lightTheme;
      for (const background of ['surface', 'panel']) {
        for (const foreground of ['ink', 'muted', 'accent']) {
          assert.ok(contrast(paint[foreground], paint[background]) >= 4.5,
            `${name}/${mode} ${foreground} on ${background}`);
        }
      }
      for (const background of ['cover', 'coverEnd']) {
        assert.ok(contrast(paint.accent, paint[background]) >= 4.5,
          `${name}/${mode} cover label on ${background}`);
      }
      for (const foreground of ['textPrimary', 'textSecondary']) {
        assert.ok(contrast(theme.colors[foreground], paint.panel) >= 4.5,
          `${name}/${mode} shared ${foreground} on panel`);
      }
    }
  }
});
