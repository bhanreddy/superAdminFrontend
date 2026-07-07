import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { superAdminApi } from '../../../src/services/apiService';
import { pressableWebStyles } from '../../../src/utils/webPressable';
import { useToast } from '../../../src/components/ui/Toast';
import { INPUT_PLACEHOLDER_COLOR } from '../../../src/theme/styles';
import { ChevronDown, ChevronUp, Pencil, Trash2, Power, Link, FileText, Type, ImageIcon } from 'lucide-react-native';

export type DcgdContentRow = {
  id: number;
  program_id: number;
  title: string;
  link_url: string | null;
  pdf_url: string | null;
  image_url: string | null;
  content_body: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

import type { LucideIcon } from 'lucide-react-native';

/** Small badges showing what is attached */
function AttachedBadges({ c, colors }: { c: DcgdContentRow; colors: any }) {
  const items: { label: string; Icon: LucideIcon; color: string }[] = [];
  if (c.link_url) items.push({ label: 'Link', Icon: Link, color: '#3B82F6' });
  if (c.pdf_url) items.push({ label: 'PDF', Icon: FileText, color: '#EF4444' });
  if (c.content_body) items.push({ label: 'Text', Icon: Type, color: '#8B5CF6' });
  if (c.image_url) items.push({ label: 'Image', Icon: ImageIcon, color: '#10B981' });
  if (items.length === 0) {
    return (
      <View style={styles.badgeRow}>
        <View style={[styles.typeBadge, { borderColor: `${colors.textSecondary}40` }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Empty</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.badgeRow}>
      {items.map((b) => (
        <View key={b.label} style={[styles.typeBadge, { borderColor: b.color + '40' }]}>
          <b.Icon size={12} color={b.color} strokeWidth={2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: b.color }}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DcgdContentManagerScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ programId: string; programName: string }>();
  const programId = parseInt(params.programId || '0', 10);
  const programName = params.programName || 'Program';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DcgdContentRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DcgdContentRow | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formPdfUrl, setFormPdfUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formOrder, setFormOrder] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormTitle('');
    setFormLinkUrl('');
    setFormPdfUrl('');
    setFormImageUrl('');
    setFormBody('');
    setFormOrder('');
    setFormActive(true);
  };

  const loadAll = useCallback(async () => {
    if (!Number.isFinite(programId) || programId <= 0) return;
    setLoading(true);
    try {
      const rows = await superAdminApi.getDcgdProgramContent(programId);
      setItems(rows || []);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  }, [programId, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.display_order - b.display_order || a.id - b.id),
    [items],
  );

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOrder(String((items.reduce((m, p) => Math.max(m, p.display_order), 0) || 0) + 1));
    setModalOpen(true);
  };

  const openEdit = (c: DcgdContentRow) => {
    setEditing(c);
    setFormTitle(c.title);
    setFormLinkUrl(c.link_url || '');
    setFormPdfUrl(c.pdf_url || '');
    setFormImageUrl(c.image_url || '');
    setFormBody(c.content_body || '');
    setFormOrder(String(c.display_order));
    setFormActive(c.is_active);
    setModalOpen(true);
  };

  const saveItem = async () => {
    if (!formTitle.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    if (!formLinkUrl.trim() && !formPdfUrl.trim() && !formImageUrl.trim() && !formBody.trim()) {
      showToast('Please fill at least one content field', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        link_url: formLinkUrl.trim() || null,
        pdf_url: formPdfUrl.trim() || null,
        image_url: formImageUrl.trim() || null,
        content_body: formBody.trim() || null,
        display_order: parseInt(formOrder, 10) || 0,
        is_active: formActive,
      };

      if (editing) {
        const row = await superAdminApi.patchDcgdProgramContent(programId, editing.id, payload);
        setItems((prev) => prev.map((x) => (x.id === row.id ? row : x)));
        showToast('Content updated successfully', 'success');
      } else {
        const row = await superAdminApi.createDcgdProgramContent(programId, payload);
        setItems((prev) => [...prev, row]);
        showToast('Content created successfully', 'success');
      }
      setModalOpen(false);
      resetForm();
    } catch (e: any) {
      console.error('[DcgdContent] Save error:', e);
      const errMsg = e?.response?.data?.error || e?.message || 'Failed to save content';
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (c: DcgdContentRow) => {
    const next = !c.is_active;
    Alert.alert(next ? 'Activate' : 'Deactivate', `${next ? 'Show' : 'Hide'} "${c.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: next ? 'Activate' : 'Deactivate',
        style: next ? 'default' : 'destructive',
        onPress: async () => {
          try {
            const row = await superAdminApi.patchDcgdProgramContent(programId, c.id, {
              is_active: next,
            });
            setItems((prev) => prev.map((x) => (x.id === row.id ? row : x)));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Update failed');
          }
        },
      },
    ]);
  };

  const deleteItem = (c: DcgdContentRow) => {
    Alert.alert('Delete', `Permanently remove "${c.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await superAdminApi.deleteDcgdProgramContent(programId, c.id);
            setItems((prev) => prev.filter((x) => x.id !== c.id));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const moveItem = async (id: number, dir: -1 | 1) => {
    const idx = sorted.findIndex((p) => p.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sorted.length) return;
    const next = [...sorted];
    const t = next[idx];
    next[idx] = next[swap];
    next[swap] = t;
    const ordered_ids = next.map((p) => p.id);
    try {
      const rows = await superAdminApi.reorderDcgdProgramContent(programId, ordered_ids);
      setItems(rows);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Reorder failed');
    }
  };

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        backgroundColor: colors.surface,
        borderColor: isDark ? colors.border : '#CBD5E1',
        color: colors.textPrimary,
      },
    ],
    [colors.surface, colors.border, colors.textPrimary, isDark],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={`Content · ${programName}`}
        subtitle="Manage content items for this program track"
        showBack
        showThemeToggle
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {sorted.length} content item{sorted.length !== 1 ? 's' : ''}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                { borderColor: colors.primary },
                ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
              ]}
              onPress={openCreate}
            >
              <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add</Text>
            </Pressable>
          </View>

          {sorted.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyIcon]}>📭</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No content yet</Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Add links, PDFs, text blocks, or images that students will see when they tap this
                program.
              </Text>
            </View>
          ) : null}

          {sorted.map((c, i) => (
            <View
              key={c.id}
              style={[
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: c.is_active ? 1 : 0.6,
                },
              ]}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {c.title}
                </Text>
                <AttachedBadges c={c} colors={colors} />
                <Text style={[styles.statusLine, { color: c.is_active ? colors.success : colors.error }]}>
                  {c.is_active ? 'Active' : 'Inactive'} · order {c.display_order}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable style={styles.iconBtn} onPress={() => moveItem(c.id, -1)} disabled={i === 0}>
                  <ChevronUp size={22} color={i === 0 ? colors.border : colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => moveItem(c.id, 1)}
                  disabled={i === sorted.length - 1}
                >
                  <ChevronDown
                    size={22}
                    color={i === sorted.length - 1 ? colors.border : colors.primary}
                  />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => openEdit(c)}>
                  <Pencil size={20} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => toggleActive(c)}>
                  <Power size={20} color={colors.warning} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => deleteItem(c)}>
                  <Trash2 size={20} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editing ? 'Edit content item' : 'New content item'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Content title"
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                style={inputStyle}
              />

              {/* Link URL */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabel}>
                  <Link size={15} color="#3B82F6" />
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0, marginLeft: 6 }]}>
                    LINK / URL
                  </Text>
                </View>
                <TextInput
                  value={formLinkUrl}
                  onChangeText={setFormLinkUrl}
                  placeholder="https://youtube.com/..."
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  style={inputStyle}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* PDF URL */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabel}>
                  <FileText size={15} color="#EF4444" />
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0, marginLeft: 6 }]}>
                    PDF / DOCUMENT URL
                  </Text>
                </View>
                <TextInput
                  value={formPdfUrl}
                  onChangeText={setFormPdfUrl}
                  placeholder="https://example.com/document.pdf"
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  style={inputStyle}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Image URL */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabel}>
                  <ImageIcon size={15} color="#10B981" />
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0, marginLeft: 6 }]}>
                    IMAGE URL
                  </Text>
                </View>
                <TextInput
                  value={formImageUrl}
                  onChangeText={setFormImageUrl}
                  placeholder="https://example.com/banner.jpg"
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  style={inputStyle}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Text content */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabel}>
                  <Type size={15} color="#8B5CF6" />
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0, marginLeft: 6 }]}>
                    TEXT CONTENT
                  </Text>
                </View>
                <TextInput
                  value={formBody}
                  onChangeText={setFormBody}
                  placeholder="Write or paste text content here..."
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  style={[inputStyle, styles.bodyInput]}
                  multiline
                />
              </View>

              {/* Display order */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 4 }]}>
                DISPLAY ORDER
              </Text>
              <TextInput
                value={formOrder}
                onChangeText={setFormOrder}
                placeholder="1"
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                style={inputStyle}
                keyboardType="number-pad"
              />

              {/* Active toggle */}
              <View style={styles.switchRow}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Active</Text>
                <Switch value={formActive} onValueChange={setFormActive} />
              </View>

              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Fill any combination of link, PDF, image, and text. Students see all provided fields under one card.
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { flex: 1, backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
                ]}
                onPress={saveItem}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  addBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  rowMain: { marginBottom: 10 },
  rowTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusLine: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: { padding: 8 },
  /* ── Modal ── */
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  bodyInput: { minHeight: 100, textAlignVertical: 'top' },
  fieldGroup: { marginTop: 14 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 18,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
