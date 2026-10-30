import { Animated as NativeAnimated } from 'react-native';
import { getAccessibilityPreferences, subscribeAccessibilityPreferences } from './accessibilityPreferences';

// Keep the familiar Animated API while respecting OS preferences for legacy
// native-driver animations as well as web animations. Reanimated uses its own
// system reduced-motion support.
function controlledAnimation(
  value: NativeAnimated.Value | NativeAnimated.ValueXY,
  config: NativeAnimated.TimingAnimationConfig | NativeAnimated.SpringAnimationConfig,
  spring: boolean,
): NativeAnimated.CompositeAnimation {
  let running: NativeAnimated.CompositeAnimation | undefined;
  let unsubscribe: (() => void) | undefined;
  let completed = false;
  const finishValue = () => {
    if (typeof config.toValue === 'number' ||
        (typeof config.toValue === 'object' && 'x' in config.toValue && 'y' in config.toValue)) {
      (value.setValue as (target: any) => void)(config.toValue);
    }
  };
  return {
    start(callback) {
      completed = false;
      const finish = (result: { finished: boolean }) => {
        if (completed) return;
        completed = true;
        unsubscribe?.();
        callback?.(result);
      };
      if (getAccessibilityPreferences().reducedMotion) {
        finishValue();
        finish({ finished: true });
        return;
      }
      running = spring
        ? NativeAnimated.spring(value, config as NativeAnimated.SpringAnimationConfig)
        : NativeAnimated.timing(value, config as NativeAnimated.TimingAnimationConfig);
      unsubscribe = subscribeAccessibilityPreferences(() => {
        if (!getAccessibilityPreferences().reducedMotion) return;
        // Suppress the native stop callback before completing at the destination.
        const active = running;
        completed = true;
        active?.stop();
        finishValue();
        completed = false;
        finish({ finished: true });
      });
      running.start(finish);
    },
    stop() { unsubscribe?.(); running?.stop(); if (getAccessibilityPreferences().reducedMotion) finishValue(); },
    reset() { unsubscribe?.(); running?.reset(); },
    // RN's loop implementation inspects this private compatibility method.
    // Each transition still uses its configured driver; loop boundaries stay
    // in JS so a changed OS preference can stop the repeat immediately.
    _isUsingNativeDriver: () => false,
  } as NativeAnimated.CompositeAnimation;
}
export const Animated: typeof NativeAnimated = {
  ...NativeAnimated,
  timing: (value, config) => controlledAnimation(value, config, false),
  spring: (value, config) => controlledAnimation(value, config, true),
  loop(animation, config) {
    let running: NativeAnimated.CompositeAnimation | undefined;
    let unsubscribe: (() => void) | undefined;
    return {
      start(callback) {
        const reduced = getAccessibilityPreferences().reducedMotion;
        running = NativeAnimated.loop(animation, { ...config, iterations: reduced ? 1 : config?.iterations ?? -1 });
        // Register before the inner animation so a preference change stops the
        // repeat before a zero-duration sequence can start another iteration.
        unsubscribe = subscribeAccessibilityPreferences(() => {
          if (getAccessibilityPreferences().reducedMotion) { unsubscribe?.(); running?.stop(); }
        });
        running.start(result => { unsubscribe?.(); callback?.(result); });
      },
      stop() { unsubscribe?.(); running?.stop(); },
      reset() { unsubscribe?.(); running?.reset(); },
      _isUsingNativeDriver: () => false,
    } as NativeAnimated.CompositeAnimation;
  },
};
