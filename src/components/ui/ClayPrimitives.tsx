// Compatibility primitives for existing dashboards, using the shared workspace surfaces.
import React from 'react';
import { View, ViewStyle, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
export const clayTokens = {
  radius: { card: 16, button: 11, input: 11, pill: 999 },
  highlight: '#FFFFFF16',
  edge: '#CAD3E1',
  text: '#182740',
  textMuted: '#52617A',
};
type ClayViewProps = {
  children: React.ReactNode;
  color?: string;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
  flat?: boolean;
  isDark?: boolean;
};
export function ClayView({
  children,
  color,
  radius = 16,
  style,
  flat,
}: ClayViewProps) {
  const { colors, clayShadows } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: color || colors.card,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.borderSubtle || colors.border,
          overflow: 'hidden',
        },
        !flat && clayStyle(clayShadows.subtle),
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function PressScale({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole,
}: any) {
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole || 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }: any) => [
        style,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        Platform.OS === 'web' &&
          ({ cursor: disabled ? 'default' : 'pointer' } as any),
      ]}
    >
      {children}
    </Pressable>
  );
}
