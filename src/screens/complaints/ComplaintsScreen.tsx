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
import { useLocalSearchParams } from 'expo-router';
import {
  LifeBuoy,
  PlusCircle,
  School,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Search,
  Filter,
  Layers,
  ChevronRight,
  X,
  Send,
  Sparkles,
  ShieldAlert,
  Building,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { PERMISSIONS } from '../../constants/rbac';
import { bottomTabPad } from '../founder/founderUi';

interface TicketItem {
  id: string;
  ticket_number: string;
  school_id: number;
  school_name?: string;
  school_code?: string;
  created_by_name?: string;
  assigned_to_name?: string;
  assigned_to?: string | null;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CLIENT' | 'ESCALATED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';
  resolution?: string | null;
  created_at: string;
  notes?: { id: string; note: string; is_internal: boolean; created_at: string; author_name?: string }[];
}

interface SchoolItem {
  id: number;
  name: string;
  code: string;
}

interface SupportAssignee {
  id: string;
  full_name: string;
  employee_id: string;
  role: string;
  status: string;
  assigned_school_ids?: number[];
}

const PRIORITY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  MEDIUM: { label: 'Medium', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' },
  HIGH: { label: 'High', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  CRITICAL: { label: 'Critical Incident', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open Queued', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  IN_PROGRESS: { label: 'In Investigation', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  WAITING_ON_CLIENT: { label: 'Waiting on School', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  ESCALATED: { label: 'Escalated', color: '#FF453A', bg: 'rgba(255, 69, 58, 0.12)' },
  REOPENED: { label: 'Reopened', color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.12)' },
  RESOLVED: { label: 'Resolved', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  CLOSED: { label: 'Closed Archive', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
};

export default function ComplaintsScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { user, role, can } = useAuth();
  const params = useLocalSearchParams<{ ticketId?: string }>();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [assignees, setAssignees] = useState<SupportAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);

  // Form states
  const [ticketSchoolId, setTicketSchoolId] = useState<number | null>(null);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState('SOFTWARE_BUG');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [creating, setCreating] = useState(false);

  // Note & Resolution state
  const [newNote, setNewNote] = useState('');
  const [targetStatus, setTargetStatus] = useState<string>('IN_PROGRESS');
  const [targetPriority, setTargetPriority] = useState<string>('MEDIUM');
  const [targetAssignee, setTargetAssignee] = useState<string>('');
  const [resolutionText, setResolutionText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const canManageTickets = can(PERMISSIONS.COMPLAINTS_MANAGE);
      const [ticRes, schRes, usersRes] = await Promise.all([
        superAdminApi.getSupportTickets(),
        superAdminApi.getSchools(),
        canManageTickets ? superAdminApi.getInternalUsers({ status: 'ACTIVE' }) : Promise.resolve(null),
      ]);

      if (ticRes?.success && Array.isArray(ticRes.data)) {
        setTickets(ticRes.data);
      }
      const rawSch: any = schRes;
      const schList = Array.isArray(rawSch) ? rawSch : Array.isArray(rawSch?.data) ? rawSch.data : [];
      setSchools(schList);
      if (schList.length > 0 && !ticketSchoolId) {
        setTicketSchoolId(schList[0].id);
      }
      const userList = Array.isArray(usersRes?.data) ? usersRes.data : [];
      setAssignees(userList.filter((candidate: SupportAssignee) =>
        ['SUPPORT_EXECUTIVE', 'TECHNICAL_SUPPORT'].includes(candidate.role)
      ));
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [can, ticketSchoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open detail modal if ticketId passed in params
  useEffect(() => {
    if (params.ticketId && tickets.length > 0) {
      const match = tickets.find((t) => t.id === params.ticketId);
      if (match) {
        openTicketDetail(match);
      }
    }
  }, [params.ticketId, tickets]);

  const openTicketDetail = async (t: TicketItem) => {
    setActiveTicket(t);
    setTargetStatus(t.status);
    setTargetPriority(t.priority);
    setTargetAssignee(t.assigned_to || '');
    setResolutionText(t.resolution || '');
    setNewNote('');
    setShowDetailModal(true);

    // Fetch full ticket details including notes
    try {
      const res = await superAdminApi.getSupportTicket(t.id);
      if (res?.success && res.data) {
        setActiveTicket(res.data);
      }
    } catch (err) {
      console.error('Error fetching ticket notes:', err);
    }
  };

  // Create Ticket
  const handleCreateTicket = async () => {
    if (!ticketSchoolId || !ticketTitle.trim() || !ticketDescription.trim()) {
      if (Platform.OS === 'web') window.alert('Please fill school, title, and description.');
      else Alert.alert('Validation Error', 'Please fill school, title, and description.');
      return;
    }

    try {
      setCreating(true);
      const res = await superAdminApi.createSupportTicket({
        school_id: ticketSchoolId,
        title: ticketTitle.trim(),
        description: ticketDescription.trim(),
        category: ticketCategory,
        priority: ticketPriority,
      });

      if (res?.success) {
        setShowCreateModal(false);
        setTicketTitle('');
        setTicketDescription('');
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  // Add Note to Ticket
  const handleAddNote = async () => {
    if (!activeTicket || !newNote.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await superAdminApi.addTicketNote(activeTicket.id, {
        note: newNote.trim(),
        is_internal: false,
      });

      if (res?.success) {
        setNewNote('');
        const refreshed = await superAdminApi.getSupportTicket(activeTicket.id);
        if (refreshed?.success) setActiveTicket(refreshed.data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Update Status / Resolution
  const handleUpdateStatus = async () => {
    if (!activeTicket) return;
    try {
      setSubmittingAction(true);
      const res = await superAdminApi.updateSupportTicket(activeTicket.id, {
        status: targetStatus,
        ...(can(PERMISSIONS.COMPLAINTS_MANAGE) ? {
          priority: targetPriority,
          assigned_to: targetAssignee || null,
        } : {}),
        resolution: resolutionText.trim() || undefined,
      });

      if (res?.success) {
        setShowDetailModal(false);
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filter list
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.ticket_number?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.school_name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <RouteGuard requiredPermission={PERMISSIONS.COMPLAINTS_READ}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}>
          {/* Header */}
          <View style={styles.topHeader}>
            <View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(168, 85, 247, 0.12)', borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
                  <LifeBuoy size={14} color="#A855F7" />
                  <Text style={[styles.badgeText, { color: '#A855F7' }]}>INCIDENT & SUPPORT DESK</Text>
                </View>
              </View>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Complaints & Support Tickets</Text>
              <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                Resolve school operational inquiries, software bug escalations, and hardware syncing failures with SLA enforcement.
              </Text>
            </View>

            {can(PERMISSIONS.COMPLAINTS_CREATE) && (
              <Pressable
                style={[styles.createBtn, { backgroundColor: '#9333EA' }]}
                onPress={() => setShowCreateModal(true)}
              >
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Open Support Ticket</Text>
              </Pressable>
            )}
          </View>

          {/* Filters */}
          <View style={[styles.filterBar, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <View style={[styles.searchBox, { borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search ticket number, school name, or keyword..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
              {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'ESCALATED', 'REOPENED', 'RESOLVED', 'CLOSED'].map((st) => {
                const isSelected = statusFilter === st;
                return (
                  <Pressable
                    key={st}
                    style={[
                      styles.filterPill,
                      isSelected && { backgroundColor: '#9333EA', borderColor: '#9333EA' },
                      !isSelected && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                    ]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text style={[styles.filterPillText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                      {st === 'ALL' ? 'All Incidents' : STATUS_BADGE[st]?.label || st}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Tickets List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading support queue...</Text>
            </View>
          ) : filteredTickets.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <CheckCircle2 size={40} color="#10B981" />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Tickets in Queue</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No incidents or partner complaints match the selected filter.
              </Text>
            </View>
          ) : (
            <View style={styles.ticketsGrid}>
              {filteredTickets.map((t) => {
                const pBadge = PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.MEDIUM;
                const sBadge = STATUS_BADGE[t.status] || STATUS_BADGE.OPEN;

                return (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.ticketCard,
                      clayStyle(clayShadows.clay),
                      {
                        backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => openTicketDetail(t)}
                  >
                    <View style={styles.ticketTopRow}>
                      <View style={styles.ticketIdRow}>
                        <Text style={[styles.ticketNum, { color: '#A855F7' }]}>{t.ticket_number}</Text>
                        <View style={[styles.badgePill, { backgroundColor: pBadge.bg, borderColor: pBadge.color + '40' }]}>
                          <Text style={[styles.pillText, { color: pBadge.color }]}>{pBadge.label}</Text>
                        </View>
                      </View>
                      <View style={[styles.badgePill, { backgroundColor: sBadge.bg, borderColor: sBadge.color + '40' }]}>
                        <Text style={[styles.pillText, { color: sBadge.color }]}>{sBadge.label}</Text>
                      </View>
                    </View>

                    <Text style={[styles.ticketTitle, { color: colors.textPrimary }]}>{t.title}</Text>
                    <Text style={[styles.ticketDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {t.description}
                    </Text>

                    <View style={styles.ticketFooter}>
                      <View style={styles.schoolInfo}>
                        <School size={13} color={colors.textSecondary} />
                        <Text style={[styles.schoolCodeText, { color: colors.textSecondary }]}>
                          {t.school_name || `School #${t.school_id}`}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.actionLink, { color: colors.primary }]}>View Details</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Modal: Open Support Ticket */}
          <Modal visible={showCreateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Open Support Ticket</Text>
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
                          ticketSchoolId === s.id && { backgroundColor: '#9333EA', borderColor: '#9333EA' },
                          ticketSchoolId !== s.id && { borderColor: colors.border },
                        ]}
                        onPress={() => setTicketSchoolId(s.id)}
                      >
                        <Text style={[styles.schoolPillText, { color: ticketSchoolId === s.id ? '#FFFFFF' : colors.textPrimary }]}>
                          {s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Incident / Complaint Title *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. Bus 4 GPS tracker offline since morning"
                    placeholderTextColor={colors.textSecondary}
                    value={ticketTitle}
                    onChangeText={setTicketTitle}
                  />

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Category</Text>
                  <View style={styles.optionsWrap}>
                    {['SOFTWARE_BUG', 'HARDWARE_GPS', 'BIOMETRIC_SYNC', 'PAYMENT_RECEIPT', 'DATA_DISCREPANCY', 'PARENT_APP'].map((c) => (
                      <Pressable
                        key={c}
                        style={[
                          styles.optionPill,
                          ticketCategory === c && { backgroundColor: '#9333EA', borderColor: '#9333EA' },
                          ticketCategory !== c && { borderColor: colors.border },
                        ]}
                        onPress={() => setTicketCategory(c)}
                      >
                        <Text style={[styles.optionText, { color: ticketCategory === c ? '#FFFFFF' : colors.textPrimary }]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Severity / Priority</Text>
                  <View style={styles.optionsWrap}>
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
                      <Pressable
                        key={p}
                        style={[
                          styles.optionPill,
                          ticketPriority === p && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                          ticketPriority !== p && { borderColor: colors.border },
                        ]}
                        onPress={() => setTicketPriority(p)}
                      >
                        <Text style={[styles.optionText, { color: ticketPriority === p ? '#FFFFFF' : colors.textPrimary }]}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Incident Details & Steps to Reproduce *</Text>
                  <TextInput
                    style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Describe client symptoms, device ID, student admission number involved..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={ticketDescription}
                    onChangeText={setTicketDescription}
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
                    style={[styles.submitBtn, { backgroundColor: '#9333EA' }]}
                    onPress={handleCreateTicket}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit Ticket</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Ticket Details & Activity Thread */}
          <Modal visible={showDetailModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border, maxWidth: 620 }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{activeTicket?.ticket_number}</Text>
                      <View style={[styles.badgePill, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                        <Text style={[styles.pillText, { color: '#A855F7' }]}>{activeTicket?.category}</Text>
                      </View>
                    </View>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                      {activeTicket?.school_name} • Reported by {activeTicket?.created_by_name || 'Staff'}
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowDetailModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.ticketDetailTitle, { color: colors.textPrimary }]}>{activeTicket?.title}</Text>
                  <Text style={[styles.ticketDetailDesc, { color: colors.textSecondary }]}>
                    {activeTicket?.description}
                  </Text>

                  {/* Notes Thread */}
                  <View style={[styles.notesSection, { borderColor: colors.border }]}>
                    <Text style={[styles.notesSectionTitle, { color: colors.textPrimary }]}>Activity & Notes Thread</Text>
                    {activeTicket?.notes && activeTicket.notes.length > 0 ? (
                      <View style={{ gap: 8, marginTop: 8 }}>
                        {activeTicket.notes.map((n) => (
                          <View key={n.id} style={[styles.noteRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                            <View style={styles.noteTop}>
                              <Text style={[styles.noteAuthor, { color: colors.primary }]}>{n.author_name || 'Operator'}</Text>
                              <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
                                {new Date(n.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text style={[styles.noteText, { color: colors.textPrimary }]}>{n.note}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyNotesText, { color: colors.textSecondary }]}>No notes logged yet.</Text>
                    )}

                    {/* Add Note Input */}
                    <View style={styles.addNoteRow}>
                      <TextInput
                        style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="Add investigation note or update..."
                        placeholderTextColor={colors.textSecondary}
                        value={newNote}
                        onChangeText={setNewNote}
                      />
                      <Pressable
                        style={[styles.sendNoteBtn, { backgroundColor: colors.primary }]}
                        onPress={handleAddNote}
                        disabled={submittingAction || !newNote.trim()}
                      >
                        <Send size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Lifecycle Status & Resolution Controls */}
                  {(can(PERMISSIONS.COMPLAINTS_MANAGE) || can(PERMISSIONS.COMPLAINTS_UPDATE_ASSIGNED)) && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Update Incident Status</Text>
                      <View style={styles.optionsWrap}>
                        {['OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'ESCALATED', 'REOPENED', 'RESOLVED', 'CLOSED'].map((st) => (
                          <Pressable
                            key={st}
                            style={[
                              styles.optionPill,
                              targetStatus === st && { backgroundColor: colors.primary, borderColor: colors.primary },
                              targetStatus !== st && { borderColor: colors.border },
                            ]}
                            onPress={() => setTargetStatus(st)}
                          >
                            <Text style={[styles.optionText, { color: targetStatus === st ? '#FFFFFF' : colors.textPrimary }]}>
                              {STATUS_BADGE[st]?.label || st}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {can(PERMISSIONS.COMPLAINTS_MANAGE) && (
                        <>
                          <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 14 }]}>Priority</Text>
                          <View style={styles.optionsWrap}>
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => (
                              <Pressable
                                key={priority}
                                style={[
                                  styles.optionPill,
                                  targetPriority === priority && { backgroundColor: colors.primary, borderColor: colors.primary },
                                  targetPriority !== priority && { borderColor: colors.border },
                                ]}
                                onPress={() => setTargetPriority(priority)}
                              >
                                <Text style={[styles.optionText, { color: targetPriority === priority ? '#FFFFFF' : colors.textPrimary }]}>
                                  {PRIORITY_BADGE[priority]?.label || priority}
                                </Text>
                              </Pressable>
                            ))}
                          </View>

                          <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 14 }]}>Assign Support Owner</Text>
                          <View style={styles.optionsWrap}>
                            <Pressable
                              style={[
                                styles.optionPill,
                                !targetAssignee && { backgroundColor: colors.primary, borderColor: colors.primary },
                                Boolean(targetAssignee) && { borderColor: colors.border },
                              ]}
                              onPress={() => setTargetAssignee('')}
                            >
                              <Text style={[styles.optionText, { color: !targetAssignee ? '#FFFFFF' : colors.textPrimary }]}>Unassigned</Text>
                            </Pressable>
                            {assignees.filter((assignee) =>
                              assignee.assigned_school_ids?.map(Number).includes(Number(activeTicket?.school_id))
                            ).map((assignee) => (
                              <Pressable
                                key={assignee.id}
                                style={[
                                  styles.optionPill,
                                  targetAssignee === assignee.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                                  targetAssignee !== assignee.id && { borderColor: colors.border },
                                ]}
                                onPress={() => setTargetAssignee(assignee.id)}
                              >
                                <Text style={[styles.optionText, { color: targetAssignee === assignee.id ? '#FFFFFF' : colors.textPrimary }]}>
                                  {assignee.full_name} ({assignee.employee_id})
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      )}

                      {targetStatus === 'RESOLVED' && (
                        <>
                          <Text style={[styles.formLabel, { color: '#10B981', marginTop: 12 }]}>Resolution Summary *</Text>
                          <TextInput
                            style={[styles.textArea, { color: colors.textPrimary, borderColor: '#10B981' }]}
                            placeholder="Explain what was fixed, firmware updated, or settings corrected..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                            value={resolutionText}
                            onChangeText={setResolutionText}
                          />
                        </>
                      )}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Close</Text>
                  </Pressable>
                  {(can(PERMISSIONS.COMPLAINTS_MANAGE) || can(PERMISSIONS.COMPLAINTS_UPDATE_ASSIGNED)) && (
                    <Pressable
                      style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                      onPress={handleUpdateStatus}
                      disabled={submittingAction}
                    >
                      {submittingAction ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Update Ticket</Text>
                      )}
                    </Pressable>
                  )}
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
  ticketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  ticketCard: {
    width: Platform.OS === 'web' ? '48.5%' : '100%',
    minWidth: 300,
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketNum: { fontSize: 14, fontWeight: '800' },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillText: { fontSize: 10.5, fontWeight: '700' },
  ticketTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  ticketDesc: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  schoolInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schoolCodeText: { fontSize: 12, fontWeight: '600' },
  actionLink: { fontSize: 12, fontWeight: '600' },

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
    maxWidth: 540,
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
    height: 80,
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

  ticketDetailTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  ticketDetailDesc: { fontSize: 13.5, lineHeight: 20, marginBottom: 16 },
  notesSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 10,
  },
  notesSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  emptyNotesText: { fontSize: 12, fontStyle: 'italic', marginVertical: 8 },
  noteRow: { padding: 10, borderRadius: 8 },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteAuthor: { fontSize: 11, fontWeight: '700' },
  noteDate: { fontSize: 10 },
  noteText: { fontSize: 12.5, lineHeight: 17 },
  addNoteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  noteInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
  },
  sendNoteBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
