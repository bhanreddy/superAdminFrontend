import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ChevronDown, CheckCircle2, Clock, Circle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PhaseSectionProps {
  phaseNumber: number;
  title: string;
  subtitle: string;
  status: 'Done' | 'In Progress' | 'Pending';
  children: React.ReactNode;
  initialExpanded?: boolean;
  completedCount?: number;
  totalCount?: number;
}

const ANIMATION_DURATION = 320;

export function PhaseSection({
  phaseNumber,
  title,
  subtitle,
  status,
  children,
  initialExpanded = false,
  completedCount,
  totalCount,
}: PhaseSectionProps) {
  const { colors, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [contentVisible, setContentVisible] = useState(initialExpanded);
  const [contentHeight, setContentHeight] = useState(0);

  // Single shared value driving ALL animations — no worklet-reading-JS-state bug
  const progress = useSharedValue(initialExpanded ? 1 : 0);

  const toggle = useCallback(() => {
    const next = !isExpanded;
    setIsExpanded(next);

    if (next) {
      // Expand: show content immediately so it can be measured, then animate
      setContentVisible(true);
      progress.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(
        0,
        { duration: ANIMATION_DURATION, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setContentVisible)(false);
        }
      );
    }
  }, [isExpanded, progress]);

  // Animated content wrapper — height + opacity
  const animatedContentStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, contentHeight]),
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0, 1]),
  }));

  // Chevron rotation
  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  // Phase number orb scale on press feedback
  const orbScale = useSharedValue(1);
  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  // ─── Status-derived values ───────────────────────────────────────────────────
  const statusConfig = {
    Done: {
      accent: colors.success,
      badgeBg: colors.success + '1A',
      icon: <CheckCircle2 size={14} color={colors.success} />,
      orbBg: colors.success + '22',
      orbBorder: colors.success + '55',
      leftBorder: colors.success,
    },
    'In Progress': {
      accent: colors.primary,
      badgeBg: isDark ? colors.primary + '25' : colors.primary + '18',
      icon: <Clock size={14} color={colors.primary} />,
      orbBg: colors.primary + '22',
      orbBorder: colors.primary + '55',
      leftBorder: colors.primary,
    },
    Pending: {
      accent: colors.textSecondary,
      badgeBg: isDark ? '#ffffff0D' : '#0000000D',
      icon: <Circle size={14} color={colors.textSecondary} />,
      orbBg: isDark ? '#ffffff0D' : '#0000000D',
      orbBorder: colors.border,
      leftBorder: 'transparent',
    },
  }[status];

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderColor: isDark ? colors.border : '#E8E8F0',
          borderLeftColor: statusConfig.leftBorder,
          // Subtle shadow for depth
          shadowColor: statusConfig.accent,
          shadowOpacity: status === 'Pending' ? 0 : isDark ? 0.18 : 0.10,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 16,
          elevation: status === 'Pending' ? 1 : 4,
        },
      ]}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPressIn={() => {
          orbScale.value = withTiming(0.9, { duration: 120 });
        }}
        onPressOut={() => {
          orbScale.value = withTiming(1, { duration: 200 });
        }}
        onPress={toggle}
        hitSlop={4}
      >
        {/* Phase number orb */}
        <Animated.View
          style={[
            styles.phaseOrb,
            {
              backgroundColor: statusConfig.orbBg,
              borderColor: statusConfig.orbBorder,
            },
            animatedOrbStyle,
          ]}
        >
          <Text style={[styles.phaseOrbText, { color: statusConfig.accent }]}>
            {phaseNumber}
          </Text>
        </Animated.View>

        {/* Title + subtitle */}
        <View style={styles.headerLeft}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
          {typeof completedCount === 'number' && typeof totalCount === 'number' && (
            <Text
              style={[styles.progressText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {completedCount}/{totalCount} completed
            </Text>
          )}
        </View>

        {/* Badge + chevron */}
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: statusConfig.badgeBg }]}>
            {statusConfig.icon}
            <Text style={[styles.badgeText, { color: statusConfig.accent }]}>
              {status}
            </Text>
          </View>

          <Animated.View
            style={[
              styles.chevronWrap,
              {
                backgroundColor: isDark ? '#ffffff0A' : '#0000000A',
                borderColor: isDark ? '#ffffff14' : '#00000014',
              },
              animatedChevronStyle,
            ]}
          >
            <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.5} />
          </Animated.View>
        </View>
      </Pressable>

      {/* ── Divider (only when expanded) ───────────────────────────────── */}
      {contentVisible && (
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? colors.border : '#E8E8F0' },
          ]}
        />
      )}

      {/* ── Animated content ───────────────────────────────────────────── */}
      <Animated.View style={[styles.contentWrapper, animatedContentStyle]}>
        {/* Hidden measurer — renders off-screen to capture real height */}
        <View
          style={styles.contentMeasurer}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== contentHeight) setContentHeight(h);
          }}
        >
          {contentVisible && (
            <View style={styles.childrenContainer}>{children}</View>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  phaseOrb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  phaseOrbText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  headerLeft: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  progressText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  contentWrapper: {
    overflow: 'hidden',
  },
  contentMeasurer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  childrenContainer: {
    padding: 16,
    gap: 20,
  },
});