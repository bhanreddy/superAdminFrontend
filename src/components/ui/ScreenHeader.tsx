import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Override default tertiary subtitle color for better contrast on dense screens. */
  subtitleColor?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
}

export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  subtitle,
  subtitleColor,
  showBack = false,
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors, isDark, clayShadows } = useTheme();
  const { width: winW } = useWindowDimensions();
  const compact = winW < 420;
  const stackActions = winW < 520;

  return (
    <View style={[styles.container, stackActions && styles.containerStacked]}>
      <View style={[styles.left, { minWidth: 0 }, stackActions && styles.leftStacked]}>
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed, hovered }: any) => [
              styles.backBtn,
              {
                backgroundColor: hovered
                  ? colors.hover
                  : colors.clayInnerLight,
              },
              clayStyle(clayShadows.subtle),
              pressed && { transform: [{ scale: 0.93 }] },
              Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } as any : {},
            ]}
            hitSlop={8}
          >
            <ChevronLeft size={18} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        )}
        <View style={[styles.titleBlock, { minWidth: 0 }]}>
          <Text
            style={[styles.title, { color: colors.textPrimary }, compact && { fontSize: 22 }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: subtitleColor ?? colors.textTertiary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && (
        <View style={[styles.right, { flexShrink: 0 }, stackActions && styles.rightStacked]}>
          {rightAction}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingTop: 6,
  },
  containerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  leftStacked: {
    width: '100%',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightStacked: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});
