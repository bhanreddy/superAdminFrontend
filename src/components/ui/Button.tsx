import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, PressableProps, ViewStyle, StyleProp, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { pressableWebStyles } from '../../utils/webPressable';
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
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13, iconSize: 14, radius: 12, gap: 6 },
  md: { paddingVertical: 11, paddingHorizontal: 20, fontSize: 14, iconSize: 16, radius: 14, gap: 7 },
  lg: { paddingVertical: 14, paddingHorizontal: 26, fontSize: 16, iconSize: 18, radius: 16, gap: 8 },
};

export const Button: React.FC<ButtonProps> = React.memo(({
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
}) => {
  const { colors, isDark, clayShadows } = useTheme();
  const isDisabled = Boolean(disabled || loading);
  const s = SIZES[size];

  const getVariantStyles = (): { bg: string; borderColor?: string; borderWidth?: number; textColor: string; shadowRaw: any } => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.primary,
          textColor: '#FFFFFF',
          shadowRaw: (clayShadows as any).buttonPrimary || clayShadows.clay,
        };
      case 'secondary':
        return {
          bg: isDark ? colors.elevated : colors.surface,
          borderColor: colors.clayBorderColor,
          borderWidth: 1,
          textColor: colors.textPrimary,
          shadowRaw: clayShadows.subtle,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          textColor: colors.textSecondary,
          shadowRaw: null,
        };
      case 'outline':
        return {
          bg: 'transparent',
          borderColor: colors.clayBorderColor,
          borderWidth: 1,
          textColor: colors.textPrimary,
          shadowRaw: clayShadows.subtle,
        };
      case 'danger':
        return {
          bg: colors.error,
          textColor: '#FFFFFF',
          shadowRaw: (clayShadows as any).buttonDanger || clayShadows.clay,
        };
      default:
        return {
          bg: colors.primary,
          textColor: '#FFFFFF',
          shadowRaw: (clayShadows as any).buttonPrimary || clayShadows.clay,
        };
    }
  };

  const variantStyle = getVariantStyles();
  const { shadowRaw } = variantStyle;

  const getDynamicShadow = (pressed: boolean, hovered: boolean) => {
    if (!shadowRaw) return {};
    if (Platform.OS !== 'web') {
      return clayStyle(pressed ? clayShadows.clayPressed : shadowRaw);
    }

    if (pressed) {
      if (variant === 'primary' || variant === 'danger') {
        return {
          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.4), inset -2px -2px 5px rgba(255,255,255,0.1)',
        };
      }
      return {
        boxShadow: isDark
          ? 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)'
          : 'inset 2px 2px 5px rgba(0,0,0,0.1), inset -2px -2px 5px rgba(255,255,255,0.8)',
      };
    }

    if (hovered) {
      if (variant === 'primary') {
        const glowColor = isDark ? 'rgba(10, 132, 255, 0.4)' : 'rgba(0, 122, 255, 0.4)';
        return {
          boxShadow: `inset 1px 1px 4px rgba(255,255,255,0.5), 0px 6px 20px ${glowColor}`,
        };
      }
      if (variant === 'danger') {
        const glowColor = isDark ? 'rgba(255, 69, 58, 0.4)' : 'rgba(255, 59, 48, 0.4)';
        return {
          boxShadow: `inset 1px 1px 4px rgba(255,255,255,0.5), 0px 6px 20px ${glowColor}`,
        };
      }
      return {
        boxShadow: isDark
          ? 'inset 1px 1px 3px rgba(255,255,255,0.1), 0px 6px 16px rgba(0,0,0,0.5)'
          : 'inset 1px 1px 3px rgba(255,255,255,0.9), 0px 6px 16px rgba(0,0,0,0.08)',
      };
    }

    return clayStyle(shadowRaw);
  };

  // Icon-only button
  if (icon && !title && !children) {
    return (
      <Pressable
        disabled={isDisabled}
        onPress={safePressHandler(onPress as any)}
        style={({ pressed, hovered }: any) => [
          {
            width: s.paddingVertical * 2 + s.iconSize + 6,
            height: s.paddingVertical * 2 + s.iconSize + 6,
            borderRadius: s.radius,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            backgroundColor: hovered ? colors.hover : variantStyle.bg,
            borderWidth: variantStyle.borderWidth || 0,
            borderColor: variantStyle.borderColor,
          },
          getDynamicShadow(pressed, hovered),
          isDisabled && styles.disabled,
          pressed && { transform: [{ scale: 0.95 }] },
          Platform.OS === 'web' ? { transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: isDisabled ? 'not-allowed' : 'pointer' } as any : {},
          style as ViewStyle,
        ]}
        {...props}
      >
        {loading ? <ActivityIndicator color={variantStyle.textColor} size={s.iconSize} /> : icon}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      onPress={safePressHandler(onPress as any)}
      style={({ pressed, hovered }: any) => [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          backgroundColor: variantStyle.bg,
          borderWidth: variantStyle.borderWidth || 0,
          borderColor: variantStyle.borderColor,
          gap: s.gap,
        },
        getDynamicShadow(pressed, hovered),
        isDisabled && styles.disabled,
        pressed && { transform: [{ scale: 0.96 }] },
        Platform.OS === 'web' ? {
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        } as any : {},
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} size={s.iconSize} />
      ) : (
        <>
          {leftIcon}
          {title ? (
            <Text style={{ color: variantStyle.textColor, fontSize: s.fontSize, fontWeight: '600', letterSpacing: 0.1 }}>
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
  disabled: {
    opacity: 0.5,
  },
});
