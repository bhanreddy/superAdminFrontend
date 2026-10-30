const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loader, uiLoader, frontend, textOf, pressable } = require('./helpers.cjs');

function motionFixture(reducedMotion) {
  let preferences = { reducedMotion, reducedTransparency: false };
  const listeners = new Set();
  const calls = [];
  const animation = (kind, value, config) => {
    const record = { kind, value, config, callback: null };
    calls.push(record);
    return { start(cb) { record.callback = cb; }, stop() { record.callback?.({ finished: false }); }, reset() {} };
  };
  const load = loader({
    'react-native': { Animated: { timing: (v, c) => animation('timing', v, c), spring: (v, c) => animation('spring', v, c), loop: (v, c) => animation('loop', v, c) } },
    [path.join(frontend, 'src/utils/accessibilityPreferences.ts')]: {
      getAccessibilityPreferences: () => preferences,
      subscribeAccessibilityPreferences: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    },
  });
  const { Animated } = load(path.join(frontend, 'src/utils/accessibleAnimation.ts'));
  return { Animated, calls, listeners, change(value) { preferences = { ...preferences, reducedMotion: value }; [...listeners].forEach(fn => fn()); } };
}
test('reduced motion completes legacy native-driver transitions immediately', () => {
  const fixture = motionFixture(true);
  const value = { setValue(v) { this.value = v; } };
  let result;
  fixture.Animated.spring(value, { toValue: 20, useNativeDriver: true }).start(r => { result = r; });
  assert.equal(value.value, 20);
  assert.deepEqual(result, { finished: true });
  assert.equal(fixture.calls.length, 0);
  fixture.Animated.loop({ start() {}, stop() {}, reset() {} }).start();
  assert.equal(fixture.calls[0].config.iterations, 1);
});
test('changing reduced motion during a transition finishes once and releases its subscription', () => {
  const fixture = motionFixture(false);
  const value = { setValue(v) { this.value = v; } };
  const results = [];
  fixture.Animated.timing(value, { toValue: 1, duration: 900, useNativeDriver: true }).start(r => results.push(r));
  assert.equal(fixture.listeners.size, 1);
  fixture.change(true);
  assert.equal(value.value, 1);
  assert.deepEqual(results, [{ finished: true }]);
  assert.equal(fixture.listeners.size, 0);
});
test('cancelling an animation removes preference subscriptions', () => {
  const fixture = motionFixture(false);
  const animation = fixture.Animated.timing({ setValue() {} }, { toValue: 1, duration: 100, useNativeDriver: true });
  animation.start(); animation.stop();
  assert.equal(fixture.listeners.size, 0);
});
test('wrapped transitions retain the runtime protocol required by React Native loops', () => {
  const fixture = motionFixture(false);
  const transition = fixture.Animated.timing({ setValue() {} }, { toValue: 1, duration: 100, useNativeDriver: true });
  assert.equal(typeof transition._isUsingNativeDriver, 'function');
  assert.equal(transition._isUsingNativeDriver(), false);
});
const native = {
  View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView',
  Platform: { OS: 'web', select: options => options.web || options.default }, StyleSheet: { create: value => value },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
};
test('required invalid fields expose their error and required state to assistive technology', () => {
  const load = uiLoader({ 'react-native': native });
  const { Input } = load(path.join(frontend, 'src/components/ui/Input.tsx'));
  let screen;
  act(() => { screen = create(React.createElement(Input, { label: 'School name', required: true, error: 'Enter a school name.' })); });
  try {
    const input = screen.root.findByType('TextInput');
    assert.equal(input.props['aria-required'], true);
    assert.equal(input.props['aria-invalid'], true);
    assert.match(input.props.accessibilityHint, /Required.*Enter a school name/);
    const error = screen.root.findAllByType('Text').find(node => node.props.accessibilityRole === 'alert');
    assert.equal(input.props['aria-describedby'], error.props.nativeID);
  } finally { act(() => screen.unmount()); }
});
test('table sorting is keyboard-addressable and shrinking records cannot strand the last page', () => {
  const load = uiLoader({ 'react-native': native,
    [path.join(frontend, 'src/components/ui/Skeleton.tsx')]: { SkeletonTable: () => null },
    [path.join(frontend, 'src/components/ui/EmptyState.tsx')]: { EmptyState: props => React.createElement('Empty', props) },
  });
  const { DataTable } = load(path.join(frontend, 'src/components/ui/DataTable.tsx'));
  const render = data => React.createElement(DataTable, { data, columns: [{ key: 'name', title: 'Name', sortable: true }], keyExtractor: r => r.id, pageSize: 2 });
  let screen;
  act(() => { screen = create(render([{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }, { id: 'c', name: 'Gamma' }])); });
  try {
    const sorter = pressable(screen.root, 'Sort by Name');
    assert.equal(sorter.props.accessibilityRole, 'button');
    act(() => pressable(screen.root, 'Next page').props.onPress());
    assert.match(textOf(screen.root), /Gamma/);
    act(() => screen.update(render([{ id: 'a', name: 'Alpha' }])));
    assert.match(textOf(screen.root), /Alpha/);
    assert.doesNotMatch(textOf(screen.root), /No records/);
    act(() => screen.root.findByType('TextInput').props.onChangeText('no-match'));
    const empty = screen.root.findByType('Empty');
    assert.equal(empty.props.title, 'No matching records');
    assert.equal(empty.props.actionLabel, 'Clear search');
    act(() => empty.props.onAction());
    assert.match(textOf(screen.root), /Alpha/);
  } finally { act(() => screen.unmount()); }
});
