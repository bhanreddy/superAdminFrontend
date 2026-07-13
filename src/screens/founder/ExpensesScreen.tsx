import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { safePressHandler } from '../../utils/safePressHandler';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import { useExpenses } from '../../hooks/useExpenses';
import * as founderDb from '../../services/founderSupabase';
import type { ExpenseListFilters } from '../../services/founderSupabase';
import type { ExpenseCategory, ExpenseRow, ExpenseStatus } from '../../types/founder';
import { ConsoleAmbientBackground, bottomTabPad } from './founderUi';
import { Check, X, Receipt, ChevronRight, Upload, Banknote, ArrowUpRight, Plus, WalletCards, Clock3, BadgeCheck, Files } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#080710',
  surface: '#0F0D1A',
  surfaceRaised: '#141222',
  border: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(139,92,246,0.40)',

  violet: '#8B5CF6',
  violetGlow: 'rgba(139,92,246,0.20)',
  gold: '#F0B429',
  goldGlow: 'rgba(240,180,41,0.15)',
  emerald: '#10D9A0',
  emeraldGlow: 'rgba(16,217,160,0.15)',
  rose: '#F43F5E',
  roseGlow: 'rgba(244,63,94,0.15)',
  amber: '#FB923C',

  text: '#F4F0FF',
  textMuted: 'rgba(244,240,255,0.45)',
  textDim: 'rgba(244,240,255,0.25)',
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING: { color: T.gold, glow: T.goldGlow, dot: T.gold, label: 'Pending' },
  APPROVED: { color: T.emerald, glow: T.emeraldGlow, dot: T.emerald, label: 'Approved' },
  REJECTED: { color: T.rose, glow: T.roseGlow, dot: T.rose, label: 'Rejected' },
} as const;

const CAT_META: Record<string, { icon: string; gradient: [string, string] }> = {
  MARKETING: { icon: '📣', gradient: ['rgba(251,146,60,0.25)', 'rgba(251,146,60,0.06)'] },
  HOSTING: { icon: '🖥', gradient: ['rgba(56,189,248,0.25)', 'rgba(56,189,248,0.06)'] },
  TOOLS: { icon: '🔧', gradient: ['rgba(167,139,250,0.25)', 'rgba(167,139,250,0.06)'] },
  TRAVEL: { icon: '✈️', gradient: ['rgba(34,211,238,0.25)', 'rgba(34,211,238,0.06)'] },
  SALARY: { icon: '💼', gradient: ['rgba(16,217,160,0.25)', 'rgba(16,217,160,0.06)'] },
  MISC: { icon: '📦', gradient: ['rgba(244,240,255,0.12)', 'rgba(244,240,255,0.04)'] },
};

const STATUS_FILTERS: { key: ExpenseStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const CAT_FILTERS: { key: ExpenseCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'MARKETING', label: 'Marketing' },
  { key: 'HOSTING', label: 'Hosting' },
  { key: 'TOOLS', label: 'Tools' },
  { key: 'TRAVEL', label: 'Travel' },
  { key: 'SALARY', label: 'Salary' },
  { key: 'MISC', label: 'Misc' },
];

// ─── Filter section label (accent bar) ────────────────────────────────────────
function FilterSectionLabel({
  text,
  colors,
  marginTop = 0,
}: {
  text: string;
  colors: { textSecondary: string };
  marginTop?: number;
}) {
  return (
    <View style={[styles.filterSectionLabelRow, { marginTop }]}>
      <LinearGradient
        colors={['#A78BFA', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.filterSectionAccent}
      />
      <Text style={[styles.filterLabel, { color: colors.textSecondary, marginBottom: 0 }]}>{text}</Text>
    </View>
  );
}

// ─── Premium Filter Pills ─────────────────────────────────────────────────────
function PremiumFilterRow<T extends string>({
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 0.75 })]}
          >
            {active ? (
              <LinearGradient
                colors={['rgba(139,92,246,0.35)', 'rgba(109,40,217,0.20)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.pill, styles.pillActive]}
              >
                <View style={[styles.pillActiveDot, !isDark && { backgroundColor: '#fff' }]} />
                <Text style={[styles.pillActiveTxt, !isDark && { color: '#fff' }]}>{o.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.pill, { borderColor: isDark ? T.border : colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface }]}>
                <Text style={[styles.pillTxt, { color: colors.textSecondary }]}>{o.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────
const SummaryBar = React.memo(function SummaryBar({ expenses }: { expenses: ExpenseRow[] }) {
  const { colors, isDark } = useTheme();
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pending = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + Number(e.amount), 0);
  const approved = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 60, friction: 14 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], marginBottom: 20 }}>
      <View style={[styles.summaryCard, !isDark && { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.8)' }]}>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(139,92,246,0.15)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Decorative glow orb */}
        <View style={styles.summaryGlowOrb} />

        <View style={styles.summaryTop}>
          <View>
            <Text style={[styles.summaryBigLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
            <Text style={[styles.summaryBigAmt, { color: colors.textPrimary }]}>{founderDb.formatInr(total, 0)}</Text>
          </View>
          <View style={[styles.summaryTrend, !isDark && { backgroundColor: 'rgba(16,217,160,0.2)' }]}>
            <ArrowUpRight size={14} color={T.emerald} />
            <Text style={styles.summaryTrendTxt}>This cycle</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryBottomRow}>
          <View style={styles.summaryMini}>
            <View style={[styles.summaryMiniDot, { backgroundColor: T.gold }]} />
            <View>
              <Text style={styles.summaryMiniLabel}>Pending</Text>
              <Text style={[styles.summaryMiniAmt, { color: T.gold }]}>{founderDb.formatInr(pending, 0)}</Text>
            </View>
          </View>
          <View style={styles.summaryMiniSep} />
          <View style={styles.summaryMini}>
            <View style={[styles.summaryMiniDot, { backgroundColor: T.emerald }]} />
            <View>
              <Text style={styles.summaryMiniLabel}>Approved</Text>
              <Text style={[styles.summaryMiniAmt, { color: T.emerald }]}>{founderDb.formatInr(approved, 0)}</Text>
            </View>
          </View>
          <View style={styles.summaryMiniSep} />
          <View style={styles.summaryMini}>
            <View style={[styles.summaryMiniDot, { backgroundColor: T.violet }]} />
            <View>
              <Text style={[styles.summaryMiniLabel, { color: colors.textSecondary }]}>Count</Text>
              <Text style={[styles.summaryMiniAmt, { color: T.violet }]}>{expenses.length}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

function ExpenseHero({ expenses, compact, onAdd, approvalsOnly }: { expenses: ExpenseRow[]; compact: boolean; onAdd: () => void; approvalsOnly: boolean }) {
  const { colors, isDark } = useTheme();
  const total = expenses.reduce((sum, row) => sum + Number(row.amount), 0);
  const pending = expenses.filter((row) => row.status === 'PENDING').reduce((sum, row) => sum + Number(row.amount), 0);
  const approved = expenses.filter((row) => row.status === 'APPROVED').reduce((sum, row) => sum + Number(row.amount), 0);
  const metrics = [
    { icon: WalletCards, label: 'Total logged', value: founderDb.formatInr(total, 0), color: '#8B5CF6' },
    { icon: Clock3, label: 'Awaiting approval', value: founderDb.formatInr(pending, 0), color: '#F0B429' },
    { icon: BadgeCheck, label: 'Approved', value: founderDb.formatInr(approved, 0), color: '#10D9A0' },
    { icon: Files, label: 'Entries', value: String(expenses.length), color: '#38BDF8' },
  ];
  return (
    <View style={[styles.heroShell, compact && styles.heroShellCompact, { borderColor: isDark ? 'rgba(129,140,248,0.3)' : 'rgba(79,70,229,0.18)' }]}>
      <LinearGradient colors={isDark ? ['#1D2342', '#111425'] : ['#F8FAFF', '#ECEFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroGradient, compact && styles.heroGradientCompact]}>
        <View style={[styles.heroOrb, compact && styles.heroOrbCompact]} />
        <View style={[styles.heroHead, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: 1 }}>
            <View style={[styles.heroKicker, compact && { marginBottom: 8 }]}><View style={[styles.heroKickerIcon, compact && { width: 30, height: 30, borderRadius: 10 }]}><Banknote size={compact ? 15 : 17} color="#FFF" /></View><Text style={[styles.heroKickerText, compact && { fontSize: 9 }]}>OPERATING EXPENSES</Text></View>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact, { color: colors.textPrimary }]}>{approvalsOnly ? 'Review every spend with confidence.' : 'Know where every rupee goes.'}</Text>
            <Text style={[styles.heroSub, compact && styles.heroSubCompact, { color: colors.textSecondary }]}>Capture receipts, classify spend and keep approvals moving from one clean ledger.</Text>
          </View>
          {!approvalsOnly && <Pressable onPress={onAdd} style={({ pressed }) => [styles.heroCta, compact && styles.heroCtaCompact, { opacity: pressed ? 0.86 : 1 }]}><Plus size={18} color="#FFF" /><Text style={styles.heroCtaText}>New expense</Text><ChevronRight size={16} color="rgba(255,255,255,0.8)" /></Pressable>}
        </View>
        <View style={[styles.heroMetrics, compact && styles.heroMetricsCompact]}>
          {metrics.map(({ icon: Icon, label, value, color }) => <View key={label} style={[styles.heroMetric, compact && styles.heroMetricCompact, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)', borderColor: isDark ? `${color}28` : `${color}20` }]}><View style={[styles.heroMetricIcon, compact && { width: 30, height: 30, borderRadius: 10 }, { backgroundColor: `${color}1F` }]}><Icon size={compact ? 15 : 17} color={color} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.heroMetricLabel, compact && { fontSize: 8 }, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.heroMetricValue, compact && { fontSize: 14 }, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text></View></View>)}
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ExpenseStatus }) {
  const { isDark } = useTheme();
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: isDark ? cfg.glow : 'transparent', borderColor: isDark ? `${cfg.color}30` : cfg.color }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Expense Card ─────────────────────────────────────────────────────────────
function ExpenseCard({
  item,
  canApprove,
  index,
  onApprove,
  onReject,
  onReceipt,
  compact,
}: {
  item: ExpenseRow;
  canApprove: boolean;
  index: number;
  onApprove: () => void;
  onReject: () => void;
  onReceipt: () => void;
  compact: boolean;
}) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(32)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, {
        toValue: 0, useNativeDriver: true,
        tension: 70, friction: 14,
        delay: index * 60,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
        delay: index * 60,
      }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(scale, { toValue: 0.972, useNativeDriver: true, speed: 60 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }).start();

  const cfg = STATUS_CFG[item.status as ExpenseStatus] ?? STATUS_CFG.PENDING;
  const cat = CAT_META[item.category] ?? CAT_META.MISC;
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY: slideIn }], opacity, marginBottom: 10 }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut}>
        <View style={[styles.card, !isDark && { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: colors.border }]}>
          <BlurView
            intensity={20}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
            pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
          />
          <LinearGradient
            colors={isDark ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(0,0,0,0.02)', 'transparent']}
            style={[StyleSheet.absoluteFill, Platform.OS === 'web' ? { pointerEvents: 'none' } : null]}
          />
          {/* Left glow stripe */}
          <View style={[styles.cardStripe, { backgroundColor: cfg.color }]} />

          <View style={styles.cardBody}>
            {/* Top */}
            <View style={[styles.cardTop, compact && { alignItems: 'flex-start' }]}>
              {/* Category icon */}
              <LinearGradient colors={cat.gradient} style={styles.catBubble}>
                <Text style={styles.catEmoji}>{cat.icon}</Text>
              </LinearGradient>

              {/* Title + meta */}
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.cardCat, { color: colors.textSecondary }]}>{item.category}  {date ? `· ${date}` : ''}</Text>
              </View>

              {/* Amount + badge */}
              <View style={{ alignItems: 'flex-end', gap: 7, maxWidth: compact ? 120 : undefined }}>
                <Text style={[styles.cardAmt, { color: colors.textPrimary }]}>{founderDb.formatInr(Number(item.amount), 2)}</Text>

                <StatusBadge status={item.status as ExpenseStatus} />
              </View>
            </View>

            {/* Description */}
            {item.description ? (
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            ) : null}

            {/* Footer */}
            <View style={[styles.cardFooter, !isDark && { borderTopColor: colors.border }]}>
              <Pressable
                style={({ pressed }) => [styles.receiptChip, ...pressableWebStyles(pressed, { pressedOpacity: 0.7 })]}
                onPress={onReceipt}
              >
                <Receipt size={13} color={item.receipt_url ? T.violet : isDark ? T.textDim : 'rgba(0,0,0,0.3)'} />
                <Text style={[styles.receiptLabel, { color: item.receipt_url ? T.violet : isDark ? T.textDim : 'rgba(0,0,0,0.3)' }]}>
                  {item.receipt_url ? 'View receipt' : 'No receipt'}
                </Text>
              </Pressable>

              {canApprove && item.status === 'PENDING' ? (
                <View style={styles.actionPair}>
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
                    onPress={safePressHandler(onApprove as () => void | Promise<void>)}
                  >
                    <LinearGradient colors={['rgba(16,217,160,0.22)', 'rgba(16,217,160,0.08)']} style={styles.actionBtnInner}>
                      <Check color={T.emerald} size={14} strokeWidth={2.5} />
                      <Text style={[styles.actionBtnTxt, { color: T.emerald }]}>Approve</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
                    onPress={onReject}
                  >
                    <LinearGradient colors={['rgba(244,63,94,0.22)', 'rgba(244,63,94,0.08)']} style={styles.actionBtnInner}>
                      <X color={T.rose} size={14} strokeWidth={2.5} />
                      <Text style={[styles.actionBtnTxt, { color: T.rose }]}>Reject</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = React.memo(function EmptyState({ onAddExpense }: { onAddExpense: () => void }) {
  const { colors, isDark } = useTheme();
  const ring1 = useRef(new Animated.Value(0.85)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0.85, duration: 2000, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring2, { toValue: 0.88, duration: 2400, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ])
    );
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop1.start();
    loop2.start();
    bob.start();
    return () => { loop1.stop(); loop2.stop(); bob.stop(); };
  }, []);

  return (
    <Animated.View style={[styles.emptyWrap, { opacity: fade, borderColor: isDark ? 'rgba(139,92,246,0.14)' : colors.border, backgroundColor: isDark ? 'rgba(15,13,26,0.32)' : 'rgba(255,255,255,0.62)' }]}>
      <View style={styles.emptyBackdrop}>
        <LinearGradient
          colors={['rgba(139,92,246,0.14)', 'transparent']}
          style={styles.emptyBlobTop}
        />
        <LinearGradient
          colors={['transparent', 'rgba(16,217,160,0.08)']}
          style={styles.emptyBlobBottom}
        />
        <View style={[styles.emptyDotGrid, !isDark && { opacity: 0.35 }]} pointerEvents="none">
          {Array.from({ length: 28 }).map((_, i) => (
            <View key={i} style={styles.emptyDot} />
          ))}
        </View>
      </View>

      <Animated.View style={[styles.emptyRingOuter, { transform: [{ translateY: floatY }] }]}>
        <Animated.View style={[styles.emptyRing2, { transform: [{ scale: ring2 }] }]} />
        <Animated.View style={[styles.emptyRing1, { transform: [{ scale: ring1 }] }]}>
          <LinearGradient colors={['rgba(139,92,246,0.45)', 'rgba(109,40,217,0.15)']} style={styles.emptyIconBox}>
            <View style={styles.emptyIconInnerGlow} />
            <Banknote size={32} color="#E9D5FF" />
          </LinearGradient>
        </Animated.View>
        <View style={styles.emptyCornerBadge}>
          <Receipt size={12} color="#C4B5FD" strokeWidth={2.5} />
        </View>
      </Animated.View>

      <Text style={[styles.emptyKicker, { color: T.violet }]}>Ledger</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No expenses yet</Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
        Track marketing, tools, travel, and payroll in one place. Add an entry to see it here with status and receipts.
      </Text>

      <Pressable
        onPress={onAddExpense}
        style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 0.92 })]}
      >
        <LinearGradient
          colors={['#5B21B6', '#7C3AED', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.emptyCta, !isDark && { shadowOpacity: 0.2 }]}
        >
          <View style={styles.emptyCtaIcon}>
            <Plus size={20} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={styles.emptyCtaTxt}>Add your first expense</Text>
        </LinearGradient>
      </Pressable>
      <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Or use New Expense above</Text>
    </Animated.View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExpensesScreen({ approvalsOnly = false }: { approvalsOnly?: boolean }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 700;
  const { founder, canApproveReject } = useFounderAuth();
  const { expenses, loading, filters, setFilters, refresh } = useExpenses(
    approvalsOnly ? { status: 'PENDING' } : undefined,
  );

  useEffect(() => {
    if (approvalsOnly && !canApproveReject) {
      router.replace('/(app)/console/expenses' as any);
    }
  }, [approvalsOnly, canApproveReject, router]);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('MISC');
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pickImage = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setPreviewUri(a.uri);
    setPickedMime(a.mimeType || 'image/jpeg');
  };

  const openReceipt = async (row: ExpenseRow) => {
    if (!row.receipt_url) { Alert.alert('Receipt', 'No receipt attached.'); return; }
    const url = row.receipt_url.startsWith('http')
      ? row.receipt_url
      : await founderDb.getReceiptSignedUrl(row.receipt_url);
    if (!url) { Alert.alert('Receipt', 'Could not load receipt.'); return; }
    setViewerUrl(url);
    setViewerOpen(true);
  };

  const submitExpense = async () => {
    if (!founder?.id) {
      Alert.alert('Founder profile required', 'Add a row in the founders table with your Supabase auth user id.');
      return;
    }
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!title.trim() || !Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Validation', 'Enter title and a valid amount.');
      return;
    }
    setSaving(true);
    try {
      const created = await founderDb.createExpense({
        title: title.trim(), description: description.trim(), amount: amt,
        category, receipt_url: null, created_by_founder_id: founder.id,
      });
      if (previewUri && pickedMime) {
        const path = await founderDb.uploadExpenseReceipt(previewUri, founder.id, created.id, pickedMime);
        await founderDb.updateExpenseReceiptPath(created.id, path);
      }
      closeModal();
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create expense');
    } finally { setSaving(false); }
  };

  const onApprove = useCallback(async (id: string) => {
    if (!founder?.id) return;
    try { await founderDb.approveExpense(id, founder.id); refresh(); }
    catch (e: any) { Alert.alert('Error', e?.message || 'Approve failed'); }
  }, [founder?.id, refresh]);

  const confirmReject = async () => {
    if (!rejectId || !founder?.id || !rejectReason.trim()) return;
    try {
      await founderDb.rejectExpense(rejectId, founder.id, rejectReason.trim());
      setRejectId(null); setRejectReason(''); refresh();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Reject failed'); }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setTitle(''); setDescription(''); setAmount(''); setCategory('MISC');
    setPreviewUri(null); setPickedMime(null);
  }, []);

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader
        title={approvalsOnly ? 'Expense approvals' : 'Expenses'}
        subtitle={approvalsOnly ? 'Pending queue (approver)' : 'Founder console'}
      />

      <View style={styles.root}>

        <ExpenseHero expenses={expenses} compact={compact} approvalsOnly={approvalsOnly} onAdd={() => setModalOpen(true)} />

        {/* ── Filters (glass panel) ── */}
        <View style={[styles.filterPanel, compact && { paddingHorizontal: 12, paddingVertical: 13, borderRadius: 18 }, !isDark && { borderColor: 'rgba(99,102,241,0.14)', backgroundColor: 'rgba(248,250,255,0.9)' }]}>
          {isDark ? (
            <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          ) : null}
          <LinearGradient
            colors={isDark ? ['rgba(139,92,246,0.08)', 'transparent'] : ['rgba(139,92,246,0.06)', 'transparent']}
            style={[StyleSheet.absoluteFill, { borderRadius: 22 }, Platform.OS === 'web' ? { pointerEvents: 'none' } : null]}
            pointerEvents="none"
          />
          <View style={[styles.filterGroups, compact && { flexDirection: 'column' }]}><View style={styles.filterGroup}><FilterSectionLabel text="STATUS" colors={colors} />
          <PremiumFilterRow
            options={STATUS_FILTERS}
            value={filters.status}
            onChange={(k) => setFilters((f: ExpenseListFilters) => ({ ...f, status: k }))}
          /></View><View style={styles.filterGroup}><FilterSectionLabel text="CATEGORY" colors={colors} marginTop={compact ? 16 : 0} />
          <PremiumFilterRow
            options={CAT_FILTERS}
            value={filters.category}
            onChange={(k) => setFilters((f: ExpenseListFilters) => ({ ...f, category: k }))}
          /></View></View>
        </View>

        <View style={[styles.listDivider, !isDark && { backgroundColor: colors.border }]} />

        {/* ── List ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <View style={[styles.loadingCard, !isDark && { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {isDark ? (
                <LinearGradient
                  colors={['rgba(139,92,246,0.12)', 'rgba(15,13,26,0.95)']}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
              ) : null}
              <ActivityIndicator color={T.violet} size="large" />
              <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Fetching ledger</Text>
              <Text style={[styles.loadingTxt, { color: colors.textSecondary }]}>Applying your filters…</Text>
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              { paddingBottom: bottomTabPad + 24 },
              expenses.length === 0 && { flex: 1 },
            ]}
          >
            {expenses.length === 0
              ? <EmptyState onAddExpense={() => setModalOpen(true)} />
              : expenses.map((e, i) => (
                <ExpenseCard
                  key={e.id}
                  item={e}
                  index={i}
                  canApprove={!!canApproveReject}
                  onApprove={() => onApprove(e.id)}
                  onReject={() => setRejectId(e.id)}
                  onReceipt={() => openReceipt(e)}
                  compact={compact}
                />
              ))}
          </ScrollView>
        )}
      </View>

      {/* ─────────── CREATE EXPENSE MODAL ─────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <BlurView
            intensity={40}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
            pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
          />
          <View style={[styles.sheet, compact && { width: '100%', maxWidth: '100%', maxHeight: height * 0.94, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, !isDark && { backgroundColor: colors.background }]}>
            {/* Handle */}
            <View style={[styles.sheetHandle, !isDark && { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <LinearGradient colors={['rgba(139,92,246,0.18)', 'rgba(139,92,246,0.06)']} style={styles.sheetIconWrap}>
                <Receipt size={18} color={T.violet} strokeWidth={2} />
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>New Expense</Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>Fill in the details below</Text>
              </View>
              <Pressable
                onPress={closeModal}
                style={({ pressed }) => [
                  styles.sheetClose,
                  !isDark && { backgroundColor: colors.surface },
                  ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
                ]}
              >
                <X color={colors.textSecondary || T.textMuted} size={18} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Meta ads" />
              <Input
                label="Description (optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="Add a note…"
                multiline
              />

              {/* Amount row */}
              <View style={styles.amtRow}>
                <View style={styles.amtPrefix}><Text style={[styles.amtPrefixTxt, { color: colors.textSecondary }]}>₹</Text></View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
              </View>

              {/* Category Options */}
              <Text style={[styles.pickerLbl, { color: colors.textSecondary }]}>Category</Text>
              <View style={styles.catGrid}>
                {(['MARKETING', 'HOSTING', 'TOOLS', 'TRAVEL', 'SALARY', 'MISC'] as ExpenseCategory[]).map((c) => {
                  const meta = CAT_META[c];
                  const active = category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      style={({ pressed }) => [
                        styles.catCard,
                        active && styles.catCardActive,
                        !isDark && {
                          borderColor: active ? T.violet : colors.border,
                          backgroundColor: active ? 'rgba(139,92,246,0.06)' : colors.surface,
                        },
                        ...pressableWebStyles(pressed, { pressedOpacity: 0.7 })
                      ]}
                    >
                      <View style={[styles.catIconBox, active && { backgroundColor: 'transparent' }]}>
                        {active && (
                          <LinearGradient
                            colors={isDark ? meta.gradient : ['rgba(139,92,246,0.15)', 'transparent']}
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        <Text style={styles.catEmoji}>{meta.icon}</Text>
                      </View>
                      <Text style={[styles.catLabel, { color: active ? T.violet : colors.textSecondary }]}>{c}</Text>
                      {active && (
                        <View style={styles.catActiveDot} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Receipt Upload */}
              <Pressable
                onPress={safePressHandler(pickImage)}
                style={({ pressed }) => [styles.uploadBox, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
              >
                <LinearGradient
                  colors={previewUri
                    ? ['rgba(16,217,160,0.14)', 'rgba(16,217,160,0.05)']
                    : ['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)']}
                  style={styles.uploadGrad}
                >
                  <Upload size={20} color={previewUri ? T.emerald : T.violet} />
                  <Text style={[styles.uploadTxt, { color: previewUri ? T.emerald : T.violet }]}>
                    {previewUri ? '✓ Receipt attached — tap to change' : 'Attach receipt image'}
                  </Text>
                </LinearGradient>
              </Pressable>

              {previewUri && (
                <View style={styles.thumbBox}>
                  <Image source={{ uri: previewUri }} style={styles.thumb} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFillObject} />
                </View>
              )}

              {/* Buttons */}
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={closeModal}
                  style={({ pressed }) => [styles.cancelBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
                >
                  <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={safePressHandler(submitExpense)}
                  disabled={saving}
                  style={({ pressed }) => [
                    { flex: 1 },
                    ...pressableWebStyles(pressed, { disabled: saving, pressedOpacity: 0.8 }),
                  ]}
                >
                  <LinearGradient
                    colors={saving ? ['#4B4080', '#3B3070'] : ['#6D28D9', '#8B5CF6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitTxt}>{saving ? 'Saving…' : 'Submit Expense'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─────────── RECEIPT VIEWER ─────────── */}
      <Modal visible={viewerOpen} transparent animationType="fade">
        <BlurView
          intensity={60}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
          pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
        />
        <Pressable
          style={({ pressed }) => [styles.viewerBg, ...pressableWebStyles(pressed, { pressedOpacity: 1 })]}
          onPress={() => setViewerOpen(false)}
        >
          <View style={styles.viewerCard}>
            {viewerUrl && (
              <Image source={{ uri: viewerUrl }} style={styles.viewerImg} resizeMode="contain" />
            )}
            <Pressable
              style={({ pressed }) => [styles.viewerCloseBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
              onPress={() => setViewerOpen(false)}
            >
              <View style={styles.viewerCloseInner}>
                <X color="#fff" size={16} />
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─────────── REJECT MODAL ─────────── */}
      <Modal visible={!!rejectId} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <BlurView
            intensity={40}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
            pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
          />
          <View style={[styles.rejectCard, !isDark && { backgroundColor: colors.background, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(244,63,94,0.08)', 'transparent'] : ['rgba(244,63,94,0.03)', 'transparent']}
              style={[StyleSheet.absoluteFill, Platform.OS === 'web' ? { pointerEvents: 'none' } : null]}
            />
            <View style={styles.rejectIconCircle}>
              <LinearGradient colors={['rgba(244,63,94,0.25)', 'rgba(244,63,94,0.08)']} style={styles.rejectIconGrad}>
                <X color={T.rose} size={24} strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Reject Expense</Text>
            <Text style={[styles.rejectSub, { color: colors.textSecondary }]}>Provide a reason for rejection.</Text>
            <Input
              label="Reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Missing receipt, duplicate…"
              multiline
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => { setRejectId(null); setRejectReason(''); }}
                style={({ pressed }) => [styles.cancelBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
              >
                <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={safePressHandler(confirmReject)}
                disabled={!rejectReason.trim()}
                style={({ pressed }) => [
                  { flex: 1 },
                  ...pressableWebStyles(pressed, { disabled: !rejectReason.trim(), pressedOpacity: 0.8 }),
                ]}
              >
                <LinearGradient
                  colors={rejectReason.trim() ? ['#BE123C', '#F43F5E'] : ['#4B3040', '#3B2030']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitTxt}>Confirm Reject</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 0, paddingTop: 8 },

  heroShell: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, marginBottom: 16, shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 26, elevation: 8 },
  heroShellCompact: { borderRadius: 22, marginBottom: 12, shadowOpacity: 0.1, shadowRadius: 18 },
  heroGradient: { padding: 20, overflow: 'hidden' },
  heroGradientCompact: { padding: 14 },
  heroOrb: { position: 'absolute', width: 230, height: 230, borderRadius: 115, right: -72, top: -112, backgroundColor: 'rgba(139,92,246,0.17)' },
  heroOrbCompact: { width: 150, height: 150, borderRadius: 75, right: -54, top: -70, backgroundColor: 'rgba(79,70,229,0.12)' },
  heroHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  heroKickerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  heroKickerText: { color: '#9B87F5', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { fontSize: 25, lineHeight: 31, fontWeight: '900', letterSpacing: -0.75, maxWidth: 570 },
  heroTitleCompact: { fontSize: 21, lineHeight: 26, letterSpacing: -0.5 },
  heroSub: { fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 580 },
  heroSubCompact: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  heroCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, paddingHorizontal: 16, borderRadius: 15, backgroundColor: '#7C3AED', shadowColor: '#6D28D9', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  heroCtaCompact: { minHeight: 42, marginTop: 12, borderRadius: 13 },
  heroCtaText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  heroMetrics: { flexDirection: 'row', gap: 10, marginTop: 22 },
  heroMetricsCompact: { flexWrap: 'wrap', gap: 8, marginTop: 14 },
  heroMetric: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  heroMetricCompact: { flexBasis: '46%', minWidth: 130, paddingHorizontal: 9, paddingVertical: 9, borderRadius: 14, gap: 8 },
  heroMetricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  heroMetricLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.35 },
  heroMetricValue: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, marginTop: 2 },

  // Add button (hero)
  addBtnOuter: {
    borderRadius: 22,
    padding: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 14,
  },
  addBtnOuterLight: {
    borderColor: 'rgba(124,58,237,0.28)',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  addBtn: {
    borderRadius: 21,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  addBtnGloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '46%',
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  addBtnShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  addBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 8 },
  addBtnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  addBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  addBtnSub: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '600', marginTop: 3 },
  addBtnArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  // Summary
  summaryCard: {
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    overflow: 'hidden', marginBottom: 20,
    backgroundColor: 'rgba(15, 13, 26, 0.4)',
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  summaryGlowOrb: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: -40, right: -20,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  summaryBigLabel: { color: T.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 5 },
  summaryBigAmt: { color: T.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  summaryTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,217,160,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  summaryTrendTxt: { color: T.emerald, fontSize: 11, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  summaryBottomRow: { flexDirection: 'row', alignItems: 'center' },
  summaryMini: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryMiniDot: { width: 6, height: 6, borderRadius: 3 },
  summaryMiniLabel: { color: T.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  summaryMiniAmt: { fontSize: 14, fontWeight: '800' },
  summaryMiniSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 4 },

  // Filters
  filterPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.16)',
    backgroundColor: 'rgba(10,8,20,0.5)',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  filterGroups: { flexDirection: 'row', gap: 20 },
  filterGroup: { flex: 1, minWidth: 0 },
  filterSectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  filterSectionAccent: { width: 3, height: 14, borderRadius: 2 },
  filterLabel: { color: T.textDim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 7, paddingBottom: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: T.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pillActive: {
    borderColor: 'rgba(139,92,246,0.50)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pillActiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.violet },
  pillTxt: { color: T.textMuted, fontSize: 12, fontWeight: '600' },
  pillActiveTxt: { color: T.violet, fontSize: 12, fontWeight: '800' },

  listDivider: { height: 1, backgroundColor: T.border, marginTop: 16, marginBottom: 14 },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 36, paddingHorizontal: 20 },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 36,
    paddingHorizontal: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    backgroundColor: 'rgba(15,13,26,0.75)',
    overflow: 'hidden',
    minWidth: 260,
  },
  loadingTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  loadingTxt: { color: T.textMuted, fontSize: 13, fontWeight: '600' },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    minHeight: 360,
    position: 'relative',
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 24,
  },
  emptyBlobTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    right: -50,
    opacity: 0.9,
  },
  emptyBlobBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: 20,
    left: -70,
    opacity: 0.85,
  },
  emptyDotGrid: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 11,
    width: 242,
    alignSelf: 'center',
    opacity: 0.5,
  },
  emptyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(167,139,250,0.45)',
  },
  emptyRingOuter: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  emptyRing2: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.14)',
  },
  emptyRing1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  emptyIconInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  emptyCornerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(8,7,16,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
    opacity: 0.95,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4, marginBottom: 10 },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
    maxWidth: 320,
    marginBottom: 4,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 16,
    marginTop: 22,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  emptyHint: { fontSize: 11, fontWeight: '600', marginTop: 12, opacity: 0.85 },

  // Card
  card: {
    borderRadius: 18, flexDirection: 'row', overflow: 'hidden',
    backgroundColor: 'rgba(20, 18, 34, 0.5)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 5,
  },
  cardStripe: { width: 3 },
  cardBody: { flex: 1, padding: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  catBubble: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 18 },
  cardTitle: { color: T.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  cardCat: { color: T.textMuted, fontSize: 11, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardAmt: { color: T.text, fontSize: 15, fontWeight: '900', letterSpacing: -0.4 },
  cardDesc: { color: T.textMuted, fontSize: 12, lineHeight: 18, marginTop: 10 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  receiptChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  receiptLabel: { fontSize: 12, fontWeight: '700' },
  actionPair: { flexDirection: 'row', gap: 7 },
  actionBtn: { borderRadius: 10, overflow: 'hidden' },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7 },
  actionBtnTxt: { fontSize: 12, fontWeight: '800' },

  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Modal / Sheet
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%', maxWidth: 540,
    backgroundColor: 'rgba(15, 13, 26, 0.95)',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 14,
    maxHeight: '92%',
    borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.14)',
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 24,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  sheetIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: T.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  sheetSub: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  sheetClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },

  // Amount
  amtRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  amtPrefix: { paddingBottom: 14, paddingLeft: 2 },
  amtPrefixTxt: { fontSize: 24, fontWeight: '900', color: T.textDim },

  // Picker
  pickerLbl: { color: T.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 20 },
  catCard: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 16, borderWidth: 1, borderColor: T.border,
    backgroundColor: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden'
  },
  catCardActive: {
    borderColor: 'rgba(139,92,246,0.5)',
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  catIconBox: { 
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' 
  },
  catLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  catActiveDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: T.violet },

  // Upload
  uploadBox: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  uploadGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.20)', borderStyle: 'dashed', borderRadius: 14 },
  uploadTxt: { fontSize: 13, fontWeight: '700' },

  // Thumb
  thumbBox: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  thumb: { width: '100%', height: 140, borderRadius: 14 },

  // Sheet actions
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 18, alignItems: 'center' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 14 },
  cancelTxt: { color: T.textMuted, fontSize: 14, fontWeight: '700' },
  submitBtn: { paddingVertical: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // Viewer
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  viewerCard: { width: '100%', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  viewerImg: { width: '100%', height: SCREEN_WIDTH * 1.2 },
  viewerCloseBtn: { position: 'absolute', top: 12, right: 12 },
  viewerCloseInner: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Reject
  rejectCard: {
    marginHorizontal: 20, backgroundColor: 'rgba(15, 13, 26, 0.95)',
    borderRadius: 26, padding: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    shadowColor: '#F43F5E', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24,
  },
  rejectIconCircle: { alignItems: 'center', marginBottom: 16 },
  rejectIconGrad: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rejectSub: { color: T.textMuted, fontSize: 13, marginTop: 5, marginBottom: 20 },
});
