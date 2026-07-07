import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' };
  accentColor?: string;
  onPress?: () => void;
}

export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  trend,
  accentColor,
  onPress,
}: StatCardProps) {
  const { colors, isDark, clayShadows } = useTheme();
  const accent = accentColor || colors.primary;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const onPressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 12, useNativeDriver: true }).start();
    }
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  const renderCard = (hovered = false) => (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.clayBorderColor,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        clayStyle(hovered ? clayShadows.clayElevated : clayShadows.clay),
        Platform.OS === 'web' ? {
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: onPress ? 'pointer' : 'default',
          ...(hovered ? { transform: 'scale(1.02)' } : {}),
        } as any : {},
      ]}
    >
      {/* Accent top glow — soft gradient instead of hard line */}
      <View style={[styles.accentGlow, { backgroundColor: `${accent}18` }]}>
        <View style={[styles.accentLine, { backgroundColor: accent, opacity: 0.6 }]} />
      </View>

      <View style={styles.header}>
        <View style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? `${accent}18` : `${accent}0A`,
            borderWidth: 1,
            borderColor: `${accent}15`,
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? `inset 1.5px 1.5px 3px rgba(0,0,0,0.4), inset -1.5px -1.5px 3px rgba(255,255,255,0.05)`
              : `inset 1.5px 1.5px 3px rgba(255,255,255,0.95), inset -2px -2px 4px ${accent}25, inset -1.5px -1.5px 3px rgba(0,0,0,0.04)`,
          } as any : {},
        ]}>
          {icon}
        </View>
        {trend && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor:
                  trend.direction === 'up' ? colors.successDim : colors.errorDim,
              },
            ]}
          >
            {trend.direction === 'up' ? (
              <TrendingUp size={11} color={colors.success} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={11} color={colors.error} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.trendText,
                { color: trend.direction === 'up' ? colors.success : colors.error },
              ]}
            >
              {trend.value}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: colors.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.pressWrap}>
        {({ hovered }: any) => renderCard(hovered)}
      </Pressable>
    );
  }

  return renderCard(false);
});

const styles = StyleSheet.create({
  pressWrap: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    minHeight: 148,
  },
  accentGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  accentLine: {
    height: 2,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  value: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
