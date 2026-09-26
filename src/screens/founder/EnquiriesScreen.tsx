import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SalesMetricList } from './SalesCommandScreen';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { pressableWebStyles } from '../../utils/webPressable';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { useEnquiries } from '../../hooks/useEnquiries';
import * as founderDb from '../../services/founderSupabase';
import type { EnquiryListFilters } from '../../services/founderSupabase';
import { crmService } from '../../services/crmService';
import { resolveVertical, buildPrefillParams, VERTICAL_ROUTE, VERTICAL_LABELS, type TenantVertical } from '../../utils/tenantRouting';
import type { EnquiryRow, EnquiryStatus, FounderRow } from '../../types/founder';
import { ConsoleAmbientBackground, GlassCard, FilterChips, SkeletonPulse, bottomTabPad } from './founderUi';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  MessageCircle, X, UserRound, Activity, Rocket, Building2, Store, Contact,
  Search, SlidersHorizontal, Inbox, ChevronDown, Clock3, UserRoundCheck,
} from 'lucide-react-native';

const VERTICAL_OPTS: { key: TenantVertical; label: string; Icon: any }[] = [
  { key: 'SCHOOL', label: VERTICAL_LABELS.SCHOOL, Icon: Building2 },
  { key: 'MEDICAL', label: VERTICAL_LABELS.MEDICAL, Icon: Store },
  { key: 'OTHER', label: VERTICAL_LABELS.OTHER, Icon: Contact },
];

const STATUS_OPTS: { key: EnquiryStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'REJECTED', label: 'Rejected' },
];

const ASSIGNED_OPTS_BASE = [
  { key: 'ALL' as const, label: 'Any' },
  { key: 'UNASSIGNED' as const, label: 'Unassigned' },
];

// Status → accent colour + short label. Reuses the exact hexes already used in
// the lead detail sheet so the two views read as one system.
const STATUS_META: Record<EnquiryStatus, { color: string; label: string }> = {
  NEW: { color: '#A78BFA', label: 'New' },
  CONTACTED: { color: '#38C8F4', label: 'Contacted' },
  QUALIFIED: { color: '#00D4AD', label: 'Qualified' },
  CLOSED: { color: '#38BDF8', label: 'Closed' },
  REJECTED: { color: '#FF6B7A', label: 'Rejected' },
};

function initials(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function LegacyEnquiryBrowser() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const { enquiries, loading, filters, setFilters, refresh } = useEnquiries();

  const [founders, setFounders] = useState<FounderRow[]>([]);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [detail, setDetail] = useState<EnquiryRow | null>(null);
  const [assignId, setAssignId] = useState<string>('');
  const [statusPick, setStatusPick] = useState<EnquiryStatus>('NEW');
  const [dealValue, setDealValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [vertical, setVertical] = useState<TenantVertical>('OTHER');
  const [accepting, setAccepting] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  // Owner id → display name, for the assigned chip on each card.
  const ownerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    founders.forEach((f) => { map[f.id] = f.full_name || f.email || 'superAdmin'; });
    return map;
  }, [founders]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = query.trim();
      setFilters((current) => (current.q === next ? current : { ...current, q: next }));
    }, 350);
    return () => clearTimeout(handle);
  }, [query, setFilters]);

  const visible = enquiries;

  // Summary counts for the stat strip (reflect the current server filter set).
  const stats = useMemo(() => {
    let neu = 0, unassigned = 0, qualified = 0;
    enquiries.forEach((e) => {
      if (e.status === 'NEW') neu += 1;
      if (!e.assigned_to && e.status !== 'CLOSED' && e.status !== 'REJECTED') unassigned += 1;
      if (e.status === 'QUALIFIED') qualified += 1;
    });
    return { total: enquiries.length, neu, unassigned, qualified };
  }, [enquiries]);

  // Count of active secondary filters, for the "More filters" badge.
  const secondaryActive =
    (filters.source !== 'ALL' ? 1 : 0) +
    (filters.category !== 'ALL' ? 1 : 0) +
    (filters.assignedTo !== 'ALL' ? 1 : 0);

  useEffect(() => {
    (async () => {
      try {
        const f = await founderDb.listFoundersForSettings();
        setFounders(f.filter((x) => x.is_active));
      } catch {
        setFounders([]);
      }
    })();
  }, []);

  const sources = useMemo(() => {
    const src = new Set<string>();
    enquiries.forEach((e) => { if (e.source) src.add(e.source); });
    return Array.from(src).sort();
  }, [enquiries]);

  const categories = useMemo(() => {
    const cat = new Set<string>();
    enquiries.forEach((e) => { if (e.category) cat.add(e.category); });
    return Array.from(cat).sort();
  }, [enquiries]);

  useEffect(() => {
    if (detail) {
      setAssignId(detail.assigned_to || '');
      setStatusPick(detail.status);
      setVertical(resolveVertical(detail as any));
      setDealValue(
        detail.deal_value != null && Number.isFinite(Number(detail.deal_value))
          ? String(detail.deal_value)
          : '',
      );
    }
  }, [detail]);

  const sourceOpts = useMemo<{ key: string; label: string }[]>(() => [
    { key: 'ALL', label: 'All sources' },
    ...sources.map((s) => ({ key: s, label: s })),
  ], [sources]);

  const categoryOpts = useMemo<{ key: string; label: string }[]>(() => [
    { key: 'ALL', label: 'All categories' },
    ...categories.map((c) => ({ key: c, label: c })),
  ], [categories]);

  const assignedOpts = useMemo<{ key: string; label: string }[]>(() => [
    ...ASSIGNED_OPTS_BASE.map((o) => ({ key: o.key, label: o.label })),
    ...founders.map((f) => ({ key: f.id, label: f.full_name || f.email || f.id })),
  ], [founders]);

  const saveDetail = async () => {
    if (!detail) return;
    const dv = dealValue.trim() === '' ? null : parseFloat(dealValue.replace(/,/g, ''));
    if (dealValue.trim() !== '' && !Number.isFinite(dv as number)) {
      Alert.alert('Validation', 'Invalid deal value.');
      return;
    }
    setSaving(true);
    try {
      await founderDb.updateEnquiry(detail.id, {
        status: statusPick,
        assigned_to: assignId || null,
        deal_value: dv,
      });
      setDetail(null);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // Accept a lead → create its CRM account, then route the superAdmin into the
  // matching tenant onboarding form (or just convert for the generic case).
  const acceptAndOnboard = async () => {
    if (!detail || accepting) return;
    setAccepting(true);
    const lead = detail;
    try {
      const res = await crmService.acceptEnquiry(lead.id, vertical);
      const accountId = res?.accountId || null;
      setDetail(null);
      refresh();
      if (vertical === 'OTHER') {
        Alert.alert('Lead accepted', `${lead.name || 'Lead'} converted to a CRM customer.`);
        router.push('/(app)/console/crm' as any);
      } else {
        router.push({
          pathname: VERTICAL_ROUTE[vertical],
          params: buildPrefillParams(lead as any, accountId),
        } as any);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed to accept lead');
    } finally {
      setAccepting(false);
    }
  };

  // Rejecting is deliberately terminal — mark it REJECTED and leave it be.
  const rejectLead = async () => {
    if (!detail || saving) return;
    setSaving(true);
    try {
      await founderDb.updateEnquiry(detail.id, { status: 'REJECTED' });
      setDetail(null);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const isDark = colors.background === '#000000' || colors.background === '#1A1D2E';

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Enquiries" subtitle="Leads & pipeline" />
      <ScrollView
        style={styles.pad}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomTabPad, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Stat strip ─────────────────────────────────────────────── */}
        <View style={styles.statStrip}>
          {[
            { label: 'Total leads', value: stats.total, color: colors.primary, Icon: Inbox },
            { label: 'New', value: stats.neu, color: '#A78BFA', Icon: Activity },
            { label: 'Unassigned', value: stats.unassigned, color: colors.warning, Icon: UserRound },
            { label: 'Qualified', value: stats.qualified, color: '#00D4AD', Icon: UserRoundCheck },
          ].map(({ label, value, color, Icon }) => (
            <View
              key={label}
              style={[
                styles.statCard,
                { width: desktop ? undefined : '48%', flex: desktop ? 1 : undefined, borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(33,31,45,0.6)' : 'rgba(255,255,255,0.7)' },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${color}1F` }]}><Icon size={15} color={color} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
                <Text numberOfLines={1} style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Search + More filters ──────────────────────────────────── */}
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)' }]}>
            <Search size={16} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, email, phone…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.textPrimary, outlineWidth: 0 } as any]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}><X size={15} color={colors.textTertiary} /></Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            style={({ pressed }) => [
              styles.filterBtn,
              { borderColor: secondaryActive || showFilters ? colors.primary : colors.clayBorderColor, backgroundColor: secondaryActive || showFilters ? colors.primaryDim : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)') },
              ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
            ]}
          >
            <SlidersHorizontal size={15} color={secondaryActive || showFilters ? colors.primary : colors.textSecondary} />
            {!desktop ? null : <Text style={[styles.filterBtnTxt, { color: secondaryActive || showFilters ? colors.primary : colors.textSecondary }]}>Filters</Text>}
            {secondaryActive ? (
              <View style={[styles.filterCount, { backgroundColor: colors.primary }]}><Text style={styles.filterCountTxt}>{secondaryActive}</Text></View>
            ) : (
              <ChevronDown size={13} color={secondaryActive || showFilters ? colors.primary : colors.textTertiary} style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }} />
            )}
          </Pressable>
        </View>

        {/* Primary status filter — always visible */}
        <FilterChips
          options={STATUS_OPTS}
          value={filters.status}
          onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, status: k }))}
        />

        {/* Secondary filters — collapsed by default */}
        {showFilters ? (
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.advPanel, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.55)' }]}>
            <Text style={[styles.advLabel, { color: colors.textTertiary }]}>Source</Text>
            <FilterChips<string> options={sourceOpts} value={filters.source} onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, source: k }))} />
            <Text style={[styles.advLabel, { color: colors.textTertiary }]}>Category</Text>
            <FilterChips<string> options={categoryOpts} value={filters.category} onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, category: k }))} />
            <Text style={[styles.advLabel, { color: colors.textTertiary }]}>Assigned</Text>
            <FilterChips<string>
              options={assignedOpts}
              value={filters.assignedTo === 'ALL' || filters.assignedTo === 'UNASSIGNED' ? filters.assignedTo : String(filters.assignedTo)}
              onChange={(k) => setFilters((f: EnquiryListFilters) => ({ ...f, assignedTo: k as 'ALL' | 'UNASSIGNED' | string }))}
            />
          </Animated.View>
        ) : null}

        {/* ── Lead list ──────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonPulse key={i} width={desktop ? '48.5%' : '100%'} height={96} borderRadius={20} />
            ))}
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
              <Inbox size={26} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{query ? 'No matches' : 'No enquiries yet'}</Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {query ? 'Try a different search term or clear the filters.' : 'New leads from your websites will appear here.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {visible.map((e, index) => {
              const sm = STATUS_META[e.status] || STATUS_META.NEW;
              return (
                <Animated.View
                  key={e.id}
                  entering={index < 12 ? FadeInDown.delay(index * 30).duration(300) : undefined}
                  style={{ width: desktop ? '48.5%' : '100%' }}
                >
                  <Pressable
                    onPress={() => router.push(`/(app)/console/lead/${e.id}` as any)}
                    style={({ pressed }) => [
                      styles.card,
                      { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(33,31,45,0.66)' : 'rgba(255,255,255,0.72)', transform: [{ scale: pressed ? 0.985 : 1 }] },
                      Platform.OS === 'web' ? { boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.28)' : '0 8px 22px rgba(100,116,139,0.10)', transition: 'transform .16s ease, box-shadow .16s ease', cursor: 'pointer' } as any : {},
                      ...pressableWebStyles(pressed, { pressedOpacity: 0.97 }),
                    ]}
                  >
                    <LinearGradient
                      colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.25)']}
                      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
                    />
                    <View style={[styles.cardAccent, { backgroundColor: sm.color }]} />
                    <View style={styles.cardRow}>
                      <View style={[styles.avatar, { backgroundColor: `${sm.color}22`, borderColor: `${sm.color}55` }]}>
                        <Text style={[styles.avatarTxt, { color: sm.color }]}>{initials(e.name)}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Text numberOfLines={1} style={[styles.cardName, { color: colors.textPrimary }]}>{e.name || 'Unnamed lead'}</Text>
                          <View style={[styles.badge, { backgroundColor: `${sm.color}1F`, borderColor: `${sm.color}55` }]}>
                            <Text style={[styles.badgeTxt, { color: sm.color }]}>{sm.label}</Text>
                          </View>
                        </View>
                        <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.textTertiary }]}>
                          {(e.source || '—')} · {(e.category || '—')}{e.email ? ` · ${e.email}` : ''}
                        </Text>
                        {e.account_id ? <Text style={{ color: colors.primary, fontSize: 12 }}>Linked school prospect</Text> : <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Not linked to a school prospect</Text>}
                        <View style={styles.chipRow}>
                          <View style={[styles.miniChip, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                            {e.assigned_to ? <UserRoundCheck size={11} color={colors.primary} /> : <UserRound size={11} color={colors.textTertiary} />}
                            <Text numberOfLines={1} style={[styles.miniChipTxt, { color: e.assigned_to ? colors.primary : colors.textTertiary }]}>
                              {e.assigned_to ? (ownerNameById[e.assigned_to] || 'Assigned') : 'Unassigned'}
                            </Text>
                          </View>
                          <View style={styles.timeWrap}>
                            <Clock3 size={11} color={colors.textTertiary} />
                            <Text style={[styles.timeTxt, { color: colors.textTertiary }]}>{formatRelative(e.created_at)}</Text>
                          </View>
                        </View>
                      </View>
                      {e.deal_value != null ? (
                        <View style={styles.dealWrap}>
                          <Text style={[styles.dealTxt, { color: '#00D4AD' }]}>{founderDb.formatInr(Number(e.deal_value), 0)}</Text>
                          <Text style={[styles.dealLbl, { color: colors.textTertiary }]}>deal value</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!detail} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          {isDark && (
             <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          )}
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#12151F' : colors.surface, borderTopColor: isDark ? 'rgba(14,165,233,0.14)' : colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border }]} />

            <View style={styles.sheetHeaderGroup}>
               <LinearGradient colors={isDark ? ['rgba(14,165,233,0.18)', 'rgba(0,212,173,0.06)'] : ['rgba(14,165,233,0.1)', 'transparent']} style={styles.sheetIconWrap}>
                 <MessageCircle size={18} color="#0EA5E9" strokeWidth={2} />
               </LinearGradient>
               <View style={{ flex: 1, marginLeft: 14 }}>
                 <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Lead details</Text>
                 <Text style={[styles.sub, { color: colors.textSecondary }]}>
                   {detail?.email || '—'} · {detail?.phone || '—'}
                 </Text>
               </View>
               <Pressable onPress={() => setDetail(null)} style={({ pressed }) => [styles.sheetClose, !isDark && { backgroundColor: colors.surface }, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}>
                 <X color={colors.textSecondary} size={18} />
               </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {/* ASSIGNMENT */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Assign to founder</Text>
              <View style={styles.pillGridWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillGridInner}>
                   <Pressable
                     onPress={() => setAssignId('')}
                     style={({ pressed }) => [
                       styles.unitCard,
                       !assignId && styles.unitCardActive,
                       !isDark && { borderColor: !assignId ? '#0EA5E9' : colors.border, backgroundColor: !assignId ? 'rgba(14,165,233,0.06)' : colors.surface },
                       ...pressableWebStyles(pressed, { pressedOpacity: 0.7 })
                     ]}
                   >
                     <View style={[styles.unitIconCircle, !assignId && { backgroundColor: 'transparent' }]}>
                       {!assignId && <LinearGradient colors={isDark ? ['rgba(14,165,233,0.25)', 'transparent'] : ['rgba(14,165,233,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />}
                       <UserRound size={13} color={!assignId ? (isDark ? '#38BDF8' : '#0284C7') : colors.textSecondary} />
                     </View>
                     <Text style={[styles.unitLabel, { color: !assignId ? (isDark ? '#38BDF8' : '#0284C7') : colors.textPrimary }]}>Unassigned</Text>
                     {!assignId && <View style={styles.unitActiveDot} />}
                   </Pressable>
                   {founders.map((f) => {
                     const active = assignId === f.id;
                     return (
                       <Pressable
                         key={f.id}
                         onPress={() => setAssignId(f.id)}
                         style={({ pressed }) => [
                           styles.unitCard,
                           active && styles.unitCardActive,
                           !isDark && { borderColor: active ? '#0EA5E9' : colors.border, backgroundColor: active ? 'rgba(14,165,233,0.06)' : colors.surface },
                           ...pressableWebStyles(pressed, { pressedOpacity: 0.7 })
                         ]}
                       >
                         <View style={[styles.unitIconCircle, active && { backgroundColor: 'transparent' }]}>
                           {active && <LinearGradient colors={isDark ? ['rgba(14,165,233,0.25)', 'transparent'] : ['rgba(14,165,233,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />}
                           <UserRound size={13} color={active ? (isDark ? '#38BDF8' : '#0284C7') : colors.textSecondary} />
                         </View>
                         <Text style={[styles.unitLabel, { color: active ? (isDark ? '#38BDF8' : '#0284C7') : colors.textPrimary }]}>{f.full_name || f.email || f.id}</Text>
                         {active && <View style={styles.unitActiveDot} />}
                       </Pressable>
                     )
                   })}
                </ScrollView>
              </View>

              {/* STATUS */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={styles.statusGrid}>
                 {(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'REJECTED'] as EnquiryStatus[]).map((s) => {
                   const active = statusPick === s;
                   const sColor = s === 'QUALIFIED' ? '#00D4AD' : s === 'CLOSED' ? '#38BDF8' : s === 'REJECTED' ? '#FF6B7A' : '#A78BFA';
                   return (
                     <Pressable
                       key={s}
                       onPress={() => setStatusPick(s)}
                       style={({ pressed }) => [
                         styles.statusChip,
                         active
                            ? { backgroundColor: `rgba(${sColor === '#00D4AD' ? '0,212,173' : sColor === '#38BDF8' ? '56,189,248' : sColor === '#FF6B7A' ? '255,107,122' : '167,139,250'},0.15)`, borderColor: sColor }
                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.glassBackground, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
                         ...pressableWebStyles(pressed, { pressedOpacity: 0.75 })
                       ]}
                     >
                        <Text style={[styles.statusChipLbl, { color: active ? sColor : isDark ? 'rgba(255,255,255,0.65)' : colors.textSecondary }]}>{s}</Text>
                     </Pressable>
                   )
                 })}
              </View>

              <View style={{ marginTop: 8 }}>
                <Input
                  label="Deal value (₹)"
                  value={dealValue}
                  onChangeText={setDealValue}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              </View>

              {/* ACCEPT / ONBOARD */}
              <View style={[styles.onboardBlock, { borderColor: isDark ? 'rgba(0,212,173,0.22)' : colors.border, backgroundColor: isDark ? 'rgba(0,212,173,0.05)' : colors.glassBackground }]}>
                <View style={styles.onboardHeader}>
                  <Rocket size={15} color="#00D4AD" />
                  <Text style={[styles.onboardTitle, { color: colors.textPrimary }]}>Accept & onboard</Text>
                </View>
                <Text style={[styles.onboardHint, { color: colors.textSecondary }]}>
                  Route this lead to a service tenant with its details pre-filled. You finish the rest.
                </Text>
                <View style={styles.verticalGrid}>
                  {VERTICAL_OPTS.map(({ key, label, Icon }) => {
                    const active = vertical === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setVertical(key)}
                        style={({ pressed }) => [
                          styles.verticalChip,
                          active
                            ? { backgroundColor: 'rgba(0,212,173,0.15)', borderColor: '#00D4AD' }
                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
                          ...pressableWebStyles(pressed, { pressedOpacity: 0.8 }),
                        ]}
                      >
                        <Icon size={14} color={active ? '#00D4AD' : colors.textSecondary} />
                        <Text style={[styles.verticalChipLbl, { color: active ? '#00D4AD' : colors.textSecondary }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={acceptAndOnboard}
                  disabled={accepting}
                  style={({ pressed }) => [{ marginTop: 12 }, ...pressableWebStyles(pressed, { disabled: accepting, pressedOpacity: 0.85 })]}
                >
                  <LinearGradient colors={['#059669', '#00D4AD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}>
                    <Rocket size={16} color="#fff" />
                    <Text style={styles.acceptTxt}>
                      {accepting ? 'Accepting…' : vertical === 'OTHER' ? 'Accept & convert' : `Accept → ${VERTICAL_LABELS[vertical]}`}
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={rejectLead}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.rejectBtn,
                    { borderColor: isDark ? 'rgba(255,107,122,0.35)' : colors.border },
                    ...pressableWebStyles(pressed, { disabled: saving, pressedOpacity: 0.8 }),
                  ]}
                >
                  <Text style={[styles.rejectTxt, { color: '#FF6B7A' }]}>Reject lead</Text>
                </Pressable>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setDetail(null)}
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
                  onPress={saveDetail}
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
                    <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save changes'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: 0, paddingTop: 8 },

  // Stat strip
  statStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, minWidth: 130 },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },

  // Toolbar
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  filterBtnTxt: { fontSize: 13, fontWeight: '700' },
  filterCount: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Advanced filter panel
  advPanel: { marginTop: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingBottom: 10 },
  advLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 10, marginBottom: 2 },

  // Lead grid + card
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  card: { borderRadius: 20, borderWidth: 1, padding: 15, paddingLeft: 18, overflow: 'hidden' },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1 },
  badgeTxt: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  cardMeta: { fontSize: 11.5, marginTop: 4, fontWeight: '500' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  miniChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, borderWidth: 1, maxWidth: 170 },
  miniChipTxt: { fontSize: 10.5, fontWeight: '700', flexShrink: 1 },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeTxt: { fontSize: 10.5, fontWeight: '600' },
  dealWrap: { alignItems: 'flex-end' },
  dealTxt: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  dealLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },

  // Empty state
  empty: { alignItems: 'center', gap: 10, marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#12151F',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 36,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '92%',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeaderGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  sheetIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 2, marginBottom: 0 },
  
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  
  pillGridWrap: { marginBottom: 18, marginHorizontal: -24 },
  pillGridInner: { paddingHorizontal: 24, paddingBottom: 4, gap: 10 },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    paddingRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    position: 'relative',
    overflow: 'hidden',
  },
  unitCardActive: {
    borderColor: 'rgba(14,165,233,0.5)',
    backgroundColor: 'rgba(14,165,233,0.1)',
  },
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
  unitActiveDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#0EA5E9' },
  
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statusChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusChipLbl: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  
  onboardBlock: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  onboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onboardTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  onboardHint: { fontSize: 12, marginTop: 6, marginBottom: 12, lineHeight: 17 },
  verticalGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  verticalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  verticalChipLbl: { fontSize: 12, fontWeight: '700' },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  acceptTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  rejectBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  rejectTxt: { fontWeight: '700', fontSize: 13 },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelTxt: { fontWeight: '700', fontSize: 14 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default function EnquiriesScreen() {
  const params = useLocalSearchParams<{ metric?: string; period?: string; timezone?: string; label?: string; stage?: string }>();
  const metric = firstParam(params.metric);
  if (!metric) return <LegacyEnquiryBrowser />;
  return (
    <SalesMetricList
      metric={metric}
      period={firstParam(params.period) || 'month'}
      timezone={firstParam(params.timezone) || 'Asia/Kolkata'}
      label={firstParam(params.label) || metric}
      stage={firstParam(params.stage) || undefined}
    />
  );
}
