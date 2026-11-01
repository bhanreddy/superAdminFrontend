// Compatibility primitives for existing dashboards, using the shared workspace surfaces.
import React from 'react';
import { MotionPressable, type MotionPressableProps } from './MotionPressable';
import { borderRadius as radii } from '../../constants/theme';
import { View, ViewStyle, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
export const clayTokens = {
  radius: {
    card: radii.xl,
    button: radii.md,
    input: radii.md,
    pill: radii.full,
  },
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
  radius = radii.xl,
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
  ...props
}: MotionPressableProps) {
  if (!onPress)
    return (
      <View
        style={
          typeof style === 'function'
            ? style({ pressed: false, hovered: false, focused: false })
            : style
        }
      >
        {children}
      </View>
    );
  return (
    <MotionPressable
      {...props}
      onPress={onPress}
      accessibilityRole={props.accessibilityRole || 'button'}
      style={style}
    >
      {children}
    </MotionPressable>
  );
}
