import React from 'react';
import { View, StyleSheet, ViewProps, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  onPress?: () => void;
  noPadding?: boolean;
}
export const Card = React.memo(function Card({
  children,
  style,
  variant = 'default',
  onPress,
  noPadding = false,
  ...props
}: CardProps) {
  const { colors, clayShadows } = useTheme();
  const surface = {
    backgroundColor: colors.card,
    borderColor: colors.borderSubtle || colors.border,
  };
  if (onPress)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ hovered, pressed }: any) => [
          styles.card,
          surface,
          !noPadding && styles.padding,
          hovered && { borderColor: colors.primary },
          pressed && { opacity: 0.88 },
          Platform.OS === 'web' &&
            ({
              cursor: 'pointer',
              transition: 'border-color 120ms ease',
            } as any),
          style,
        ]}
        {...props}
      >
        {children}
      </Pressable>
    );
  return (
    <View
      style={[
        styles.card,
        surface,
        clayStyle(
          variant === 'elevated'
            ? clayShadows.clayElevated
            : variant === 'outlined'
              ? clayShadows.none
              : clayShadows.subtle,
        ),
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
  card: { borderRadius: 16, borderWidth: 1, minWidth: 0 },
  padding: { padding: 20 },
});
