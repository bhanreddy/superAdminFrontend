import { Platform, ViewStyle } from 'react-native';

type WebCursorStyle = ViewStyle & { cursor?: 'pointer' | 'default' };

/** Web-only pointer cursor; omit from style array on native. */
export function webCursor(disabled?: boolean): WebCursorStyle | undefined {
  if (Platform.OS !== 'web') return undefined;
  return { cursor: disabled ? 'default' : 'pointer' };
}

/** Pressed opacity + web cursor for Pressable `style` callbacks. */
export function pressableWebStyles(
  pressed: boolean,
  options?: { disabled?: boolean; pressedOpacity?: number }
): ViewStyle[] {
  const { disabled, pressedOpacity = 0.85 } = options ?? {};
  const out: ViewStyle[] = [];
  if (pressed && !disabled) out.push({ opacity: pressedOpacity });
  const c = webCursor(disabled);
  if (c) out.push(c);
  return out;
}
