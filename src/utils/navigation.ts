import type { Router } from 'expo-router';

/** Cold deep links have no native navigation history to pop. */
type Fallback = '/(app)/' | '/(app)/schools' | '/(app)/admins' | '/(app)/clusters' | '/(app)/messenger';
export function navigateBack(router: Pick<Router, 'canGoBack' | 'back' | 'replace'>, fallback: Fallback = '/(app)/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
