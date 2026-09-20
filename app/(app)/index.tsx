// - Dashboard Screen - V3 (3-Version Direct Upgrade) -
// V+1 (Foundation): Sparklines + MoM deltas on every metric card
// V+2 (Intelligence): Attention Strip, Primary Metric Hero, smart insights
// V+3 (Storytelling): Pipeline Funnel, area-fill revenue chart, insight callouts
// All business logic, routes, auth gates, data fetching preserved verbatim.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, Target, TrendingUp, TrendingDown, IndianRupee, School,
  GraduationCap, Briefcase, ShieldCheck, CheckCircle2, Wallet, Receipt,
  PiggyBank, CircleDollarSign, BarChart3, Sparkles, ArrowUpRight, Plus,
  BookOpen, Settings, Building2, Megaphone, ScrollText, Cpu, ChevronRight,
  Store, Zap, Activity, AlertCircle, Bell, Clock, Flame, Eye, ArrowDown,
  ArrowUp, Filter, Layers, CalendarDays,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useFounderAuth } from '../../src/hooks/useFounderAuth';
import { superAdminApi } from '../../src/services/apiService';
import * as founderDb from '../../src/services/founderSupabase';
import { computeFounderDashboardMetrics } from '../../src/utils/founderDashboardMetrics';
import { useTheme, clayStyle } from '../../src/contexts/ThemeContext';
import { founderGradients } from '../../src/screens/founder/founderUi';
import { Badge } from '../../src/components/ui/Badge';
import { Skeleton } from '../../src/components/ui/Skeleton';
import SalesManagerDashboard from '../../src/screens/dashboards/SalesManagerDashboard';
import SalesExecutiveDashboard from '../../src/screens/dashboards/SalesExecutiveDashboard';
import ImplementationDashboard from '../../src/screens/dashboards/ImplementationDashboard';
import SupportDashboard from '../../src/screens/dashboards/SupportDashboard';
import GenericRoleDashboard from '../../src/screens/dashboards/GenericRoleDashboard';
import { isFounderOrSuperAdmin } from '../../src/constants/rbac';

// - Helpers -
function n(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function pick(row: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) { if (row[k] !== undefined && row[k] !== null) return n(row[k]); }
  return 0;
}
function monthKey(r: Record<string, unknown>): string {
  const month = n(r.month ?? r.period_month ?? r.m);
  const year = n(r.year ?? r.period_year ?? r.y);
  return `${year}-${String(month).padStart(2, '0')}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m, 10)] || m} '${(y || '').slice(2)}`;
}
function formatCompact(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString('en-IN');
}
// MoM delta % from last two sorted entries
function computeMoM(rows: Record<string, unknown>[], keys: string[]): number {
  if (!rows || rows.length < 2) return 0;
  const sorted = [...rows].sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
  const last = pick(sorted[sorted.length - 1], keys);
  const prev = pick(sorted[sorted.length - 2], keys);
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}
// Build sparkline data (last N points) from rows
function buildSpark(rows: Record<string, unknown>[], keys: string[], n = 7): number[] {
  if (!rows || rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
  return sorted.slice(-n).map(r => pick(r, keys));
}

// - Fade-in stagger -
const FadeIn = React.memo(function FadeIn({
  children, delay = 0, translateY = 16,
}: { children: React.ReactNode; delay?: number; translateY?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(translateY)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, delay, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: translateAnim }] }}>
      {children}
    </Animated.View>
  );
});

// - Animated bar (used in chart) -
const AnimatedBar = React.memo(function AnimatedBar({
  targetHeight, color, delay = 0, barW = 10, gradient,
}: {
  targetHeight: number; color: string; delay?: number; barW?: number;
  gradient?: readonly [string, string];
}) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: Math.max(4, targetHeight), delay,
      tension: 50, friction: 9, useNativeDriver: false,
    }).start();
  }, [targetHeight]);

  if (gradient) {
    return (
      <Animated.View style={{ height: heightAnim, width: barW, borderRadius: 5, overflow: 'hidden' }}>
        <LinearGradient
          colors={gradient as [string, string]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />
      </Animated.View>
    );
  }
  return (
    <Animated.View style={{
      height: heightAnim, width: barW, borderRadius: 5,
      backgroundColor: color,
      shadowColor: color, shadowOpacity: 0.5, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }} />
  );
});

// - Sparkline (NEW) -
// Mini bar-density chart, no SVG, no new deps.
const Sparkline = React.memo(function Sparkline({
  data, color, height = 28, width = 90,
}: { data: number[]; color: string; height?: number; width?: number }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ width, height, justifyContent: 'flex-end' }}>
        <View style={{ height: 1.5, backgroundColor: `${color}40`, borderRadius: 1 }} />
      </View>
    );
  }
  const max = Math.max(...data, 1);
  const barCount = data.length;
  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * height);
        const opacity = 0.35 + (i / Math.max(1, barCount - 1)) * 0.65;
        return (
          <View
            key={i}
            style={{
              flex: 1, height: h,
              backgroundColor: color, opacity,
              borderRadius: 1.5,
            }}
          />
        );
      })}
    </View>
  );
});

// - Delta Pill (NEW) -
const DeltaPill = React.memo(function DeltaPill({
  value, size = 'sm',
}: { value: number; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const isUp = value >= 0;
  const c = isUp ? colors.success : colors.error;
  const padX = size === 'md' ? 8 : 7;
  const padY = size === 'md' ? 4 : 3;
  const fs = size === 'md' ? 11 : 10;
  const ic = size === 'md' ? 11 : 9;
  return (
    <View style={[s.deltaPill, {
      backgroundColor: `${c}1A`,
      borderColor: `${c}35`,
      paddingHorizontal: padX, paddingVertical: padY,
    }]}>
      {isUp ? <ArrowUp size={ic} color={c} strokeWidth={3} />
        : <ArrowDown size={ic} color={c} strokeWidth={3} />}
      <Text style={[s.deltaText, { color: c, fontSize: fs }]}>
        {Math.abs(value).toFixed(1)}%
      </Text>
    </View>
  );
});

// - Section Header -
const SectionLabel = React.memo(function SectionLabel({
  title, badge, badgeVariant, subtitle, rightSlot,
}: {
  title: string; badge?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1 }}>
        <View style={s.sectionTitleRow}>
          <LinearGradient
            colors={[colors.primary, `${colors.primary}40`]}
            style={s.sectionAccentBar}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        {subtitle && <Text style={[s.sectionSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
      </View>
      {rightSlot}
      {badge && <Badge label={badge} variant={badgeVariant || 'primary'} size="sm" />}
    </View>
  );
});

// - Insight Callout (NEW) -
const InsightCallout = React.memo(function InsightCallout({
  icon, text, tone = 'info',
}: {
  icon?: React.ReactNode;
  text: string;
  tone?: 'info' | 'success' | 'warning';
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const toneColor = tone === 'success' ? colors.success
    : tone === 'warning' ? colors.warning
      : colors.primary;
  return (
    <LinearGradient
      colors={isDark
        ? [`${toneColor}14`, `${toneColor}04`]
        : [`${toneColor}0E`, `${toneColor}03`]}
      style={[
        s.insightCallout,
        { borderColor: colors.clayBorderColor },
        clayStyle(clayShadows.subtle),
      ]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
    >
      <View style={[
        s.insightIconWrap,
        {
          backgroundColor: `${toneColor}22`,
        },
        Platform.OS === 'web' ? {
          boxShadow: isDark
            ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
            : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
        } as any : {},
      ]}>
        {icon || <Sparkles size={12} color={toneColor} strokeWidth={2.5} />}
      </View>
      <Text style={[s.insightText, { color: colors.textSecondary }]} numberOfLines={2}>
        {text}
      </Text>
    </LinearGradient>
  );
});

// - Attention Strip (NEW - V+2) -
const AttentionItem = React.memo(function AttentionItem({
  count, label, accentColor, icon, onPress, fullWidth,
}: {
  count: number; label: string; accentColor: string;
  icon: React.ReactNode; onPress: () => void; fullWidth?: boolean;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Pressable onPress={onPress} style={[s.attnItemWrap, fullWidth && { width: '100%' }]}>
      <LinearGradient
        colors={isDark ? [`${accentColor}22`, `${accentColor}08`] : [`${accentColor}14`, `${accentColor}04`]}
        style={[
          s.attnItem,
          { borderColor: colors.clayBorderColor },
          clayStyle(clayShadows.clay),
        ]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={s.attnTopRow}>
          <View style={[
            s.attnIcon,
            {
              backgroundColor: `${accentColor}25`,
            },
            Platform.OS === 'web' ? {
              boxShadow: isDark
                ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
                : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
            } as any : {},
          ]}>
            {icon}
          </View>
          <Animated.View style={[s.attnPulseDot, {
            backgroundColor: accentColor,
            transform: [{ scale: pulse }],
            shadowColor: accentColor, shadowOpacity: 0.9, shadowRadius: 5,
          }]} />
        </View>
        <Text style={[s.attnCount, { color: colors.textPrimary }]}>{count}</Text>
        <Text style={[s.attnLabel, { color: `${accentColor}DD` }]} numberOfLines={2}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
});

// - Primary Metric Hero Card (NEW - V+2) -
const PrimaryMetricCard = React.memo(function PrimaryMetricCard({
  label, value, delta, sparkline, accentColor, icon, onPress, hint = 'This month . MoM', showDelta = true,
}: {
  label: string; value: string; delta: number;
  sparkline: number[]; accentColor: string;
  icon: React.ReactNode; onPress?: () => void; hint?: string; showDelta?: boolean;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 200, friction: 15 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 15 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={isDark
            ? [`${accentColor}28`, `${accentColor}10`, `${accentColor}04`]
            : [`${accentColor}18`, `${accentColor}08`, `${accentColor}02`]}
          style={[
            s.primaryCard,
            { borderColor: colors.clayBorderColor },
            clayStyle(clayShadows.clayElevated),
          ]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Ambient glow */}
          <View style={[s.primaryGlow, { backgroundColor: `${accentColor}30` }]} />

          <View style={s.primaryTopRow}>
            <View style={[
              s.primaryIconWrap,
              {
                backgroundColor: `${accentColor}28`,
                borderColor: `${accentColor}45`,
              },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? 'inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.03)'
                  : 'inset 3px 3px 6px rgba(0,0,0,0.06), inset -3px -3px 6px rgba(255,255,255,0.5)',
              } as any : {},
            ]}>
              {icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.primaryLabel, { color: `${accentColor}DD` }]}>{label}</Text>
              <Text style={[s.primaryHint, { color: colors.textTertiary }]}>{hint}</Text>
            </View>
            {showDelta && <DeltaPill value={delta} size="md" />}
          </View>

          <View style={s.primaryBottomRow}>
            <Text style={[s.primaryValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {value}
            </Text>
            <Sparkline data={sparkline} color={accentColor} height={32} width={92} />
          </View>

          {/* Bottom accent line */}
          <LinearGradient
            colors={[accentColor, `${accentColor}00`]}
            style={s.primaryBottomLine}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// - Premium Stat Card (UPGRADED - sparkline + delta) -
const PremiumStatCard = React.memo(function PremiumStatCard({
  title, value, icon, accentColor, onPress, change, sparkline,
}: {
  title: string; value: number; icon: React.ReactNode;
  accentColor: string; onPress?: () => void;
  change?: number;
  sparkline?: number[];
}) {
  const { width: winW } = useWindowDimensions();
  const { colors, isDark, clayShadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 15 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 15 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={s.statCardWrap}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={isDark
            ? [`${accentColor}18`, `${accentColor}06`]
            : [`${accentColor}12`, `${accentColor}04`]}
          style={[
            s.statCard,
            { borderColor: colors.clayBorderColor },
            clayStyle(clayShadows.clay),
          ]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[s.statGlow, { backgroundColor: `${accentColor}20` }]} />

          <View style={s.statTop}>
            <View style={[
              s.statIconWrap,
              {
                backgroundColor: `${accentColor}22`,
                borderColor: `${accentColor}35`,
              },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
                  : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
              } as any : {},
            ]}>
              {icon}
            </View>
            {change !== undefined && Number.isFinite(change) && change !== 0 && (
              <DeltaPill value={change} size="sm" />
            )}
          </View>

          <Text style={[s.statValue, { color: colors.textPrimary }]}>
            {value.toLocaleString('en-IN')}
          </Text>
          <Text style={[s.statTitle, { color: `${accentColor}CC` }]}>{title}</Text>

          {sparkline && sparkline.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Sparkline data={sparkline} color={accentColor} height={22} width={Math.max(80, winW * 0.32)} />
            </View>
          )}

          <View style={[s.statBottomLine, { backgroundColor: `${accentColor}50` }]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// - Quick Action (kept, minor polish) -
const QuickAction = React.memo(function QuickAction({
  label, subtitle, icon, accentColor, onPress, desktopWide,
}: {
  label: string; subtitle?: string; icon: React.ReactNode;
  accentColor: string; onPress: () => void; index?: number; desktopWide?: boolean;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, tension: 260, friction: 18 }),
      Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 260, friction: 18 }),
      Animated.timing(glowAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start();
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[s.qaCardWrap, desktopWide && s.qaCardWrapDesktopWide]}
    >
      <Animated.View style={[
        s.qaCard,
        {
          borderColor: colors.clayBorderColor,
          transform: [{ scale: scaleAnim }],
        },
        clayStyle(clayShadows.clay),
      ]}>
        <LinearGradient
          colors={isDark
            ? [`${accentColor}18`, `${accentColor}06`, 'transparent']
            : [`${accentColor}12`, `${accentColor}04`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, opacity: glowOpacity, borderRadius: 22 }]}
        />
        <View style={[s.qaGlowOrb, { backgroundColor: `${accentColor}22` }]} />

        <View style={[
          s.qaIconWrap,
          {
            backgroundColor: `${accentColor}22`,
            borderColor: `${accentColor}38`,
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
              : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
          } as any : {},
        ]}>
          {icon}
        </View>

        <View style={s.qaTextCol}>
          <Text style={[s.qaLabel, { color: colors.textPrimary }]} numberOfLines={2}>{label}</Text>
          <Text style={[s.qaSub, { color: `${accentColor}BB` }]} numberOfLines={1}>
            {subtitle || 'Open ->'}
          </Text>
        </View>

        <LinearGradient
          colors={[accentColor, `${accentColor}00`]}
          style={s.qaBottomLine}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />

        <View style={[
          s.qaTopArrow,
          {
            backgroundColor: `${accentColor}20`,
            borderColor: `${accentColor}35`,
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 1px 1px 3px rgba(0,0,0,0.15), inset -1px -1px 3px rgba(255,255,255,0.02)'
              : 'inset 1px 1px 3px rgba(0,0,0,0.03), inset -1px -1px 3px rgba(255,255,255,0.5)',
          } as any : {},
        ]}>
          <ChevronRight size={10} color={accentColor} strokeWidth={3} />
        </View>
      </Animated.View>
    </Pressable>
  );
});

// - Financial Tile (UPGRADED with delta) -
const FinTile = React.memo(function FinTile({
  label, value, icon, accentColor, isGradient, gradientColors, delta,
}: {
  label: string; value: string; icon: React.ReactNode;
  accentColor: string; isGradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  delta?: number;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const showDelta = delta !== undefined && Number.isFinite(delta) && delta !== 0;

  if (isGradient && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.finTile, { borderColor: 'transparent' }]}
      >
        <View style={s.finTopRow}>
          <View style={[
            s.finIconWrap,
            {
              backgroundColor: 'rgba(255,255,255,0.2)',
            },
            Platform.OS === 'web' ? {
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.15), inset -2px -2px 4px rgba(255,255,255,0.1)',
            } as any : {},
          ]}>{icon}</View>
          {showDelta && (
            <View style={[s.finDeltaPillWhite, {
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderColor: 'rgba(255,255,255,0.3)',
            }]}>
              {delta! >= 0
                ? <ArrowUp size={9} color="#fff" strokeWidth={3} />
                : <ArrowDown size={9} color="#fff" strokeWidth={3} />}
              <Text style={[s.finDeltaText, { color: '#fff' }]}>
                {Math.abs(delta!).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={[s.finValue, { color: '#fff' }]} numberOfLines={1}>{value}</Text>
        <Text style={[s.finLabel, { color: 'rgba(255,255,255,0.8)' }]}>{label}</Text>
        <View style={[s.finShimmer, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      </LinearGradient>
    );
  }
  return (
    <LinearGradient
      colors={isDark
        ? [`${accentColor}16`, `${accentColor}06`]
        : [`${accentColor}10`, `${accentColor}03`]}
      style={[
        s.finTile,
        { borderColor: colors.clayBorderColor },
        clayStyle(clayShadows.clay),
      ]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={[s.finAccentBar, { backgroundColor: accentColor }]} />
      <View style={s.finTopRow}>
        <View style={[
          s.finIconWrap,
          {
            backgroundColor: `${accentColor}20`,
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
              : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
          } as any : {},
        ]}>{icon}</View>
        {showDelta && <DeltaPill value={delta!} size="sm" />}
      </View>
      <Text style={[s.finValue, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
      <Text style={[s.finLabel, { color: colors.textSecondary }]}>{label}</Text>
    </LinearGradient>
  );
});

// - KPI Mini -
const KpiMini = React.memo(function KpiMini({
  icon, value, label, accentColor, trend,
}: {
  icon: React.ReactNode; value: string; label: string;
  accentColor: string; trend?: 'up' | 'down' | null;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  return (
    <LinearGradient
      colors={isDark ? [`${accentColor}15`, `${accentColor}05`] : [`${accentColor}10`, `${accentColor}03`]}
      style={[
        s.kpiCard,
        { borderColor: colors.clayBorderColor },
        clayStyle(clayShadows.clay),
      ]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={s.kpiTop}>
        <View style={[
          s.kpiIcon,
          {
            backgroundColor: `${accentColor}22`,
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
              : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
          } as any : {},
        ]}>{icon}</View>
        {trend === 'up' && (
          <View style={[s.kpiTrend, { backgroundColor: colors.successDim }]}>
            <TrendingUp size={9} color={colors.success} />
            <Text style={[s.kpiTrendText, { color: colors.success }]}>Up</Text>
          </View>
        )}
        {trend === 'down' && (
          <View style={[s.kpiTrend, { backgroundColor: colors.errorDim }]}>
            <TrendingDown size={9} color={colors.error} />
            <Text style={[s.kpiTrendText, { color: colors.error }]}>Down</Text>
          </View>
        )}
      </View>
      <Text style={[s.kpiValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[s.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[s.kpiBottomLine, { backgroundColor: `${accentColor}45` }]} />
    </LinearGradient>
  );
});

// - Pipeline Funnel (NEW - V+3) -
const PipelineFunnel = React.memo(function PipelineFunnel({
  stages,
}: {
  stages: { label: string; count: number; color: string }[];
}) {
  const { colors, isDark, clayShadows } = useTheme();
  if (!stages || stages.length === 0) return null;
  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <LinearGradient
      colors={isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.7)']}
      style={[
        s.funnelCard,
        { borderColor: colors.clayBorderColor },
        clayStyle(clayShadows.clay),
      ]}
    >
      {stages.map((stage, idx) => {
        const widthPct = Math.max(20, (stage.count / max) * 100);
        const conversionFromPrev = idx > 0 && stages[idx - 1].count > 0
          ? ((stage.count / stages[idx - 1].count) * 100)
          : null;

        return (
          <View key={stage.label} style={[s.funnelStage, idx > 0 && { marginTop: 12 }]}>
            <View style={s.funnelLabelRow}>
              <View style={[s.funnelDot, {
                backgroundColor: stage.color,
                shadowColor: stage.color, shadowOpacity: 0.8, shadowRadius: 4,
              }]} />
              <Text style={[s.funnelLabel, { color: colors.textSecondary }]}>{stage.label}</Text>
              {conversionFromPrev !== null && (
                <Text style={[s.funnelConvText, { color: colors.textTertiary }]}>
                  {conversionFromPrev.toFixed(0)}% conv
                </Text>
              )}
              <Text style={[s.funnelCount, { color: colors.textPrimary }]}>{stage.count.toLocaleString('en-IN')}</Text>
            </View>
            <View style={[s.funnelTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              <LinearGradient
                colors={[stage.color, `${stage.color}80`]}
                style={[s.funnelBar, { width: `${widthPct}%` }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        );
      })}
    </LinearGradient>
  );
});

// - Area Revenue Chart (UPGRADED - V+3) -
const AreaRevenueChart = React.memo(function AreaRevenueChart({
  sortedKeys, incomeByKey, expenseByKey, maxTrend,
}: {
  sortedKeys: string[];
  incomeByKey: Record<string, number>;
  expenseByKey: Record<string, number>;
  maxTrend: number;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const MAX_H = 110;

  // Pull latest delta for header
  const latestKey = sortedKeys[sortedKeys.length - 1];
  const prevKey = sortedKeys[sortedKeys.length - 2];
  const latestNet = (incomeByKey[latestKey] || 0) - (expenseByKey[latestKey] || 0);
  const prevNet = (incomeByKey[prevKey] || 0) - (expenseByKey[prevKey] || 0);
  const netDelta = prevNet ? ((latestNet - prevNet) / prevNet) * 100 : 0;

  return (
    <LinearGradient
      colors={isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.7)']}
      style={[
        s.chartCard,
        { borderColor: colors.clayBorderColor },
        clayStyle(clayShadows.clay),
      ]}
    >
      {/* Header strip with summary */}
      <View style={s.chartHeaderRow}>
        <View>
          <Text style={[s.chartHeaderLabel, { color: colors.textTertiary }]}>Net (latest month)</Text>
          <Text style={[s.chartHeaderValue, { color: colors.textPrimary }]}>
            {founderDb.formatInr(latestNet)}
          </Text>
        </View>
        {Number.isFinite(netDelta) && netDelta !== 0 && <DeltaPill value={netDelta} size="md" />}
      </View>

      <View style={s.chartRow}>
        {sortedKeys.map((k, idx) => {
          const incVal = incomeByKey[k] || 0;
          const expVal = expenseByKey[k] || 0;
          const incH = (incVal / maxTrend) * MAX_H;
          const expH = (expVal / maxTrend) * MAX_H;
          const isLast = idx === sortedKeys.length - 1;
          return (
            <View key={k} style={s.chartCol}>
              {incVal > 0 && isLast && (
                <Text style={[s.chartVal, { color: colors.success }]}>{formatCompact(incVal)}</Text>
              )}
              <View style={s.barPair}>
                <AnimatedBar
                  targetHeight={incH}
                  color={colors.success}
                  delay={idx * 60}
                  barW={12}
                  gradient={[colors.success, `${colors.success}55`]}
                />
                <AnimatedBar
                  targetHeight={expH}
                  color={colors.error}
                  delay={idx * 60 + 25}
                  barW={12}
                  gradient={[colors.error, `${colors.error}55`]}
                />
              </View>
              <Text style={[s.chartLbl, {
                color: isLast ? colors.primary : colors.textTertiary,
                fontWeight: isLast ? '700' : '400',
              }]}>{monthLabel(k)}</Text>
            </View>
          );
        })}
      </View>

      <View style={[s.chartLegend, { borderTopColor: colors.divider }]}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[s.legendText, { color: colors.textSecondary }]}>Income</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[s.legendText, { color: colors.textSecondary }]}>Expense</Text>
        </View>
        <Text style={[s.legendText, { color: colors.textTertiary, marginLeft: 'auto' }]}>Last 6 months</Text>
      </View>
    </LinearGradient>
  );
});

// - Super Admin Card -
const SuperAdminCard = React.memo(function SuperAdminCard({
  count, onPress,
}: { count: number; onPress: () => void }) {
  const { colors, isDark, clayShadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 15 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 15 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={isDark
            ? [`${colors.success}20`, `${colors.success}08`]
            : [`${colors.success}14`, `${colors.success}04`]}
          style={[
            s.saCard,
            { borderColor: colors.clayBorderColor },
            clayStyle(clayShadows.clay),
          ]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={[
            s.saIconWrap,
            {
              backgroundColor: `${colors.success}25`,
            },
            Platform.OS === 'web' ? {
              boxShadow: isDark
                ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)'
                : 'inset 2px 2px 4px rgba(0,0,0,0.03), inset -2px -2px 4px rgba(255,255,255,0.5)',
            } as any : {},
          ]}>
            <ShieldCheck size={22} color={colors.success} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.saCount, { color: colors.textPrimary }]}>{count}</Text>
            <Text style={[s.saLabel, { color: colors.textSecondary }]}>Super Admins on platform</Text>
          </View>
          <View style={[
            s.saArrow,
            {
              backgroundColor: `${colors.success}20`,
              borderColor: `${colors.success}30`,
            },
            Platform.OS === 'web' ? {
              boxShadow: isDark
                ? 'inset 1px 1px 3px rgba(0,0,0,0.15), inset -1px -1px 3px rgba(255,255,255,0.02)'
                : 'inset 1px 1px 3px rgba(0,0,0,0.03), inset -1px -1px 3px rgba(255,255,255,0.5)',
            } as any : {},
          ]}>
            <ArrowUpRight size={15} color={colors.success} />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// - Premium Avatar -
const PremiumAvatar = React.memo(function PremiumAvatar({ name, compact = false }: { name: string; compact?: boolean }) {
  const { colors, isDark, clayShadows } = useTheme();
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={[s.avatarWrap, compact && s.avatarWrapCompact]}>
      <Animated.View style={[s.avatarPulse, compact && s.avatarPulseCompact, { borderColor: `${colors.primary}40`, transform: [{ scale: pulseAnim }] }]} />
      <LinearGradient
        colors={[colors.primary, `${colors.primary}90`]}
        style={[
          s.avatar,
          compact && s.avatarCompact,
          clayStyle(clayShadows.subtle),
        ]}
      >
        <Text style={[s.avatarText, compact && { fontSize: 16 }]}>{initials}</Text>
      </LinearGradient>
      <View style={[s.avatarOnline, { backgroundColor: colors.success, borderColor: colors.background }]} />
    </View>
  );
});

// ============================================================
// MAIN DASHBOARD ROUTER - MULTI-ROLE ADAPTIVE
// ============================================================
export default function DashboardScreen() {
  const { role } = useAuth();

  if (isFounderOrSuperAdmin(role)) {
    return <FounderDashboardScreen />;
  }
  if (role === 'SALES_MANAGER') {
    return <SalesManagerDashboard />;
  }
  if (role === 'SALES_EXECUTIVE') {
    return <SalesExecutiveDashboard />;
  }
  if (role === 'IMPLEMENTATION_MANAGER' || role === 'IMPLEMENTATION_EXECUTIVE') {
    return <ImplementationDashboard />;
  }
  if (role === 'SUPPORT_MANAGER' || role === 'SUPPORT_EXECUTIVE' || role === 'TECHNICAL_SUPPORT') {
    return <SupportDashboard />;
  }

  return <GenericRoleDashboard />;
}

function FounderDashboardScreen() {
  const { currentAdmin, founder, isSuperAdmin } = useAuth();
  const { isApprover, canApproveReject } = useFounderAuth();
  const hasFounderAccess = Boolean(founder || isSuperAdmin);
  const router = useRouter();
  const { colors, isDark, clayShadows } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;
  const isCompact = screenWidth < 560;

  const roleLabel =
    founder?.role === 'APPROVER' ? 'Approver'
      : founder ? 'Founder'
        : isSuperAdmin ? 'Super Admin'
          : 'Admin';

  // - State (preserved verbatim) -
  const [dashboardStats, setDashboardStats] = useState({
    total_schools: 0, active_schools: 0,
    total_students: 0, total_staff: 0, total_super_admins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [founderLoading, setFounderLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [incomeRows, setIncomeRows] = useState<Record<string, unknown>[]>([]);
  const [expenseRows, setExpenseRows] = useState<Record<string, unknown>[]>([]);
  const [enquiryRows, setEnquiryRows] = useState<Record<string, unknown>[]>([]);
  const [closedRows, setClosedRows] = useState<Record<string, unknown>[]>([]);
  const [expenseRoiRows, setExpenseRoiRows] = useState<Record<string, unknown>[]>([]);
  const [convRows, setConvRows] = useState<Record<string, unknown>[]>([]);
  const [cplRows, setCplRows] = useState<Record<string, unknown>[]>([]);
  const [enquiriesToday, setEnquiriesToday] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [financialSummary, setFinancialSummary] = useState<founderDb.FinancialSummary | null>(null);

  // - Data fetching (preserved) -
  const fetchAdminStats = async () => {
    try { setDashboardStats(await superAdminApi.getDashboardStats()); } catch { } finally { setLoading(false); }
  };

  const fetchFounderMetrics = useCallback(async () => {
    if (!hasFounderAccess) { setFounderLoading(false); return; }
    try {
      const [pm, inc, exp, enq, closed, expRoi, conv, cpl, todayN, unas, summary] = await Promise.all([
        founderDb.fetchPendingMetricsSummary(), founderDb.fetchMonthlyIncomeSummary(),
        founderDb.fetchMonthlyExpenseSummaryV2(), founderDb.fetchMonthlyEnquirySummary(),
        founderDb.fetchMonthlyClosedDeals(), founderDb.fetchMonthlyExpenseSummaryRoi(),
        founderDb.fetchConversionRateSeries(), founderDb.fetchCostPerLeadSeries(),
        founderDb.countEnquiriesCreatedToday(), founderDb.countUnassignedEnquiries(),
        founderDb.getFinancialSummary({ period: 'ALL', business_unit_id: 'ALL' }),
      ]);
      setPending(pm); setIncomeRows(inc); setExpenseRows(exp); setEnquiryRows(enq);
      setClosedRows(closed); setExpenseRoiRows(expRoi); setConvRows(conv); setCplRows(cpl);
      setEnquiriesToday(todayN); setUnassignedCount(unas);
      setFinancialSummary(summary);
    } catch { } finally { setFounderLoading(false); }
  }, [hasFounderAccess]);

  useFocusEffect(useCallback(() => {
    fetchAdminStats(); fetchFounderMetrics();
  }, [fetchFounderMetrics]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      superAdminApi.getDashboardStats().then(setDashboardStats).catch(() => { }),
      hasFounderAccess ? fetchFounderMetrics() : Promise.resolve(),
    ]).finally(() => setRefreshing(false));
  }, [hasFounderAccess, fetchFounderMetrics]);

  // - Founder metrics (preserved) -
  const founderMetrics = useMemo(() =>
    computeFounderDashboardMetrics({
      pending, incomeRows, expenseRows, enquiryRows,
      monthlyClosedDeals: closedRows,
      monthlyExpenseRoi: expenseRoiRows.length > 0 ? expenseRoiRows : expenseRows,
      conversionRows: convRows, costPerLeadRows: cplRows,
      enquiriesToday, unassignedEnquiries: unassignedCount,
    }),
    [pending, incomeRows, expenseRows, enquiryRows, closedRows, expenseRoiRows, convRows, cplRows, enquiriesToday, unassignedCount]
  );

  const approvedIncome = founderMetrics.approvedIncomeThisMonth;
  const pendingCollections = founderMetrics.pendingCollectionsAmount;
  const approvedExpenses = founderMetrics.approvedExpensesThisMonth;
  const netProfit = founderMetrics.collectionsNetProfit;
  const totalCollected = financialSummary?.revenue ?? 0;
  const conversionPct = founderMetrics.conversionRate;
  const cpl = founderMetrics.costPerLead;
  const enquirySummaryCount = founderMetrics.totalEnquiriesMonth;

  // - NEW: MoM deltas + sparklines -
  const incomeDelta = useMemo(() => computeMoM(incomeRows, ['total_income', 'total_amount', 'amount', 'income', 'sum', 'total']), [incomeRows]);
  const expenseDelta = useMemo(() => computeMoM(expenseRows, ['total_expense', 'total_amount', 'amount', 'expense', 'sum', 'total']), [expenseRows]);
  const enquiryDelta = useMemo(() => computeMoM(enquiryRows, ['count', 'total', 'enquiries']), [enquiryRows]);
  const closedDelta = useMemo(() => computeMoM(closedRows, ['count', 'deals', 'closed', 'total']), [closedRows]);

  // Net profit delta
  const netProfitDelta = useMemo(() => {
    if (incomeRows.length < 2 || expenseRows.length < 2) return 0;
    const incSorted = [...incomeRows].sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
    const expSorted = [...expenseRows].sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
    const lastInc = pick(incSorted[incSorted.length - 1], ['total_income', 'total_amount', 'amount']);
    const lastExp = pick(expSorted[expSorted.length - 1], ['total_expense', 'total_amount', 'amount']);
    const prevInc = pick(incSorted[incSorted.length - 2], ['total_income', 'total_amount', 'amount']);
    const prevExp = pick(expSorted[expSorted.length - 2], ['total_expense', 'total_amount', 'amount']);
    const lastNet = lastInc - lastExp;
    const prevNet = prevInc - prevExp;
    if (!prevNet) return 0;
    return ((lastNet - prevNet) / Math.abs(prevNet)) * 100;
  }, [incomeRows, expenseRows]);

  const incomeSpark = useMemo(() => buildSpark(incomeRows, ['total_income', 'total_amount', 'amount']), [incomeRows]);
  const expenseSpark = useMemo(() => buildSpark(expenseRows, ['total_expense', 'total_amount', 'amount']), [expenseRows]);
  const enquirySpark = useMemo(() => buildSpark(enquiryRows, ['count', 'total', 'enquiries']), [enquiryRows]);
  const closedSpark = useMemo(() => buildSpark(closedRows, ['count', 'deals', 'closed', 'total']), [closedRows]);
  // Net profit sparkline = income[i] - expense[i] for matched months
  const netSpark = useMemo(() => {
    const incSorted = [...incomeRows].sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
    const expMap: Record<string, number> = {};
    expenseRows.forEach(r => { expMap[monthKey(r)] = pick(r, ['total_expense', 'total_amount', 'amount']); });
    return incSorted.slice(-7).map(r => {
      const k = monthKey(r);
      const inc = pick(r, ['total_income', 'total_amount', 'amount']);
      const exp = expMap[k] || 0;
      return Math.max(0, inc - exp);
    });
  }, [incomeRows, expenseRows]);

  // - NEW: Pending counts for Attention Strip -
  const pendingExpenseCount = useMemo(
    () => pick(pending, ['expense_pending_count', 'pending_expenses', 'expenses', 'expense_count', 'expenses_pending']),
    [pending]
  );
  const pendingCollectionCount = useMemo(
    () => pick(pending, ['collection_pending_count', 'pending_collections', 'collections', 'collection_count', 'collections_pending']),
    [pending]
  );

  const attentionItems = useMemo(() => {
    if (!hasFounderAccess) return [];
    const items: Array<{ count: number; label: string; color: string; icon: React.ReactNode; route: string }> = [];
    if (canApproveReject && pendingExpenseCount > 0) {
      items.push({
        count: pendingExpenseCount, label: 'Expense approvals',
        color: colors.error, icon: <Receipt size={16} color={colors.error} strokeWidth={2.5} />,
        route: '/(app)/console/expense-approvals',
      });
    }
    if (canApproveReject && pendingCollectionCount > 0) {
      items.push({
        count: pendingCollectionCount, label: 'Collection approvals',
        color: colors.warning, icon: <Wallet size={16} color={colors.warning} strokeWidth={2.5} />,
        route: '/(app)/console/collection-approvals',
      });
    }
    if (unassignedCount > 0) {
      items.push({
        count: unassignedCount, label: 'Unassigned enquiries',
        color: colors.primary, icon: <Users size={16} color={colors.primary} strokeWidth={2.5} />,
        route: '/(app)/console/enquiries',
      });
    }
    if (enquiriesToday > 0) {
      items.push({
        count: enquiriesToday, label: 'New leads\ntoday',
        color: colors.success, icon: <Flame size={16} color={colors.success} strokeWidth={2.5} />,
        route: '/(app)/console/enquiries',
      });
    }
    return items;
  }, [hasFounderAccess, canApproveReject, pendingExpenseCount, pendingCollectionCount, unassignedCount, enquiriesToday, colors]);

  // - NEW: Funnel stages -
  const funnelStages = useMemo(() => {
    const totalEnquiries = enquirySummaryCount;
    const lastClosed = closedRows.length > 0
      ? pick([...closedRows].sort((a, b) => monthKey(a).localeCompare(monthKey(b)))[closedRows.length - 1], ['count', 'deals', 'closed', 'total'])
      : 0;
    const inPipeline = Math.max(0, totalEnquiries - lastClosed - unassignedCount);
    return [
      { label: 'Total Enquiries', count: totalEnquiries, color: colors.primary },
      { label: 'In Pipeline', count: inPipeline, color: colors.warning },
      { label: 'Closed Deals', count: lastClosed, color: colors.success },
    ];
  }, [enquirySummaryCount, closedRows, unassignedCount, colors]);

  // - Insight messaging -
  const heroInsight = useMemo(() => {
    if (!hasFounderAccess || incomeRows.length < 2) return null;
    if (netProfitDelta >= 15) return { tone: 'success' as const, text: `Strong month - net profit up ${netProfitDelta.toFixed(1)}% MoM. Highest in recent history.` };
    if (netProfitDelta <= -10) return { tone: 'warning' as const, text: `Net profit down ${Math.abs(netProfitDelta).toFixed(1)}% MoM. Review expenses & pending collections.` };
    if (conversionPct >= 25) return { tone: 'success' as const, text: `Conversion at ${conversionPct.toFixed(1)}% - well above industry average. Sales engine is humming.` };
    return { tone: 'info' as const, text: `${enquirySummaryCount} enquiries this month . ${conversionPct.toFixed(1)}% conversion . ${founderDb.formatInr(netProfit)} net.` };
  }, [hasFounderAccess, incomeRows, netProfitDelta, conversionPct, enquirySummaryCount, netProfit]);

  // - Chart data -
  const { sortedKeys, incomeByKey, expenseByKey, maxTrend } = useMemo(() => {
    const chartKeys = new Set<string>();
    incomeRows.forEach((r) => chartKeys.add(monthKey(r)));
    expenseRows.forEach((r) => chartKeys.add(monthKey(r)));
    const sk = Array.from(chartKeys).sort().slice(-6);
    const ibk: Record<string, number> = {};
    incomeRows.forEach((r) => { ibk[monthKey(r)] = pick(r, ['total_income', 'total_amount', 'amount', 'income', 'sum', 'total']); });
    const ebk: Record<string, number> = {};
    expenseRows.forEach((r) => { ebk[monthKey(r)] = pick(r, ['total_expense', 'total_amount', 'amount', 'expense', 'sum', 'total']); });
    const mt = Math.max(1, ...sk.map((k) => Math.max(ibk[k] || 0, ebk[k] || 0)));
    return { sortedKeys: sk, incomeByKey: ibk, expenseByKey: ebk, maxTrend: mt };
  }, [incomeRows, expenseRows]);

  // - Actions (preserved) -
  const adminActions = useMemo(() => [
    { label: 'Add New School', subtitle: 'Register institution', icon: <Plus size={18} color={colors.primary} strokeWidth={2.5} />, accentColor: colors.primary, route: '/schools/add' },
    { label: 'View Schools', subtitle: 'All institutions', icon: <School size={18} color={colors.success} strokeWidth={2} />, accentColor: colors.success, route: '/(app)/schools' },
    { label: 'Add Admin', subtitle: 'Assign super admin', icon: <ShieldCheck size={18} color={colors.warning} strokeWidth={2} />, accentColor: colors.warning, route: '/admins/add' },
    { label: 'Manage Content', subtitle: 'CMS & resources', icon: <BookOpen size={18} color={colors.accent} strokeWidth={2} />, accentColor: colors.accent, route: '/(app)/manage-content' },
    { label: 'DCGD . Microservices', subtitle: 'Department content', icon: <Cpu size={18} color={colors.primary} strokeWidth={2} />, accentColor: colors.primary, route: '/(app)/microservices/dcgd' },
    { label: 'Medical Shops', subtitle: 'POS management', icon: <Store size={18} color={colors.error} strokeWidth={2} />, accentColor: colors.error, route: '/medical/list' },
  ], [colors]);

  const founderActions = useMemo(() => hasFounderAccess ? [
    { label: 'Expenses', subtitle: 'Track & receipts', icon: <Receipt size={18} color={colors.error} strokeWidth={2} />, accentColor: colors.error, route: '/(app)/console/expenses' },
    ...(canApproveReject ? [
      { label: 'Expense Approvals', subtitle: 'Pending queue', icon: <CheckCircle2 size={18} color={colors.warning} strokeWidth={2} />, accentColor: colors.warning, route: '/(app)/console/expense-approvals' },
      { label: 'Collection Approvals', subtitle: 'Pending queue', icon: <Wallet size={18} color={colors.primary} strokeWidth={2} />, accentColor: colors.primary, route: '/(app)/console/collection-approvals' },
    ] : []),
    { label: 'Collections', subtitle: 'Units & approvals', icon: <Wallet size={18} color={colors.success} strokeWidth={2} />, accentColor: colors.success, route: '/(app)/console/collections' },
    { label: 'Enquiries', subtitle: 'Pipeline & deals', icon: <Users size={18} color={colors.primary} strokeWidth={2} />, accentColor: colors.primary, route: '/(app)/console/enquiries' },
    { label: 'Analytics', subtitle: 'Sources & leaderboard', icon: <BarChart3 size={18} color={colors.warning} strokeWidth={2} />, accentColor: colors.warning, route: '/(app)/console/analytics' },
    { label: 'Business Units', subtitle: 'Units directory', icon: <Building2 size={18} color={colors.primary} strokeWidth={2} />, accentColor: colors.primary, route: '/(app)/console/units' },
    { label: 'Notifications', subtitle: 'Alerts & updates', icon: <Megaphone size={18} color={colors.success} strokeWidth={2} />, accentColor: colors.success, route: '/(app)/console/notifications' },
    ...(isApprover || isSuperAdmin ? [{ label: 'Audit Logs', subtitle: 'Activity trail', icon: <ScrollText size={18} color={colors.textSecondary} strokeWidth={2} />, accentColor: colors.textSecondary, route: '/(app)/console/audit-logs' }] : []),
    { label: 'Settings', subtitle: 'Security & controls', icon: <Settings size={18} color={colors.primary} strokeWidth={2} />, accentColor: colors.primary, route: '/(app)/console/settings' },
  ] : [], [hasFounderAccess, canApproveReject, isApprover, isSuperAdmin, colors]);

  const adminName = currentAdmin?.full_name || currentAdmin?.email?.split('@')[0] || 'Admin';
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const isDataLoading = loading || (hasFounderAccess && founderLoading);
  const handleRoutePress = useCallback((route: string) => { router.push(route as any); }, [router]);

  // - Render -
  return (
    <ScrollView
      style={[s.root, { backgroundColor: 'transparent' }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing} onRefresh={onRefresh}
          tintColor={colors.primary} colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
    >

      {/* Ambient clay field: depth without putting the page back inside a box. */}
      <View pointerEvents="none" style={s.ambientField}>
        <View style={[s.ambientOrb, s.ambientOrbPrimary, { backgroundColor: `${colors.primary}${isDark ? '16' : '0D'}` }]} />
        <View style={[s.ambientOrb, s.ambientOrbAccent, { backgroundColor: `${colors.accent}${isDark ? '12' : '0A'}` }]} />
      </View>

      {/* = COMMAND CENTER HERO = */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={isDark
            ? [`${colors.primary}28`, `${colors.primary}08`, 'transparent']
            : [`${colors.primary}14`, `${colors.primary}04`, 'transparent']}
          style={[
            s.heroGradient,
            isCompact && s.heroGradientCompact,
            { borderColor: colors.clayBorderColor },
            clayStyle(clayShadows.clayElevated),
          ]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[s.heroRow, isCompact && s.heroRowCompact]}>
            <PremiumAvatar name={adminName} compact={isCompact} />
            <View style={[s.heroText, isCompact && s.heroTextCompact]}>
              <View style={s.greetingRow}>
                <Sparkles size={12} color={colors.primary} strokeWidth={2} />
                <Text style={[s.greeting, { color: colors.textTertiary }]}>{greeting}</Text>
              </View>
              <Text style={[s.adminName, isCompact && s.adminNameCompact, { color: colors.textPrimary }]} numberOfLines={isCompact ? 2 : 1}>{adminName}</Text>
              <Text style={[s.adminRole, { color: `${colors.primary}CC` }]}>NexSyrus Platform</Text>
            </View>
            {!isCompact && <View style={[s.roleBadgeWrap, {
              backgroundColor: `${colors.primary}18`,
              borderColor: `${colors.primary}30`,
            }]}>
              <Zap size={10} color={colors.primary} fill={colors.primary} />
              <Text style={[s.roleBadgeText, { color: colors.primary }]}>{roleLabel}</Text>
            </View>}
          </View>
          {isCompact && <View style={[s.roleBadgeWrap, s.roleBadgeCompact, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}><Zap size={10} color={colors.primary} fill={colors.primary} /><Text style={[s.roleBadgeText, { color: colors.primary }]}>{roleLabel}</Text></View>}

          <View style={[s.heroSignalGrid, isCompact && s.heroSignalGridCompact]}>
            <View style={[s.heroSignal, isCompact && s.heroSignalCompact, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.62)',
              borderColor: colors.clayBorderColor,
            }, clayStyle(clayShadows.clayInset)]}>
              <View style={[s.heroSignalIcon, isCompact && s.heroSignalIconCompact, { backgroundColor: `${colors.primary}1E` }]}>
                <Layers size={15} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.heroSignalValue, { color: colors.textPrimary }]}>{dashboardStats.total_schools.toLocaleString('en-IN')}</Text>
                <Text style={[s.heroSignalLabel, { color: colors.textTertiary }]}>School network</Text>
              </View>
            </View>
            <View style={[s.heroSignal, isCompact && s.heroSignalCompact, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.62)',
              borderColor: colors.clayBorderColor,
            }, clayStyle(clayShadows.clayInset)]}>
              <View style={[s.heroSignalIcon, isCompact && s.heroSignalIconCompact, { backgroundColor: `${colors.success}1E` }]}>
                <Activity size={15} color={colors.success} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.heroSignalValue, { color: colors.textPrimary }]}>{dashboardStats.active_schools.toLocaleString('en-IN')}</Text>
                <Text style={[s.heroSignalLabel, { color: colors.textTertiary }]}>Active now</Text>
              </View>
            </View>
            {!isCompact && (
              <View style={[s.heroSignal, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.62)',
                borderColor: colors.clayBorderColor,
              }, clayStyle(clayShadows.clayInset)]}>
                <View style={[s.heroSignalIcon, { backgroundColor: `${colors.warning}1E` }]}>
                  <CalendarDays size={15} color={colors.warning} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.heroSignalValue, { color: colors.textPrimary }]}>
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={[s.heroSignalLabel, { color: colors.textTertiary }]}>Today</Text>
                </View>
              </View>
            )}
          </View>

          {/* Live strip */}
          <View style={[s.liveStrip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[s.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[s.liveText, { color: colors.textTertiary }]} numberOfLines={1}>
              {isCompact ? 'All systems operational' : 'Platform live  •  All systems operational'}
            </Text>
            <Activity size={12} color={colors.success} style={{ marginLeft: 'auto' }} />
          </View>
        </LinearGradient>
      </FadeIn>

      {/* = DATA-LOADING SKELETON = */}
      {isDataLoading && !refreshing ? (
        <View style={s.skeletonWrap}>
          <Skeleton height={140} borderRadius={20} style={{ marginBottom: 20 }} />
          <View style={s.statGrid}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} height={150} borderRadius={16} style={{ flex: 1, minWidth: 155 }} />
            ))}
          </View>
          {hasFounderAccess && (
            <View style={{ marginTop: 24, gap: 12 }}>
              <Skeleton height={220} borderRadius={16} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[1, 2].map(i => <Skeleton key={i} height={100} borderRadius={16} style={{ flex: 1 }} />)}
              </View>
            </View>
          )}
        </View>
      ) : (
        <>
          {isDesktop ? (
            <>
            <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start', marginTop: 12 }}>
              {/* Left Column (flex: 1.6) */}
              <View style={{ flex: 1.6, gap: 24, minWidth: 0 }}>
                {/* Total collected from approved collections + issued client billing. */}
                {hasFounderAccess && (
                  <FadeIn delay={60}>
                    <PrimaryMetricCard
                      label="Total Collected"
                      value={founderDb.formatInr(totalCollected)}
                      delta={0}
                      sparkline={incomeSpark}
                      accentColor={colors.primary}
                      icon={<PiggyBank size={22} color={colors.primary} strokeWidth={2} />}
                      hint="All issued billing + approved collections"
                      showDelta={false}
                      onPress={() => handleRoutePress('/(app)/console/analytics')}
                    />
                    {heroInsight && (
                      <View style={{ marginTop: 12 }}>
                        <InsightCallout
                          text={heroInsight.text}
                          tone={heroInsight.tone}
                          icon={
                            heroInsight.tone === 'success' ? <Flame size={12} color={colors.success} strokeWidth={2.5} />
                              : heroInsight.tone === 'warning' ? <AlertCircle size={12} color={colors.warning} strokeWidth={2.5} />
                                : <Sparkles size={12} color={colors.primary} strokeWidth={2.5} />
                          }
                        />
                      </View>
                    )}
                  </FadeIn>
                )}

                {/* Platform Overview */}
                <FadeIn delay={180}>
                  <SectionLabel
                    title="Platform Overview"
                    badge="Live"
                    badgeVariant="success"
                    subtitle="Real-time platform metrics"
                  />
                  <View style={s.statGrid}>
                    <PremiumStatCard
                      title="Total Schools"
                      value={dashboardStats.total_schools}
                      icon={<School size={20} color={colors.primary} />}
                      accentColor={colors.primary}
                      onPress={() => handleRoutePress('/(app)/schools')}
                    />
                    <PremiumStatCard
                      title="Active Schools"
                      value={dashboardStats.active_schools}
                      icon={<CheckCircle2 size={20} color={colors.success} />}
                      accentColor={colors.success}
                      onPress={() => handleRoutePress('/(app)/schools')}
                    />
                    <PremiumStatCard
                      title="Total Students"
                      value={dashboardStats.total_students}
                      icon={<GraduationCap size={20} color={colors.warning} />}
                      accentColor={colors.warning}
                    />
                    <PremiumStatCard
                      title="Total Staff"
                      value={dashboardStats.total_staff}
                      icon={<Briefcase size={20} color={colors.accent} />}
                      accentColor={colors.accent}
                    />
                  </View>
                </FadeIn>

                <FadeIn delay={220}>
                  <SuperAdminCard
                    count={dashboardStats.total_super_admins}
                    onPress={() => handleRoutePress('/(app)/admins')}
                  />
                </FadeIn>

                {/* Revenue vs Expense Chart */}
                {hasFounderAccess && sortedKeys.length > 0 && (
                  <FadeIn delay={340}>
                    <SectionLabel title="Revenue vs Expense" subtitle="6-month trend with net delta" />
                    <AreaRevenueChart
                      sortedKeys={sortedKeys} incomeByKey={incomeByKey}
                      expenseByKey={expenseByKey} maxTrend={maxTrend}
                    />
                  </FadeIn>
                )}

                {/* Pipeline Funnel */}
                {hasFounderAccess && (
                  <FadeIn delay={400}>
                    <SectionLabel
                      title="Pipeline Funnel"
                      badge={`${conversionPct.toFixed(1)}% conv`}
                      badgeVariant="primary"
                      subtitle="Enquiries -> Pipeline -> Closed"
                    />
                    <PipelineFunnel stages={funnelStages} />

                    <View style={{ marginTop: 14 }}>
                      <View style={s.kpiGrid}>
                        <KpiMini
                          icon={<Users size={17} color={colors.primary} />}
                          value={enquirySummaryCount.toString()}
                          label="Enquiries this month"
                          accentColor={colors.primary}
                          trend={enquiryDelta > 0 ? 'up' : enquiryDelta < 0 ? 'down' : null}
                        />
                        <KpiMini
                          icon={<Target size={17} color={colors.warning} />}
                          value={enquiriesToday.toString()}
                          label="New today"
                          accentColor={colors.warning}
                          trend={enquiriesToday > 0 ? 'up' : null}
                        />
                        <KpiMini
                          icon={<TrendingUp size={17} color={colors.success} />}
                          value={`${conversionPct.toFixed(1)}%`}
                          label="Conversion rate"
                          accentColor={colors.success}
                          trend={conversionPct >= 20 ? 'up' : conversionPct < 10 ? 'down' : null}
                        />
                        <KpiMini
                          icon={<IndianRupee size={17} color={colors.primary} />}
                          value={founderDb.formatInr(cpl, cpl % 1 === 0 ? 0 : 2)}
                          label="Cost per lead"
                          accentColor={colors.primary}
                        />
                      </View>
                    </View>
                  </FadeIn>
                )}

                {/* Closed Deals Trend */}
                {hasFounderAccess && closedRows.length > 0 && (
                  <FadeIn delay={460}>
                    <SectionLabel
                      title="Closed Deals Trend"
                      badge={`${Math.min(6, closedRows.length)} months`}
                      badgeVariant="success"
                      rightSlot={
                        Number.isFinite(closedDelta) && closedDelta !== 0
                          ? <View style={{ marginRight: 8 }}><DeltaPill value={closedDelta} size="sm" /></View>
                          : undefined
                      }
                    />
                    <LinearGradient
                      colors={isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)']}
                      style={[
                        s.closedCard,
                        { borderColor: colors.clayBorderColor },
                        clayStyle(clayShadows.clay),
                      ]}
                    >
                      {closedRows.slice(-6).map((r, idx) => {
                        const dealCount = pick(r, ['count', 'deals', 'closed', 'total']);
                        const maxDeals = Math.max(1, ...closedRows.slice(-6).map(cr => pick(cr, ['count', 'deals', 'closed', 'total'])));
                        const barPct = (dealCount / maxDeals) * 100;
                        const isMax = dealCount === maxDeals;
                        return (
                          <View key={idx} style={[s.closedRow, idx > 0 && { marginTop: 14 }]}>
                            <Text style={[s.closedPeriod, { color: isMax ? colors.success : colors.textSecondary }]}>{monthLabel(monthKey(r))}</Text>
                            <View style={[s.closedTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
                              <LinearGradient
                                colors={isMax
                                  ? [colors.success, `${colors.success}80`]
                                  : [colors.primary, `${colors.primary}70`]}
                                style={[s.closedBar, { width: `${Math.max(8, barPct)}%` }]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                              />
                            </View>
                            <Text style={[s.closedCount, {
                              color: isMax ? colors.success : colors.textPrimary,
                              fontWeight: isMax ? '800' : '600',
                            }]}>{dealCount.toLocaleString('en-IN')}</Text>
                          </View>
                        );
                      })}
                    </LinearGradient>
                  </FadeIn>
                )}
              </View>

              {/* Right Column (flex: 1) */}
              <View style={{ flex: 1, gap: 24, minWidth: 0 }}>
                {/* Needs Attention */}
                {attentionItems.length > 0 && (
                  <FadeIn delay={120}>
                    <SectionLabel
                      title="Needs Attention"
                      badge={`${attentionItems.length}`}
                      badgeVariant="error"
                      subtitle="Pending actions"
                    />
                    <View style={{ gap: 10 }}>
                      {attentionItems.map((item, i) => (
                        <AttentionItem
                          key={i}
                          count={item.count}
                          label={item.label}
                          accentColor={item.color}
                          icon={item.icon}
                          onPress={() => handleRoutePress(item.route)}
                          fullWidth
                        />
                      ))}
                    </View>
                  </FadeIn>
                )}

                {/* Financial Performance Tiles */}
                {hasFounderAccess && (
                  <FadeIn delay={280}>
                    <SectionLabel
                      title="Financial Performance"
                      badge="Founder"
                      badgeVariant="primary"
                      subtitle="Month-over-month overview"
                    />
                    <View style={{ gap: 12 }}>
                      <FinTile
                        label="Approved Income"
                        value={founderDb.formatInr(approvedIncome)}
                        accentColor={colors.success}
                        isGradient
                        gradientColors={founderGradients.success}
                        icon={<CircleDollarSign size={17} color="rgba(255,255,255,0.9)" />}
                        delta={incomeDelta}
                      />
                      <FinTile
                        label="Pending Collections"
                        value={founderDb.formatInr(pendingCollections)}
                        accentColor={colors.warning}
                        icon={<Wallet size={17} color={colors.warning} />}
                      />
                      <FinTile
                        label="Approved Expenses"
                        value={founderDb.formatInr(approvedExpenses)}
                        accentColor={colors.error}
                        icon={<Receipt size={17} color={colors.error} />}
                        delta={expenseDelta}
                      />
                      <FinTile
                        label="Total Collected"
                        value={founderDb.formatInr(totalCollected)}
                        accentColor={colors.primary}
                        isGradient
                        gradientColors={founderGradients.primary}
                        icon={<PiggyBank size={17} color="rgba(255,255,255,0.9)" />}
                        delta={0}
                      />
                    </View>
                  </FadeIn>
                )}

              </View>
            </View>

            {/* Full-width operations deck keeps the analytics columns balanced. */}
            <FadeIn delay={520}>
              <SectionLabel title="Operations Deck" subtitle="Everything you need, without the endless side rail" />
              <View style={s.qaGrid}>
                {adminActions.map((a, i) => (
                  <QuickAction
                    key={i} index={i} desktopWide
                    label={a.label} subtitle={a.subtitle}
                    icon={a.icon} accentColor={a.accentColor}
                    onPress={() => handleRoutePress(a.route)}
                  />
                ))}
              </View>
            </FadeIn>

            {hasFounderAccess && founderActions.length > 0 && (
              <FadeIn delay={580}>
                <SectionLabel title="Founder Console" badge="Pro" badgeVariant="primary" subtitle="Finance, pipeline and business controls" />
                <View style={s.qaGrid}>
                  {founderActions.map((a, i) => (
                    <QuickAction
                      key={`f-${i}`} index={i} desktopWide
                      label={a.label} subtitle={a.subtitle}
                      icon={a.icon} accentColor={a.accentColor}
                      onPress={() => handleRoutePress(a.route)}
                    />
                  ))}
                </View>
              </FadeIn>
            )}
            </>
          ) : (
            <>
              {/* = V+2: PRIMARY METRIC HERO CARD = */}
              {hasFounderAccess && (
                <FadeIn delay={60}>
                  <PrimaryMetricCard
                    label="Total Collected"
                    value={founderDb.formatInr(totalCollected)}
                    delta={0}
                    sparkline={incomeSpark}
                    accentColor={colors.primary}
                    icon={<PiggyBank size={22} color={colors.primary} strokeWidth={2} />}
                    hint="All issued billing + approved collections"
                    showDelta={false}
                    onPress={() => handleRoutePress('/(app)/console/analytics')}
                  />
                  {heroInsight && (
                    <View style={{ marginTop: 12 }}>
                      <InsightCallout
                        text={heroInsight.text}
                        tone={heroInsight.tone}
                        icon={
                          heroInsight.tone === 'success' ? <Flame size={12} color={colors.success} strokeWidth={2.5} />
                            : heroInsight.tone === 'warning' ? <AlertCircle size={12} color={colors.warning} strokeWidth={2.5} />
                              : <Sparkles size={12} color={colors.primary} strokeWidth={2.5} />
                        }
                      />
                    </View>
                  )}
                </FadeIn>
              )}

              {/* = V+2: ATTENTION STRIP = */}
              {attentionItems.length > 0 && (
                <FadeIn delay={120}>
                  <SectionLabel
                    title="Needs Your Attention"
                    badge={`${attentionItems.length}`}
                    badgeVariant="error"
                    subtitle="Tap to take action"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.attnRow}
                  >
                    {attentionItems.map((item, i) => (
                      <AttentionItem
                        key={i}
                        count={item.count}
                        label={item.label}
                        accentColor={item.color}
                        icon={item.icon}
                        onPress={() => handleRoutePress(item.route)}
                      />
                    ))}
                  </ScrollView>
                </FadeIn>
              )}

              {/* = PLATFORM OVERVIEW (V+1: sparklines + deltas) = */}
              <FadeIn delay={180}>
                <SectionLabel
                  title="Platform Overview"
                  badge="Live"
                  badgeVariant="success"
                  subtitle="Real-time platform metrics"
                />
                <View style={s.statGrid}>
                  <PremiumStatCard
                    title="Total Schools"
                    value={dashboardStats.total_schools}
                    icon={<School size={20} color={colors.primary} />}
                    accentColor={colors.primary}
                    onPress={() => handleRoutePress('/(app)/schools')}
                  />
                  <PremiumStatCard
                    title="Active Schools"
                    value={dashboardStats.active_schools}
                    icon={<CheckCircle2 size={20} color={colors.success} />}
                    accentColor={colors.success}
                    onPress={() => handleRoutePress('/(app)/schools')}
                  />
                  <PremiumStatCard
                    title="Total Students"
                    value={dashboardStats.total_students}
                    icon={<GraduationCap size={20} color={colors.warning} />}
                    accentColor={colors.warning}
                  />
                  <PremiumStatCard
                    title="Total Staff"
                    value={dashboardStats.total_staff}
                    icon={<Briefcase size={20} color={colors.accent} />}
                    accentColor={colors.accent}
                  />
                </View>
              </FadeIn>

              <FadeIn delay={220}>
                <SuperAdminCard
                  count={dashboardStats.total_super_admins}
                  onPress={() => handleRoutePress('/(app)/admins')}
                />
              </FadeIn>

              {/* = FINANCIAL PERFORMANCE (V+1: deltas on tiles) = */}
              {hasFounderAccess && (
                <FadeIn delay={280}>
                  <SectionLabel
                    title="Financial Performance"
                    badge="Founder"
                    badgeVariant="primary"
                    subtitle="This month . with month-over-month deltas"
                  />
                  <View style={s.finGrid}>
                    <FinTile
                      label="Approved Income"
                      value={founderDb.formatInr(approvedIncome)}
                      accentColor={colors.success}
                      isGradient
                      gradientColors={founderGradients.success}
                      icon={<CircleDollarSign size={17} color="rgba(255,255,255,0.9)" />}
                      delta={incomeDelta}
                    />
                    <FinTile
                      label="Pending Collections"
                      value={founderDb.formatInr(pendingCollections)}
                      accentColor={colors.warning}
                      icon={<Wallet size={17} color={colors.warning} />}
                    />
                    <FinTile
                      label="Approved Expenses"
                      value={founderDb.formatInr(approvedExpenses)}
                      accentColor={colors.error}
                      icon={<Receipt size={17} color={colors.error} />}
                      delta={expenseDelta}
                    />
                    <FinTile
                      label="Total Collected"
                      value={founderDb.formatInr(totalCollected)}
                      accentColor={colors.primary}
                      isGradient
                      gradientColors={founderGradients.primary}
                      icon={<PiggyBank size={17} color="rgba(255,255,255,0.9)" />}
                      delta={0}
                    />
                  </View>
                </FadeIn>
              )}

              {/* = V+3: AREA REVENUE CHART = */}
              {hasFounderAccess && sortedKeys.length > 0 && (
                <FadeIn delay={340}>
                  <SectionLabel title="Revenue vs Expense" subtitle="6-month trend with net delta" />
                  <AreaRevenueChart
                    sortedKeys={sortedKeys} incomeByKey={incomeByKey}
                    expenseByKey={expenseByKey} maxTrend={maxTrend}
                  />
                </FadeIn>
              )}

              {/* = V+3: PIPELINE FUNNEL = */}
              {hasFounderAccess && (
                <FadeIn delay={400}>
                  <SectionLabel
                    title="Pipeline Funnel"
                    badge={`${conversionPct.toFixed(1)}% conv`}
                    badgeVariant="primary"
                    subtitle="Enquiries -> Pipeline -> Closed"
                  />
                  <PipelineFunnel stages={funnelStages} />

                  <View style={{ marginTop: 14 }}>
                    <View style={s.kpiGrid}>
                      <KpiMini
                        icon={<Users size={17} color={colors.primary} />}
                        value={enquirySummaryCount.toString()}
                        label="Enquiries this month"
                        accentColor={colors.primary}
                        trend={enquiryDelta > 0 ? 'up' : enquiryDelta < 0 ? 'down' : null}
                      />
                      <KpiMini
                        icon={<Target size={17} color={colors.warning} />}
                        value={enquiriesToday.toString()}
                        label="New today"
                        accentColor={colors.warning}
                        trend={enquiriesToday > 0 ? 'up' : null}
                      />
                      <KpiMini
                        icon={<TrendingUp size={17} color={colors.success} />}
                        value={`${conversionPct.toFixed(1)}%`}
                        label="Conversion rate"
                        accentColor={colors.success}
                        trend={conversionPct >= 20 ? 'up' : conversionPct < 10 ? 'down' : null}
                      />
                      <KpiMini
                        icon={<IndianRupee size={17} color={colors.primary} />}
                        value={founderDb.formatInr(cpl, cpl % 1 === 0 ? 0 : 2)}
                        label="Cost per lead"
                        accentColor={colors.primary}
                      />
                    </View>
                  </View>
                </FadeIn>
              )}

              {/* = CLOSED DEALS = */}
              {hasFounderAccess && closedRows.length > 0 && (
                <FadeIn delay={460}>
                  <SectionLabel
                    title="Closed Deals Trend"
                    badge={`${Math.min(6, closedRows.length)} months`}
                    badgeVariant="success"
                    rightSlot={
                      Number.isFinite(closedDelta) && closedDelta !== 0
                        ? <View style={{ marginRight: 8 }}><DeltaPill value={closedDelta} size="sm" /></View>
                        : undefined
                    }
                  />
                  <LinearGradient
                    colors={isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)']}
                    style={[
                      s.closedCard,
                      { borderColor: colors.clayBorderColor },
                      clayStyle(clayShadows.clay),
                    ]}
                  >
                    {closedRows.slice(-6).map((r, idx) => {
                      const dealCount = pick(r, ['count', 'deals', 'closed', 'total']);
                      const maxDeals = Math.max(1, ...closedRows.slice(-6).map(cr => pick(cr, ['count', 'deals', 'closed', 'total'])));
                      const barPct = (dealCount / maxDeals) * 100;
                      const isMax = dealCount === maxDeals;
                      return (
                        <View key={idx} style={[s.closedRow, idx > 0 && { marginTop: 14 }]}>
                          <Text style={[s.closedPeriod, { color: isMax ? colors.success : colors.textSecondary }]}>{monthLabel(monthKey(r))}</Text>
                          <View style={[s.closedTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
                            <LinearGradient
                              colors={isMax
                                ? [colors.success, `${colors.success}80`]
                                : [colors.primary, `${colors.primary}70`]}
                              style={[s.closedBar, { width: `${Math.max(8, barPct)}%` }]}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            />
                          </View>
                          <Text style={[s.closedCount, {
                            color: isMax ? colors.success : colors.textPrimary,
                            fontWeight: isMax ? '800' : '600',
                          }]}>{dealCount.toLocaleString('en-IN')}</Text>
                        </View>
                      );
                    })}
                  </LinearGradient>
                </FadeIn>
              )}

              {/* = QUICK ACTIONS = */}
              <FadeIn delay={520}>
                <SectionLabel title="Quick Actions" subtitle="Operations . Tap to navigate" />
                <View style={s.qaGrid}>
                  {adminActions.map((a, i) => (
                    <QuickAction
                      key={i} index={i}
                      label={a.label} subtitle={a.subtitle}
                      icon={a.icon} accentColor={a.accentColor}
                      onPress={() => handleRoutePress(a.route)}
                    />
                  ))}
                </View>
              </FadeIn>

              {/* = FOUNDER CONSOLE = */}
              {hasFounderAccess && founderActions.length > 0 && (
                <FadeIn delay={580}>
                  <SectionLabel title="Founder Console" badge="Pro" badgeVariant="primary" subtitle="Restricted access . finance & ops" />
                  <View style={s.qaGrid}>
                    {founderActions.map((a, i) => (
                      <QuickAction
                        key={`f-${i}`} index={i}
                        label={a.label} subtitle={a.subtitle}
                        icon={a.icon} accentColor={a.accentColor}
                        onPress={() => handleRoutePress(a.route)}
                      />
                    ))}
                  </View>
                </FadeIn>
              )}
            </>
          )}

          {/* Footer */}
          <FadeIn delay={640}>
            <View style={[s.footer, { borderTopColor: colors.divider }]}>
              <LinearGradient
                colors={[colors.primary, colors.accent || colors.primary]}
                style={s.footerDot}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <Text style={[s.footerText, { color: colors.textTertiary }]}>
                NexSyrus Platform . {new Date().getFullYear()}
              </Text>
            </View>
          </FadeIn>
        </>
      )}
    </ScrollView>
  );
}

// =
// STYLES
// =
const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 0, paddingBottom: 64, position: 'relative' },
  skeletonWrap: { paddingTop: 10 },

  // Ambient page depth. These stay decorative and never become a content wrapper.
  ambientField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientOrb: { position: 'absolute' },
  ambientOrbPrimary: {
    width: 420, height: 420, borderRadius: 210,
    top: -190, right: -110,
    transform: [{ scaleX: 1.25 }, { rotate: '-12deg' }],
  },
  ambientOrbAccent: {
    width: 340, height: 340, borderRadius: 170,
    top: 620, left: -220,
    transform: [{ scaleY: 1.3 }, { rotate: '18deg' }],
  },

  // Hero
  heroGradient: {
    borderRadius: 30, marginBottom: 32, borderWidth: 1,
    padding: 26, gap: 18, overflow: 'hidden',
  },
  heroGradientCompact: { borderRadius: 22, padding: 14, gap: 12, marginBottom: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, position: 'relative' },
  heroRowCompact: { flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start', paddingRight: 0 },
  heroText: { flex: 1, gap: 3 },
  heroTextCompact: { minWidth: 0, paddingTop: 1, paddingRight: 0 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { fontSize: 12.5, fontWeight: '500', letterSpacing: 0.2 },
  adminName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  adminNameCompact: { fontSize: 21, lineHeight: 25, letterSpacing: -0.35 },
  adminRole: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  roleBadgeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 22, borderWidth: 1,
  },
  roleBadgeCompact: { alignSelf: 'flex-start', marginLeft: 58, marginTop: -6, paddingHorizontal: 10, paddingVertical: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  heroSignalGrid: { flexDirection: 'row', gap: 12 },
  heroSignalGridCompact: { gap: 8 },
  heroSignal: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 13, paddingVertical: 12,
    borderRadius: 18, borderWidth: 1,
  },
  heroSignalCompact: { gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 15 },
  heroSignalIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  heroSignalIconCompact: { width: 30, height: 30, borderRadius: 10 },
  heroSignalValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.25 },
  heroSignalLabel: { fontSize: 10.5, fontWeight: '500', marginTop: 1 },
  liveStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOpacity: 0.8, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
  } as any,
  liveText: { flexShrink: 1, fontSize: 11.5, fontWeight: '500' },

  // Avatar
  avatarWrap: { position: 'relative', width: 56, height: 56 },
  avatarWrapCompact: { width: 46, height: 46, marginTop: 4 },
  avatarPulse: {
    position: 'absolute', top: -4, left: -4,
    width: 64, height: 64, borderRadius: 32, borderWidth: 1.5,
  },
  avatarPulseCompact: { top: -3, left: -3, width: 52, height: 52, borderRadius: 26 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCompact: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  avatarOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 6.5, borderWidth: 2,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginTop: 36, marginBottom: 18, gap: 10,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionAccentBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12.5, fontWeight: '400', marginTop: 4, marginLeft: 16 },

  // V+1: Delta pill
  deltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 22, borderWidth: 1,
  },
  deltaText: { fontWeight: '700', letterSpacing: 0.1 },

  // V+2: Primary Metric Card
  primaryCard: {
    borderRadius: 24, borderWidth: 1, padding: 20,
    overflow: 'hidden', position: 'relative',
    minHeight: 146,
  },
  primaryGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 130, height: 130, borderRadius: 65,
  },
  primaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  primaryIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  primaryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  primaryHint: { fontSize: 10.5, fontWeight: '500', marginTop: 2 },
  primaryBottomRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 20, gap: 14,
  },
  primaryValue: {
    fontSize: 34, fontWeight: '900',
    letterSpacing: -1, flex: 1,
  },
  primaryBottomLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },

  // V+2: Attention Strip
  attnRow: { gap: 14, paddingRight: 10 },
  attnItemWrap: { width: 148 },
  attnItem: {
    borderRadius: 20, borderWidth: 1, padding: 16,
    overflow: 'hidden', position: 'relative', minHeight: 118,
  },
  attnTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  attnIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  attnPulseDot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  } as any,
  attnCount: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },
  attnLabel: { fontSize: 11, fontWeight: '600', lineHeight: 14 },

  // V+3: Insight callout
  insightCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 16, borderWidth: 1,
  },
  insightIconWrap: {
    width: 28, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  insightText: { flex: 1, fontSize: 12.5, fontWeight: '500', lineHeight: 17 },

  // Stat cards (V+1 with sparkline)
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statCardWrap: { flex: 1, minWidth: 160 },
  statCard: {
    borderRadius: 22, borderWidth: 1, padding: 18,
    overflow: 'hidden', position: 'relative',
  },
  statGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 80, height: 80, borderRadius: 40,
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  statIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginBottom: 4 },
  statTitle: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.1 },
  statBottomLine: { position: 'absolute', bottom: 0, left: 18, right: 18, height: 3, borderRadius: 1.5 },

  // Super admin card
  saCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 22, borderWidth: 1, padding: 18, marginTop: 14,
  },
  saIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  saCount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  saLabel: { fontSize: 13.5, fontWeight: '500', marginTop: 1 },
  saArrow: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Financial tiles (V+1: deltas)
  finGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  finTile: {
    flex: 1, minWidth: 160, borderRadius: 22, borderWidth: 1,
    padding: 18, overflow: 'hidden', position: 'relative',
  },
  finTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  finAccentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 4, borderTopLeftRadius: 22, borderBottomLeftRadius: 22,
  },
  finShimmer: {
    position: 'absolute', top: 0, right: -20, bottom: 0, width: 60,
    transform: [{ skewX: '-15deg' }],
  },
  finIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  finValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  finLabel: { fontSize: 11.5, fontWeight: '500' },
  finDeltaPillWhite: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  finDeltaText: { fontSize: 10, fontWeight: '700' },

  // Chart (V+3: gradient bars + header)
  chartCard: {
    borderRadius: 22, borderWidth: 1, padding: 18, overflow: 'hidden',
  },
  chartHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  chartHeaderLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, textTransform: 'uppercase' },
  chartHeaderValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  chartRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'flex-end', height: 140, paddingHorizontal: 4,
  },
  chartCol: { alignItems: 'center', gap: 6 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  chartVal: { fontSize: 9.5, fontWeight: '700' },
  chartLbl: { fontSize: 10.5, marginTop: 6 },
  chartLegend: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingTop: 16, paddingHorizontal: 4, borderTopWidth: 1, marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { fontSize: 11.5, fontWeight: '500' },

  // V+3: Pipeline Funnel
  funnelCard: {
    borderRadius: 22, borderWidth: 1, padding: 20,
  },
  funnelStage: { gap: 10 },
  funnelLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funnelDot: { width: 9, height: 9, borderRadius: 4.5 },
  funnelLabel: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  funnelConvText: { fontSize: 10.5, fontWeight: '500', marginRight: 8 },
  funnelCount: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  funnelTrack: { height: 11, borderRadius: 6, overflow: 'hidden' },
  funnelBar: { height: '100%', borderRadius: 6 },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    flex: 1, minWidth: 160, borderRadius: 22, borderWidth: 1,
    padding: 18, overflow: 'hidden', position: 'relative',
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kpiIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiTrend: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  kpiTrendText: { fontSize: 9.5, fontWeight: '700' },
  kpiValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  kpiLabel: { fontSize: 11.5, fontWeight: '500' },
  kpiBottomLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },

  // Closed deals
  closedCard: { borderRadius: 22, borderWidth: 1, padding: 20 },
  closedRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  closedPeriod: { fontSize: 12.5, fontWeight: '600', width: 56 },
  closedTrack: { flex: 1, height: 9, borderRadius: 5, overflow: 'hidden' },
  closedBar: { height: '100%', borderRadius: 5 },
  closedCount: { fontSize: 13.5, width: 44, textAlign: 'right' },

  // Quick action grid - 2 column
  qaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6,
  },
  qaCardWrap: {
    width: '47.5%', flexGrow: 1, flexShrink: 0, minWidth: 155,
  },
  qaCardWrapDesktopWide: {
    width: '23%', minWidth: 210,
  },
  qaCard: {
    borderRadius: 22, borderWidth: 1, padding: 18, paddingBottom: 20,
    overflow: 'hidden', position: 'relative', minHeight: 124,
    gap: 14, justifyContent: 'flex-start',
  } as any,
  qaGlowOrb: {
    position: 'absolute', top: -24, right: -24,
    width: 72, height: 72, borderRadius: 36,
  },
  qaIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, alignSelf: 'flex-start',
  },
  qaTextCol: { gap: 5 },
  qaLabel: { fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2, lineHeight: 19 },
  qaSub: { fontSize: 11.5, fontWeight: '500' },
  qaBottomLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  qaTopArrow: {
    position: 'absolute', top: 12, right: 12,
    width: 24, height: 24, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Footer
  footer: {
    marginTop: 48, paddingTop: 20, borderTopWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  footerDot: { width: 22, height: 4, borderRadius: 2 },
  footerText: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.3 },
});
