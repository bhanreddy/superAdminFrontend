import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  PressableProps,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { safePressHandler } from '../../utils/safePressHandler';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title?: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}
const SIZES = {
  sm: { vertical: 10, horizontal: 14, font: 13, height: 44 },
  md: { vertical: 12, horizontal: 18, font: 14, height: 46 },
  lg: { vertical: 14, horizontal: 24, font: 16, height: 50 },
};

export const Button = React.memo(function Button({
  title,
  loading,
  variant = 'primary',
  size = 'md',
  icon,
  leftIcon,
  rightIcon,
  style,
  onPress,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const blocked = Boolean(disabled || loading);
  const s = SIZES[size];
  const filled = variant === 'primary' || variant === 'danger';
  const foreground = filled
    ? colors.onPrimary || '#FFFFFF'
    : variant === 'ghost'
      ? colors.textSecondary
      : colors.textPrimary;
  const background =
    variant === 'primary'
      ? colors.primaryFill || colors.primary
      : variant === 'danger'
        ? '#BF3547'
        : variant === 'secondary'
          ? colors.primaryMuted
          : 'transparent';
  const iconOnly = Boolean(icon && !title && !children);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: blocked, busy: Boolean(loading) }} aria-busy={Boolean(loading)}
      disabled={blocked}
      onPress={safePressHandler(onPress as any)}
      {...props}
      style={({ pressed, hovered }: any) => [
        styles.base,
        {
          minHeight: s.height,
          paddingVertical: s.vertical,
          paddingHorizontal: iconOnly ? 10 : s.horizontal,
          backgroundColor:
            hovered && !blocked && !filled ? colors.hover : background,
          borderColor:
            variant === 'outline'
              ? colors.border
              : variant === 'secondary'
                ? colors.primaryDim
                : 'transparent',
          opacity: blocked ? 0.5 : pressed ? 0.82 : 1,
        },
        iconOnly && { minWidth: s.height },
        Platform.OS === 'web' &&
          ({
            cursor: blocked ? 'not-allowed' : 'pointer',
            transition: 'background-color 120ms ease, opacity 120ms ease',
          } as any),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {leftIcon || icon}
          {title ? (
            <Text
              style={{
                color: foreground,
                fontSize: s.font,
                fontWeight: '600',
                flexShrink: 1,
                textAlign: 'center',
              }}
            >
              {title}
            </Text>
          ) : null}
          {children}
          {rightIcon}
        </>
      )}
    </Pressable>
  );
});
const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    gap: 8,
  },
});
