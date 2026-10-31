const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { Slot } = require('@radix-ui/react-slot');
const { StyleSheet } = require('react-native-web');
const { create, act } = require('react-test-renderer');
const { frontend, textOf } = require('./helpers.cjs');

// Mock dependencies for testing LoginScreen in Node environment
function createAuthLoader(options = {}) {
  const {
    windowWidth = 1200,
    windowHeight = 800,
    caMode = false,
    signInResult = { user: { id: 'usr-1' }, session: { access_token: 'tok' } },
  } = options;

  let storedRememberedId = null;

  const native = {
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: React.forwardRef(({ children, onPress, ...props }, ref) => React.createElement('Pressable', { ...props, onPress, ref }, children)),
    TextInput: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({ focus: () => {} }));
      return React.createElement('TextInput', props);
    }),
    ActivityIndicator: 'ActivityIndicator',
    Modal: ({ visible, children }) => (visible ? React.createElement('Modal', null, children) : null),
    KeyboardAvoidingView: ({ children }) => React.createElement('KeyboardAvoidingView', null, children),
    Image: ({ source, ...props }) => React.createElement('Image', { ...props }),
    Platform: { OS: 'web', select: (obj) => obj.web || obj.default },
    StyleSheet: { create: (s) => s, flatten: StyleSheet.flatten, absoluteFill: {} },
    useWindowDimensions: () => ({ width: windowWidth, height: windowHeight }),
    Animated: {
      Value: class {
        constructor(v) { this.v = v; }
        interpolate() { return '0deg'; }
      },
      timing: () => ({ start: (fn) => fn?.() }),
      loop: (anim) => ({ start: () => {}, stop: () => {} }),
      sequence: () => ({ start: () => {}, stop: () => {} }),
      View: ({ children, ...props }) => React.createElement('View', props, children),
    },
    Easing: { linear: () => {}, inOut: () => {}, ease: () => {} },
  };

  const reanimatedView = ({ children, ...props }) => React.createElement('View', props, children);
  const reanimated = {
    __esModule: true,
    default: {
      View: reanimatedView,
    },
    View: reanimatedView,
    FadeInUp: { duration: () => ({ delay: () => ({}) }) },
    FadeInDown: { duration: () => ({ delay: () => ({}) }) },
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
  };

  const asyncStorage = {
    getItem: async (key) => storedRememberedId,
    setItem: async (key, val) => { storedRememberedId = val; },
    removeItem: async (key) => { storedRememberedId = null; },
  };

  const svgMocks = new Proxy({}, {
    get: (_, key) => (key === '__esModule' ? true : ({ children, ...props }) => React.createElement(`Svg_${key}`, props, children)),
  });

  const lucideMocks = new Proxy({}, {
    get: (_, key) => (key === '__esModule' ? true : (props) => React.createElement(`Icon_${key}`, props)),
  });

  const expoLinearGradient = {
    LinearGradient: ({ children, ...props }) => React.createElement('LinearGradient', props, children),
  };

  const expoRouter = {
    useRouter: () => ({ push: () => {}, replace: () => {} }),
    useLocalSearchParams: () => ({}),
    // Expo Router uses this real slot for asChild. Its object style merge must
    // remain in the test: returning children hid the production startup crash.
    Link: ({ children, href, asChild }) => React.createElement(Slot, { style: undefined }, children),
  };

  const themeContext = {
    useTheme: () => ({
      colors: {
        background: '#060A13',
        card: '#0D1526',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        border: 'rgba(255,255,255,0.08)',
        primary: '#0A84FF',
      },
      isDark: true,
      reducedMotion: false,
    }),
  };

  const clusterContext = {
    useCluster: () => ({
      selectedCluster: { cluster_id: 'cluster-delhi-01', label: 'Delhi NCR Hub Cluster' },
    }),
  };

  const authContext = {
    useAuth: () => ({
      refreshSessionProfile: async () => {},
    }),
  };

  const fingerprintContext = {
    useFingerprint: () => ({
      supported: false,
      ready: false,
      enabled: false,
      unlock: async () => {},
    }),
  };

  const authService = {
    authService: {
      signIn: async (id, pwd, isCa) => signInResult,
    },
  };

  const { loader } = require('./helpers.cjs');
  const load = loader({
    'react-native': native,
    'react-native-reanimated': reanimated,
    'react-native-svg': svgMocks,
    'expo-linear-gradient': expoLinearGradient,
    '@react-native-async-storage/async-storage': asyncStorage,
    'lucide-react-native': lucideMocks,
    'expo-router': expoRouter,
    [path.join(frontend, 'assets/logo.png')]: 'mock-logo.png',
    [path.join(frontend, 'src/contexts/ThemeContext.tsx')]: themeContext,
    [path.join(frontend, 'src/contexts/ClusterContext.tsx')]: clusterContext,
    [path.join(frontend, 'src/contexts/AuthContext.tsx')]: authContext,
    [path.join(frontend, 'src/contexts/FingerprintContext.tsx')]: fingerprintContext,
    [path.join(frontend, 'src/services/authService.ts')]: authService,
  });

  const LoginScreen = load(path.join(frontend, 'src/screens/auth/LoginScreen.tsx')).default;
  return { LoginScreen, asyncStorage };
}

test('Desktop layout renders two-panel NexSyrus Command Centre composition', async () => {
  const { LoginScreen } = createAuthLoader({ windowWidth: 1280 });
  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: false }));
  });

  const content = textOf(screen.root);
  // Left Panel Brand Identity
  assert.ok(content.includes('NEXSYRUS'), 'renders NEXSYRUS wordmark');
  assert.ok(content.includes('COMMAND CENTRE'), 'renders COMMAND CENTRE badge');
  assert.ok(content.includes('A clearer view.'), 'renders brand headline');
  assert.ok(content.includes('Delhi NCR Hub Cluster'), 'renders real active cluster from ClusterContext');
  assert.ok(content.includes('Role-based access'), 'renders security information');

  // Right Panel Authentication Terminal
  assert.ok(content.includes('Welcome back.'), 'renders terminal authentication title');
  assert.ok(content.includes('Email, phone, or employee ID'), 'renders unified identifier label');
  assert.ok(content.includes('Password'), 'renders password label');
  assert.ok(content.includes('Remember my ID'), 'renders remember terminal checkbox');
  assert.ok(content.includes('Forgot password?'), 'renders forgot password link');
  assert.ok(content.includes('Sign in to Command Centre'), 'renders sign-in button');
});

test('Mobile layout renders compact command header without horizontal overflow', async () => {
  const { LoginScreen } = createAuthLoader({ windowWidth: 412 });
  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: false }));
  });

  const content = textOf(screen.root);
  // Compact Mobile Header
  assert.ok(content.includes('SUPERADMIN COMMAND CENTRE'), 'renders mobile brand subtitle');
  assert.ok(content.includes('Delhi NCR Hub Cluster'), 'renders mobile cluster pill');
  // Form Card
  assert.ok(content.includes('Welcome back.'), 'renders form card');
  assert.ok(content.includes('Sign in to Command Centre'), 'renders action button');
  // Left panel statement omitted on mobile
  assert.ok(!content.includes('A clearer view.'), 'omits heavy desktop copy on mobile');
});

test('CA Mode renders Chartered Accountant branding and Books workspace access notice', async () => {
  const { LoginScreen } = createAuthLoader({ windowWidth: 1200, caMode: true });
  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: true }));
  });

  const content = textOf(screen.root);
  assert.ok(content.includes('Your financial workspace.'), 'renders Your financial workspace. title');
  assert.ok(content.includes('CA email or employee ID'), 'renders CA account identifier input label');
  assert.ok(content.includes('Chartered Accountant Gateway'), 'renders Books ledger access notice');
  assert.ok(content.includes('Sign in to Books'), 'renders CA authenticate action');
});

test('Both access modes pass valid styles through the real router slot', async () => {
  for (const caMode of [false, true]) {
    let screen;
    const { LoginScreen } = createAuthLoader({ caMode });
    await act(async () => {
      screen = create(React.createElement(LoginScreen, { caMode }));
    });
    const tabs = screen.root.findAllByType('Pressable').filter((tab) => tab.props.accessibilityRole === 'tab');
    assert.equal(tabs.length, 2);
    for (const tab of tabs) {
      assert.ok(!Object.keys(tab.props.style).some((key) => /^\d+$/.test(key)),
        'router slot must not turn style arrays into indexed CSS properties');
      assert.equal(tab.props.style.flexDirection, 'row', 'retains the actual native style properties');
    }
    assert.equal(tabs.filter((tab) => tab.props.accessibilityState.selected).length, 1);
    screen.unmount();
  }
});

test('Empty credentials submission triggers validation warning', async () => {
  const { LoginScreen } = createAuthLoader({ windowWidth: 1200 });
  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: false }));
  });

  // Find and click the Sign In button
  const buttons = screen.root.findAllByType('Pressable');
  const signInButton = buttons.find((b) => textOf(b).includes('Sign in to Command Centre'));
  assert.ok(signInButton, 'Sign In button exists');

  await act(async () => {
    signInButton.props.onPress();
  });

  const content = textOf(screen.root);
  assert.ok(content.includes('Missing Required Credentials'), 'displays missing credentials alert');
  assert.ok(content.includes('Enter email, phone, or employee ID.'), 'displays identifier error');
  assert.ok(content.includes('Enter your password.'), 'displays password error');
});

test('Invalid credentials result in high-assurance error alert', async () => {
  const { LoginScreen } = createAuthLoader({
    windowWidth: 1200,
    signInResult: { user: null, session: null, error: { message: 'Invalid credentials' } },
  });

  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: false }));
  });

  // Type in identifier and password
  const textInputs = screen.root.findAllByType('TextInput');
  assert.ok(textInputs.length >= 2, 'has identifier and password text inputs');

  await act(async () => {
    textInputs[0].props.onChangeText('admin@nexsyrus.com');
    textInputs[1].props.onChangeText('wrong-password');
  });

  const buttons = screen.root.findAllByType('Pressable');
  const signInButton = buttons.find((b) => textOf(b).includes('Sign in to Command Centre'));

  await act(async () => {
    await signInButton.props.onPress();
  });

  const content = textOf(screen.root);
  assert.ok(content.includes('Invalid Credentials'), 'displays Invalid Credentials alert');
  assert.ok(content.includes('Verify your credentials and retry'), 'displays guidance');
});

test('Inactive or locked account displays access suspended alert', async () => {
  const { LoginScreen } = createAuthLoader({
    windowWidth: 1200,
    signInResult: { user: null, session: null, error: { message: 'Access denied. Account is inactive. Please contact administrator.' } },
  });

  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: false }));
  });

  const textInputs = screen.root.findAllByType('TextInput');
  await act(async () => {
    textInputs[0].props.onChangeText('suspended@nexsyrus.com');
    textInputs[1].props.onChangeText('secret');
  });

  const buttons = screen.root.findAllByType('Pressable');
  const signInButton = buttons.find((b) => textOf(b).includes('Sign in to Command Centre'));

  await act(async () => {
    await signInButton.props.onPress();
  });

  const content = textOf(screen.root);
  assert.ok(content.includes('Access Suspended'), 'displays Access Suspended alert');
  assert.ok(content.includes('Access denied. Account is inactive'), 'displays message');
});

test('Forgot Password triggers Zero-Disclosure Credential Recovery Modal', async () => {
  const { LoginScreen } = createAuthLoader({ windowWidth: 1200 });
  let screen;
  await act(async () => {
    screen = create(React.createElement(LoginScreen, { caMode: false }));
  });

  const buttons = screen.root.findAllByType('Pressable');
  const forgotButton = buttons.find((b) => b.props.accessibilityLabel === 'Forgot password recovery' || textOf(b).includes('Forgot password?'));
  assert.ok(forgotButton, 'Forgot password button exists');

  await act(async () => {
    forgotButton.props.onPress();
  });

  const content = textOf(screen.root);
  assert.ok(content.includes('Credential Recovery Protocol'), 'opens recovery modal');
  assert.ok(content.includes('NexSyrus Zero-Trust Security Standard'), 'explains security standard');
  assert.ok(content.includes('Registered Email or Employee ID'), 'renders recovery identifier input');
});
