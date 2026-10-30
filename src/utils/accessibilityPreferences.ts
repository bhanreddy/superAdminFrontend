import { AccessibilityInfo, Platform } from 'react-native';

type Preferences = { reducedMotion: boolean; reducedTransparency: boolean };
const listeners = new Set<() => void>();
const media = (query: string) => {
  try { return Platform.OS === 'web' ? window.matchMedia?.(query) : undefined; }
  catch { return undefined; }
};
const motion = media('(prefers-reduced-motion: reduce)');
const transparency = media('(prefers-reduced-transparency: reduce)');
let preferences: Preferences = {
  reducedMotion: motion?.matches ?? Boolean(AccessibilityInfo?.isReduceMotionEnabled),
  reducedTransparency: transparency?.matches ?? Boolean(AccessibilityInfo?.isReduceTransparencyEnabled),
};
function update(patch: Partial<Preferences>) {
  const next = { ...preferences, ...patch };
  if (next.reducedMotion === preferences.reducedMotion && next.reducedTransparency === preferences.reducedTransparency) return;
  preferences = next;
  listeners.forEach(listener => listener());
}
motion?.addEventListener?.('change', event => update({ reducedMotion: event.matches }));
transparency?.addEventListener?.('change', event => update({ reducedTransparency: event.matches }));
if (Platform.OS !== 'web') {
  AccessibilityInfo?.isReduceMotionEnabled?.().then(value => update({ reducedMotion: value })).catch(() => {});
  AccessibilityInfo?.isReduceTransparencyEnabled?.().then(value => update({ reducedTransparency: value })).catch(() => {});
  AccessibilityInfo?.addEventListener?.('reduceMotionChanged', value => update({ reducedMotion: value }));
  AccessibilityInfo?.addEventListener?.('reduceTransparencyChanged', value => update({ reducedTransparency: value }));
}
export const getAccessibilityPreferences = () => preferences;
export function subscribeAccessibilityPreferences(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
