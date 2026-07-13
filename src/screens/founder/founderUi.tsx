import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ScrollView,
  Animated as RNAnimated,
  useWindowDimensions,
} from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { safePressHandler } from '../../utils/safePressHandler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { ClayView, PressScale, clayTokens } from '../../components/ui/ClayPrimitives';

const { width: W } = Dimensions.get('window');

export const founderGradients = {
  primary: ['#818CF8', '#6366F1'] as const,
  success: ['#34D399', '#059669'] as const,
  danger: ['#FCA5A5', '#DC2626'] as const,
  warning: ['#FCD34D', '#D97706'] as const,
  info: ['#7DD3FC', '#2563EB'] as const,
  cardDark: ['rgba(33,31,45,0.95)', 'rgba(27,26,37,0.98)'] as const,
};

/* ── Skeleton Pulse Loader ─────────────────────────────────────────────────── */
export const SkeletonPulse = React.memo(function SkeletonPulse({
  width,
  height,
  borderRadius = 16,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const { isDark } = useTheme();
  const pulse = useRef(new RNAnimated.Value(0.3)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <RNAnimated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          opacity: pulse,
        },
        style,
      ]}
    />
  );
});

export const SkeletonStatGrid = React.memo(function SkeletonStatGrid() {
  const cardW = (W - 48 - 12) / 2;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonPulse key={i} width={cardW} height={130} borderRadius={22} />
      ))}
      <SkeletonPulse width="100%" height={72} borderRadius={22} style={{ marginTop: 0 }} />
    </View>
  );
});

export const SkeletonKpiGrid = React.memo(function SkeletonKpiGrid() {
  const cardW = (W - 40 - 12) / 2;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonPulse key={i} width={cardW} height={96} borderRadius={20} />
      ))}
    </View>
  );
});

export const SkeletonActionList = React.memo(function SkeletonActionList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPulse key={i} width="100%" height={68} borderRadius={20} />
      ))}
    </View>
  );
});

/* ── Console Ambient Background ────────────────────────────────────────────── */
export const ConsoleAmbientBackground = React.memo(function ConsoleAmbientBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {children}
    </View>
  );
});

/* ── Glass Card ────────────────────────────────────────────────────────────── */
export const GlassCard = React.memo(function GlassCard({
  children,
  style,
  noPad,
}: {
  children: React.ReactNode;
  style?: object;
  noPad?: boolean;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  return (
    <View
      style={[
        styles.glassOuter,
        {
          borderColor: colors.clayBorderColor,
          backgroundColor: isDark ? 'rgba(33,31,45,0.7)' : 'rgba(251,250,248,0.75)',
        },
        clayStyle(clayShadows.clayElevated),
        style,
      ]}
    >
      <BlurView
        intensity={isDark ? 30 : 65}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.glassInner, noPad ? { padding: 0 } : null]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']
              : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.35)']
          }
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
        <View style={styles.glassContent}>{children}</View>
      </BlurView>
    </View>
  );
});

/* ── Sparkline Mini Chart ───────────────────────────────────────────────────── */
function SparklineMini({
  data,
  color,
  height = 28,
  width = 64,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  // Build a simple polyline via small View dots and connecting lines
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height - 4) - 2,
  }));

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Area fill */}
      <View style={[{ width, height, position: 'absolute', bottom: 0, opacity: 0.15, borderRadius: 4, overflow: 'hidden' }]}>
        <LinearGradient
          colors={[color, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width, height }}
        />
      </View>
      {/* Line segments */}
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: len,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: '0 0',
              opacity: 0.8,
            } as any}
          />
        );
      })}
      {/* End dot */}
      <View
        style={{
          position: 'absolute',
          left: points[points.length - 1].x - 3,
          top: points[points.length - 1].y - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/* ── KPI Tile v2 ──────────────────────────────────────────────────────────── */
export const KpiTile = React.memo(function KpiTile({
  label,
  value,
  gradient,
  delay = 0,
  icon,
  sparklineData,
  changePercent,
}: {
  label: string;
  value: string;
  gradient: readonly [string, string];
  delay?: number;
  icon?: React.ReactNode;
  sparklineData?: number[];
  changePercent?: number;
}) {
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  const tileWidth = isDesktop
    ? (screenWidth - 240 - 80 - 36) / 4
    : isTablet
      ? (screenWidth - 40 - 12) / 2
      : (W - 40 - 12) / 2;

  const changeDir = changePercent !== undefined
    ? changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat'
    : null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(420).springify()} style={{ width: tileWidth, marginBottom: 12 }}>
      <PressScale style={{ width: '100%', height: 130 }}>
        <ClayView 
          isDark={isDark} 
          color={isDark ? 'rgba(255,255,255,0.03)' : colors.card} 
          radius={24} 
          style={{ padding: 18, flex: 1, overflow: 'hidden' }}
        >
          {/* Top colored edge accent */}
          <LinearGradient
            colors={[gradient[0], gradient[1]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, opacity: isDark ? 0.8 : 0.6 }}
          />

          {/* Top row: icon + sparkline */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {icon && (
              <View
                style={[
                  {
                    width: 36, height: 36, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isDark ? gradient[0] + '33' : gradient[0] + '22',
                  },
                ]}
              >
                {React.cloneElement(icon as any, { color: isDark ? '#FFF' : gradient[0] })}
              </View>
            )}
            {sparklineData && sparklineData.length >= 2 && (
              <View style={{ width: 60, height: 24, opacity: 0.8 }}>
                <SparklineMini data={sparklineData} color={gradient[0]} />
              </View>
            )}
          </View>

          <View style={{ flex: 1 }} />

          {/* Value + Change row */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 }} numberOfLines={1}>
              {value}
            </Text>
            {changeDir && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2,
                borderRadius: 8,
                backgroundColor: changeDir === 'up'
                  ? (isDark ? 'rgba(0,212,173,0.15)' : 'rgba(0,212,173,0.1)')
                  : changeDir === 'down'
                    ? (isDark ? 'rgba(255,107,122,0.15)' : 'rgba(255,107,122,0.1)')
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
              }}>
                {changeDir === 'up' && <TrendingUp size={10} color="#00D4AD" strokeWidth={2.5} />}
                {changeDir === 'down' && <TrendingDown size={10} color="#FF6B7A" strokeWidth={2.5} />}
                {changeDir === 'flat' && <Minus size={10} color={colors.textSecondary} strokeWidth={2.5} />}
                <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: changeDir === 'up' ? '#00D4AD'
                      : changeDir === 'down' ? '#FF6B7A'
                        : colors.textSecondary,
                  }}>
                  {changePercent !== undefined ? `${Math.abs(changePercent).toFixed(1)}%` : ''}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' }} numberOfLines={1}>
            {label}
          </Text>

          {/* Large subtle background icon */}
          <View style={{ position: 'absolute', right: -10, bottom: -15, opacity: isDark ? 0.05 : 0.03, transform: [{ scale: 3.5 }] }} pointerEvents="none">
             {React.cloneElement(icon as any, { color: colors.textPrimary })}
          </View>
        </ClayView>
      </PressScale>
    </Animated.View>
  );
});

/* ── Financial Summary Banner ──────────────────────────────────────────────── */
export const FinancialSummaryBanner = React.memo(function FinancialSummaryBanner({
  netProfit,
  netProfitFormatted,
  incomeFormatted,
  expenseFormatted,
  delay = 0,
}: {
  netProfit: number;
  netProfitFormatted: string;
  incomeFormatted: string;
  expenseFormatted: string;
  delay?: number;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const isHealthy = netProfit >= 0;
  const grad: [string, string] = isHealthy ? ['#00D4AD', '#059669'] : ['#FF6B7A', '#DC2626'];

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(500).springify()} style={styles.financialBanner}>
      <View style={[
        styles.financialBannerInner,
        {
          backgroundColor: colors.card,
          borderColor: grad[0] + '44',
        },
        clayStyle(clayShadows.clayElevated),
      ]}>
        <LinearGradient
          colors={[grad[0] + '18', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Left: Net Profit */}
        <View style={styles.financialLeft}>
          <View style={styles.financialStatusRow}>
            <View style={[
              styles.financialStatusDot,
              { backgroundColor: isHealthy ? '#00D4AD' : '#FF6B7A' },
            ]} />
            <Text style={[styles.financialStatusText, { color: isHealthy ? '#00D4AD' : '#FF6B7A' }]}>
              {isHealthy ? 'Healthy' : 'Deficit'}
            </Text>
          </View>
          <Text style={[styles.financialBigValue, { color: colors.textPrimary }]}>
            {netProfitFormatted}
          </Text>
          <Text style={[styles.financialSubLabel, { color: colors.textSecondary }]}>
            Net profit this month
          </Text>
        </View>

        {/* Right: Income / Expense mini stats */}
        <View style={styles.financialRight}>
          <View style={styles.financialMiniStat}>
            <View style={[styles.financialMiniDot, { backgroundColor: '#00D4AD' }]} />
            <View>
              <Text style={[styles.financialMiniLabel, { color: colors.textSecondary }]}>Income</Text>
              <Text style={[styles.financialMiniVal, { color: colors.textPrimary }]}>{incomeFormatted}</Text>
            </View>
          </View>
          <View style={[styles.financialDivider, { backgroundColor: colors.border }]} />
          <View style={styles.financialMiniStat}>
            <View style={[styles.financialMiniDot, { backgroundColor: '#FF6B7A' }]} />
            <View>
              <Text style={[styles.financialMiniLabel, { color: colors.textSecondary }]}>Expense</Text>
              <Text style={[styles.financialMiniVal, { color: colors.textPrimary }]}>{expenseFormatted}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

/* ── Section Title ─────────────────────────────────────────────────────────── */
export const SectionTitle = React.memo(function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {right}
    </View>
  );
});

/* ── Filter Chips ──────────────────────────────────────────────────────────── */
function FilterChipsInner<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <ScrollView style={{ flexGrow: 0, flexShrink: 0 }} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={({ pressed, hovered }: any) => [
              styles.chip,
              {
                backgroundColor: active
                  ? colors.primaryDim
                  : isDark
                    ? 'rgba(255,255,255,0.04)'
                    : colors.surface,
                borderColor: active ? colors.primary : colors.clayBorderColor,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
              Platform.OS === 'web' ? {
                boxShadow: active
                  ? isDark
                    ? 'inset 2px 2px 5px rgba(0,0,0,0.25), inset -2px -2px 5px rgba(255,255,255,0.03)'
                    : 'inset 2px 2px 5px rgba(0,0,0,0.04), inset -2px -2px 5px rgba(255,255,255,0.5)'
                  : isDark
                    ? '2px 2px 6px rgba(0,0,0,0.15), -2px -2px 6px rgba(255,255,255,0.02)'
                    : '2px 2px 6px rgba(0,0,0,0.03), -2px -2px 6px rgba(255,255,255,0.5)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              } as any : {},
              ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
            ]}
          >
            <Text
              style={{
                color: active ? colors.primary : colors.textSecondary,
                fontSize: 12.5,
                fontWeight: '700',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const FilterChips = React.memo(FilterChipsInner) as typeof FilterChipsInner;

/* ── Primary Gradient Button ───────────────────────────────────────────────── */
export const PrimaryGradientButton = React.memo(function PrimaryGradientButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress?: () => void | Promise<void>;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger';
}) {
  const { clayShadows } = useTheme();
  const g =
    variant === 'success'
      ? founderGradients.success
      : variant === 'danger'
        ? founderGradients.danger
        : founderGradients.primary;
  return (
    <Pressable
      onPress={safePressHandler(onPress)}
      disabled={disabled}
      style={({ pressed, hovered }: any) => [
        {
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        clayStyle(clayShadows.clay),
        Platform.OS === 'web' ? {
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        } as any : {},
        ...pressableWebStyles(pressed, { disabled, pressedOpacity: 0.9 }),
      ]}
    >
      <LinearGradient colors={g as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}>
        <Text style={styles.ctaBtnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  rootFill: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glassOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glassInner: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 20,
  },
  glassContent: {
    position: 'relative',
  },
  kpiWrap: {
    width: (W - 40 - 12) / 2,
    marginBottom: 12,
  },
  kpiCard: {
    borderRadius: 22,
    padding: 18,
    minHeight: 130,
    overflow: 'hidden',
    borderWidth: 1,
    flex: 1,
  },
  kpiTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  kpiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiSparklineWrap: {
    opacity: 0.9,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 3,
  },
  kpiChangeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  kpiLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // Financial Summary Banner
  financialBanner: {
    marginBottom: 16,
  },
  financialBannerInner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 100,
  },
  financialLeft: {
    flex: 1,
  },
  financialStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  financialStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  financialStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  financialBigValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  financialSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  financialRight: {
    justifyContent: 'center',
    paddingLeft: 20,
    gap: 12,
  },
  financialMiniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  financialMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  financialMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  financialMiniVal: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  financialDivider: {
    height: 1,
    width: 60,
    borderRadius: 1,
    opacity: 0.4,
  },
  // Existing styles preserved
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingRight: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  ctaBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 22,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15.5,
  },
});

export const bottomTabPad = Platform.OS === 'ios' ? 108 : 96;

