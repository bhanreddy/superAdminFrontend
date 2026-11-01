import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/** A single opacity pulse. No per-row gradient or continuously repainted blur. */
export const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors, reducedMotion } = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = reducedMotion
      ? 1
      : withRepeat(withTiming(0.5, { duration: 900 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [reducedMotion, opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessible={false}
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        style,
        pulse,
      ]}
    />
  );
});

// ─── Presets ────────────────────────────────────────────────────────────────

export const SkeletonText = React.memo(function SkeletonText({
  lines = 3,
  gap = 10,
}: {
  lines?: number;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
          borderRadius={6}
        />
      ))}
    </View>
  );
});

export const SkeletonCard = React.memo(function SkeletonCard() {
  const { colors, borderRadius: br } = useTheme();
  return (
    <View
      style={[
        skeletonStyles.card,
        { backgroundColor: colors.card, borderColor: colors.clayBorderColor },
      ]}
    >
      <View style={skeletonStyles.cardRow}>
        <Skeleton width={48} height={48} borderRadius={16} />
        <View style={skeletonStyles.cardTexts}>
          <Skeleton height={16} width="70%" borderRadius={6} />
          <Skeleton height={12} width="40%" borderRadius={6} />
        </View>
      </View>
    </View>
  );
});

export const SkeletonTable = React.memo(function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 1 }}>
      {/* Header */}
      <View
        style={[skeletonStyles.tableRow, { backgroundColor: colors.surface }]}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <View key={i} style={{ flex: i === 0 ? 2 : 1 }}>
            <Skeleton height={12} width="60%" borderRadius={6} />
          </View>
        ))}
      </View>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <View
          key={ri}
          style={[skeletonStyles.tableRow, { backgroundColor: colors.card }]}
        >
          {Array.from({ length: columns }).map((_, ci) => (
            <View key={ci} style={{ flex: ci === 0 ? 2 : 1 }}>
              <Skeleton
                height={14}
                width={ci === 0 ? '80%' : '50%'}
                borderRadius={6}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardTexts: {
    flex: 1,
    gap: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
});
