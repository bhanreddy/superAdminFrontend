import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  CheckSquare,
  School,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  ChevronRight,
  X,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import type { ChecklistItem } from '../../services/checklistService';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { PERMISSIONS } from '../../constants/rbac';
import { bottomTabPad } from '../founder/founderUi';

interface SchoolItem {
  id: number;
  name: string;
  code: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  CONTRACT_AND_SETUP: '1. Foundation, DNS & Portal Setup',
  DATA_INGESTION: '2. Student, Staff & Transport Data Ingestion',
  HARDWARE_AND_INFRA: '3. Hardware, RFID & GPS Integration',
  APP_BUILD: '4. White-Label Mobile App Builds',
  TRAINING_AND_GO_LIVE: '5. Staff Training & Production Launch',
};

const STATUS_ICONS: Record<string, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: 'Not Started', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
  IN_PROGRESS: { label: 'In Progress', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' },
  COMPLETED: { label: 'Completed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  BLOCKED: { label: 'Blocked', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  NOT_APPLICABLE: { label: 'N/A', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.12)' },
};

export default function ChecklistScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { user, role, can } = useAuth();
  const params = useLocalSearchParams<{ schoolId?: string }>();

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [schoolReload, setSchoolReload] = useState(0);
  const requestId = useRef(0);
  const selectedSchoolRef = useRef(selectedSchoolId);
  selectedSchoolRef.current = selectedSchoolId;

  // Edit Item Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeItem, setActiveItem] = useState<ChecklistItem | null>(null);
  const [itemStatus, setItemStatus] = useState<ChecklistItem['status']>('IN_PROGRESS');
  const [blockerReason, setBlockerReason] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Initial load: Schools list
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        setSchoolsError(null);
        const schRes: any = await superAdminApi.getSchools();
        const schList: SchoolItem[] = Array.isArray(schRes) ? schRes : Array.isArray(schRes?.data) ? schRes.data : [];
        if (cancelled) return;
        setSchools(schList);

        const requestedId = Number(params.schoolId);
        const initialId = schList.find((school) => school.id === requestedId)?.id ?? schList[0]?.id ?? null;
        setSelectedSchoolId(initialId);
      } catch (err) {
        if (!cancelled) setSchoolsError('Unable to load your schools. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [params.schoolId, schoolReload]);

  // Ignore responses from an earlier school selection or an unmounted screen.
  const loadChecklist = useCallback(async (sId: number) => {
    const currentRequest = ++requestId.current;
    setItemsLoading(true);
    setLoadError(null);
    setItems([]);
    setProgress({ total: 0, completed: 0, percentage: 0 });
    try {
      const res = await superAdminApi.getSchoolChecklist(sId);
      if (!res?.success) throw new Error('Unable to load checklist.');
      if (requestId.current !== currentRequest || selectedSchoolRef.current !== sId) return;
      setItems(res.data.items);
      setProgress(res.data.progress);
    } catch (err: any) {
      if (requestId.current === currentRequest && selectedSchoolRef.current === sId) {
        setLoadError(err?.response?.data?.error || err.message || 'Unable to load checklist.');
      }
    } finally {
      if (requestId.current === currentRequest && selectedSchoolRef.current === sId) setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    setShowEditModal(false);
    setActiveItem(null);
    if (selectedSchoolId) loadChecklist(selectedSchoolId);
    else {
      setItems([]);
      setProgress({ total: 0, completed: 0, percentage: 0 });
    }
    return () => { requestId.current += 1; };
  }, [selectedSchoolId, loadChecklist]);

  const handleInitChecklist = async () => {
    if (!selectedSchoolId || itemsLoading) return;
    const schoolId = selectedSchoolId;
    try {
      setItemsLoading(true);
      setLoadError(null);
      const res = await superAdminApi.initSchoolChecklist(schoolId);
      if (!res?.success) throw new Error('Unable to initialize checklist.');
      if (selectedSchoolRef.current === schoolId) await loadChecklist(schoolId);
    } catch (err: any) {
      if (selectedSchoolRef.current === schoolId) setLoadError(err?.response?.data?.error || err.message);
    } finally {
      if (selectedSchoolRef.current === schoolId) setItemsLoading(false);
    }
  };

  // Open Edit Item Modal
  const openEditModal = (item: ChecklistItem) => {
    setActiveItem(item);
    setItemStatus(item.status);
    setBlockerReason(item.blocker_reason || '');
    setItemNotes(item.notes || '');
    setShowEditModal(true);
  };

  // Save Item Status
  const handleSaveItem = async () => {
    if (!selectedSchoolId || !activeItem || savingItem) return;
    const schoolId = selectedSchoolId;
    if (itemStatus === 'BLOCKED' && !blockerReason.trim()) {
      if (Platform.OS === 'web') window.alert('Please specify the blocker reason.');
      else Alert.alert('Validation Error', 'Please specify the blocker reason.');
      return;
    }

    try {
      setSavingItem(true);
      const res = await superAdminApi.updateChecklistItem(schoolId, activeItem.id, {
        status: itemStatus,
        blocker_reason: itemStatus === 'BLOCKED' ? blockerReason.trim() : undefined,
        notes: itemNotes.trim(),
      });

      if (!res?.success) throw new Error('Unable to save checklist item.');
      if (selectedSchoolRef.current === schoolId) {
        setShowEditModal(false);
        await loadChecklist(schoolId);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSavingItem(false);
    }
  };

  // Group items by category
  const categories = Array.from(new Set([...Object.keys(CATEGORY_NAMES), ...items.map((item) => item.category)]));

  return (
    <RouteGuard requiredPermission={PERMISSIONS.CHECKLIST_READ}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}>
          {/* Header */}
          <View style={styles.topHeader}>
            <View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <CheckSquare size={14} color="#10B981" />
                  <Text style={[styles.badgeText, { color: '#10B981' }]}>DEPLOYMENT OPERATIONAL READINESS</Text>
                </View>
              </View>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>School Onboarding Milestones</Text>
              <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                Standard Operating Procedure (SOP) rollout verification from contract signature to live production cutover.
              </Text>
            </View>
          </View>

          {/* School Selector Pills */}
          <View style={[styles.selectorBar, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Select Partner School:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {schools.map((s) => {
                const isSelected = selectedSchoolId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.schoolPill,
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !isSelected && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                    ]}
                    disabled={savingItem || itemsLoading}
                    onPress={() => {
                      selectedSchoolRef.current = s.id;
                      setSelectedSchoolId(s.id);
                    }}
                  >
                    <Building size={14} color={isSelected ? '#FFFFFF' : colors.textSecondary} />
                    <Text style={[styles.schoolPillText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                      {s.name} ({s.code})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Progress Overview Card */}
          <View style={[styles.progressCard, clayStyle(clayShadows.clay), { backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Launch Readiness Score</Text>
                <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
                  {progress.completed} of {progress.total} deployment checkpoints completed
                </Text>
              </View>
              <Text style={[styles.progressPercentage, { color: progress.percentage >= 80 ? '#10B981' : '#F59E0B' }]}>
                {progress.percentage}%
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={[styles.trackBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
              <View
                style={[
                  styles.fillBar,
                  {
                    width: `${progress.percentage}%`,
                    backgroundColor: progress.percentage >= 80 ? '#10B981' : '#0284C7',
                  },
                ]}
              />
            </View>
          </View>

          {/* Checklist Sections */}
          {schoolsError ? (
            <View style={styles.emptyBox}>
              <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{schoolsError}</Text>
              <Pressable accessibilityRole="button" onPress={() => setSchoolReload((value) => value + 1)}><Text style={{ color: colors.primary }}>Retry schools</Text></Pressable>
            </View>
          ) : loading || itemsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading school checklist...</Text>
            </View>
          ) : !selectedSchoolId ? (
            <View style={styles.emptyBox}><Text style={{ color: colors.textSecondary }}>No schools assigned yet.</Text></View>
          ) : loadError ? (
            <View style={styles.emptyBox}>
              <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{loadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => loadChecklist(selectedSchoolId)}><Text style={{ color: colors.primary }}>Retry checklist</Text></Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <CheckSquare size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Checklist Not Initialized</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                This school has not been seeded with the standard onboarding checkpoints yet.
              </Text>
              {can(PERMISSIONS.CHECKLIST_UPDATE) && (
                <Pressable
                  style={[styles.initBtn, { backgroundColor: colors.primary }]}
                  onPress={handleInitChecklist}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.initBtnText}>Initialize Standard SOP Checklist</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              {categories.map((catKey) => {
                const catItems = items.filter((i) => i.category === catKey);
                if (catItems.length === 0) return null;

                return (
                  <View key={catKey} style={[styles.catSection, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF' }]}>
                    <Text style={[styles.catHeader, { color: colors.textPrimary }]}>
                      {CATEGORY_NAMES[catKey] || catKey}
                    </Text>

                    <View style={styles.itemsList}>
                      {catItems.map((item) => {
                        const sBadge = STATUS_ICONS[item.status] || STATUS_ICONS.NOT_STARTED;
                        const isBlocked = item.status === 'BLOCKED';

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.checkRow,
                              { borderColor: isBlocked ? 'rgba(239, 68, 68, 0.4)' : colors.border },
                              isBlocked && { backgroundColor: 'rgba(239, 68, 68, 0.05)' },
                            ]}
                          >
                            <View style={[styles.statusTag, { backgroundColor: sBadge.bg }]}>
                              <Text style={[styles.statusTagText, { color: sBadge.color }]}>{sBadge.label}</Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                              {item.description && (
                                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                              )}
                              {isBlocked && item.blocker_reason && (
                                <View style={styles.blockerAlert}>
                                  <AlertTriangle size={13} color="#EF4444" />
                                  <Text style={styles.blockerText}>Blocker: {item.blocker_reason}</Text>
                                </View>
                              )}
                              {item.notes && !isBlocked && (
                                <Text style={[styles.itemNotes, { color: colors.textSecondary }]}>Note: {item.notes}</Text>
                              )}
                            </View>

                            {can(PERMISSIONS.CHECKLIST_UPDATE) && (
                              <Pressable
                                style={[styles.editBtn, { borderColor: colors.border }]}
                                disabled={savingItem}
                                onPress={() => openEditModal(item)}
                              >
                                <Text style={[styles.editBtnText, { color: colors.primary }]}>Update</Text>
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Modal: Edit Item Status */}
          <Modal visible={showEditModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Update Milestone</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {activeItem?.title}
                    </Text>
                  </View>
                  <Pressable disabled={savingItem} onPress={() => setShowEditModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Task Status</Text>
                  <View style={styles.statusOptionsWrap}>
                    {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'NOT_APPLICABLE'] as const).map((st) => (
                      <Pressable
                        key={st}
                        style={[
                          styles.statusOptionPill,
                          itemStatus === st && { backgroundColor: STATUS_ICONS[st].color, borderColor: STATUS_ICONS[st].color },
                          itemStatus !== st && { borderColor: colors.border },
                        ]}
                        onPress={() => setItemStatus(st)}
                      >
                        <Text style={[styles.statusOptionText, { color: itemStatus === st ? '#FFFFFF' : colors.textPrimary }]}>
                          {STATUS_ICONS[st].label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {itemStatus === 'BLOCKED' && (
                    <>
                      <Text style={[styles.formLabel, { color: '#EF4444' }]}>Reason for Blocker *</Text>
                      <TextInput
                        style={[styles.textArea, { color: colors.textPrimary, borderColor: '#EF4444' }]}
                        placeholder="e.g. Principal has not provided biometric device IP address..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={3}
                        value={blockerReason}
                        onChangeText={setBlockerReason}
                      />
                    </>
                  )}

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Operator Notes & Comments</Text>
                  <TextInput
                    style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
                    accessibilityLabel="Operator notes"
                    placeholder="Add verification details, APK version tested, or contact person..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    value={itemNotes}
                    onChangeText={setItemNotes}
                  />
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    disabled={savingItem} onPress={() => setShowEditModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                    accessibilityLabel="Save task status"
                    onPress={handleSaveItem}
                    disabled={savingItem}
                  >
                    {savingItem ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Status</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </RouteGuard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20 },
  topHeader: { marginBottom: 20 },
  badgeRow: { marginBottom: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pageTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  pageSub: { fontSize: 13, lineHeight: 18, maxWidth: 580 },
  selectorBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  selectorLabel: { fontSize: 12, fontWeight: '700' },
  schoolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  schoolPillText: { fontSize: 12, fontWeight: '600' },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressTitle: { fontSize: 16, fontWeight: '800' },
  progressSub: { fontSize: 12, marginTop: 2 },
  progressPercentage: { fontSize: 26, fontWeight: '900' },
  trackBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 5,
  },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },
  emptyBox: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 440 },
  initBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  initBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  catSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  catHeader: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  itemsList: { gap: 10 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagText: { fontSize: 10, fontWeight: '800' },
  itemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemDesc: { fontSize: 12, lineHeight: 16 },
  blockerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  blockerText: { fontSize: 11.5, color: '#EF4444', fontWeight: '600' },
  itemNotes: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 11.5, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 2 },
  modalForm: { padding: 20 },
  formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  statusOptionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  statusOptionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionText: { fontSize: 11, fontWeight: '700' },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600' },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
