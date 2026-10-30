import { useSyncExternalStore } from 'react';
import { getAccessibilityPreferences, subscribeAccessibilityPreferences } from '../utils/accessibilityPreferences';

export function useAccessibilityPreferences() {
  return useSyncExternalStore(subscribeAccessibilityPreferences, getAccessibilityPreferences, getAccessibilityPreferences);
}
