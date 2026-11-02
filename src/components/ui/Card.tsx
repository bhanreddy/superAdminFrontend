import { MotionPressable } from './MotionPressable';
import React from 'react';
import { getCardTone, type CardTone } from '../../constants/experienceColors';
import { View, StyleSheet, ViewProps, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/theme';
interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  onPress?: () => void;
  noPadding?: boolean;
  tone?: CardTone;
  material?: 'soft' | 'panel' | 'neutral';
}
export const Card = React.memo(function Card({
  children,
  style,
  variant = 'default',
  onPress,
  noPadding = false,
  tone,
  material = 'soft',
  ...props
}: CardProps) {
  const { colors, clayShadows, isDark } = useTheme();
  const paint = tone ? getCardTone(tone, isDark) : undefined;
  const materialStyle = paint && material !== 'neutral' && {
    backgroundColor: material === 'panel' ? paint.panel : paint.surface,
    borderColor: paint.border,
  };
  const surface = {
    backgroundColor: colors.card,
    borderColor: colors.borderSubtle || colors.border,
  };
  if (onPress)
    return (
      <MotionPressable
        lift
        accessibilityRole="button"
        onPress={onPress}
        style={({ hovered, pressed, focused }: any) => [
          styles.card,
          surface,
          clayStyle(clayShadows.subtle),
          !noPadding && styles.padding,
          pressed && { opacity: 0.88 },
          Platform.OS === 'web' &&
            ({
              cursor: 'pointer',
              transition: 'border-color 120ms ease',
            } as any),
          style,
          materialStyle,
          (hovered || focused) && { borderColor: paint?.accent || colors.primary },
        ]}
        {...props}
      >
        {children}
      </MotionPressable>
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
        materialStyle,
      ]}
      {...props}
    >
      {children}
    </View>
  );
});
const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, borderWidth: 1, minWidth: 0 },
  padding: { padding: 20 },
});
