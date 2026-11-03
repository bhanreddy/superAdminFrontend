import { MotionPressable } from './MotionPressable';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardTone, type CardTone } from '../../constants/experienceColors';
import { workspaceTones } from '../../constants/workspaceDesign';
import { View, StyleSheet, ViewProps, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { borderRadius, theme } from '../../constants/theme';
export type CardMaterial = 'soft' | 'panel' | 'neutral';
interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  onPress?: () => void;
  noPadding?: boolean;
  tone?: CardTone;
  material?: CardMaterial;
}
export const Card = React.memo(function Card({
  children,
  style,
  variant = 'default',
  onPress,
  noPadding = false,
  tone,
  material = 'neutral',
  ...props
}: CardProps) {
  const { colors, clayShadows, isDark, workspaceModule = 'overview' } = useTheme();
  const resolvedTone = tone || (material === 'neutral' ? workspaceTones[workspaceModule] : undefined);
  const paint = resolvedTone ? getCardTone(resolvedTone, isDark) : undefined;
  const materialStyle = paint && material !== 'neutral' && {
    backgroundColor: material === 'panel' ? paint.panel : paint.surface,
    borderColor: paint.border,
  };
  const surface = {
    backgroundColor: colors.card,
    borderColor: colors.borderSubtle || colors.border,
  };
  const content = (
    <>
      {paint && material === 'neutral' && (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[colors.card, paint.panel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[styles.accentEdge, { backgroundColor: paint.accent }]}
          />
        </>
      )}
      {children}
    </>
  );
  if (onPress)
    return (
      <MotionPressable
        lift
        accessibilityRole="button"
        onPress={onPress}
        style={({ hovered, pressed, focused }: any) => [
          styles.card,
          material === 'neutral' && styles.neutral,
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
        {content}
      </MotionPressable>
    );
  return (
    <View
      style={[
        styles.card,
        material === 'neutral' && styles.neutral,
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
      {content}
    </View>
  );
});
const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, borderWidth: 1, minWidth: 0 },
  neutral: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  accentEdge: {
    position: 'absolute',
    left: 0,
    top: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 3,
    borderTopRightRadius: borderRadius.xs,
    borderBottomRightRadius: borderRadius.xs,
  },
  padding: { padding: 20 },
});
