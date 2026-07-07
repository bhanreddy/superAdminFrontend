import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { superAdminApi } from '../../../src/services/apiService';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Drawer } from '../../../src/components/ui/Drawer';
import { Input } from '../../../src/components/ui/Input';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { KebabMenu } from '../../../src/components/ui/KebabMenu';
import { useToast } from '../../../src/components/ui/Toast';
import {
  ChevronDown, ChevronUp, Pencil, Trash2, Power, FolderOpen, Plus, BookOpen, Save, Settings,
  ChevronRight,
} from 'lucide-react-native';

export type DcgdProgramRow = {
  id: number; name: string; description: string; icon: string;
  display_order: number; is_active: boolean; created_at?: string; updated_at?: string;
};
export type DcgdSettingsRow = {
  id: number; page_title: string; subtitle: string; is_visible: boolean;
};

export default function DcgdManageScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [programs, setPrograms] = useState<DcgdProgramRow[]>([]);
  const [settings, setSettings] = useState<DcgdSettingsRow | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [visible, setVisible] = useState(true);

  // Drawer form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DcgdProgramRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formOrder, setFormOrder] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [savingProgram, setSavingProgram] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prows, srow] = await Promise.all([
        superAdminApi.getDcgdPrograms(), superAdminApi.getDcgdSettings(),
      ]);
      setPrograms(prows || []);
      setSettings(srow);
      if (srow) { setPageTitle(srow.page_title || ''); setSubtitle(srow.subtitle || ''); setVisible(!!srow.is_visible); }
    } catch (e: any) { showToast(e?.message || 'Failed to load DCGD data', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sortedPrograms = useMemo(
    () => [...programs].sort((a, b) => a.display_order - b.display_order || a.id - b.id),
    [programs],
  );

  // ── Settings ────────────────────────────────────────────────────────────
  const savePageSettings = async () => {
    setSavingSettings(true);
    try {
      const row = await superAdminApi.updateDcgdSettings({ page_title: pageTitle.trim() || 'DCGD', subtitle, is_visible: visible });
      setSettings(row);
      showToast('Page settings updated', 'success');
    } catch (e: any) { showToast(e?.message || 'Save failed', 'error'); }
    finally { setSavingSettings(false); }
  };

  // ── Create / Edit ──────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null); setFormName(''); setFormDesc(''); setFormIcon('ribbon-outline');
    setFormOrder(String((programs.reduce((m, p) => Math.max(m, p.display_order), 0) || 0) + 1));
    setFormActive(true); setDrawerOpen(true);
  };
  const openEdit = (p: DcgdProgramRow) => {
    setEditing(p); setFormName(p.name); setFormDesc(p.description || '');
    setFormIcon(p.icon || 'ribbon-outline'); setFormOrder(String(p.display_order));
    setFormActive(p.is_active); setDrawerOpen(true);
  };

  const saveProgram = async () => {
    if (!formName.trim()) { showToast('Name is required', 'warning'); return; }
    setSavingProgram(true);
    try {
      const orderNum = parseInt(formOrder, 10);
      if (editing) {
        const row = await superAdminApi.patchDcgdProgram(editing.id, {
          name: formName.trim(), description: formDesc, icon: formIcon.trim() || 'ribbon-outline',
          display_order: Number.isFinite(orderNum) ? orderNum : editing.display_order, is_active: formActive,
        });
        setPrograms((prev) => prev.map((x) => (x.id === row.id ? row : x)));
        showToast('Program updated', 'success');
      } else {
        const row = await superAdminApi.createDcgdProgram({
          name: formName.trim(), description: formDesc, icon: formIcon.trim() || 'ribbon-outline',
          display_order: Number.isFinite(orderNum) ? orderNum : undefined, is_active: formActive,
        });
        setPrograms((prev) => [...prev, row]);
        showToast('Program created', 'success');
      }
      setDrawerOpen(false);
    } catch (e: any) { showToast(e?.message || 'Save failed', 'error'); }
    finally { setSavingProgram(false); }
  };

  // ── Toggle / Delete ────────────────────────────────────────────────────
  const toggleProgram = async (p: DcgdProgramRow) => {
    try {
      const row = await superAdminApi.patchDcgdProgram(p.id, { is_active: !p.is_active });
      setPrograms((prev) => prev.map((x) => (x.id === row.id ? row : x)));
      showToast(`${p.name} ${p.is_active ? 'deactivated' : 'activated'}`, 'success');
    } catch (e: any) { showToast(e?.message || 'Update failed', 'error'); }
  };

  const deleteProgram = async (p: DcgdProgramRow) => {
    try {
      await superAdminApi.deleteDcgdProgram(p.id);
      setPrograms((prev) => prev.filter((x) => x.id !== p.id));
      showToast(`${p.name} deleted`, 'success');
    } catch (e: any) { showToast(e?.message || 'Delete failed', 'error'); }
  };

  // ── Reorder ────────────────────────────────────────────────────────────
  const moveProgram = async (id: number, dir: -1 | 1) => {
    const idx = sortedPrograms.findIndex((p) => p.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sortedPrograms.length) return;
    const next = [...sortedPrograms];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    try {
      const rows = await superAdminApi.reorderDcgdPrograms(next.map((p) => p.id));
      setPrograms(rows);
    } catch (e: any) { showToast(e?.message || 'Reorder failed', 'error'); }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="DCGD"
        subtitle="Microservices · department programs"
        showBack
        rightAction={<Button title="Add Program" leftIcon={<Plus size={16} color="#fff" />} size="sm" onPress={openCreate} />}
      />

      {loading ? (
        <View style={{ gap: 12, marginTop: 8, paddingHorizontal: 16 }}>
          <Skeleton height={180} borderRadius={12} />
          {[1,2,3].map(i => <Skeleton key={i} height={72} borderRadius={12} />)}
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          {/* Page Settings */}
          <Card variant="elevated">
            <View style={st.settingsHeader}>
              <View style={[st.settingsIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : `${colors.primary}10` }]}>
                <Settings size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.settingsTitle, { color: colors.textPrimary }]}>Page settings</Text>
                <Text style={[st.settingsSubtitle, { color: colors.textSecondary }]}>Title and visibility on student devices</Text>
              </View>
            </View>
            <Input label="Title" value={pageTitle} onChangeText={setPageTitle} placeholder="DCGD" />
            <Input label="Subtitle" value={subtitle} onChangeText={setSubtitle} placeholder="Department subtitle" />
            <View style={st.switchRow}>
              <Text style={[st.switchLabel, { color: colors.textSecondary }]}>Visible to students</Text>
              <Switch value={visible} onValueChange={setVisible} trackColor={{ false: colors.border, true: colors.primaryDim }} thumbColor={visible ? colors.primary : colors.textTertiary} />
            </View>
            <Button title="Save Settings" variant="secondary" loading={savingSettings} onPress={savePageSettings} leftIcon={<Save size={14} color={colors.textPrimary} />} size="sm" style={{ alignSelf: 'flex-start', marginTop: 8 }} />
          </Card>

          {/* Programs */}
          <View style={st.programsHeader}>
            <Text style={[st.sectionTitle, { color: colors.textPrimary }]}>Programs</Text>
            <View style={[st.countChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
              <Text style={[st.countChipText, { color: colors.textSecondary }]}>{sortedPrograms.length}</Text>
            </View>
          </View>

          {sortedPrograms.length === 0 ? (
            <EmptyState title="No programs" description="Create your first DCGD program" actionLabel="Add Program" onAction={openCreate} icon={<BookOpen size={32} color={colors.textTertiary} />} />
          ) : (
            <View style={{ gap: 8 }}>
              {sortedPrograms.map((p, idx) => (
                <Card key={p.id} variant="default" noPadding>
                  <Pressable
                    onPress={() => router.push(`/(app)/microservices/dcgdContent?programId=${p.id}&programName=${encodeURIComponent(p.name)}` as any)}
                    style={({ pressed }) => [st.programRow, { opacity: pressed ? 0.9 : 1 }, Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}]}
                  >
                    {/* Reorder */}
                    <View style={st.reorderCol}>
                      <Pressable onPress={() => moveProgram(p.id, -1)} disabled={idx === 0} style={[st.reorderBtn, { opacity: idx === 0 ? 0.2 : 1 }]} hitSlop={6}>
                        <ChevronUp size={14} color={colors.textSecondary} />
                      </Pressable>
                      <Text style={[st.orderNum, { color: colors.textTertiary }]}>{p.display_order}</Text>
                      <Pressable onPress={() => moveProgram(p.id, 1)} disabled={idx === sortedPrograms.length - 1} style={[st.reorderBtn, { opacity: idx === sortedPrograms.length - 1 ? 0.2 : 1 }]} hitSlop={6}>
                        <ChevronDown size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    {/* Info */}
                    <View style={st.programInfo}>
                      <Text style={[st.programName, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                      {p.description ? <Text style={[st.programDesc, { color: colors.textSecondary }]} numberOfLines={1}>{p.description}</Text> : null}
                    </View>

                    <Badge label={p.is_active ? 'Active' : 'Inactive'} variant={p.is_active ? 'success' : 'error'} size="sm" dot />

                    <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} style={{ opacity: 0.65 }} />

                    {/* Actions */}
                    <KebabMenu items={[
                      { label: 'Edit', icon: <Pencil size={14} color={colors.textSecondary} />, onPress: () => openEdit(p) },
                      { label: 'Content', icon: <FolderOpen size={14} color={colors.textSecondary} />, onPress: () => router.push(`/(app)/microservices/dcgdContent?programId=${p.id}&programName=${encodeURIComponent(p.name)}` as any) },
                      { label: p.is_active ? 'Deactivate' : 'Activate', icon: <Power size={14} color={p.is_active ? colors.error : colors.success} />, onPress: () => toggleProgram(p), danger: p.is_active },
                      { label: 'Delete', icon: <Trash2 size={14} color={colors.error} />, onPress: () => deleteProgram(p), danger: true },
                    ]} />
                  </Pressable>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create/Edit Drawer */}
      <Drawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit Program' : 'New Program'}>
        <Input label="Program Name" value={formName} onChangeText={setFormName} placeholder="e.g. Sports Academy" />
        <Input label="Description" value={formDesc} onChangeText={setFormDesc} placeholder="Optional description" multiline />
        <Input label="Icon Name" value={formIcon} onChangeText={setFormIcon} placeholder="e.g. ribbon-outline" />
        <Input label="Display Order" value={formOrder} onChangeText={setFormOrder} placeholder="1" keyboardType="numeric" />
        <View style={st.switchRow}>
          <Text style={[st.switchLabel, { color: colors.textSecondary }]}>Active</Text>
          <Switch value={formActive} onValueChange={setFormActive} trackColor={{ false: colors.border, true: colors.primaryDim }} thumbColor={formActive ? colors.primary : colors.textTertiary} />
        </View>
        <View style={st.drawerActions}>
          <Button title="Cancel" variant="ghost" onPress={() => setDrawerOpen(false)} />
          <Button title={editing ? 'Save Changes' : 'Create Program'} loading={savingProgram} onPress={saveProgram} />
        </View>
      </Drawer>
    </View>
  );
}

const st = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 18, paddingTop: 4 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  settingsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  settingsSubtitle: { fontSize: 13, fontWeight: '400', marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  programsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.35 },
  countChip: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  countChipText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  programRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14, gap: 10 },
  reorderCol: { alignItems: 'center', gap: 2 },
  reorderBtn: { padding: 2 },
  orderNum: { fontSize: 10, fontWeight: '600' },
  programInfo: { flex: 1 },
  programName: { fontSize: 14, fontWeight: '500' },
  programDesc: { fontSize: 12, marginTop: 2 },
  drawerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
});
