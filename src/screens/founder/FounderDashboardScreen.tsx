import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { useRouter, Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  LayoutGrid,
  Users,
  Target,
  ChevronRight,
  Briefcase,
  MessageCircle,
  Receipt,
  CheckSquare,
  ClipboardCheck,
  Wallet,
  MessageSquare,
  BarChart2,
  Building2,
  Bell,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Calendar,
  Plus,
  ArrowRight,
  Crown,
  Award,
  Sparkles,
  PieChart,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import * as founderDb from '../../services/founderSupabase';
import { computeFounderDashboardMetrics } from '../../utils/founderDashboardMetrics';
import {
  ConsoleAmbientBackground,
  GlassCard,
  KpiTile,
  FinancialSummaryBanner,
  SectionTitle,
  founderGradients,
  bottomTabPad,
} from './founderUi';

const { width } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const CARD_WIDTH = IS_WEB ? Math.min(width, 1200) : width;

// - helpers -

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pick(row: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return n(row[k]);
  }
  return 0;
}

function monthKey(r: Record<string, unknown>): string {
  const month = n(r.month ?? r.period_month ?? r.m);
  const year = n(r.year ?? r.period_year ?? r.y);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${m}/${y.slice(2)}`;
}

// - accent palette for breakdown rows -

const ROW_ACCENTS = [
  '#7C6FFF', '#38C8F4', '#00D4AD', '#FFB020',
  '#FF6B7A', '#A78BFA', '#34D399', '#F472B6',
];

function FinancialSummaryGrid({ summary, colors, isDark }: { summary: founderDb.FinancialSummary; colors: any; isDark: boolean }) {
  const cards = [
    { label: 'Total collected', value: founderDb.formatInr(summary.revenue), color: '#00D4AD' },
    { label: 'Client billing collected', value: founderDb.formatInr(summary.client_billing_collected), color: '#7C6FFF' },
    { label: 'Platform expenses', value: founderDb.formatInr(summary.expenses), color: '#FF6B7A' },
    { label: 'Net profit', value: founderDb.formatInr(summary.net_profit), color: summary.net_profit >= 0 ? '#7C6FFF' : '#FF6B7A' },
    { label: 'Profit margin', value: summary.profit_margin == null ? '—' : `${summary.profit_margin.toFixed(1)}%`, color: '#38C8F4' },
  ];
  return (
    <View style={[styles.financialGrid, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(18,20,34,0.68)' : 'rgba(250,251,255,0.85)' }]}>
      <View style={styles.financialGridHead}>
        <View><Text style={[styles.financialGridTitle, { color: colors.textPrimary }]}>Financial Summary</Text><Text style={[styles.financialGridSub, { color: colors.textSecondary }]}>Total collected includes Business Unit collections and issued client billing documents. Expenses are platform-wide.</Text></View>
        <View style={[styles.financialScope, { backgroundColor: 'rgba(124,111,255,0.12)' }]}><Text style={{ color: '#7C6FFF', fontSize: 10, fontWeight: '800' }}>LIVE</Text></View>
      </View>
      <View style={styles.financialCards}>{cards.map((card) => <View key={card.label} style={[styles.financialCard, { borderColor: `${card.color}28`, backgroundColor: `${card.color}0C` }]}><Text style={[styles.financialCardLabel, { color: colors.textSecondary }]}>{card.label}</Text><Text style={[styles.financialCardValue, { color: card.color }]} numberOfLines={1}>{card.value}</Text></View>)}</View>
    </View>
  );
}

// - GradientDivider -

function GradientDivider({ color = '#7C6FFF' }: { color?: string }) {
  return (
    <LinearGradient
      colors={[color + '00', color + 'AA', color + '00']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradDivider}
    />
  );
}

// - PremiumSectionTitle -

function PremiumSectionTitle({
  title,
  accent = '#7C6FFF',
  icon,
  colors,
}: {
  title: string;
  accent?: string;
  icon?: React.ReactNode;
  colors: any;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.sectionHeader}>
      <View style={[styles.sectionAccentBar, { backgroundColor: accent }]} />
      {icon && <View style={styles.sectionIcon}>{icon}</View>}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    </Animated.View>
  );
}

// - QuickActionRow -

const QUICK_ACTIONS = [
  { label: '11-Day Sprint', icon: Zap, route: '/(app)/console/sprint', gradient: ['#38BDF8', '#2563EB'] },
  { label: 'Add Expense', icon: Plus, route: '/(app)/console/expenses', gradient: ['#FF6B7A', '#DC2626'] },
  { label: 'Enquiries', icon: MessageCircle, route: '/(app)/console/enquiries', gradient: ['#38C8F4', '#2563EB'] },
  { label: 'Analytics', icon: BarChart2, route: '/(app)/console/analytics', gradient: ['#FFB020', '#D97706'] },
] as const;

function QuickActionRow({ colors, isDark }: { colors: any; isDark: boolean }) {
  const router = useRouter();
  return (
    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.quickActionRow}>
      {QUICK_ACTIONS.map((action, i) => {
        const Icon = action.icon;
        return (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.route as any)}
            style={({ pressed, hovered }: any) => [
              styles.quickActionBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                borderColor: hovered ? action.gradient[0] + '55' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                transform: [{ scale: pressed ? 0.95 : hovered ? 1.03 : 1 }],
              },
              Platform.OS === 'web' ? {
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: hovered
                  ? `0 8px 24px ${action.gradient[0]}22`
                  : isDark
                    ? '0 2px 8px rgba(0,0,0,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
              } as any : {},
            ] as any}
          >
            <LinearGradient
              colors={action.gradient as unknown as [string, string]}
              style={styles.quickActionIconBox}
            >
              <Icon size={14} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{action.label}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

// - PipelineFunnel -

function PipelineFunnel({
  steps,
  colors,
  isDark,
}: {
  steps: { label: string; value: number; accent: string; icon: React.ReactNode }[];
  colors: any;
  isDark: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.pipelineRow}>
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <Animated.View entering={FadeInRight.delay(i * 100 + 100).springify()} style={styles.pipelineStep}>
            <View style={[
              styles.pipelineCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                borderColor: step.accent + '33',
              },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? `0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)`
                  : `0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)`,
              } as any : {},
            ]}>
              <View style={[styles.pipelineIconWrap, { backgroundColor: step.accent + '20' }]}>
                {step.icon}
              </View>
              <Text style={[styles.pipelineValue, { color: colors.textPrimary }]}>
                {step.value.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.pipelineLabel, { color: colors.textSecondary }]}>
                {step.label}
              </Text>
              {/* Bottom accent line */}
              <View style={[styles.pipelineAccentLine, { backgroundColor: step.accent }]} />
            </View>
          </Animated.View>
          {i < steps.length - 1 && (
            <Animated.View entering={FadeInRight.delay(i * 100 + 150).springify()} style={styles.pipelineArrow}>
              <ArrowRight size={16} color={colors.textSecondary + '66'} />
            </Animated.View>
          )}
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

// - RankBadge -

const RANK_COLORS = ['#FFB020', '#A0AEC0', '#CD7F32'];
const RANK_ICONS = [Crown, Award, Award];

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) return null;
  const color = RANK_COLORS[rank - 1];
  const Icon = RANK_ICONS[rank - 1];
  return (
    <View style={[styles.rankBadge, { backgroundColor: color + '20', borderColor: color + '44' }]}>
      <Icon size={8} color={color} />
      <Text style={[styles.rankText, { color }]}>#{rank}</Text>
    </View>
  );
}

// - BreakdownList (Enhanced) -

function BreakdownList({
  title,
  items,
  type,
  accent = '#7C6FFF',
  colors,
}: {
  title: string;
  items: { label: string; value: number }[];
  type: 'currency' | 'count';
  accent?: string;
  colors: { textPrimary: string; textSecondary: string; border: string };
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <GlassCard>
      <View style={styles.breakdownHeader}>
        <View style={[styles.breakdownAccentDot, { backgroundColor: accent }]} />
        <Text style={[styles.breakdownTitle, { color: colors.textPrimary }]}>{title}</Text>
        {total > 0 && (
          <Text style={[styles.breakdownTotal, { color: colors.textSecondary }]}>
            {type === 'currency' ? founderDb.formatInr(total, 0) : total.toLocaleString('en-IN')} total
          </Text>
        )}
      </View>
      {items.length === 0 ? (
        <View style={styles.breakdownEmptyWrap}>
          <PieChart size={24} color={colors.textSecondary + '44'} />
          <Text style={[styles.breakdownEmpty, { color: colors.textSecondary }]}>No data this period.</Text>
        </View>
      ) : (
        items.slice(0, 8).map((item, i) => {
          const pct = (item.value / max) * 100;
          const percentOfTotal = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          const rowAccent = ROW_ACCENTS[i % ROW_ACCENTS.length];
          return (
            <Animated.View
              key={`${item.label}-${i}`}
              entering={FadeInDown.delay(i * 40 + 60).springify()}
              style={styles.breakdownRow}
            >
              <View style={styles.breakdownRowTop}>
                <View style={styles.breakdownRowLeft}>
                  {i < 3 && <RankBadge rank={i + 1} />}
                  <Text
                    style={[styles.breakdownLbl, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.breakdownRowRight}>
                  <Text style={[styles.breakdownPct, { color: rowAccent }]}>
                    {percentOfTotal}%
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.textPrimary }]}>
                    {type === 'currency'
                      ? founderDb.formatInr(item.value, 0)
                      : item.value.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              {/* progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <Animated.View
                  entering={FadeInRight.delay(i * 40 + 120).duration(600)}
                  style={[styles.progressFill, { width: `${pct}%` as any, overflow: 'hidden' }]}
                >
                  <LinearGradient
                    colors={[rowAccent + 'CC', rowAccent + '44']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          );
        })
      )}
    </GlassCard>
  );
}

// - PremiumBarChart -

function AnimatedBar({
  targetHeight,
  colors,
  delay = 0,
}: {
  targetHeight: number;
  colors: [string, string];
  delay?: number;
}) {
  const height = useSharedValue(0);
  
  React.useEffect(() => {
    height.value = withTiming(targetHeight, { duration: 800 + delay });
  }, [targetHeight, delay]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
  }));
  const capStyle = useAnimatedStyle(() => ({
    bottom: Math.max(0, height.value - 2),
    opacity: height.value > 5 ? 0.9 : 0,
  }));

  return (
    <View style={styles.barWrapper}>
      <Animated.View style={[styles.bar, style, { overflow: 'hidden' }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.barGlowCap, { backgroundColor: colors[0] }, capStyle]} />
    </View>
  );
}

function PremiumBarChart({
  chartKeys,
  incomeByKey,
  expenseByKey,
  maxTrend,
  colors,
}: {
  chartKeys: string[];
  incomeByKey: Record<string, number>;
  expenseByKey: Record<string, number>;
  maxTrend: number;
  colors: { textPrimary: string; textSecondary: string; border: string };
}) {
  const BAR_HEIGHT = 100;
  const gridLines = [0.25, 0.5, 0.75, 1.0];

  return (
    <GlassCard>
      {/* grid lines */}
      <View style={[styles.chartContainer, { height: BAR_HEIGHT + 32 }]}>
        {gridLines.map((pct) => (
          <View
            key={pct}
            style={[
              styles.gridLine,
              {
                bottom: pct * BAR_HEIGHT + 24,
                borderColor: colors.border,
              },
            ]}
          />
        ))}

        <View style={[styles.chartRow, { height: BAR_HEIGHT + 24 }]}>
          {chartKeys.map((k, idx) => {
            const incH = Math.max(4, ((incomeByKey[k] || 0) / maxTrend) * BAR_HEIGHT);
            const expH = Math.max(4, ((expenseByKey[k] || 0) / maxTrend) * BAR_HEIGHT);
            return (
              <Animated.View
                key={k}
                entering={FadeInUp.delay(idx * 60).springify()}
                style={styles.chartCol}
              >
                <View style={[styles.barPair, { height: BAR_HEIGHT }]}>
                  {/* income bar */}
                  <AnimatedBar targetHeight={incH} colors={['#00D4AD', '#00D4AD44']} delay={idx * 50} />
                  {/* expense bar */}
                  <AnimatedBar targetHeight={expH} colors={['#FF6B7A', '#FF6B7A44']} delay={idx * 50 + 100} />
                </View>
                <Text style={[styles.chartLbl, { color: colors.textSecondary }]}>{monthLabel(k)}</Text>
              </Animated.View>
            );
          })}
        </View>

        {chartKeys.length === 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>
            No monthly series yet.
          </Text>
        )}
      </View>

      <GradientDivider color="#7C6FFF" />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <LinearGradient colors={['#00D4AD', '#00D4AD88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.legendPill} />
          <Text style={{ color: '#9090A8', fontSize: 11, fontWeight: '600' }}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <LinearGradient colors={['#FF6B7A', '#FF6B7A88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.legendPill} />
          <Text style={{ color: '#9090A8', fontSize: 11, fontWeight: '600' }}>Expense</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// - NavIcon map -

const NAV_ICON_MAP: Record<string, any> = {
  'Expenses': Receipt,
  'Expense approvals': CheckSquare,
  'Collection approvals': ClipboardCheck,
  'Collections': Wallet,
  'Enquiries': MessageSquare,
  'Analytics': BarChart2,
  'Business units': Building2,
  'Notifications': Bell,
  'Audit logs': FileText,
  'Settings': Settings,
};

// - PremiumNavCard -

// Normalize gradient: founderGradients.cardDark may be near-black -> fallback
function safeGradient(g: string[]): [string, string] {
  if (!g || g.length < 2) return ['#7C6FFF', '#5A4FCC'];
  // If both stops are very dark (luminance < 0.05), use a visible fallback
  const isDark = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255, gr = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * gr + 0.114 * b) < 30;
  };
  if (isDark(g[0]) && isDark(g[1])) return ['#6B6B9A', '#4A4870'];
  return [g[0], g[1]];
}

function PremiumNavCard({
  item,
  index,
  colors,
  isDark,
  fullWidth,
}: {
  item: { label: string; sub: string; route: string; gradient: string[]; icon: string };
  index: number;
  colors: any;
  isDark: boolean;
  fullWidth?: boolean;
}) {
  const scale = useSharedValue(1);
  const NavIcon = NAV_ICON_MAP[item.label] ?? LayoutGrid;
  const grad = safeGradient(item.gradient);
  const accentColor = grad[0];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(220 + index * 45).springify()}
      style={[
        animStyle,
        IS_WEB && (fullWidth ? { width: '100%', flexGrow: 1 } : { width: '48%', minWidth: 280, flexGrow: 1 }) as any,
      ]}
    >
      <Link href={item.route as any} asChild>
        <Pressable
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 17, stiffness: 280 }); }}
          style={({ pressed, hovered }: any) => [
            styles.navCardOuter,
            {
              backgroundColor: isDark
                ? hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'
                : hovered ? colors.glassBackground : colors.surface,
              borderColor: hovered
                ? accentColor + '66'
                : isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: hovered && !pressed ? 1.01 : 1 }],
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: hovered ? 0.15 : 0,
              shadowRadius: 12,
            },
          ] as any}
        >
          {/* - LEFT ACCENT STRIP: real flex child, not absolute - */}
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.navStripChild}
          />

          {/* - CONTENT ROW - */}
          <View style={styles.navContent}>
            {/* icon box */}
            <View style={[styles.navIconBox, { backgroundColor: accentColor + '25' }]}>
              <NavIcon size={20} color={accentColor} />
            </View>

            {/* labels */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.navLabel, { color: isDark ? '#EEEEF8' : colors.textPrimary }]}>
                {item.label}
              </Text>
              <Text style={[styles.navSub, { color: isDark ? 'rgba(255,255,255,0.50)' : colors.textSecondary }]}>
                {item.sub}
              </Text>
            </View>

            {/* chevron */}
            <View style={[styles.navChevronBox, { backgroundColor: accentColor + '20' }]}>
              <ChevronRight color={accentColor} size={16} />
            </View>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

// - StatPill -

function StatPill({
  icon,
  label,
  value,
  accent,
  colors,
  isDark,
  delay = 0,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  colors: any;
  isDark: boolean;
  delay?: number;
  fullWidth?: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={fullWidth ? { width: '100%' } : { flex: 1 }}>
      <View
        style={[
          styles.statPill,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : colors.surface,
            borderColor: accent + '40',
          },
        ]}
      >
        <View style={[styles.statPillIcon, { backgroundColor: accent + '25' }]}>{icon}</View>
        <Text style={[styles.statPillVal, { color: isDark ? '#EEEEF8' : colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statPillLbl, { color: isDark ? 'rgba(255,255,255,0.50)' : colors.textSecondary }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function isDarkColor(_hex: string) { return true; }

// - ClosedDealsTrend -

function ClosedDealsTrend({
  rows,
  colors,
}: {
  rows: Record<string, unknown>[];
  colors: any;
}) {
  const items = rows.slice(-6);
  const maxVal = Math.max(1, ...items.map((r) => pick(r, ['count', 'deals', 'closed', 'total'])));

  return (
    <GlassCard>
      <View style={styles.closedHeader}>
        <Activity size={16} color="#7C6FFF" />
        <Text style={[styles.closedTitle, { color: colors.textPrimary }]}>
          Last {items.length} periods
        </Text>
      </View>
      <View style={styles.closedSparkline}>
        {items.map((r, idx) => {
          const val = pick(r, ['count', 'deals', 'closed', 'total']);
          const h = Math.max(8, (val / maxVal) * 56);
          const isLast = idx === items.length - 1;
          return (
            <View key={idx} style={styles.closedBar}>
              <AnimatedBar
                targetHeight={h}
                colors={isLast ? ['#7C6FFF', '#7C6FFF66'] : ['#4A4880', '#4A488044']}
                delay={idx * 60}
              />
              <Text style={[styles.closedBarLbl, { color: colors.textSecondary }]}>
                {monthLabel(monthKey(r))}
              </Text>
              {isLast && (
                <Text style={[styles.closedBarVal, { color: '#7C6FFF' }]}>
                  {val}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

// - CategoryGrid -

function CategoryGrid({
  items,
  colors,
  isDark,
}: {
  items: { category: string; amount: number }[];
  colors: any;
  isDark: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.amount));

  return (
    <View style={styles.catGrid}>
      {items.slice(0, 8).map((item, i) => {
        const accent = ROW_ACCENTS[i % ROW_ACCENTS.length];
        const pct = Math.round((item.amount / max) * 100);
        return (
          <Animated.View
            key={item.category + i}
            entering={FadeInDown.delay(i * 40).springify()}
            style={[
              styles.catChip,
              {
                borderColor: accent + '33',
                backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : colors.surface,
              },
            ]}
          >
            <LinearGradient
              colors={[accent + '18', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.catDot, { backgroundColor: accent }]} />
            <Text style={[styles.catChipLbl, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.category}
            </Text>
            <Text style={[styles.catChipAmt, { color: colors.textPrimary }]}>
              {founderDb.formatInr(item.amount, 0)}
            </Text>
            {/* mini progress strip at bottom */}
            <View style={[styles.catProgressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.catProgressFill, { width: `${pct}%` as any, backgroundColor: accent }]} />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

// - main screen -

export default function FounderDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user, isSuperAdmin, currentAdmin } = useAuth();
  const { founder, isApprover, canApproveReject } = useFounderAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;

  const roleLabel =
    founder?.role === 'APPROVER'
      ? 'Approver'
      : founder
        ? 'Founder'
        : isSuperAdmin
          ? 'Super Admin'
          : 'Console';
  const identityLine =
    founder?.full_name ||
    founder?.email ||
    currentAdmin?.full_name ||
    currentAdmin?.email ||
    user?.email ||
    'Console';

  // Dynamic greeting
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (founder?.full_name || currentAdmin?.full_name || '').split(' ')[0] || '';
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;

  // Formatted date
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [financialPeriod, setFinancialPeriod] = useState<founderDb.CollectionPeriodFilter>('ALL');
  const [financialUnitId, setFinancialUnitId] = useState('ALL');
  const [financialUnits, setFinancialUnits] = useState<{ id: string; name: string }[]>([]);
  const [financialSummary, setFinancialSummary] = useState<founderDb.FinancialSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const [pm, inc, exp, enq, closed, expRoi, conv, cpl, todayN, unas] =
        await Promise.all([
          founderDb.fetchPendingMetricsSummary(),
          founderDb.fetchMonthlyIncomeSummary(),
          founderDb.fetchMonthlyExpenseSummaryV2(),
          founderDb.fetchMonthlyEnquirySummary(),
          founderDb.fetchMonthlyClosedDeals(),
          founderDb.fetchMonthlyExpenseSummaryRoi(),
          founderDb.fetchConversionRateSeries(),
          founderDb.fetchCostPerLeadSeries(),
          founderDb.countEnquiriesCreatedToday(),
          founderDb.countUnassignedEnquiries(),
        ]);
      setPending(pm);
      setIncomeRows(inc);
      setExpenseRows(exp);
      setEnquiryRows(enq);
      setClosedRows(closed);
      setExpenseRoiRows(expRoi);
      setConvRows(conv);
      setCplRows(cpl);
      setEnquiriesToday(todayN);
      setUnassignedCount(unas);
    } catch {
      // silently handle dashboard load failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    founderDb.listBusinessUnits(true)
      .then((units) => setFinancialUnits(units.map((unit) => ({ id: unit.id, name: unit.name }))))
      .catch(() => setFinancialUnits([]));
  }, []);

  useEffect(() => {
    founderDb.getFinancialSummary({ period: financialPeriod, business_unit_id: financialUnitId })
      .then(setFinancialSummary)
      .catch(() => setFinancialSummary(null));
  }, [financialPeriod, financialUnitId]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const m = useMemo(
    () =>
      computeFounderDashboardMetrics({
        pending,
        incomeRows,
        expenseRows,
        enquiryRows,
        monthlyClosedDeals: closedRows,
        monthlyExpenseRoi: expenseRoiRows.length > 0 ? expenseRoiRows : expenseRows,
        conversionRows: convRows,
        costPerLeadRows: cplRows,
        enquiriesToday,
        unassignedEnquiries: unassignedCount,
      }),
    [pending, incomeRows, expenseRows, enquiryRows, closedRows, expenseRoiRows, convRows, cplRows, enquiriesToday, unassignedCount],
  );

  const chartKeys = useMemo(() => {
    const s = new Set<string>();
    incomeRows.forEach((r) => s.add(monthKey(r)));
    expenseRows.forEach((r) => s.add(monthKey(r)));
    return Array.from(s).sort().slice(-6);
  }, [incomeRows, expenseRows]);

  const incomeByKey: Record<string, number> = useMemo(() => {
    const o: Record<string, number> = {};
    incomeRows.forEach((r) => {
      o[monthKey(r)] = pick(r, ['total_income', 'total_amount', 'amount', 'income', 'sum', 'total']);
    });
    return o;
  }, [incomeRows]);

  const expenseByKey: Record<string, number> = useMemo(() => {
    const o: Record<string, number> = {};
    expenseRows.forEach((r) => {
      o[monthKey(r)] = pick(r, ['total_expense', 'total_amount', 'amount', 'expense', 'sum', 'total']);
    });
    return o;
  }, [expenseRows]);

  const maxTrend = Math.max(
    1,
    ...chartKeys.map((k) => Math.max(incomeByKey[k] || 0, expenseByKey[k] || 0)),
  );

  // Sparkline data for KPI tiles (last 4 months)
  const incomeSparkline = useMemo(() => chartKeys.slice(-4).map(k => incomeByKey[k] || 0), [chartKeys, incomeByKey]);
  const expenseSparkline = useMemo(() => chartKeys.slice(-4).map(k => expenseByKey[k] || 0), [chartKeys, expenseByKey]);
  const enquirySparkline = useMemo(() => {
    const keys = Array.from(new Set(enquiryRows.map(r => monthKey(r)))).sort().slice(-4);
    return keys.map(k => {
      const rows = enquiryRows.filter(r => monthKey(r) === k);
      return rows.reduce((s, r) => s + pick(r, ['total_enquiries', 'count', 'enquiries', 'leads']), 0);
    });
  }, [enquiryRows]);

  // Chart totals for summary line
  const totalIncome = useMemo(() => chartKeys.reduce((s, k) => s + (incomeByKey[k] || 0), 0), [chartKeys, incomeByKey]);
  const totalExpense = useMemo(() => chartKeys.reduce((s, k) => s + (expenseByKey[k] || 0), 0), [chartKeys, expenseByKey]);
  const chartMarginPct = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : '0';


  const navItems = useMemo(
    () => [
      { label: 'Expenses', sub: 'Track & receipts', route: '/(app)/console/expenses', gradient: founderGradients.danger, icon: 'INR' },
      ...(canApproveReject
        ? ([
          { label: 'Expense approvals', sub: 'Pending queue', route: '/(app)/console/expense-approvals' as const, gradient: founderGradients.warning, icon: 'ok' },
          { label: 'Collection approvals', sub: 'Pending collections', route: '/(app)/console/collection-approvals' as const, gradient: founderGradients.info, icon: '*' },
        ] as const)
        : []),
      { label: 'Collections', sub: 'Units & approvals', route: '/(app)/console/billing?tab=collections', gradient: founderGradients.success, icon: '*' },
      { label: 'Enquiries', sub: 'Pipeline & deals', route: '/(app)/console/enquiries', gradient: founderGradients.info, icon: '*' },
      { label: 'Analytics', sub: 'Sources & leaderboard', route: '/(app)/console/analytics', gradient: founderGradients.warning, icon: '*' },
      { label: 'Business units', sub: 'Units directory', route: '/(app)/console/units', gradient: founderGradients.primary, icon: '*' },
      { label: 'Notifications', sub: 'Alerts & updates', route: '/(app)/console/notifications', gradient: founderGradients.success, icon: '*' },
      ...(isApprover || isSuperAdmin
        ? [{ label: 'Audit logs', sub: 'Activity trail', route: '/(app)/console/audit-logs', gradient: founderGradients.cardDark, icon: '*' } as const]
        : []),
      ...(isSuperAdmin
        ? [{ label: 'Festival posters', sub: 'App popup banners', route: '/(app)/console/festival-posters', gradient: founderGradients.info, icon: '*' } as const]
        : []),
      { label: 'Settings', sub: isApprover || isSuperAdmin ? 'Security & controls' : 'Security', route: '/(app)/console/settings', gradient: founderGradients.primary, icon: '⚙' },
    ],
    [canApproveReject, isApprover, isSuperAdmin],
  );

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomTabPad },
          IS_WEB && styles.contentWeb,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C6FFF" />
        }
      >
        {/* - HERO HEADER - */}
        <Animated.View entering={FadeInDown.duration(500)} style={[
          styles.header,
          {
            backgroundColor: isDark ? 'rgba(33,31,45,0.7)' : 'rgba(251,250,248,0.85)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
          Platform.OS === 'web' ? {
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
          } as any : {},
        ]}>
          {/* ambient header glow */}
          <LinearGradient
            colors={isDark ? ['#7C6FFF15', '#38C8F408', 'transparent'] : ['#7C6FFF10', '#38C8F405', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGlow}
          />

          {/* Top row */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.kickerRow}>
                <Zap size={11} color="#7C6FFF" />
                <Text style={[styles.kicker, { color: '#7C6FFF' }]}>NexSyrus</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{greetingText}</Text>
              <View style={styles.dateRow}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
              </View>
            </View>
            <LinearGradient
              colors={founderGradients.primary as [string, string]}
              style={styles.rolePill}
            >
              <View style={styles.rolePillDot} />
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </LinearGradient>
          </View>

          {/* Gradient divider */}
          <GradientDivider color="#7C6FFF" />

          {/* Quick Actions */}
          <QuickActionRow colors={colors} isDark={isDark} />
        </Animated.View>

        {/* ── 11-DAY SPRINT COMMAND CENTER HERO BANNER ── */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Pressable
            onPress={() => router.push('/(app)/console/sprint' as any)}
            style={({ pressed, hovered }: any) => [
              styles.sprintHeroBanner,
              {
                backgroundColor: isDark ? 'rgba(17, 24, 39, 0.88)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: hovered ? '#38bdf8' : (isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.45)'),
                transform: [{ scale: pressed ? 0.99 : hovered ? 1.006 : 1 }],
              },
              Platform.OS === 'web' ? {
                cursor: 'pointer',
                boxShadow: hovered ? '0 12px 28px rgba(56, 189, 248, 0.22)' : '0 4px 16px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              } as any : {},
            ]}
          >
            <LinearGradient
              colors={['rgba(56, 189, 248, 0.16)', 'rgba(37, 99, 235, 0.07)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.sprintHeroLeft}>
              <View style={styles.sprintHeroBadgeRow}>
                <View style={styles.sprintZapPill}>
                  <Zap size={12} color="#38bdf8" />
                  <Text style={styles.sprintZapPillText}>WAR ROOM ACTIVE</Text>
                </View>
                <View style={styles.sprintTargetPill}>
                  <Sparkles size={11} color="#fca5a5" style={{ marginRight: 4 }} />
                  <Text style={styles.sprintTargetText}>Target: Oct 1, 2026</Text>
                </View>
              </View>
              <Text style={[styles.sprintHeroTitle, { color: colors.textPrimary }]}>
                11-Day Sprint Command Center — 100 Mission-Critical Deliverables
              </Text>
              <Text style={[styles.sprintHeroSub, { color: colors.textSecondary }]}>
                Live multi-founder blueprint & progress tracker across Tech, Academics, Content & Sales leads.
              </Text>
            </View>
            <View style={styles.sprintHeroRight}>
              <View style={styles.sprintEnterBtn}>
                <Text style={styles.sprintEnterBtnText}>Open Cockpit</Text>
                <ArrowRight size={14} color="#ffffff" style={{ marginLeft: 6 }} />
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <View style={[styles.financialFilters, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.78)' }]}>
          <View style={styles.financialFilterGroup}>
            <Text style={[styles.financialFilterLabel, { color: colors.textSecondary }]}>Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financialFilterScroll}>
              {(['THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'ALL'] as founderDb.CollectionPeriodFilter[]).map((period) => <Pressable key={period} onPress={() => setFinancialPeriod(period)} style={[styles.financialFilterChip, { borderColor: financialPeriod === period ? '#7C6FFF' : colors.border, backgroundColor: financialPeriod === period ? 'rgba(124,111,255,0.14)' : 'transparent' }]}><Text style={{ color: financialPeriod === period ? '#7C6FFF' : colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{period.replace('_', ' ')}</Text></Pressable>)}
            </ScrollView>
          </View>
          <View style={styles.financialFilterGroup}>
            <Text style={[styles.financialFilterLabel, { color: colors.textSecondary }]}>Business unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.financialFilterScroll}>
              {[{ id: 'ALL', name: 'All units' }, ...financialUnits].map((unit) => <Pressable key={unit.id} onPress={() => setFinancialUnitId(unit.id)} style={[styles.financialFilterChip, { borderColor: financialUnitId === unit.id ? '#00D4AD' : colors.border, backgroundColor: financialUnitId === unit.id ? 'rgba(0,212,173,0.12)' : 'transparent' }]}><Text style={{ color: financialUnitId === unit.id ? '#00A88A' : colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{unit.name}</Text></Pressable>)}
            </ScrollView>
          </View>
        </View>

        {/* - LOADING - */}
        {loading && !refreshing ? (
          <View style={styles.loader}>
            <View style={styles.loaderRing}>
              <ActivityIndicator color="#7C6FFF" size="large" />
            </View>
            <Text style={[styles.loaderTxt, { color: colors.textSecondary }]}>
              Syncing metrics…
            </Text>
          </View>
        ) : (
          <>
            {/* - CASH FINANCIALS - */}
            {financialSummary ? <FinancialSummaryGrid summary={financialSummary} colors={colors} isDark={isDark} /> : <View style={styles.summaryLoading}><ActivityIndicator color="#7C6FFF" /><Text style={[styles.summaryLoadingText, { color: colors.textSecondary }]}>Syncing financial summary…</Text></View>}

            {/* Top paying unit - full-width stat pill */}
            <Animated.View entering={FadeInDown.delay(240).springify()}>
              <View style={[styles.topUnitCard, { borderColor: '#7C6FFF33' }]}>
                <LinearGradient
                  colors={['#7C6FFF18', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.topUnitIconBox, { backgroundColor: '#7C6FFF22' }]}>
                  <Briefcase size={18} color="#7C6FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topUnitLbl, { color: colors.textSecondary }]}>Top paying unit</Text>
                  <Text style={[styles.topUnitVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {m.topPayingUnit}
                  </Text>
                </View>
                <TrendingUp size={16} color="#00D4AD" />
              </View>
            </Animated.View>

            {/* - COLLECTIONS BY CATEGORY - */}
            {m.collectionsByCategory.length > 0 && (
              <>
                <PremiumSectionTitle
                  title="Collections by category"
                  accent="#38C8F4"
                  icon={<Wallet size={14} color="#38C8F4" />}
                  colors={colors}
                />
                <CategoryGrid
                  items={m.collectionsByCategory}
                  colors={colors}
                  isDark={isDark}
                />
              </>
            )}

            {/* - CRM PROJECTIONS - */}
            <PremiumSectionTitle
              title="CRM projections (enquiries)"
              accent="#FFB020"
              icon={<Target size={14} color="#FFB020" />}
              colors={colors}
            />
            <View style={[styles.kpiGrid, IS_WEB && styles.kpiGridWeb]}>
              <KpiTile label="Revenue (month)" value={founderDb.formatInr(m.revenueThisMonth)} gradient={founderGradients.success} delay={60} icon={<Wallet size={16} color="#FFF" />} sparklineData={incomeSparkline} />
              <KpiTile label="Expense (ROI view)" value={founderDb.formatInr(m.expenseThisMonthRoi)} gradient={founderGradients.danger} delay={90} icon={<TrendingDown size={16} color="#FFF" />} sparklineData={expenseSparkline} />
              <KpiTile label="Net profit (projected)" value={founderDb.formatInr(m.netProfitRoi)} gradient={m.netProfitRoi >= 0 ? founderGradients.primary : founderGradients.danger} delay={120} icon={<Activity size={16} color="#FFF" />} />
              <KpiTile label="Conversion %" value={`${m.conversionRate.toFixed(1)}%`} gradient={founderGradients.info} delay={150} icon={<Target size={16} color="#FFF" />} />
              <KpiTile label="Cost per lead" value={founderDb.formatInr(m.costPerLead, m.costPerLead % 1 === 0 ? 0 : 2)} gradient={founderGradients.warning} delay={180} icon={<Users size={16} color="#FFF" />} sparklineData={enquirySparkline} />
            </View>

            {/* - EXPENSE OVERVIEW - */}
            <PremiumSectionTitle
              title="Expense overview"
              accent="#FF6B7A"
              icon={<Receipt size={14} color="#FF6B7A" />}
              colors={colors}
            />
            <View style={[styles.kpiGrid, IS_WEB && styles.kpiGridWeb]}>
              <KpiTile label="Approved (month)" value={founderDb.formatInr(m.totalApprovedThisMonth)} gradient={founderGradients.success} delay={40} icon={<CheckSquare size={16} color="#FFF" />} />
              <KpiTile label="Pending amount" value={founderDb.formatInr(m.pendingTotal)} gradient={founderGradients.warning} delay={70} icon={<Receipt size={16} color="#FFF" />} />
              <KpiTile label="Approved count" value={m.approvedCount.toLocaleString('en-IN')} gradient={founderGradients.info} delay={100} icon={<Briefcase size={16} color="#FFF" />} />
              <KpiTile label="Rejected count" value={m.rejectedCount.toLocaleString('en-IN')} gradient={founderGradients.danger} delay={130} icon={<Building2 size={16} color="#FFF" />} />
            </View>

            {/* - ENQUIRY PIPELINE (Funnel) - */}
            <PremiumSectionTitle
              title="Enquiry pipeline"
              accent="#38C8F4"
              icon={<MessageSquare size={14} color="#38C8F4" />}
              colors={colors}
            />
            <PipelineFunnel
              steps={[
                { label: 'New today', value: m.newEnquiriesToday, accent: '#7C6FFF', icon: <Sparkles size={16} color="#7C6FFF" /> },
                { label: 'Total (month)', value: m.totalEnquiriesMonth, accent: '#38C8F4', icon: <Users size={16} color="#38C8F4" /> },
                { label: 'Unassigned', value: m.unassignedEnquiries, accent: '#FFB020', icon: <Target size={16} color="#FFB020" /> },
              ]}
              colors={colors}
              isDark={isDark}
            />

            {/* - DETAILED BREAKDOWNS (side-by-side on desktop) - */}
            <PremiumSectionTitle
              title="Detailed breakdowns"
              accent="#A78BFA"
              icon={<BarChart2 size={14} color="#A78BFA" />}
              colors={colors}
            />
            <View style={[styles.breakdownGrid, IS_WEB && isDesktop && styles.breakdownGridDesktop]}>
              <View style={IS_WEB && isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
                <BreakdownList
                  title="Expense by category"
                  items={m.expenseCategoryBreakdown.map((x) => ({ label: x.category, value: x.amount }))}
                  type="currency"
                  accent="#FF6B7A"
                  colors={{ textPrimary: colors.textPrimary, textSecondary: colors.textSecondary, border: colors.border }}
                />
              </View>
              <View style={IS_WEB && isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
                <BreakdownList
                  title="Leads by website"
                  items={m.enquiriesByWebsite.map((x) => ({ label: x.website, value: x.count }))}
                  type="count"
                  accent="#38C8F4"
                  colors={{ textPrimary: colors.textPrimary, textSecondary: colors.textSecondary, border: colors.border }}
                />
              </View>
            </View>
            <View style={{ height: 12 }} />
            <BreakdownList
              title="Leads by category"
              items={m.enquiriesByCategory.map((x) => ({ label: x.category, value: x.count }))}
              type="count"
              accent="#00D4AD"
              colors={{ textPrimary: colors.textPrimary, textSecondary: colors.textSecondary, border: colors.border }}
            />

            {/* - REVENUE VS EXPENSE CHART - */}
            <PremiumSectionTitle
              title="Revenue vs expense"
              accent="#7C6FFF"
              icon={<Activity size={14} color="#7C6FFF" />}
              colors={colors}
            />
            {/* Chart summary line */}
            <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.chartSummaryRow}>
              <View style={styles.chartSummaryItem}>
                <View style={[styles.chartSummaryDot, { backgroundColor: '#00D4AD' }]} />
                <Text style={[styles.chartSummaryLbl, { color: colors.textSecondary }]}>Total Income</Text>
                <Text style={[styles.chartSummaryVal, { color: colors.textPrimary }]}>{founderDb.formatInr(totalIncome, 0)}</Text>
              </View>
              <View style={[styles.chartSummarySep, { backgroundColor: colors.border }]} />
              <View style={styles.chartSummaryItem}>
                <View style={[styles.chartSummaryDot, { backgroundColor: '#FF6B7A' }]} />
                <Text style={[styles.chartSummaryLbl, { color: colors.textSecondary }]}>Total Expense</Text>
                <Text style={[styles.chartSummaryVal, { color: colors.textPrimary }]}>{founderDb.formatInr(totalExpense, 0)}</Text>
              </View>
              <View style={[styles.chartSummarySep, { backgroundColor: colors.border }]} />
              <View style={styles.chartSummaryItem}>
                <View style={[styles.chartSummaryDot, { backgroundColor: Number(chartMarginPct) >= 0 ? '#00D4AD' : '#FF6B7A' }]} />
                <Text style={[styles.chartSummaryLbl, { color: colors.textSecondary }]}>Margin</Text>
                <Text style={[styles.chartSummaryVal, { color: Number(chartMarginPct) >= 0 ? '#00D4AD' : '#FF6B7A' }]}>{chartMarginPct}%</Text>
              </View>
            </Animated.View>
            <PremiumBarChart
              chartKeys={chartKeys}
              incomeByKey={incomeByKey}
              expenseByKey={expenseByKey}
              maxTrend={maxTrend}
              colors={colors}
            />

            {/* - CLOSED DEALS TREND - */}
            {closedRows.length > 0 && (
              <>
                <PremiumSectionTitle
                  title="Closed deals trend"
                  accent="#00D4AD"
                  icon={<TrendingUp size={14} color="#00D4AD" />}
                  colors={colors}
                />
                <ClosedDealsTrend rows={closedRows} colors={colors} />
              </>
            )}

            {/* - NAVIGATION (Icon-forward grid) - */}
            <PremiumSectionTitle
              title="Quick navigation"
              accent="#7C6FFF"
              icon={<LayoutGrid size={14} color="#7C6FFF" />}
              colors={colors}
            />
            <View style={[styles.navList, IS_WEB && styles.navListWeb]}>
              {navItems.map((item, i) => (
                <PremiumNavCard
                  key={item.route}
                  item={item as any}
                  index={i}
                  colors={colors}
                  isDark={isDark}
                  fullWidth={!IS_WEB}
                />
              ))}
            </View>

            {/* - PREMIUM FOOTER - */}
            <Animated.View entering={FadeInDown.delay(600)}>
              <View style={[styles.footerMark, {
                borderColor: isDark ? 'rgba(124,111,255,0.15)' : 'rgba(124,111,255,0.1)',
                backgroundColor: isDark ? 'rgba(124,111,255,0.04)' : 'rgba(124,111,255,0.03)',
              }]}>
                <LinearGradient
                  colors={['#7C6FFF12', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Zap size={12} color="#7C6FFF" />
                <Text style={[styles.footerTxt, { color: colors.textSecondary }]}>
                  Powered by NexSyrus
                </Text>
                <View style={[styles.footerSep, { backgroundColor: colors.border }]} />
                <Text style={[styles.footerTxt, { color: colors.textSecondary, opacity: 0.6 }]}>
                  v1.0 · {new Date().getFullYear()}
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

// - styles -

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 56,
  },
  contentWeb: {
    maxWidth: 1200,
    alignSelf: 'center' as any,
    width: '100%' as any,
    paddingHorizontal: 32,
  },
  financialFilters: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12, marginBottom: 18 },
  financialFilterGroup: { gap: 7 },
  financialFilterLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' as any },
  financialFilterScroll: { gap: 8, paddingRight: 8 },
  financialFilterChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 },
  financialGrid: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18 },
  financialGridHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  financialGridTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.35 },
  financialGridSub: { fontSize: 11, lineHeight: 16, marginTop: 3, maxWidth: 440 },
  financialScope: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  financialCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  financialCard: { flexGrow: 1, flexBasis: '44%', minWidth: 138, borderWidth: 1, borderRadius: 14, padding: 12 },
  financialCardLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  financialCardValue: { fontSize: 17, fontWeight: '900', letterSpacing: -0.35, marginTop: 5 },
  summaryLoading: { minHeight: 164, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 },
  summaryLoadingText: { fontSize: 12, fontWeight: '700' },

  // - header -
  header: {
    marginBottom: 24,
    overflow: 'hidden' as any,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' as any },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginTop: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dateText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  sub: { marginTop: 6, fontSize: 13, fontWeight: '500' },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rolePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  rolePillText: { color: '#FFF', fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },

  // - quick actions -
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // - gradient divider -
  gradDivider: { height: 1, marginTop: 14, marginBottom: 2, borderRadius: 1 },

  // - section titles -
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 14,
    gap: 8,
  },
  sectionAccentBar: { width: 3, height: 18, borderRadius: 2 },
  sectionIcon: {},
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' as any },

  // - loader -
  loader: { paddingVertical: 56, alignItems: 'center', gap: 16 },
  loaderRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#7C6FFF33',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C6FFF0A',
  },
  loaderTxt: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

  // - kpi grid -
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpiGridWeb: { gap: 12 },

  // - top unit card -
  topUnitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden' as any,
  },
  topUnitIconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topUnitLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' as any },
  topUnitVal: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  // - pipeline funnel -
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 0,
  },
  pipelineStep: {
    flex: 1,
  },
  pipelineCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden' as any,
    position: 'relative' as any,
  },
  pipelineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pipelineValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pipelineLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase' as any,
    marginTop: 4,
  },
  pipelineAccentLine: {
    position: 'absolute' as any,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    opacity: 0.5,
  },
  pipelineArrow: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // - rank badges -
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rankText: {
    fontSize: 9,
    fontWeight: '900',
  },

  // - category grid -
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  catChip: {
    width: IS_WEB ? '48%' as any : (width - 46) / 2,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden' as any,
    position: 'relative' as any,
  },
  catDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  catChipLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any, letterSpacing: 0.6 },
  catChipAmt: { fontSize: 17, fontWeight: '900', marginTop: 4, letterSpacing: -0.3 },
  catProgressTrack: { height: 3, borderRadius: 2, marginTop: 10, overflow: 'hidden' as any },
  catProgressFill: { height: '100%' as any, borderRadius: 2 },

  // - stat row (kept for compatibility) -
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  statRowWeb: { gap: 16 },
  statPill: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
    overflow: 'hidden' as any,
  },
  statPillIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statPillVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  statPillLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' as any, marginTop: 4 },

  // - breakdown -
  breakdownGrid: { gap: 12 },
  breakdownGridDesktop: { flexDirection: 'row', gap: 16 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  breakdownAccentDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  breakdownTotal: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  breakdownEmptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  breakdownEmpty: { fontSize: 13, textAlign: 'center' },
  breakdownRow: { marginBottom: 12 },
  breakdownRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  breakdownRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  breakdownRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownLbl: { fontSize: 13, fontWeight: '600' },
  breakdownPct: { fontSize: 11, fontWeight: '700' },
  breakdownVal: { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' as any },
  progressFill: { height: '100%' as any, borderRadius: 3 },

  // - chart summary -
  chartSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
    gap: 8,
  },
  chartSummaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartSummaryDot: { width: 6, height: 6, borderRadius: 3 },
  chartSummaryLbl: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  chartSummaryVal: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  chartSummarySep: { width: 1, height: 16, borderRadius: 1, opacity: 0.3 },

  // - chart -
  chartContainer: { position: 'relative' as any, paddingBottom: 8 },
  gridLine: { position: 'absolute' as any, left: 0, right: 0, height: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' as any },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  chartCol: { alignItems: 'center', flex: 1 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barWrapper: { position: 'relative' as any, alignItems: 'center' },
  bar: { width: 10, borderRadius: 5, overflow: 'hidden' as any },
  barGlowCap: { position: 'absolute' as any, width: 10, height: 3, borderRadius: 2, opacity: 0.9 },
  chartLbl: { marginTop: 8, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendPill: { width: 20, height: 4, borderRadius: 2 },

  // - closed deals -
  closedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  closedTitle: { fontSize: 13, fontWeight: '700' },
  closedSparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 72 },
  closedBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 72 },
  closedBarFill: { width: '100%' as any, borderRadius: 4, overflow: 'hidden' as any },
  closedBarLbl: { fontSize: 9, fontWeight: '700', marginTop: 5, letterSpacing: 0.2 },
  closedBarVal: { position: 'absolute' as any, top: 0, fontSize: 11, fontWeight: '800' },

  // - nav -
  navList: { gap: 10, marginBottom: 22 },
  navListWeb: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden' as any,
    gap: 12,
  },
  navCardOuter: {
    flexDirection: 'row' as any,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden' as any,
  },
  navStripChild: { width: 4, borderRadius: 2 },
  navContent: {
    flex: 1,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: 12,
    padding: 14,
  },
  navAccentStrip: { position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  navIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
  navSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  navChevronBox: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // - footer -
  footerMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center' as any,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden' as any,
  },
  footerSep: { width: 1, height: 12, borderRadius: 1, opacity: 0.3 },
  footerDot: { width: 6, height: 6, borderRadius: 3 },
  footerTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // - sprint hero banner -
  sprintHeroBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row' as any,
    justifyContent: 'space-between' as any,
    alignItems: 'center' as any,
    flexWrap: 'wrap' as any,
    gap: 12,
    overflow: 'hidden' as any,
    position: 'relative' as any,
  },
  sprintHeroLeft: {
    flex: 1,
    minWidth: 260,
  },
  sprintHeroBadgeRow: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap' as any,
  },
  sprintZapPill: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 4,
  },
  sprintZapPillText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sprintTargetPill: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sprintTargetText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: '700',
  },
  sprintHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sprintHeroSub: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  sprintHeroRight: {
    alignItems: 'flex-end' as any,
  },
  sprintEnterBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
  },
  sprintEnterBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
