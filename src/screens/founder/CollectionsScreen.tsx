import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { safePressHandler } from '../../utils/safePressHandler';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import { useCollections } from '../../hooks/useCollections';
import * as founderDb from '../../services/founderSupabase';
import type { CollectionPaymentMode, CollectionRow } from '../../types/founder';
import type { CollectionPeriodFilter, CollectionStatusFilter } from '../../services/founderSupabase';
import { ConsoleAmbientBackground, bottomTabPad } from './founderUi';
import type { ThemeColors } from '../../constants/theme';
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  TrendingUp,
  Calendar,
  Mailbox,
  IndianRupee,
  Wallet,
  Building2,
  SlidersHorizontal,
  Filter as FilterIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ClayView, PressScale, clayTokens } from '../../components/ui/ClayPrimitives';

// ─── Breakpoints ──────────────────────────────────────────────────────────────

const BP = { XS: 360, SM: 520, MD: 768, LG: 1024 } as const;

function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    width,
    isXS: width < BP.XS,
    isSM: width < BP.SM,
    isMD: width < BP.MD,
    isLG: width >= BP.LG,
  };
}

// ─── Typography Ladder ────────────────────────────────────────────────────────

const TYPE = {
  display: { size: 21, weight: '800' as const, tracking: -0.4 },
  title: { size: 15, weight: '700' as const, tracking: -0.2 },
  body: { size: 13, weight: '600' as const, tracking: 0 },
  caption: { size: 11, weight: '700' as const, tracking: 0.8 },
};

// ─── Brand Accents ────────────────────────────────────────────────────────────

const ACCENT = {
  teal: { d: '#14B8A6', l: '#0D9488', bg: 'rgba(20,184,166,0.12)' },
  cyan: { d: '#06B6D4', l: '#0891B2', bg: 'rgba(6,182,212,0.12)' },
  amber: { d: '#FBB040', l: '#D97706', bg: 'rgba(251,176,64,0.12)' },
  rose: { d: '#FB7185', l: '#E11D48', bg: 'rgba(251,113,133,0.12)' },
  slate: { d: '#94A3B8', l: '#64748B', bg: 'rgba(148,163,184,0.10)' },
} as const;
type AccentKey = keyof typeof ACCENT;
const a = (t: AccentKey, isDark: boolean) => (isDark ? ACCENT[t].d : ACCENT[t].l);
const aBg = (t: AccentKey) => ACCENT[t].bg;

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTS: { key: CollectionPeriodFilter; label: string; icon: string; short: string }[] = [
  { key: 'THIS_MONTH', label: 'This month', icon: '📅', short: 'Month' },
  { key: 'LAST_MONTH', label: 'Last month', icon: '🕐', short: 'Last' },
  { key: 'THIS_YEAR', label: 'This year', icon: '📆', short: 'Year' },
  { key: 'ALL', label: 'All time', icon: '∞', short: 'All' },
];

const STATUS_OPTS: { key: CollectionStatusFilter; label: string; accent: AccentKey }[] = [
  { key: 'ALL', label: 'All', accent: 'slate' },
  { key: 'PENDING', label: 'Pending', accent: 'amber' },
  { key: 'APPROVED', label: 'Approved', accent: 'teal' },
];

const PAYMENT: { mode: CollectionPaymentMode; emoji: string; label: string }[] = [
  { mode: 'CASH', emoji: '💵', label: 'Cash' },
  { mode: 'UPI', emoji: '📱', label: 'UPI' },
  { mode: 'BANK', emoji: '🏦', label: 'Bank' },
  { mode: 'CHEQUE', emoji: '📄', label: 'Cheque' },
  { mode: 'OTHER', emoji: '⚡', label: 'Other' },
];

const STATUS_META: Record<string, AccentKey> = {
  PENDING: 'amber',
  APPROVED: 'teal',
  REJECTED: 'rose',
};

// ─── Animated Number ──────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 600) {
  const animated = useRef(new Animated.Value(target)).current;
  const [display, setDisplay] = useState(target);
  const lastTarget = useRef(target);

  useEffect(() => {
    if (lastTarget.current === target) return;
    Animated.timing(animated, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = animated.addListener(({ value }) => setDisplay(value));
    lastTarget.current = target;
    return () => animated.removeListener(id);
  }, [target, duration, animated]);

  return display;
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function CollectionCardSkeleton({ delay, isDark, colors }: { delay: number; isDark: boolean; colors: ThemeColors }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true, delay }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);

  const blockColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)';

  return (
    <ClayView isDark={isDark} color={colors.card} radius={24} style={{ marginBottom: 12, padding: 20 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Animated.View style={{ opacity, width: 44, height: 44, borderRadius: 14, backgroundColor: blockColor }} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={{ opacity, width: '60%', height: 16, borderRadius: 8, backgroundColor: blockColor }} />
          <Animated.View style={{ opacity, width: '40%', height: 12, borderRadius: 6, backgroundColor: blockColor }} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Animated.View style={{ opacity, width: 80, height: 20, borderRadius: 10, backgroundColor: blockColor }} />
          <Animated.View style={{ opacity, width: 64, height: 22, borderRadius: 11, backgroundColor: blockColor }} />
        </View>
      </View>
    </ClayView>
  );
}

// ─── Animated Collection Card ─────────────────────────────────────────────────

interface CollectionCardProps {
  r: CollectionRow;
  index: number;
  canApprove: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  colors: ThemeColors;
  isDark: boolean;
  isSM: boolean;
  isXS: boolean;
}

function CollectionCard({ r, index, canApprove, onApprove, onReject, colors, isDark, isSM, isXS }: CollectionCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, delay: index * 55, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, delay: index * 55, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 55, useNativeDriver: true, tension: 90, friction: 8 }),
    ]).start();
  }, [index]);

  const accentKey = STATUS_META[r.status] ?? 'amber';
  const accentColor = a(accentKey, isDark);
  const unitName = r.business_unit_name || r.business_units?.name || r.business_unit_id.slice(0, 8);
  const payInfo = PAYMENT.find((p) => p.mode === r.payment_mode);

  const cardPad = isXS ? 10 : isSM ? 12 : 16;

  const triggerOptimistic = (cb: () => void) => {
    Animated.timing(fadeOutAnim, { toValue: 0.4, duration: 200, useNativeDriver: true }).start();
    cb();
  };

  return (
    <Animated.View
      style={{
        opacity: Animated.multiply(fadeAnim, fadeOutAnim),
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        marginBottom: 10,
      }}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border,
            shadowColor: 'rgba(15,23,42,1)',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 24,
            elevation: isDark ? 0 : 2,
          },
        ]}
      >
        {/* Top inner highlight (dark theme depth) */}
        {isDark && (
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'transparent']}
            style={styles.cardTopGloss}
            pointerEvents="none"
          />
        )}

        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

        <View style={[styles.cardInner, { padding: cardPad }]}>
          {/* Line 1: unit name + amount */}
          <View style={styles.cardLine1}>
            <Text
              style={[
                styles.cardUnit,
                { color: colors.textPrimary, fontSize: isSM ? 14 : 15 },
              ]}
              numberOfLines={1}
            >
              {unitName}
            </Text>
            <Text style={[styles.cardAmount, { color: colors.textPrimary, fontSize: isSM ? 16 : 17 }]}>
              {founderDb.formatInr(Number(r.amount), 2)}
            </Text>
          </View>

          {/* Line 2: meta + status */}
          <View style={styles.cardLine2}>
            <View style={styles.cardMetaWrap}>
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : aBg('teal') },
                ]}
              >
                <Text style={[styles.metaPillTxt, { color: colors.textSecondary }]} numberOfLines={1}>
                  {payInfo?.emoji ?? '💳'} {r.payment_mode}
                </Text>
              </View>
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.glassBackground },
                ]}
              >
                <Calendar color={colors.textSecondary} size={10} />
                <Text style={[styles.metaPillTxt, { color: colors.textSecondary, marginLeft: 4 }]}>
                  {r.month}/{r.year}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: aBg(accentKey),
                  borderColor: `${accentColor}40`,
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
              {!isXS && (
                <Text style={[styles.statusTxt, { color: accentColor }]} numberOfLines={1}>
                  {r.status}
                </Text>
              )}
            </View>
          </View>

          {/* Actions */}
          {canApprove && r.status === 'PENDING' && (
            <View style={styles.cardActions}>
              <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} />
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(20,184,166,0.10)' : aBg('teal'),
                      borderColor: `${a('teal', isDark)}40`,
                    },
                    ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
                  ]}
                  onPress={safePressHandler(() => triggerOptimistic(() => onApprove(r.id)))}
                >
                  <Check color={a('teal', isDark)} size={15} />
                  <Text style={[styles.actionBtnTxt, { color: a('teal', isDark) }]}>Approve</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(251,113,133,0.10)' : aBg('rose'),
                      borderColor: `${a('rose', isDark)}40`,
                    },
                    ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
                  ]}
                  onPress={() => onReject(r.id)}
                >
                  <X color={a('rose', isDark)} size={15} />
                  <Text style={[styles.actionBtnTxt, { color: a('rose', isDark) }]}>Reject</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Period Chip ──────────────────────────────────────────────────────────────

function PeriodChip({
  opt,
  selected,
  onPress,
  isDark,
  colors,
  wrapLayout,
  short,
}: {
  opt: (typeof PERIOD_OPTS)[0];
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: ThemeColors;
  wrapLayout?: boolean;
  short?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
      ]).start();
    }
  }, [selected]);

  const label = short ? opt.short : opt.label;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          !wrapLayout && { marginRight: 8 },
          ...pressableWebStyles(pressed, { pressedOpacity: 0.7 }),
        ]}
      >
        {selected ? (
          <LinearGradient
            colors={['#14B8A6', '#0891B2', '#0EA5E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chipSelected}
          >
            <Text style={styles.chipEmoji}>{opt.icon}</Text>
            <Text style={styles.chipTxtSelected}>{label}</Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.chipUnselected,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
              },
            ]}
          >
            <Text style={[styles.chipEmojiSm, { opacity: 0.85 }]}>{opt.icon}</Text>
            <Text style={[styles.chipTxtUnselected, { color: isDark ? 'rgba(255,255,255,0.72)' : colors.textPrimary }]}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Status Tab ───────────────────────────────────────────────────────────────

function StatusTab({
  opt,
  selected,
  onPress,
  isDark,
  colors,
  compact,
  count,
  showCount,
  isXS,
}: {
  opt: (typeof STATUS_OPTS)[0];
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: ThemeColors;
  compact?: boolean;
  count: number;
  showCount: boolean;
  isXS: boolean;
}) {
  const accentColor = a(opt.accent, isDark);
  const inactiveColor = isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
  const inactiveBorder = isDark ? 'rgba(255,255,255,0.10)' : colors.border;
  const inactiveBg = isDark ? 'rgba(255,255,255,0.04)' : colors.glassBackground;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusTab,
        compact && styles.statusTabMobile,
        selected
          ? { backgroundColor: aBg(opt.accent), borderColor: `${accentColor}55` }
          : { backgroundColor: inactiveBg, borderColor: inactiveBorder },
        ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
      ]}
    >
      <Text
        style={[
          styles.statusTabTxt,
          compact && styles.statusTabTxtMobile,
          { color: selected ? accentColor : inactiveColor },
        ]}
        numberOfLines={1}
      >
        {selected || !isXS ? opt.label : ''}
        {showCount && (selected ? ` · ${count}` : isXS ? `${count}` : ` ${count}`)}
      </Text>
    </Pressable>
  );
}

// ─── Unit Tab ─────────────────────────────────────────────────────────────────

function UnitTab({
  opt,
  selected,
  onPress,
  isDark,
  colors,
}: {
  opt: { id: string; name: string };
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: ThemeColors;
}) {
  const accentColor = a('cyan', isDark);
  const inactiveColor = isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
  const inactiveBorder = isDark ? 'rgba(255,255,255,0.10)' : colors.border;
  const inactiveBg = isDark ? 'rgba(255,255,255,0.04)' : colors.glassBackground;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderRadius: 12,
          borderWidth: 1,
          marginRight: 8,
        },
        selected
          ? { backgroundColor: aBg('cyan'), borderColor: accentColor }
          : { backgroundColor: inactiveBg, borderColor: inactiveBorder },
        ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
      ]}
    >
      <Text style={[styles.statusTabTxt, { color: selected ? accentColor : inactiveColor }]}>{opt.name}</Text>
    </Pressable>
  );
}

// ─── Payment Mode Selector ────────────────────────────────────────────────────

function PayModeSelector({
  value,
  onChange,
}: {
  value: CollectionPaymentMode;
  onChange: (v: CollectionPaymentMode) => void;
}) {
  const { isDark, colors } = useTheme();
  const { width: payW } = useWindowDimensions();
  const payChipMin = Math.max(56, (payW - 72) / 5);
  const tealAccent = a('teal', isDark);

  return (
    <View style={styles.payGrid}>
      {PAYMENT.map((p) => {
        const sel = value === p.mode;
        return (
          <Pressable
            key={p.mode}
            onPress={() => onChange(p.mode)}
            style={({ pressed }) => [
              styles.payChip,
              { minWidth: payChipMin },
              sel
                ? { backgroundColor: aBg('teal'), borderColor: tealAccent }
                : {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.glassBackground,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  },
              ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
            ]}
          >
            {sel && (
              <LinearGradient
                colors={isDark ? ['rgba(20,184,166,0.10)', 'transparent'] : ['rgba(20,184,166,0.05)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={styles.payEmoji}>{p.emoji}</Text>
            <Text style={[styles.payLabel, { color: sel ? tealAccent : isDark ? 'rgba(255,255,255,0.65)' : colors.textSecondary }]}>
              {p.label}
            </Text>
            {sel && <View style={[styles.payActiveDot, { backgroundColor: tealAccent }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Summary Banner ───────────────────────────────────────────────────────────

const SummaryBanner = React.memo(function SummaryBanner({ total, rows, isLG, isMD, isSM, isXS }: any) {
  const { colors, isDark } = useTheme();
  const { pending, approved, totalAmt } = useMemo(() => {
    const p = rows.filter((r: any) => r.status === 'PENDING').length;
    const ap = rows.filter((r: any) => r.status === 'APPROVED').length;
    const ta = rows.reduce((s: number, r: any) => s + Number(r.amount), 0);
    return { pending: p, approved: ap, totalAmt: ta };
  }, [rows]);

  const animatedTotal = useAnimatedNumber(totalAmt);
  const formattedTotal = founderDb.formatInr(animatedTotal, 0);

  const tealAccent = a('teal', isDark);
  const amberAccent = a('amber', isDark);

  if (isSM) {
    return (
      <ClayView isDark={isDark} color={colors.surface} radius={20} style={{ padding: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Total</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>{formattedTotal}</Text>
          </View>
          <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Pending</Text>
            <Text style={{ color: amberAccent, fontSize: 15, fontWeight: '800' }}>{pending}</Text>
          </View>
          <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Approved</Text>
            <Text style={{ color: tealAccent, fontSize: 15, fontWeight: '800' }}>{approved}</Text>
          </View>
        </View>
      </ClayView>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
      <ClayView isDark={isDark} color={aBg('teal')} radius={clayTokens.radius.card} style={{ flex: 1.5, padding: 16 }}>
        <TrendingUp color={tealAccent} size={18} />
        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 8 }}>{formattedTotal}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Page Total</Text>
      </ClayView>
      <ClayView isDark={isDark} color={aBg('amber')} radius={clayTokens.radius.card} style={{ flex: 1, padding: 16 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: amberAccent, marginBottom: 4 }} />
        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{pending}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Pending</Text>
      </ClayView>
      <ClayView isDark={isDark} color={aBg('teal')} radius={clayTokens.radius.card} style={{ flex: 1, padding: 16 }}>
        <Check color={tealAccent} size={18} />
        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 8 }}>{approved}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Approved</Text>
      </ClayView>
    </View>
  );
});

// ─── Filter Section Header ────────────────────────────────────────────────────

function FilterSectionAccent({
  label,
  colors,
  isDark,
  marginTop = 0,
  compact,
}: {
  label: string;
  colors: ThemeColors;
  isDark: boolean;
  marginTop?: number;
  compact?: boolean;
}) {
  return (
    <View style={[styles.filterSectionHead, { marginTop }, compact && styles.filterSectionHeadCompact]}>
      <LinearGradient
        colors={['#14B8A6', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.filterAccentBar, compact && styles.filterAccentBarCompact]}
      />
      <Text
        style={[
          styles.filterSectionTitle,
          compact && styles.filterSectionTitleMobile,
          { color: isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Hero CTA ─────────────────────────────────────────────────────────────────

function NewCollectionHero({
  onPress,
  colors,
  isDark,
  compact,
}: {
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 0.92 })]}>
      <View
        style={[
          styles.heroOuter,
          compact && styles.heroOuterCompact,
          { borderColor: isDark ? 'rgba(20,184,166,0.4)' : colors.border },
          !isDark && { shadowOpacity: 0.1 },
        ]}
      >
        <LinearGradient
          colors={['rgba(20,184,166,0.2)', 'rgba(14,165,233,0.08)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={['#0D9488', '#0EA5E9', '#38BDF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroInner, compact && styles.heroInnerCompact]}
        >
          <View style={styles.heroGloss} />
          <View style={[styles.heroLeft, compact && styles.heroLeftCompact]}>
            <View style={[styles.heroIconBox, compact && styles.heroIconBoxCompact]}>
              <Plus color="#fff" size={compact ? 18 : 22} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>New collection</Text>
              {!compact && (
                <Text style={styles.heroSub} numberOfLines={2}>
                  Record income by unit, period & payment mode
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.heroChevron, compact && styles.heroChevronCompact]}>
            <ChevronRight color="rgba(255,255,255,0.9)" size={compact ? 16 : 20} strokeWidth={2.5} />
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const CollectionsEmptyState = React.memo(function CollectionsEmptyState({ onAdd, onClearFilters, colors, isDark, compact, isXS, filterActive }: any) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <ClayView isDark={isDark} color={isDark ? 'rgba(255,255,255,0.02)' : colors.surface} radius={32} style={{ width: '100%', maxWidth: 400, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Mailbox color={isDark ? '#5EEAD4' : '#0F766E'} size={32} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          {filterActive ? 'No matches' : 'No collections yet'}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
          {filterActive ? 'No records match the current filters. Try clearing them.' : 'Record money received from each business unit.'}
        </Text>
        <PressScale onPress={filterActive ? onClearFilters : onAdd} style={{ width: '100%' }}>
          <View style={{ backgroundColor: a('teal', isDark), paddingVertical: 14, borderRadius: clayTokens.radius.button, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
              {filterActive ? 'Clear filters' : 'Record a collection'}
            </Text>
          </View>
        </PressScale>
      </ClayView>
    </View>
  );
});

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  isDark,
  colors,
  align = 'between',
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  isDark: boolean;
  colors: ThemeColors;
  align?: 'between' | 'end' | 'center';
}) {
  const prevDisabled = page <= 0;
  const nextDisabled = page + 1 >= totalPages;
  const prevScale = useRef(new Animated.Value(1)).current;
  const nextScale = useRef(new Animated.Value(1)).current;

  const press = (anim: Animated.Value, fn: () => void) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
    ]).start();
    fn();
  };

  return (
    <View
      style={[
        styles.paginationRow,
        align === 'end' && { justifyContent: 'flex-end', gap: 12 },
        align === 'center' && { justifyContent: 'center', gap: 12 },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: prevScale }] }}>
        <Pressable
          disabled={prevDisabled}
          onPress={() => press(prevScale, onPrev)}
          style={({ pressed }) => [
            styles.pageArrow,
            {
              opacity: prevDisabled ? 0.25 : 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.glassBackground,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : colors.border,
            },
            ...pressableWebStyles(pressed, { disabled: prevDisabled, pressedOpacity: 0.7 }),
          ]}
        >
          <ChevronLeft color={colors.textPrimary} size={18} />
        </Pressable>
      </Animated.View>

      <View style={styles.pageInfo}>
        <Text style={[styles.pageMain, { color: colors.textPrimary }]}>Page {page + 1}</Text>
        <Text style={[styles.pageSub, { color: colors.textSecondary }]}>of {totalPages}</Text>
      </View>

      <Animated.View style={{ transform: [{ scale: nextScale }] }}>
        <Pressable
          disabled={nextDisabled}
          onPress={() => press(nextScale, onNext)}
          style={({ pressed }) => [
            styles.pageArrow,
            {
              opacity: nextDisabled ? 0.25 : 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.glassBackground,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : colors.border,
            },
            ...pressableWebStyles(pressed, { disabled: nextDisabled, pressedOpacity: 0.7 }),
          ]}
        >
          <ChevronRight color={colors.textPrimary} size={18} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Filter Summary Pill (collapsed mobile filter) ────────────────────────────

function FilterSummaryPill({
  period,
  status,
  unitName,
  onPress,
  isDark,
  colors,
}: {
  period: CollectionPeriodFilter;
  status: CollectionStatusFilter;
  unitName: string;
  onPress: () => void;
  isDark: boolean;
  colors: ThemeColors;
}) {
  const periodLabel = PERIOD_OPTS.find((p) => p.key === period)?.label ?? period;
  const statusLabel = STATUS_OPTS.find((s) => s.key === status)?.label ?? status;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface,
          borderColor: isDark ? 'rgba(20,184,166,0.18)' : colors.border,
        },
        ...pressableWebStyles(pressed, { pressedOpacity: 0.8 }),
      ]}
    >
      <SlidersHorizontal color={a('teal', isDark)} size={14} />
      <Text style={[styles.filterPillTxt, { color: colors.textPrimary }]} numberOfLines={1}>
        {periodLabel} · {statusLabel} · {unitName}
      </Text>
      <ChevronDown color={colors.textSecondary} size={16} />
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CollectionsScreen({ approvalsOnly = false, embedded = false }: { approvalsOnly?: boolean; embedded?: boolean }) {
  const router = useRouter();
  const { isXS, isSM, isMD, isLG } = useResponsive();
  const { colors, isDark } = useTheme();
  const { founder, canApproveReject } = useFounderAuth();
  const {
    rows,
    total,
    page,
    totalPages,
    loading,
    period,
    setPeriod,
    status,
    setStatus,
    unitId: filterUnitId,
    setUnitId: setFilterUnitId,
    setPage,
    refresh,
  } = useCollections(approvalsOnly ? { period: 'ALL', status: 'PENDING' } : undefined);

  useEffect(() => {
    if (approvalsOnly && !canApproveReject) {
      router.replace('/(app)/console/billing?tab=collections' as any);
    }
  }, [approvalsOnly, canApproveReject, router]);

  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [payMode, setPayMode] = useState<CollectionPaymentMode>('UPI');
  const [saving, setSaving] = useState(false);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filter expansion (mobile only)
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await founderDb.listBusinessUnits(true);
        setUnits(list.map((u) => ({ id: u.id, name: u.name })));
        if (list[0] && !unitId) setUnitId(list[0].id);
      } catch {
        setUnits([]);
      }
    })();
  }, []);

  const pressFab = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => setModalOpen(true));
  };

  const submit = async () => {
    if (!founder?.id) {
      Alert.alert(
        'Founder profile required',
        'Add a row in the founders table with your Supabase auth user id to record collections.',
      );
      return;
    }
    if (!unitId) return;
    const amt = parseFloat(amount.replace(/,/g, ''));
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!Number.isFinite(amt) || amt <= 0 || m < 1 || m > 12 || y < 2000) {
      Alert.alert('Validation', 'Check amount, month (1–12), and year.');
      return;
    }
    setSaving(true);
    try {
      await founderDb.createCollection({
        business_unit_id: unitId,
        amount: amt,
        month: m,
        year: y,
        payment_mode: payMode,
        created_by_founder_id: founder.id,
      });
      setModalOpen(false);
      setAmount('');
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add collection');
    } finally {
      setSaving(false);
    }
  };

  const onApprove = useCallback(
    async (id: string) => {
      if (!founder?.id) return;
      try {
        await founderDb.approveCollection(id, founder.id);
        refresh();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Approve failed');
      }
    },
    [founder?.id, refresh],
  );

  const confirmReject = async () => {
    if (!rejectId || !founder?.id || !rejectReason.trim()) return;
    try {
      await founderDb.rejectCollection(rejectId, founder.id, rejectReason.trim());
      setRejectId(null);
      setRejectReason('');
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Reject failed');
    }
  };

  // ─── Status counts for tabs ───
  const statusCounts = useMemo(() => {
    return {
      ALL: rows.length,
      PENDING: rows.filter((r) => r.status === 'PENDING').length,
      APPROVED: rows.filter((r) => r.status === 'APPROVED').length,
    } as Record<CollectionStatusFilter, number>;
  }, [rows]);

  // ─── Filter active detection ───
  const filtersActive =
    period !== 'THIS_MONTH' || status !== 'ALL' || (filterUnitId !== 'ALL' && filterUnitId !== '');

  const clearFilters = () => {
    setPeriod('THIS_MONTH');
    setStatus('ALL');
    setFilterUnitId('ALL');
    setPage(0);
  };

  // ─── Selected unit name for collapsed filter pill ───
  const selectedUnitName = useMemo(() => {
    if (filterUnitId === 'ALL' || !filterUnitId) return 'All units';
    const u = units.find((u) => u.id === filterUnitId);
    return u?.name ?? 'Unit';
  }, [filterUnitId, units]);

  // ─── Decisions per breakpoint ───
  const showHero = !approvalsOnly && !isSM;
  const showFAB = !approvalsOnly && !isLG;
  const paginationAtBottom = isSM;
  const filtersCollapsible = isSM && !approvalsOnly;
  const filtersExpandedActual = !filtersCollapsible || filtersExpanded;

  // ─── Modal style decisions ───
  const modalCentered = !isSM; // isMD or larger → centered card
  const modalAnimation = modalCentered ? 'fade' : 'slide';
  const modalPad = isXS ? 14 : isSM ? 18 : 24;
  const modalTitleSize = isXS ? 18 : 21;
  const sheetHandleMargin = isXS ? 14 : 20;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ─── Header ─── */}
      {!embedded && <Animated.View
        style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        }}
      >
        <ScreenHeader
          title={approvalsOnly ? 'Collection approvals' : 'Collections'}
          subtitle={approvalsOnly ? `Pending queue · ${total} records` : `${total} records`}
          subtitleColor={isDark ? 'rgba(255,255,255,0.65)' : colors.textSecondary}
        />
      </Animated.View>}

      <View style={[styles.root, isSM && styles.rootMobile]}>
        {/* ─── Hero CTA (isMD+ only) ─── */}
        {showHero && (
          <View style={{ marginBottom: 16 }}>
            <NewCollectionHero onPress={() => setModalOpen(true)} colors={colors} isDark={isDark} compact={isMD} />
          </View>
        )}

        {/* ─── Summary Banner ─── */}
        {rows.length > 0 && (
          <SummaryBanner total={total} rows={rows} isLG={isLG} isMD={isMD} isSM={isSM} isXS={isXS} />
        )}

        {/* ─── Filters ─── */}
        {!approvalsOnly && (
          <>
            {filtersCollapsible && !filtersExpanded ? (
              <FilterSummaryPill
                period={period}
                status={status}
                unitName={selectedUnitName}
                onPress={() => setFiltersExpanded(true)}
                isDark={isDark}
                colors={colors}
              />
            ) : (
              <ClayView
    isDark={isDark}
    color={colors.surface}
    radius={24}
    style={[
      { padding: isSM ? 16 : 24, marginBottom: 20 },
      isDark ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}
    ]}
  >

                {/* Collapse button on mobile */}
                {filtersCollapsible && (
                  <Pressable
                    onPress={() => setFiltersExpanded(false)}
                    style={({ pressed }) => [
                      styles.filterCollapseBtn,
                      ...pressableWebStyles(pressed, { pressedOpacity: 0.7 }),
                    ]}
                  >
                    <ChevronDown
                      color={colors.textSecondary}
                      size={16}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  </Pressable>
                )}

                <FilterSectionAccent label="Period" colors={colors} isDark={isDark} compact={isSM} />
                {isSM ? (
                  <View style={styles.periodChipWrap}>
                    {PERIOD_OPTS.map((opt) => (
                      <PeriodChip
                        key={opt.key}
                        opt={opt}
                        selected={period === opt.key}
                        isDark={isDark}
                        colors={colors}
                        wrapLayout
                        short={isXS}
                        onPress={() => {
                          setPeriod(opt.key);
                          setPage(0);
                        }}
                      />
                    ))}
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {PERIOD_OPTS.map((opt) => (
                      <PeriodChip
                        key={opt.key}
                        opt={opt}
                        selected={period === opt.key}
                        isDark={isDark}
                        colors={colors}
                        onPress={() => {
                          setPeriod(opt.key);
                          setPage(0);
                        }}
                      />
                    ))}
                  </ScrollView>
                )}

                <FilterSectionAccent
                  label="Status"
                  colors={colors}
                  isDark={isDark}
                  marginTop={isSM ? 10 : 14}
                  compact={isSM}
                />
                <View style={[styles.statusTabRow, isSM && styles.statusTabRowMobile]}>
                  {STATUS_OPTS.map((opt) => (
                    <StatusTab
                      key={opt.key}
                      opt={opt}
                      selected={status === opt.key}
                      isDark={isDark}
                      colors={colors}
                      compact={isSM}
                      isXS={isXS}
                      count={statusCounts[opt.key]}
                      showCount={rows.length > 0}
                      onPress={() => {
                        setStatus(opt.key);
                        setPage(0);
                      }}
                    />
                  ))}
                </View>

                {units.length > 0 && (
                  <>
                    <FilterSectionAccent
                      label="Business Unit"
                      colors={colors}
                      isDark={isDark}
                      marginTop={isSM ? 10 : 14}
                      compact={isSM}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={isSM}
                      contentContainerStyle={[styles.filterScroll, isSM && styles.filterScrollPadded]}
                    >
                      <UnitTab
                        opt={{ id: 'ALL', name: 'All' }}
                        selected={filterUnitId === 'ALL'}
                        isDark={isDark}
                        colors={colors}
                        onPress={() => {
                          setFilterUnitId('ALL');
                          setPage(0);
                        }}
                      />
                      {units.map((u) => (
                        <UnitTab
                          key={u.id}
                          opt={u}
                          selected={filterUnitId === u.id}
                          isDark={isDark}
                          colors={colors}
                          onPress={() => {
                            setFilterUnitId(u.id);
                            setPage(0);
                          }}
                        />
                      ))}
                    </ScrollView>
                  </>
                )}
              </ClayView>
            )}
          </>
        )}

        {/* ─── Pagination (top, only on isMD+) ─── */}
        {!paginationAtBottom && totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage(page - 1)}
            onNext={() => setPage(page + 1)}
            isDark={isDark}
            colors={colors}
            align="end"
          />
        )}

        {/* ─── List ─── */}
        {loading ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomTabPad + 88 }}>
            {Array.from({ length: isSM ? 3 : 5 }).map((_, i) => (
              <CollectionCardSkeleton key={i} delay={i * 150} isDark={isDark} colors={colors} />
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[{ paddingBottom: bottomTabPad + 88 }, rows.length === 0 && styles.scrollEmpty]}
          >
            {rows.map((r, i) => (
              <CollectionCard
                key={r.id}
                r={r}
                index={i}
                canApprove={canApproveReject}
                onApprove={onApprove}
                onReject={(id) => setRejectId(id)}
                colors={colors}
                isDark={isDark}
                isSM={isSM}
                isXS={isXS}
              />
            ))}

            {rows.length === 0 && (
              <CollectionsEmptyState
                onAdd={() => setModalOpen(true)}
                onClearFilters={clearFilters}
                colors={colors}
                isDark={isDark}
                compact={isSM}
                isXS={isXS}
                filterActive={filtersActive}
              />
            )}

            {/* Pagination at bottom on mobile */}
            {paginationAtBottom && totalPages > 1 && rows.length > 0 && (
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => setPage(page - 1)}
                  onNext={() => setPage(page + 1)}
                  isDark={isDark}
                  colors={colors}
                  align="center"
                />
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ─── FAB (hidden on isLG and approvalsOnly) ─── */}
      {showFAB && (
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
          <Pressable onPress={pressFab} style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 1 })]}>
            <LinearGradient colors={['#14B8A6', '#0EA5E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
              <Plus color="#fff" size={24} strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* ─── Add Collection Modal ─── */}
      <Modal visible={modalOpen} animationType={modalAnimation} transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalBackdrop, modalCentered && { justifyContent: 'center' }]}
        >
          {isDark && Platform.OS !== 'web' && (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          )}
          <View
            style={[
              styles.modalSheet,
              modalCentered && styles.modalCentered,
              {
                backgroundColor: isDark ? '#12151F' : colors.surface,
                borderTopColor: isDark ? 'rgba(14,165,233,0.14)' : colors.border,
                padding: modalPad,
                paddingBottom: Platform.OS === 'ios' && !modalCentered ? 40 : modalPad + 12,
              },
            ]}
          >
            {/* Handle (mobile only) */}
            {!modalCentered && (
              <View
                style={[
                  styles.sheetHandle,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border,
                    marginBottom: sheetHandleMargin,
                  },
                ]}
              />
            )}

            <View style={[styles.sheetHeaderGroup, { marginBottom: isXS ? 18 : 24 }]}>
              <LinearGradient
                colors={isDark ? ['rgba(14,165,233,0.18)', 'rgba(20,184,166,0.06)'] : ['rgba(14,165,233,0.1)', 'transparent']}
                style={styles.sheetIconWrap}
              >
                <Wallet size={18} color={a('cyan', isDark)} strokeWidth={2} />
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: modalTitleSize }]}>New collection</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Record a payment received from a business unit
                </Text>
              </View>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={({ pressed }) => [
                  styles.sheetClose,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface },
                  ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
                ]}
              >
                <X color={colors.textSecondary} size={18} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Business unit list */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Business unit</Text>
              <View style={[styles.unitGridWrap, { marginHorizontal: -modalPad }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.unitGridInner, { paddingHorizontal: modalPad }]}
                >
                  {units.map((u) => {
                    const active = unitId === u.id;
                    const cyanAccent = a('cyan', isDark);
                    return (
                      <Pressable
                        key={u.id}
                        onPress={() => setUnitId(u.id)}
                        style={({ pressed }) => [
                          styles.unitCard,
                          active && styles.unitCardActive,
                          {
                            borderColor: active ? `${cyanAccent}70` : isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                            backgroundColor: active
                              ? aBg('cyan')
                              : isDark
                              ? 'rgba(255,255,255,0.03)'
                              : colors.surface,
                          },
                          ...pressableWebStyles(pressed, { pressedOpacity: 0.7 }),
                        ]}
                      >
                        <View style={[styles.unitIconCircle, active && { backgroundColor: 'transparent' }]}>
                          {active && (
                            <LinearGradient
                              colors={isDark ? ['rgba(14,165,233,0.25)', 'transparent'] : ['rgba(14,165,233,0.15)', 'transparent']}
                              style={StyleSheet.absoluteFillObject}
                            />
                          )}
                          <Building2 size={13} color={active ? cyanAccent : colors.textSecondary} />
                        </View>
                        <Text
                          style={[styles.unitLabel, { color: active ? cyanAccent : colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {u.name}
                        </Text>
                        {active && <View style={[styles.unitActiveDot, { backgroundColor: cyanAccent }]} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Amount */}
              <View style={styles.amtRow}>
                <View style={styles.amtPrefix}>
                  <Text style={[styles.amtPrefixTxt, { color: colors.textSecondary }]}>₹</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
                </View>
              </View>

              {/* Month / Year row — stacked on isXS */}
              {isXS ? (
                <View>
                  <View style={{ marginBottom: 12 }}>
                    <Input label="Month (1–12)" value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder="Example: 5" />
                  </View>
                  <View style={{ marginBottom: 12 }}>
                    <Input label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="Example: 2026" />
                  </View>
                </View>
              ) : (
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Input label="Month (1–12)" value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder="Example: 5" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Input label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="Example: 2026" />
                  </View>
                </View>
              )}

              {/* Payment mode */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Payment mode</Text>
              <PayModeSelector value={payMode} onChange={setPayMode} />

              {/* Actions */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setModalOpen(false)}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.glassBackground,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                    },
                    ...pressableWebStyles(pressed, { pressedOpacity: 0.8 }),
                  ]}
                >
                  <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={safePressHandler(submit)}
                  disabled={saving}
                  style={({ pressed }) => [
                    { flex: 1, marginLeft: 12 },
                    ...pressableWebStyles(pressed, { disabled: saving, pressedOpacity: 0.85 }),
                  ]}
                >
                  <LinearGradient
                    colors={['#0D9488', '#0EA5E9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  >
                    <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save collection'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Reject Modal ─── */}
      <Modal visible={!!rejectId} transparent animationType="fade">
        <View style={[styles.modalBackdrop, { justifyContent: 'center' }]}>
          <View
            style={[
              styles.alertSheet,
              { backgroundColor: isDark ? '#1A1D2E' : colors.surface, borderColor: `${a('rose', isDark)}30` },
            ]}
          >
            <View style={[styles.rejectIconWrap, { backgroundColor: aBg('rose'), borderColor: `${a('rose', isDark)}40` }]}>
              <X color={a('rose', isDark)} size={24} />
            </View>
            <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>Reject collection</Text>
            <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
              Provide a reason so the submitter understands what needs to be fixed.
            </Text>
            <Input
              label="Reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Incorrect amount entered"
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.glassBackground,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  },
                  ...pressableWebStyles(pressed, { pressedOpacity: 0.8 }),
                ]}
              >
                <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={safePressHandler(confirmReject)}
                disabled={!rejectReason.trim()}
                style={({ pressed }) => [
                  { flex: 1, marginLeft: 12 },
                  ...pressableWebStyles(pressed, { disabled: !rejectReason.trim(), pressedOpacity: 0.85 }),
                ]}
              >
                <LinearGradient
                  colors={['#FB7185', '#E11D48']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.saveBtn, !rejectReason.trim() && { opacity: 0.45 }]}
                >
                  <Text style={styles.saveTxt}>Reject</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Claymorphic collections ledger embedded in the Billing page. */
export function CollectionsTab() {
  return <CollectionsScreen embedded />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  rootMobile: {
    paddingHorizontal: 0,
  },

  // Summary — desktop/tablet
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1.3,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
  },
  summaryCard2: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    justifyContent: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  summaryLbl: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  summaryMiniTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusMixBar: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 6,
  },
  statusMixSeg: {
    height: '100%',
  },

  // Summary — mobile pill bar
  summaryPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  summaryPillSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryPillVal: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryPillTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryPillDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 4,
  },

  // Filter pill (collapsed)
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterPillTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },

  // Filter panel
  filterPanel: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  filterPanelMobile: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  filterCollapseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  periodChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  filterSectionHeadCompact: {
    marginBottom: 8,
  },
  filterAccentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  filterAccentBarCompact: {
    width: 3,
    height: 12,
  },
  filterSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  filterSectionTitleMobile: {
    fontSize: 9,
    letterSpacing: 1.1,
  },
  filterScroll: {
    flexDirection: 'row',
    paddingBottom: 2,
  },
  filterScrollPadded: {
    paddingRight: 4,
  },

  // Hero CTA
  heroOuter: {
    borderRadius: 22,
    padding: 1,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  heroInner: {
    borderRadius: 21,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroGloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '44%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
  heroSub: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '600', marginTop: 3 },
  heroChevron: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroOuterCompact: {
    borderRadius: 16,
  },
  heroInnerCompact: {
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  heroLeftCompact: { gap: 10 },
  heroIconBoxCompact: {
    width: 36,
    height: 36,
    borderRadius: 11,
  },
  heroTitleCompact: { fontSize: 15 },
  heroChevronCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },

  // Period chips
  chipSelected: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipEmoji: { fontSize: 14 },
  chipEmojiSm: { fontSize: 13 },
  chipTxtSelected: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  chipUnselected: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipTxtUnselected: {
    fontWeight: '700',
    fontSize: 13,
  },

  // Status tabs
  statusTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusTabRowMobile: {
    gap: 6,
  },
  statusTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTabMobile: {
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusTabTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusTabTxtMobile: {
    fontSize: 12,
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  pageArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pageMain: {
    fontWeight: '700',
    fontSize: 14,
  },
  pageSub: {
    fontWeight: '600',
    fontSize: 13,
  },

  // Card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  cardTopGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 5,
  },
  cardAccent: {
    width: 3,
    borderRadius: 2,
    margin: 8,
    marginRight: 0,
  },
  cardInner: {
    flex: 1,
  },
  cardLine1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  cardLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardUnit: {
    flex: 1,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardMetaWrap: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaPillTxt: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardAmount: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardActions: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  actionBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty state
  scrollEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 340,
  },
  emptyWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyWrapCompact: {
    paddingVertical: 0,
  },
  emptyPanel: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  emptyPanelCompact: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  emptyPanelXS: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 18,
  },
  emptyIconRing: {
    position: 'relative',
    marginBottom: 16,
  },
  emptyIconGrad: {
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyCornerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKicker: {
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emptyTitle: {
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyTitleCompact: {
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 6,
  },
  emptySubCompact: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    marginTop: 18,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyCtaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyHint: { fontSize: 11, fontWeight: '600', marginTop: 12 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: bottomTabPad + 16,
    right: 20,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 540,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    maxHeight: '92%',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  modalCentered: {
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetHeaderGroup: { flexDirection: 'row', alignItems: 'center' },
  sheetIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  unitGridWrap: { marginBottom: 18 },
  unitGridInner: { paddingBottom: 4, gap: 10 },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    paddingRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  unitCardActive: {},
  unitIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unitLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, maxWidth: 160 },
  unitActiveDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },

  amtRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  amtPrefix: { paddingBottom: 12, paddingLeft: 2 },
  amtPrefixTxt: { fontSize: 24, fontWeight: '800' },

  rowInputs: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  // Pay mode
  payGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  payChip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    minWidth: 56,
    overflow: 'hidden',
    position: 'relative',
  },
  payEmoji: {
    fontSize: 22,
  },
  payLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  payActiveDot: { position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: 3 },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelTxt: {
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  // Reject alert
  alertSheet: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  rejectIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  alertSub: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 18,
  },
});
