import React, { useCallback, useEffect, useState } from 'react';
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
import {
  FileText,
  PlusCircle,
  School,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  ChevronRight,
  X,
  Building,
  Send,
  Sparkles,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { PERMISSIONS } from '../../constants/rbac';
import { bottomTabPad } from '../founder/founderUi';

interface RequirementItem {
  id: string;
  school_id: number;
  school_name?: string;
  school_code?: string;
  submitted_by_name?: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'IN_DEVELOPMENT' | 'DEPLOYED' | 'REJECTED';
  feasibility_status?: string | null;
  resolution_notes?: string | null;
  created_at: string;
}

interface SchoolItem {
  id: number;
  name: string;
  code: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open Submitted', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' },
  UNDER_REVIEW: { label: 'Under Review', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  IN_DEVELOPMENT: { label: 'In Dev / Building', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
  DEPLOYED: { label: 'Deployed to Live', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  REJECTED: { label: 'Not Feasible / Declined', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

const PRIORITY_BADGE: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: '#10B981' },
  MEDIUM: { label: 'Medium', color: '#0284C7' },
  HIGH: { label: 'High', color: '#F59E0B' },
  CRITICAL: { label: 'Critical', color: '#EF4444' },
};

export default function RequirementsScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { user, role, can } = useAuth();

  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequirementItem | null>(null);

  // Form states
  const [targetSchoolId, setTargetSchoolId] = useState<number | null>(null);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqCategory, setReqCategory] = useState('CUSTOM_APP');
  const [reqPriority, setReqPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  // Update states
  const [updateStatus, setUpdateStatus] = useState<string>('UNDER_REVIEW');
  const [updateFeasibility, setUpdateFeasibility] = useState<string>('FEASIBLE');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, schRes] = await Promise.all([
        superAdminApi.getRequirements(),
        superAdminApi.getSchools(),
      ]);

      if (reqRes?.success && Array.isArray(reqRes.data)) {
        setRequirements(reqRes.data);
      }
      const rawSch: any = schRes;
      const schList = Array.isArray(rawSch) ? rawSch : Array.isArray(rawSch?.data) ? rawSch.data : [];
      setSchools(schList);
      if (schList.length > 0 && !targetSchoolId) {
        setTargetSchoolId(schList[0].id);
      }
    } catch (err) {
      console.error('Failed to load requirements:', err);
    } finally {
      setLoading(false);
    }
  }, [targetSchoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit Requirement
  const handleCreateRequirement = async () => {
    if (!targetSchoolId || !reqTitle.trim()) {
      if (Platform.OS === 'web') window.alert('Please select a school and enter requirement title.');
      else Alert.alert('Validation Error', 'Please select a school and enter requirement title.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await superAdminApi.createRequirement({
        school_id: targetSchoolId,
        title: reqTitle.trim(),
        description: reqDescription.trim(),
        category: reqCategory,
        priority: reqPriority,
      });

      if (res?.success) {
        setShowCreateModal(false);
        setReqTitle('');
        setReqDescription('');
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Update Modal
  const openUpdateModal = (item: RequirementItem) => {
    setSelectedReq(item);
    setUpdateStatus(item.status);
    setUpdateFeasibility(item.feasibility_status || 'FEASIBLE');
    setUpdateNotes(item.resolution_notes || '');
    setShowUpdateModal(true);
  };

  // Save Requirement Update
  const handleSaveUpdate = async () => {
    if (!selectedReq) return;
    try {
      setUpdating(true);
      const res = await superAdminApi.updateRequirement(selectedReq.id, {
        status: updateStatus,
        feasibility_status: updateFeasibility,
        resolution_notes: updateNotes,
      });

      if (res?.success) {
        setShowUpdateModal(false);
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setUpdating(false);
    }
  };

  // Filter list
  const filteredReqs = requirements.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.school_name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <RouteGuard requiredPermission={PERMISSIONS.REQUIREMENTS_READ}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}>
          {/* Header */}
          <View style={styles.topHeader}>
            <View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                  <FileText size={14} color="#38BDF8" />
                  <Text style={[styles.badgeText, { color: '#38BDF8' }]}>SPECIFICATION REGISTRY</Text>
                </View>
              </View>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>School Requirements & Feature Demands</Text>
              <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                Track custom branding, payment gateways, timetable formulas, and custom modules demanded by partner schools.
              </Text>
            </View>

            {can(PERMISSIONS.REQUIREMENTS_CREATE) && (
              <Pressable
                style={[styles.createBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => setShowCreateModal(true)}
              >
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Log New Requirement</Text>
              </Pressable>
            )}
          </View>

          {/* Filters */}
          <View style={[styles.filterBar, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <View style={[styles.searchBox, { borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search requirements or school name..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
              {['ALL', 'OPEN', 'UNDER_REVIEW', 'IN_DEVELOPMENT', 'DEPLOYED', 'REJECTED'].map((st) => {
                const isSelected = statusFilter === st;
                return (
                  <Pressable
                    key={st}
                    style={[
                      styles.filterPill,
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !isSelected && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                    ]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text style={[styles.filterPillText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                      {st === 'ALL' ? 'All Statuses' : STATUS_BADGE[st]?.label || st}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Requirements Grid */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading requirements catalog...</Text>
            </View>
          ) : filteredReqs.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <FileText size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Requirements Found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No school feature requests match your current filters.
              </Text>
            </View>
          ) : (
            <View style={styles.reqsGrid}>
              {filteredReqs.map((r) => {
                const sBadge = STATUS_BADGE[r.status] || STATUS_BADGE.OPEN;
                const pBadge = PRIORITY_BADGE[r.priority] || PRIORITY_BADGE.MEDIUM;

                return (
                  <View
                    key={r.id}
                    style={[
                      styles.reqCard,
                      clayStyle(clayShadows.clay),
                      {
                        backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.reqCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardHeaderRow}>
                          <View style={[styles.statusPill, { backgroundColor: sBadge.bg, borderColor: sBadge.color + '40' }]}>
                            <Text style={[styles.statusPillText, { color: sBadge.color }]}>{sBadge.label}</Text>
                          </View>
                          <Text style={[styles.priorityText, { color: pBadge.color }]}>• {pBadge.label} Priority</Text>
                        </View>
                        <Text style={[styles.reqTitle, { color: colors.textPrimary }]}>{r.title}</Text>
                      </View>
                    </View>

                    <Text style={[styles.reqDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                      {r.description || 'No detailed specifications provided.'}
                    </Text>

                    {r.resolution_notes && (
                      <View style={[styles.notesBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                        <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Team Notes:</Text>
                        <Text style={[styles.notesText, { color: colors.textPrimary }]}>{r.resolution_notes}</Text>
                      </View>
                    )}

                    <View style={styles.reqCardFooter}>
                      <View style={styles.schoolTag}>
                        <School size={13} color={colors.textSecondary} />
                        <Text style={[styles.schoolNameText, { color: colors.textSecondary }]}>
                          {r.school_name || `School #${r.school_id}`}
                        </Text>
                      </View>

                      {can(PERMISSIONS.REQUIREMENTS_MANAGE) && (
                        <Pressable
                          style={[styles.updateBtn, { borderColor: colors.border }]}
                          onPress={() => openUpdateModal(r)}
                        >
                          <Text style={[styles.updateBtnText, { color: colors.primary }]}>Review / Status</Text>
                          <ChevronRight size={13} color={colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Modal: Log New Requirement */}
          <Modal visible={showCreateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log School Requirement</Text>
                  <Pressable onPress={() => setShowCreateModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Partner Institution *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
                    {schools.map((s) => (
                      <Pressable
                        key={s.id}
                        style={[
                          styles.schoolPill,
                          targetSchoolId === s.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                          targetSchoolId !== s.id && { borderColor: colors.border },
                        ]}
                        onPress={() => setTargetSchoolId(s.id)}
                      >
                        <Text style={[styles.schoolPillText, { color: targetSchoolId === s.id ? '#FFFFFF' : colors.textPrimary }]}>
                          {s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Requirement Title *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. ICICI Payment Gateway integration for fee receipts"
                    placeholderTextColor={colors.textSecondary}
                    value={reqTitle}
                    onChangeText={setReqTitle}
                  />

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Category</Text>
                  <View style={styles.optionsWrap}>
                    {['PAYMENT', 'CUSTOM_APP', 'TRANSPORT', 'ATTENDANCE', 'ACADEMIC', 'REPORTS'].map((c) => (
                      <Pressable
                        key={c}
                        style={[
                          styles.optionPill,
                          reqCategory === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                          reqCategory !== c && { borderColor: colors.border },
                        ]}
                        onPress={() => setReqCategory(c)}
                      >
                        <Text style={[styles.optionText, { color: reqCategory === c ? '#FFFFFF' : colors.textPrimary }]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Priority Level</Text>
                  <View style={styles.optionsWrap}>
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
                      <Pressable
                        key={p}
                        style={[
                          styles.optionPill,
                          reqPriority === p && { backgroundColor: colors.primary, borderColor: colors.primary },
                          reqPriority !== p && { borderColor: colors.border },
                        ]}
                        onPress={() => setReqPriority(p)}
                      >
                        <Text style={[styles.optionText, { color: reqPriority === p ? '#FFFFFF' : colors.textPrimary }]}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Detailed Specifications</Text>
                  <TextInput
                    style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Describe specific rules, merchant credentials needed, or client workflow..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={reqDescription}
                    onChangeText={setReqDescription}
                  />
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: '#0284C7' }]}
                    onPress={handleCreateRequirement}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit Requirement</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Update Requirement Status */}
          <Modal visible={showUpdateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Update Requirement</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedReq?.title}
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowUpdateModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Lifecycle Status</Text>
                  <View style={styles.optionsWrap}>
                    {['OPEN', 'UNDER_REVIEW', 'IN_DEVELOPMENT', 'DEPLOYED', 'REJECTED'].map((st) => (
                      <Pressable
                        key={st}
                        style={[
                          styles.optionPill,
                          updateStatus === st && { backgroundColor: colors.primary, borderColor: colors.primary },
                          updateStatus !== st && { borderColor: colors.border },
                        ]}
                        onPress={() => setUpdateStatus(st)}
                      >
                        <Text style={[styles.optionText, { color: updateStatus === st ? '#FFFFFF' : colors.textPrimary }]}>
                          {STATUS_BADGE[st]?.label || st}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Feasibility Evaluation</Text>
                  <View style={styles.optionsWrap}>
                    {['FEASIBLE', 'NEEDS_MORE_INFO', 'NOT_FEASIBLE'].map((f) => (
                      <Pressable
                        key={f}
                        style={[
                          styles.optionPill,
                          updateFeasibility === f && { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                          updateFeasibility !== f && { borderColor: colors.border },
                        ]}
                        onPress={() => setUpdateFeasibility(f)}
                      >
                        <Text style={[styles.optionText, { color: updateFeasibility === f ? '#FFFFFF' : colors.textPrimary }]}>{f}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Resolution & Engineering Notes</Text>
                  <TextInput
                    style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Enter reason, build version, or deployment confirmation..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={updateNotes}
                    onChangeText={setUpdateNotes}
                  />
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowUpdateModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveUpdate}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Update</Text>
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
  topHeader: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  filterBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 13 },
  filterPills: { flexDirection: 'row', gap: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontWeight: '600' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },
  emptyBox: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13 },
  reqsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  reqCard: {
    width: Platform.OS === 'web' ? '48.5%' : '100%',
    minWidth: 300,
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  reqCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10.5, fontWeight: '700' },
  priorityText: { fontSize: 11, fontWeight: '600' },
  reqTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  reqDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  notesBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  notesText: { fontSize: 12, lineHeight: 16 },
  reqCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  schoolTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schoolNameText: { fontSize: 12, fontWeight: '600' },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  updateBtnText: { fontSize: 12, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
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
  formInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    height: 90,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  optionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: { fontSize: 11, fontWeight: '600' },
  schoolPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  schoolPillText: { fontSize: 12, fontWeight: '600' },
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
