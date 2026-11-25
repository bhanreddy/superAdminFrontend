import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Check, ChevronRight, CircleHelp, GraduationCap, Layers, LockKeyhole, Power, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react-native';
import { superAdminApi, SchoolFeature } from '../../../../src/services/apiService';
import { useFounderAuth } from '../../../../src/hooks/useFounderAuth';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useCluster } from '../../../../src/contexts/ClusterContext';
import { PERMISSIONS } from '../../../../src/constants/rbac';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { brandColors } from '../../../../src/constants/experienceColors';
import { borderRadius, workspaceUi } from '../../../../src/constants/layout';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { MotionPressable } from '../../../../src/components/ui/MotionPressable';
import { Skeleton } from '../../../../src/components/ui/Skeleton';
import { EmptyState } from '../../../../src/components/ui/EmptyState';

type Status = 'all' | 'enabled' | 'disabled';
const categoryName = (feature: SchoolFeature) => feature.scope === 'portal' ? 'Student portal'
  : ({ academics: 'Academics', intelligence: 'Intelligence', operations: 'Operations', communication: 'Communication', finance: 'Finance', security: 'Security', core: 'Core' }[feature.category || ''] || 'School features');
const iconFor = (feature: SchoolFeature) => /diary|lms|curriculum|academic/.test(feature.key) ? BookOpen
  : /ai|intelligence|analytics/.test(feature.key) ? Sparkles : feature.scope === 'portal' ? GraduationCap : Layers;

const FeatureCard = memo(function FeatureCard({ feature, parentLabel, busy, saving, canWrite, onToggle, onReset }: {
  feature: SchoolFeature; parentLabel?: string; busy: boolean; saving: boolean; canWrite: boolean;
  onToggle: (feature: SchoolFeature, enabled: boolean) => void; onReset: (feature: SchoolFeature) => void;
}) {
  const { colors } = useTheme();
  const Icon = iconFor(feature);
  const blocked = !!feature.blocked_by;
  return <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: feature.enabled ? colors.info : colors.borderSubtle }]}>
    <View style={styles.cardTop}>
      <View style={[styles.featureIcon, { backgroundColor: feature.enabled ? colors.infoDim : colors.surface }]}><Icon size={21} color={feature.enabled ? colors.info : colors.textSecondary} /></View>
      <View style={[styles.pill, { backgroundColor: feature.enabled ? colors.infoDim : colors.surface }]}>
        <View style={[styles.dot, { backgroundColor: feature.enabled ? colors.info : colors.textTertiary }]} />
        <Text style={[styles.pillText, { color: feature.enabled ? colors.info : colors.textSecondary }]}>{feature.enabled ? 'Enabled' : 'Disabled'}</Text>
      </View>
    </View>
    <Text style={[styles.category, { color: colors.textTertiary }]}>{categoryName(feature)}</Text>
    <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{feature.label}</Text>
    <Text style={[styles.description, { color: colors.textSecondary }]}>{feature.description || (feature.scope === 'portal' ? 'Control this entry in the student and parent experience.' : 'Manage access to this module for everyone at this school.')}</Text>
    {blocked && <View style={[styles.parentNotice, { backgroundColor: colors.warningDim }]}><LockKeyhole size={13} color={colors.warning} /><Text style={[styles.parentText, { color: colors.warning }]}>Enable {parentLabel || 'the school module'} first</Text></View>}
    {feature.available === false && <Text style={[styles.note, { color: colors.warning }]}>Currently unavailable in the platform release.</Text>}
    <View style={[styles.cardBottom, { borderTopColor: colors.borderSubtle }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.scope, { color: colors.textPrimary }]}>{feature.scope === 'school' ? 'School-wide access' : 'Student portal access'}</Text>
        <View style={styles.sourceRow}>
          {saving ? <><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.note, { color: colors.primary }]}>Saving…</Text></>
            : <Text style={[styles.note, { color: colors.textTertiary }]}>{feature.source === 'overridden' ? 'Custom setting' : 'Disabled by default'}</Text>}
          {feature.source === 'overridden' && canWrite && !blocked && <MotionPressable accessibilityRole="button" accessibilityLabel={`Reset ${feature.label}`} disabled={busy} onPress={() => onReset(feature)} style={styles.reset}><RotateCcw size={12} color={colors.textSecondary} /><Text style={[styles.note, { color: colors.textSecondary }]}>Reset</Text></MotionPressable>}
        </View>
      </View>
      <Switch accessibilityLabel={`${feature.label} ${feature.scope === 'school' ? 'school-wide' : 'student portal'}`} accessibilityHint={blocked ? `Enable ${parentLabel} first` : 'Saves immediately for this school'} value={feature.enabled}
        disabled={!canWrite || busy || blocked} onValueChange={next => onToggle(feature, next)} trackColor={{ false: colors.border, true: colors.info }} thumbColor={colors.card} />
    </View>
  </View>;
});

export default function SchoolFeatureFlagsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schoolId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { selectedCluster } = useCluster();
  const clusterId = selectedCluster?.cluster_id;
  const { can } = useAuth();
  const { isApprover } = useFounderAuth();
  const canWrite = can(PERMISSIONS.CONFIGS_MODIFY) && !isApprover;
  const wide = width >= 1120;
  const columns = width >= 850 ? 2 : 1;
  const [features, setFeatures] = useState<SchoolFeature[]>([]);
  const [school, setSchool] = useState<{ name: string; code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [category, setCategory] = useState('All categories');
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const epoch = useRef(0);
  const pending = useRef(false);
  const listRef = useRef<FlatList<SchoolFeature>>(null);
  const errorText = (e: any) => e?.response?.data?.error || 'The change could not be saved. Check your connection and try again.';

  const load = useCallback(async () => {
    const current = ++epoch.current;
    setLoading(true); setLoadError(null); setError(null); setFeatures([]); setSchool(null); pending.current = false; setSavingKey(null);
    if (!Number.isSafeInteger(schoolId) || schoolId <= 0) { setLoadError('This school link is invalid. Return to Schools and select a school.'); setLoading(false); return; }
    try {
      const response = await superAdminApi.getSchoolFeatures(schoolId);
      if (current !== epoch.current) return;
      setFeatures(response.features); setSchool(response.school || null);
    } catch (e: any) { if (current === epoch.current) setLoadError(e?.response?.data?.error || 'We could not load this school’s current feature settings.'); }
    finally { if (current === epoch.current) setLoading(false); }
  }, [schoolId, clusterId]);
  useEffect(() => { setSearch(''); setStatus('all'); setCategory('All categories'); setConfirm(null); setNotice(null); void load(); return () => { epoch.current++; }; }, [load]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 4500); return () => clearTimeout(timer); }, [notice]);

  const save = useCallback(async (feature: SchoolFeature | null, enabled?: boolean, reset = false) => {
    if (!canWrite || pending.current || feature?.blocked_by) return;
    pending.current = true; const current = epoch.current; setSavingKey(feature?.key || '*'); setError(null); setNotice(null); setConfirm(null);
    try {
      const result = !feature ? await superAdminApi.updateAllSchoolFeatures(schoolId, !!enabled)
        : reset ? await superAdminApi.resetSchoolFeature(schoolId, feature.key)
        : await superAdminApi.updateSchoolFeature(schoolId, feature.key, !!enabled);
      if (current !== epoch.current) return;
      setFeatures(result.features);
      setNotice(feature ? `${feature.label} ${reset ? 'reset to disabled' : enabled ? 'enabled' : 'disabled'}.` : `All optional features ${enabled ? 'enabled' : 'disabled'} for ${school?.name || 'this school'}.`);
    } catch (e: any) { if (current === epoch.current) { setError(errorText(e)); listRef.current?.scrollToOffset({ offset: 0, animated: true }); } }
    finally { if (current === epoch.current) { pending.current = false; setSavingKey(null); } }
  }, [canWrite, schoolId, school?.name]);
  const onToggle = useCallback((feature: SchoolFeature, enabled: boolean) => { void save(feature, enabled); }, [save]);
  const onReset = useCallback((feature: SchoolFeature) => { void save(feature, undefined, true); }, [save]);
  const optional = useMemo(() => features.filter(feature => feature.toggleable).sort((a, b) => {
    const priority = (f: SchoolFeature) => f.scope === 'school' && f.key === 'diary' ? 0 : f.scope === 'school' && f.key === 'curriculum_v2' ? 1 : 2;
    return priority(a) - priority(b);
  }), [features]);
  const enabledCount = optional.filter(feature => feature.enabled).length;
  const categories = useMemo(() => ['All categories', ...Array.from(new Set(optional.map(categoryName)))], [optional]);
  const filtered = useMemo(() => optional.filter(feature => (!search.trim() || `${feature.label} ${feature.description || ''} ${categoryName(feature)}`.toLowerCase().includes(search.trim().toLowerCase()))
    && (status === 'all' || feature.enabled === (status === 'enabled')) && (category === 'All categories' || categoryName(feature) === category)), [optional, search, status, category]);
  const byKey = useMemo(() => new Map(features.map(feature => [feature.key, feature])), [features]);
  const renderItem = useCallback(({ item }: { item: SchoolFeature }) => <View style={[styles.cardCell, { width: columns === 2 ? '50%' : '100%' }]}>
    <FeatureCard feature={item} parentLabel={byKey.get(item.blocked_by || '')?.label} busy={!!savingKey} saving={savingKey === item.key || savingKey === '*'} canWrite={canWrite} onToggle={onToggle} onReset={onReset} />
  </View>, [columns, byKey, savingKey, canWrite, onToggle, onReset]);

  const header = <View style={styles.headerContent}>
    <View style={styles.breadcrumb}><MotionPressable accessibilityRole="button" accessibilityLabel="Back to schools" onPress={() => router.push('/schools/' as any)} style={styles.back}><ArrowLeft size={16} color={colors.textSecondary} /><Text style={[styles.small, { color: colors.textSecondary }]}>Schools</Text></MotionPressable><ChevronRight size={13} color={colors.textTertiary} /><Text numberOfLines={1} style={[styles.small, { color: colors.textPrimary, flex: 1 }]}>{school?.name || `School ${schoolId}`}</Text><View style={[styles.pill, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSubtle }]}><ShieldCheck size={13} color={colors.info} /><Text style={[styles.pillText, { color: colors.textSecondary }]}>Superadmin</Text></View></View>
    <View style={[styles.hero, { backgroundColor: brandColors.navyDeep }, wide && styles.heroWide]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.eyebrow}><View style={[styles.heroIcon, { backgroundColor: brandColors.navyRaised }]}><SlidersHorizontal size={16} color={brandColors.honey} /></View><Text style={[styles.eyebrowText, { color: brandColors.onNavyMuted }]}>SCHOOL EXPERIENCE</Text></View>
        <Text accessibilityRole="header" style={[styles.title, { color: brandColors.onNavy }, width < 520 && { fontSize: 29, lineHeight: 36 }]}>Feature access</Text>
        <Text style={[styles.heroDescription, { color: brandColors.onNavyMuted }]}>Choose what {school?.name || 'this school'} can access. Every switch applies to this school alone.</Text>
        <View style={[styles.schoolChip, { borderColor: brandColors.navyLine }]}><GraduationCap size={15} color={brandColors.honey} /><Text style={[styles.schoolChipText, { color: brandColors.onNavy }]}>{school?.code || `School #${schoolId}`}</Text><View style={[styles.dot, { backgroundColor: brandColors.honey }]} /><Text style={[styles.small, { color: brandColors.onNavyMuted }]}>Features off by default</Text></View>
      </View>
      <View style={[styles.stats, wide && { width: 330, marginTop: 0, marginLeft: 36 }]}>
        {[{ label: 'Enabled', value: enabledCount, color: brandColors.honey }, { label: 'Disabled', value: optional.length - enabledCount, color: brandColors.onNavy }, { label: 'Available', value: optional.length, color: brandColors.onNavy }].map(stat => <View key={stat.label} style={[styles.stat, { borderColor: brandColors.navyLine }]}><Text style={[styles.statValue, { color: stat.color }]}>{loading ? '—' : stat.value.toString().padStart(2, '0')}</Text><Text style={[styles.statLabel, { color: brandColors.onNavyMuted }]}>{stat.label}</Text></View>)}
      </View>
    </View>
    <View style={[styles.policy, { backgroundColor: colors.infoDim, borderColor: colors.borderSubtle }]}><ShieldCheck size={18} color={colors.info} /><View style={{ flex: 1 }}><Text style={[styles.policyTitle, { color: colors.textPrimary }]}>Access is intentional.</Text><Text style={[styles.small, { color: colors.textSecondary }]}>Optional features stay off until you enable them. Home and Dashboard remain available.</Text></View></View>
    {!canWrite && <View style={[styles.feedback, { backgroundColor: colors.warningDim }]}><LockKeyhole size={17} color={colors.warning} /><Text style={[styles.small, { flex: 1, color: colors.warning }]}>{isApprover ? 'Approver access · You can review settings. A Founder or Superadmin can change them.' : 'Read-only access · You do not have permission to change school features.'}</Text></View>}
    {notice && <View accessibilityRole="alert" style={[styles.feedback, { backgroundColor: colors.successDim }]}><Check size={18} color={colors.success} /><Text style={[styles.small, { color: colors.success, flex: 1 }]}>{notice}</Text></View>}
    {error && <View accessibilityRole="alert" style={[styles.feedback, { backgroundColor: colors.errorDim }]}><CircleHelp size={18} color={colors.error} /><Text style={[styles.small, { color: colors.error, flex: 1 }]}>{error} Your previous settings are still shown.</Text><Button title="Dismiss" variant="ghost" size="sm" onPress={() => setError(null)} /></View>}
    <View style={[styles.sectionHeading, width < 560 && { alignItems: 'flex-start' }]}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textPrimary }]}>Feature library</Text><Text style={[styles.small, { color: colors.textSecondary }]}>School modules and student portal controls</Text></View>{canWrite && !loading && !loadError && <View style={styles.bulk}><Button title="Disable all" variant="ghost" size="sm" disabled={!!savingKey || !enabledCount} onPress={() => setConfirm(false)} /><Button title="Enable all" variant="outline" size="sm" disabled={!!savingKey || enabledCount === optional.length} onPress={() => setConfirm(true)} /></View>}</View>
    {!loadError && <>
      <View style={[styles.toolbar, width < 560 && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: 1, minWidth: 0 }}><Input accessibilityLabel="Search school features" placeholder="Search features…" value={search} onChangeText={setSearch} autoCapitalize="none" containerStyle={{ marginBottom: 0 }} /></View>
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>{(['all', 'enabled', 'disabled'] as Status[]).map(value => <MotionPressable key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.tab, status === value && { backgroundColor: colors.card }]}><Text style={[styles.tabText, { color: status === value ? colors.textPrimary : colors.textSecondary }]}>{value === 'all' ? 'All' : value === 'enabled' ? 'Enabled' : 'Disabled'}</Text></MotionPressable>)}</View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map(value => <MotionPressable key={value} accessibilityRole="button" accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={[styles.categoryChip, { borderColor: category === value ? colors.textPrimary : colors.borderSubtle, backgroundColor: category === value ? colors.textPrimary : colors.card }]}><Text style={[styles.categoryChipText, { color: category === value ? colors.card : colors.textSecondary }]}>{value}</Text></MotionPressable>)}</ScrollView>
      {!loading && <View style={styles.results}><Text style={[styles.small, { color: colors.textTertiary }]}>{filtered.length} {filtered.length === 1 ? 'feature' : 'features'}{status !== 'all' ? ` · ${status}` : ''}</Text><View style={styles.sourceRow}><View style={[styles.dot, { backgroundColor: colors.info }]} /><Text style={[styles.small, { color: colors.textTertiary }]}>Changes save automatically</Text></View></View>}
    </>}
  </View>;

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <FlatList ref={listRef} key={columns} data={loading || loadError ? [] : filtered} numColumns={columns} keyExtractor={feature => feature.key} renderItem={renderItem} ListHeaderComponent={header} keyboardShouldPersistTaps="handled" initialNumToRender={8} windowSize={5} contentContainerStyle={[styles.page, { paddingHorizontal: width < 600 ? workspaceUi.phoneGutter : workspaceUi.pageGutter }]}
      ListEmptyComponent={loading ? <View style={styles.skeletons}>{Array.from({ length: 4 }, (_, i) => <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}><Skeleton width={40} height={40} /><Skeleton width="65%" height={22} /><Skeleton width="90%" /><Skeleton width="75%" /></View>)}</View> : loadError ? <EmptyState title="Settings unavailable" description={loadError} icon={<CircleHelp size={32} color={colors.error} />} actionLabel="Retry loading" onAction={load} /> : <EmptyState title="No matching features" description="Try another search or clear the filters to see the full library." icon={<Search size={30} color={colors.textSecondary} />} actionLabel="Clear filters" onAction={() => { setSearch(''); setStatus('all'); setCategory('All categories'); }} />}
      ListFooterComponent={<View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}><LockKeyhole size={14} color={colors.textTertiary} /><Text style={[styles.small, { color: colors.textTertiary, flex: 1 }]}>Disabling a feature preserves its data. School-wide restrictions take priority over individual access.</Text></View>} />
    <Modal visible={confirm !== null} transparent animationType="fade" onRequestClose={() => setConfirm(null)}><View style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}><View accessibilityViewIsModal style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.modalTop}><View style={[styles.featureIcon, { backgroundColor: confirm ? colors.infoDim : colors.warningDim }]}><Power size={23} color={confirm ? colors.info : colors.warning} /></View><Button accessibilityLabel="Close confirmation" icon={<X size={20} color={colors.textSecondary} />} variant="ghost" onPress={() => setConfirm(null)} /></View><Text accessibilityRole="header" style={[styles.modalTitle, { color: colors.textPrimary }]}>{confirm ? 'Enable every optional feature?' : 'Disable every optional feature?'}</Text><Text style={[styles.description, { color: colors.textSecondary }]}>{confirm ? 'This gives this school access to every available module and student portal feature. Existing role permissions still apply.' : 'Everyone at this school will lose access to optional modules. Their data is preserved, and Home and Dashboard remain available.'}</Text><View style={[styles.confirmSchool, { backgroundColor: colors.surface }]}><GraduationCap size={20} color={colors.textSecondary} /><View style={{ flex: 1 }}><Text style={[styles.scope, { color: colors.textPrimary }]}>{school?.name || `School ${schoolId}`}</Text><Text style={[styles.small, { color: colors.textSecondary }]}>{optional.length} optional features · This school only</Text></View></View><View style={styles.modalActions}><Button title="Cancel" variant="ghost" onPress={() => setConfirm(null)} /><Button title={confirm ? 'Enable features' : 'Disable features'} variant={confirm ? 'primary' : 'danger'} onPress={() => { void save(null, !!confirm); }} /></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, page: { maxWidth: 1400, width: '100%', alignSelf: 'center', paddingTop: 20, paddingBottom: 32 }, headerContent: { paddingHorizontal: 6 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, small: { fontSize: 12, lineHeight: 19 },
  hero: { borderRadius: borderRadius.xl, padding: 28 }, heroWide: { flexDirection: 'row', alignItems: 'center', padding: 36 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }, eyebrowText: { fontSize: 10, fontWeight: '700', letterSpacing: 2 }, heroIcon: { padding: 8, borderRadius: 10 }, title: { fontSize: 38, lineHeight: 44, fontWeight: '600', letterSpacing: -1.2 }, heroDescription: { fontSize: 14, lineHeight: 23, marginTop: 14, maxWidth: 480 }, schoolChip: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', alignSelf: 'flex-start', marginTop: 22, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }, schoolChipText: { fontSize: 12, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: 12, marginTop: 26 }, stat: { flex: 1, borderLeftWidth: 1, paddingLeft: 16, paddingVertical: 8 }, statValue: { fontSize: 32, fontWeight: '500', letterSpacing: -1 }, statLabel: { fontSize: 12, marginTop: 8 },
  policy: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 14, marginTop: 16 }, policyTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 }, feedback: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 12 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 32, marginBottom: 20 }, sectionTitle: { ...workspaceUi.sectionTitle, fontSize: 22, lineHeight: 30, marginBottom: 4 }, bulk: { flexDirection: 'row', alignItems: 'center', gap: 8 }, toolbar: { flexDirection: 'row', alignItems: 'center', gap: 14 }, tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1 }, tab: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 10 }, tabText: { fontSize: 12, fontWeight: '600' }, categories: { gap: 8, paddingVertical: 16 }, categoryChip: { minHeight: 38, borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: 14, justifyContent: 'center' }, categoryChipText: { fontSize: 12, fontWeight: '500' }, results: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 2, paddingBottom: 14 },
  cardCell: { padding: 6 }, featureCard: { flex: 1, padding: 22, borderWidth: 1, borderRadius: workspaceUi.cardRadius }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: borderRadius.full }, pillText: { fontSize: 10, fontWeight: '600' }, dot: { width: 5, height: 5, borderRadius: 3 }, category: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }, featureTitle: { fontSize: 18, fontWeight: '600', letterSpacing: -0.35, lineHeight: 25, marginBottom: 8 }, description: { fontSize: 13, lineHeight: 21, flexGrow: 1 }, cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, marginTop: 22, paddingTop: 16 }, scope: { fontSize: 12, fontWeight: '600', lineHeight: 19 }, sourceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 3 }, note: { fontSize: 11, lineHeight: 17 }, reset: { flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 36, paddingHorizontal: 6 }, parentNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 }, parentText: { fontSize: 11, lineHeight: 17, flex: 1 },
  footer: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 20, marginHorizontal: 6, marginTop: 24, borderTopWidth: 1 }, skeletons: { gap: 12, padding: 6 }, skeletonCard: { borderWidth: 1, borderRadius: 20, padding: 22, gap: 18 }, modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 480, padding: 26, borderWidth: 1, borderRadius: 24 }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }, modalTitle: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5, lineHeight: 31, marginBottom: 12 }, confirmSchool: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, marginTop: 22 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
});
