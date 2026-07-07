import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'primary' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = React.memo(({ label, variant = 'primary', size = 'sm', dot = false }) => {
  const { colors, isDark } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successDim, text: colors.success, dot: colors.success };
      case 'warning':
        return { bg: colors.warningDim, text: colors.warning, dot: colors.warning };
      case 'error':
        return { bg: colors.errorDim, text: colors.error, dot: colors.error };
      case 'info':
        return { bg: colors.infoDim, text: colors.info, dot: colors.info };
      case 'primary':
      default:
        return { bg: colors.primaryDim, text: colors.primary, dot: colors.primary };
    }
  };

  const c = getColors();
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: `${c.text}22`,
      },
      isSmall ? styles.badgeSm : styles.badgeMd,
      Platform.OS === 'web' ? {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isDark
          ? 'inset 1px 1px 2px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)'
          : 'inset 1px 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.02)',
      } as any : {},
    ]}>
      {dot && (
        <View style={styles.dotWrap}>
          <View style={[styles.dotGlow, { backgroundColor: c.dot }]} />
          <View style={[styles.dot, { backgroundColor: c.dot }]} />
        </View>
      )}
      <Text style={[styles.text, { color: c.text }, isSmall ? styles.textSm : styles.textMd]}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 9999,
    gap: 6,
  },
  badgeSm: {
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  badgeMd: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dotWrap: {
    width: 7,
    height: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGlow: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.35,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
});
