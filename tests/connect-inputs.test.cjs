const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { uiLoader, frontend, textOf } = require('./helpers.cjs');
const flatten = (style) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const colors = {
  textPrimary: '#D1D2D3',
  textSecondary: '#B8BABD',
  textTertiary: '#ABADB0',
  primary: '#69B6E8',
  border: '#3B3E42',
  surface: '#1A1D21',
};

test('form fields retain visible labels, selected values and clear focus styling at larger mobile text sizes', () => {
  const load = uiLoader({
    'react-native': {
      View: 'View',
      Text: 'Text',
      TextInput: 'TextInput',
      StyleSheet: { create: (x) => x },
      Platform: { OS: 'ios' },
      useWindowDimensions: () => ({ fontScale: 1.5 }),
    },
  });
  const { ConnectTextField } = load(
    path.join(frontend, 'src/screens/connect/ConnectTextField.tsx'),
  );
  let screen,
    value = 'Existing channel purpose';
  const render = () =>
    React.createElement(ConnectTextField, {
      colors,
      accessibilityLabel: 'Channel purpose',
      placeholder: 'Purpose',
      value,
      onChangeText: (next) => (value = next),
      helper: 'Tell the team what this channel is for.',
    });
  try {
    act(() => {
      screen = create(render());
    });
    const field = () => screen.root.findByType('TextInput');
    let style = flatten(field().props.style);
    assert.equal(style.fontSize, 16);
    assert.ok(style.height >= 59, 'line box accommodates 1.5x system text');
    assert.equal(style.color, colors.textPrimary);
    assert.equal(style.backgroundColor, colors.surface);
    assert.equal(field().props.underlineColorAndroid, 'transparent');
    act(() => field().props.onFocus({}));
    assert.equal(flatten(field().props.style).borderColor, colors.primary);
    assert.match(textOf(screen.root), /Channel purpose/);
    act(() => field().props.onChangeText('Updated purpose'));
    act(() => screen.update(render()));
    assert.equal(field().props.value, 'Updated purpose');
    assert.match(textOf(screen.root), /Channel purpose/);
    act(() => field().props.onBlur({}));
    assert.equal(flatten(field().props.style).borderColor, colors.border);
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('multiline forms reserve readable height without letting legacy single-line styles clip the text', () => {
  const load = uiLoader({
    'react-native': {
      View: 'View',
      Text: 'Text',
      TextInput: 'TextInput',
      StyleSheet: { create: (x) => x },
      Platform: { OS: 'web' },
      useWindowDimensions: () => ({ fontScale: 1 }),
    },
  });
  const { ConnectTextField } = load(
    path.join(frontend, 'src/screens/connect/ConnectTextField.tsx'),
  );
  let screen;
  try {
    act(() => {
      screen = create(
        React.createElement(ConnectTextField, {
          colors,
          accessibilityLabel: 'Description',
          multiline: true,
          value: 'Line one\nLine two',
          style: [{ fontSize: 14, minHeight: 44, marginBottom: 10 }],
          onChangeText() {},
        }),
      );
    });
    const field = screen.root.findByType('TextInput'),
      style = flatten(field.props.style);
    assert.equal(field.props.multiline, true);
    assert.equal(style.fontSize, 16);
    assert.ok(style.height >= 104);
    assert.ok(style.maxHeight >= style.height);
    assert.equal(style.textAlignVertical, 'top');
    assert.equal(style.marginBottom, 0);
    assert.equal(style.outlineStyle, 'none');
  } finally {
    if (screen) act(() => screen.unmount());
  }
});

test('mobile visual viewport coalesces keyboard events, ignores pinch zoom and cleans up listeners', () => {
  const previousWindow = global.window;
  const listeners = new Map(),
    frames = new Map();
  let sequence = 0,
    result,
    commits = 0;
  const viewport = {
    height: 800,
    offsetTop: 0,
    scale: 1,
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type, fn) => {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
  };
  global.window = {
    visualViewport: viewport,
    requestAnimationFrame: (fn) => {
      const id = sequence++;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  const load = uiLoader({ 'react-native': { Platform: { OS: 'web' } } });
  const { useConnectViewport } = load(
    path.join(frontend, 'src/screens/connect/useConnectViewport.ts'),
  );
  function Probe({ enabled }) {
    result = useConnectViewport(enabled);
    commits++;
    return null;
  }
  let screen;
  const tick = () => {
    for (const [id, fn] of frames) {
      frames.delete(id);
      fn();
    }
  };
  try {
    act(() => {
      screen = create(React.createElement(Probe, { enabled: true }));
    });
    assert.deepEqual(result, { height: 800, offsetTop: 0 });
    viewport.height = 420;
    viewport.offsetTop = 80;
    for (let i = 0; i < 30; i++) {
      listeners.get('resize')();
      listeners.get('scroll')();
    }
    assert.equal(frames.size, 1);
    act(tick);
    assert.deepEqual(result, { height: 420, offsetTop: 80 });
    const baseline = commits;
    listeners.get('resize')();
    act(tick);
    assert.equal(commits, baseline, 'unchanged viewport does not commit');
    viewport.scale = 2;
    viewport.height = 200;
    listeners.get('resize')();
    act(tick);
    assert.deepEqual(result, { height: 420, offsetTop: 80 });
    viewport.scale = 1;
    listeners.get('resize')();
    assert.equal(frames.size, 1);
    act(() => screen.update(React.createElement(Probe, { enabled: false })));
    assert.equal(result, null);
    assert.equal(listeners.size, 0);
    assert.equal(frames.size, 0);
  } finally {
    if (screen) act(() => screen.unmount());
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});
