import React from 'react';
import { View, StyleSheet, ViewProps, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  onPress?: () => void;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = React.memo(({
  children,
  style,
  variant = 'default',
  onPress,
  noPadding = false,
  ...props
}) => {
  const { colors, isDark, clayShadows } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
          borderColor: colors.clayBorderColor,
          borderWidth: 1,
          shadowRaw: clayShadows.subtle,
        };
      case 'elevated':
        return {
          backgroundColor: colors.card,
          borderColor: colors.clayBorderColor,
          borderWidth: 1,
          shadowRaw: clayShadows.clayElevated,
        };
      case 'interactive':
        return {
          backgroundColor: colors.card,
          borderColor: colors.clayBorderColor,
          borderWidth: 1,
          shadowRaw: clayShadows.clay,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.card,
          borderColor: colors.clayBorderColor,
          borderWidth: 1,
          shadowRaw: clayShadows.clay,
        };
    }
  };

  const variantStyle = getVariantStyle();
  const { shadowRaw, ...cleanVariantStyle } = variantStyle;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={{ width: '100%' }}
      >
        {({ pressed, hovered }: any) => {
          const activeShadow = pressed
            ? clayShadows.clayPressed
            : hovered
              ? clayShadows.clayElevated
              : shadowRaw;
          const activeScale = pressed ? 0.98 : hovered ? 1.01 : 1;

          return (
            <View
              style={[
                styles.card,
                cleanVariantStyle,
                clayStyle(activeShadow),
                !noPadding && styles.padding,
                Platform.OS === 'web' ? {
                  transform: `scale(${activeScale})`,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                } as any : {
                  transform: [{ scale: activeScale }],
                },
                style,
              ]}
              {...props}
            >
              {children}
            </View>
          );
        }}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        cleanVariantStyle,
        clayStyle(shadowRaw),
        !noPadding && styles.padding,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  padding: {
    padding: 24,
  },
});
