import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Zap,
  Check,
  Copy,
  Search,
  RefreshCw,
  X,
  History,
  User,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { ConsoleAmbientBackground } from './founderUi';
import { sprintService } from '../../services/sprintService';
import type {
  SprintDay,
  SprintTask,
  SprintRole,
  SprintTaskStatus,
  SprintGateStatus,
  SprintMetrics,
  SprintActivityLog,
  SprintMember,
  SprintDefinition,
} from '../../types/sprint';

const IS_WEB = Platform.OS === 'web';

export default function SprintCommandCenterScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1100;
  const isMediumScreen = width >= 700;

  // Data state
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<SprintDay[]>([]);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null);
  const [activities, setActivities] = useState<SprintActivityLog[]>([]);
  const [members, setMembers] = useState<SprintMember[]>([]);
  const [definition, setDefinition] = useState<SprintDefinition | null>(null);

  // Navigation & View state
  const [activeDay, setActiveDay] = useState<number>(1);
  const [currentView, setCurrentView] = useState<'room' | 'matrix'>('room');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | SprintRole>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | SprintTaskStatus>('all');

  // Modals
  const [standupModalOpen, setStandupModalOpen] = useState(false);
  const [standupText, setStandupText] = useState('');
  const [standupCopied, setStandupCopied] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  // Edit / Details Modal
  const [editingTask, setEditingTask] = useState<SprintTask | null>(null);
  const [editBlockerReason, setEditBlockerReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  // Dynamic role theme helper
  const roleThemes = useMemo(() => {
    return {
      tech: {
        name: definition?.roles.tech.name || 'Member 1 — Tech Lead',
        shortName: 'Tech',
        subtitle: definition?.roles.tech.subtitle || 'Cross-functional technical strike force',
        icon: '🛠️',
        color: isDark ? '#38bdf8' : '#0369A1',
        bg: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(3, 105, 161, 0.08)',
        border: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(3, 105, 161, 0.25)',
      },
      curr: {
        name: definition?.roles.curr.name || 'Member 2 — Curriculum Research Lead',
        shortName: 'Curriculum',
        subtitle: definition?.roles.curr.subtitle || 'Academic architecture, validation, evidence',
        icon: '📚',
        color: isDark ? '#818cf8' : '#6366F1',
        bg: isDark ? 'rgba(129, 140, 248, 0.12)' : 'rgba(99, 102, 241, 0.08)',
        border: isDark ? 'rgba(129, 140, 248, 0.3)' : 'rgba(99, 102, 241, 0.25)',
      },
      sales: {
        name: definition?.roles.sales.name || 'Member 3 — Sales Strategy & Field Lead',
        shortName: 'Sales',
        subtitle: definition?.roles.sales.subtitle || 'Pipeline, positioning, demos, commercial execution',
        icon: '📈',
        color: isDark ? '#34d399' : '#059669',
        bg: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(5, 150, 105, 0.08)',
        border: isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(5, 150, 105, 0.25)',
      },
      scale: {
        name: definition?.roles.scale.name || 'Member 4 — Sales Scale & Hiring Lead',
        shortName: 'Scale',
        subtitle: definition?.roles.scale.subtitle || 'Brochure, hiring, training, enablement, operations',
        icon: '🚀',
        color: isDark ? '#fbbf24' : '#B45309',
        bg: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(180, 83, 9, 0.08)',
        border: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(180, 83, 9, 0.25)',
      },
    };
  }, [definition, isDark]);

  const statusColors = useMemo(() => {
    return {
      todo: colors.textSecondary,
      doing: isDark ? '#38bdf8' : '#0284C7',
      blocked: colors.error,
      done: colors.success,
    };
  }, [colors, isDark]);

  const gateColors = useMemo(() => {
    return {
      pending: { label: 'Pending', color: colors.textSecondary, border: colors.border },
      in_progress: { label: 'Evaluating', color: isDark ? '#38bdf8' : '#0284C7', border: isDark ? '#38bdf8' : '#0284C7' },
      passed: { label: 'Passed ✅', color: colors.success, border: colors.success },
      blocked: { label: 'At Risk ⚠️', color: colors.error, border: colors.error },
    };
  }, [colors, isDark]);

  // Load state from Postgres
  const loadState = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await sprintService.fetchSprintState();
      setDefinition(data.definition || null);
      setDays(data.days);
      setTasks(data.tasks);
      setMetrics(data.metrics);
      setActivities(data.recent_activity);
      setMembers(data.members);
    } catch (err: any) {
      console.error('[SprintCommandCenter] Failed to load sprint state:', err);
      if (!silent) {
        Alert.alert('Error', 'Unable to load Sprint Command Center from database.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Current active day metadata
  const currentDay = useMemo(() => {
    return days.find((d) => d.day === activeDay) || days[0];
  }, [days, activeDay]);

  // Handle task status update with optimistic update
  const handleSetTaskStatus = async (task: SprintTask, newStatus: SprintTaskStatus) => {
    if (task.status === newStatus) return;

    if (newStatus === 'blocked') {
      setEditingTask(task);
      setEditBlockerReason(task.blocker_reason || '');
      setEditNotes(task.notes || '');
      setEditAssigneeId(task.assignee_id || null);
      return;
    }

    if (newStatus === 'done' && !task.notes?.trim()) {
      setEditingTask({ ...task, status: 'done' });
      setEditBlockerReason('');
      setEditNotes('');
      setEditAssigneeId(task.assignee_id || null);
      return;
    }

    const prevTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, blocker_reason: null } : t))
    );

    try {
      const res = await sprintService.updateSprintTask(task.id, {
        status: newStatus,
        blocker_reason: null,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
      loadState(true);
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      setTasks(prevTasks);
      Alert.alert('Update Failed', err.response?.data?.error || 'Could not update task');
    }
  };

  // Save task details (notes, blocker, assignee)
  const handleSaveTaskDetails = async () => {
    if (!editingTask) return;
    setSavingTask(true);
    try {
      const assignedMember = members.find((m) => m.id === editAssigneeId);
      const newStatus = editBlockerReason.trim()
        ? 'blocked'
        : editingTask.status === 'blocked'
        ? 'doing'
        : editingTask.status;

      if (newStatus === 'done' && !editNotes.trim()) {
        Alert.alert('Evidence required', 'Add a deliverable link or evidence note before marking this task done.');
        return;
      }

      const res = await sprintService.updateSprintTask(editingTask.id, {
        status: newStatus,
        blocker_reason: editBlockerReason.trim() || null,
        notes: editNotes.trim() || null,
        assignee_id: editAssigneeId || null,
        assignee_name: assignedMember ? assignedMember.name : null,
      });

      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? res.task : t)));
      setEditingTask(null);
      loadState(true);
    } catch (err: any) {
      console.error('Failed to save task details:', err);
      Alert.alert('Error', 'Failed to save deliverable');
    } finally {
      setSavingTask(false);
    }
  };

  // Update End-of-Day Exit Gate
  const handleUpdateGateStatus = async (newStatus: SprintGateStatus) => {
    if (!currentDay || currentDay.gate_status === newStatus) return;
    try {
      const res = await sprintService.updateSprintDayGate(activeDay, newStatus);
      setDays((prev) => prev.map((d) => (d.day === activeDay ? res.day : d)));
    } catch (err: any) {
      console.error('Failed to update exit gate:', err);
      Alert.alert('Error', 'Could not update exit gate');
    }
  };

  // Standup report generator
  const handleOpenStandup = async () => {
    try {
      const res = await sprintService.getStandupReport(activeDay);
      setStandupText(res.report);
      setStandupCopied(false);
      setStandupModalOpen(true);
    } catch (err: any) {
      console.error('Failed to generate standup:', err);
      Alert.alert('Error', 'Could not generate standup report');
    }
  };

  const handleCopyStandup = async () => {
    await Clipboard.setStringAsync(standupText);
    setStandupCopied(true);
    setTimeout(() => setStandupCopied(false), 2500);
  };

  // Reset Sprint
  const handleResetSprint = () => {
    const confirmed = IS_WEB
      ? window.confirm("Are you sure you want to reset all 100 sprint deliverables back to 'To Do'?")
      : true;

    if (confirmed) {
      sprintService
        .resetSprintTasks()
        .then(() => {
          loadState();
        })
        .catch((err) => {
          Alert.alert('Error', err.message || 'Failed to reset sprint');
        });
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (currentView === 'room' && t.day !== activeDay) return false;
      if (selectedRoleFilter !== 'all' && t.role !== selectedRoleFilter) return false;
      if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesNum = `#${t.num}`.includes(q);
        const matchesAssignee = t.assignee_name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNum && !matchesAssignee) return false;
      }

      return true;
    });
  }, [tasks, currentView, activeDay, selectedRoleFilter, selectedStatusFilter, searchQuery]);

  if (loading && !metrics) {
    return (
      <View style={[styles.centerBox, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Connecting to Sprint Command Center...
        </Text>
      </View>
    );
  }

  const doneCount = metrics?.done || 0;
  const totalCount = metrics?.total || 100;
  const progressPct = metrics?.completionPct || 0;
  const doingCount = metrics?.doing || 0;
  const blockedCount = metrics?.blocked || 0;

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── TOP COCKPIT BAR (Adapts to Theme) ───────────────────────── */}
          <View
            style={[
              styles.topBar,
              {
                backgroundColor: isDark ? 'rgba(45, 12, 18, 0.88)' : 'rgba(255, 247, 247, 0.96)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.42)' : 'rgba(220, 38, 38, 0.25)',
              },
              clayStyle(clayShadows.clay),
            ]}
          >
            <View style={styles.brand}>
              <View style={styles.brandTitleRow}>
                <View style={[styles.zapBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(220, 38, 38, 0.1)' }]}>
                  <Zap size={16} color={colors.error} />
                </View>
                <Text style={[styles.brandH1, { color: colors.textPrimary }]}>NexSyrus RED ALERT</Text>
                <View
                  style={[
                    styles.deadlineTag,
                    {
                      backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 59, 48, 0.1)',
                      borderColor: isDark ? 'rgba(255, 69, 58, 0.35)' : 'rgba(255, 59, 48, 0.25)',
                    },
                  ]}
                >
                  <Sparkles size={11} color={colors.error} style={{ marginRight: 3 }} />
                  <Text style={[styles.deadlineTagText, { color: colors.error }]}>10 DAYS</Text>
                </View>
              </View>
              <Text style={[styles.brandP, { color: colors.textSecondary }]}>
                100 hard deliverables. 4 owners. Technical work belongs only to the Tech Lead. No task closes without evidence.
              </Text>
              <Text style={[styles.operatingRule, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                <Text style={{ fontWeight: '800' }}>Operating rule: </Text>
                {definition?.operating_rule || 'Every task must end in an artifact, validated decision, logged activity, working build, or measurable result.'}
              </Text>
            </View>

            <View style={styles.topMetrics}>
              <View style={styles.metricBox}>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Sprint Progress</Text>
                <Text style={[styles.metricVal, { color: colors.textPrimary }]}>{progressPct}%</Text>
                <View
                  style={[
                    styles.progressBarWrap,
                    { backgroundColor: isDark ? '#22222E' : '#E5E5EA' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPct}%`,
                        backgroundColor: colors.error,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.metricBox}>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Completed</Text>
                <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                  {doneCount} <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '600' }}>/ {totalCount}</Text>
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>In motion</Text>
                <Text style={[styles.metricVal, { color: isDark ? '#38BDF8' : '#0369A1' }]}>{doingCount}</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Blocked</Text>
                <Text style={[styles.metricVal, { color: colors.error }]}>{blockedCount}</Text>
              </View>
            </View>

            <View style={styles.topActions}>
              <Pressable
                style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }, clayStyle(clayShadows.buttonPrimary)]}
                onPress={handleOpenStandup}
              >
                <Copy size={13} color="#ffffff" />
                <Text style={styles.btnPrimaryText}>Copy Standup</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.btn,
                  {
                    backgroundColor: isDark ? '#1E1E28' : '#FFFFFF',
                    borderColor: colors.border,
                  },
                  clayStyle(clayShadows.subtle),
                ]}
                onPress={() => setActivityModalOpen(true)}
              >
                <History size={13} color={colors.textSecondary} />
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>Logs</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.btn,
                  {
                    backgroundColor: isDark ? '#1E1E28' : '#FFFFFF',
                    borderColor: colors.border,
                  },
                  clayStyle(clayShadows.subtle),
                ]}
                onPress={() => loadState(true)}
              >
                <RefreshCw size={13} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                style={[
                  styles.btn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 59, 48, 0.08)',
                    borderColor: isDark ? 'rgba(255, 69, 58, 0.3)' : 'rgba(255, 59, 48, 0.25)',
                  },
                ]}
                onPress={handleResetSprint}
              >
                <RotateCcw size={13} color={colors.error} />
                <Text style={[styles.btnResetText, { color: colors.error }]}>Reset</Text>
              </Pressable>
            </View>
          </View>

          {/* ── NAV RIBBON (DAY SELECTOR & VIEW SWITCHER) ────────────────── */}
          <View style={styles.navRibbon}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayStrip}
            >
              {days.map((dm) => {
                const isActive = currentView === 'room' && activeDay === dm.day;
                return (
                  <Pressable
                    key={dm.day}
                    onPress={() => {
                      setActiveDay(dm.day);
                      setCurrentView('room');
                    }}
                    style={[
                      styles.dayTab,
                      {
                        backgroundColor: isActive
                          ? isDark ? '#22222E' : colors.primaryDim
                          : isDark ? 'rgba(24, 24, 34, 0.65)' : '#FFFFFF',
                        borderColor: isActive ? colors.primary : colors.clayBorderColor,
                      },
                      clayStyle(isActive ? clayShadows.clay : clayShadows.subtle),
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayTabTitle,
                        { color: isActive ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      Day {dm.day}
                    </Text>
                    <Text
                      style={[
                        styles.dayTabSub,
                        { color: isActive ? colors.primary : colors.textTertiary },
                      ]}
                    >
                      {dm.done_tasks}/{dm.total_tasks}
                    </Text>
                    {dm.gate_status === 'passed' && (
                      <Text style={[styles.dayTabPassedMark, { color: colors.success }]}>✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View
              style={[
                styles.viewToggles,
                {
                  backgroundColor: isDark ? 'rgba(24, 24, 34, 0.8)' : '#FFFFFF',
                  borderColor: colors.clayBorderColor,
                },
                clayStyle(clayShadows.subtle),
              ]}
            >
              <Pressable
                onPress={() => setCurrentView('room')}
                style={[
                  styles.toggleBtn,
                  currentView === 'room' && {
                    backgroundColor: isDark ? '#22222E' : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    {
                      color: currentView === 'room'
                        ? isDark ? colors.textPrimary : '#FFFFFF'
                        : colors.textSecondary,
                    },
                  ]}
                >
                  Day View
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setCurrentView('matrix')}
                style={[
                  styles.toggleBtn,
                  currentView === 'matrix' && {
                    backgroundColor: isDark ? '#22222E' : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    {
                      color: currentView === 'matrix'
                        ? isDark ? colors.textPrimary : '#FFFFFF'
                        : colors.textSecondary,
                    },
                  ]}
                >
                  All Deliverables
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── DAY BRIEFING CARD (War Room View) ─────────────────────────── */}
          {currentView === 'room' && currentDay && (
            <View
              style={[
              styles.dayBrief,
              !isLargeScreen && ({ gridTemplateColumns: '1fr' } as any),
              {
                  backgroundColor: isDark ? 'rgba(24, 24, 34, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: colors.clayBorderColor,
                },
                clayStyle(clayShadows.clay),
              ]}
            >
              <View style={styles.briefColMain}>
                <Text style={[styles.briefTitle, { color: colors.textPrimary }]}>
                  Day {currentDay.day}: {currentDay.title}
                </Text>
                <Text style={[styles.briefDesc, { color: colors.textSecondary }]}>
                  {currentDay.date_label}
                </Text>
              </View>

              <View
                style={[
                  styles.briefBox,
                  {
                    backgroundColor: isDark ? '#181824' : '#F0F9FF',
                    borderLeftColor: isDark ? '#38bdf8' : '#0284C7',
                  },
                ]}
              >
                <Text style={[styles.briefBoxLbl, { color: colors.textSecondary }]}>
                  🔄 Daily Inter-Lead Handoff
                </Text>
                <Text style={[styles.briefBoxVal, { color: colors.textPrimary }]}>
                  {currentDay.handoff}
                </Text>
              </View>

              <View
                style={[
                  styles.briefBox,
                  styles.briefBoxGate,
                  {
                    backgroundColor: isDark ? '#181824' : '#F0FDF4',
                    borderLeftColor: colors.success,
                  },
                ]}
              >
                <View style={styles.briefBoxGateHeader}>
                  <Text style={[styles.briefBoxLbl, { color: colors.textSecondary }]}>
                    ✅ End-of-Day Exit Gate
                  </Text>
                  {IS_WEB ? (
                    <select
                      value={currentDay.gate_status}
                      onChange={(e) => handleUpdateGateStatus(e.target.value as SprintGateStatus)}
                      style={{
                        backgroundColor: isDark ? '#121216' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: gateColors[currentDay.gate_status].border,
                        color: gateColors[currentDay.gate_status].color,
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">Evaluating</option>
                      <option value="passed">Passed ✅</option>
                      <option value="blocked">At Risk ⚠️</option>
                    </select>
                  ) : (
                    <View style={styles.gatePill}>
                      <Text
                        style={{
                          color: gateColors[currentDay.gate_status].color,
                          fontSize: 10,
                          fontWeight: '700',
                        }}
                      >
                        {gateColors[currentDay.gate_status].label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.briefBoxVal, { color: colors.textPrimary }]}>
                  {currentDay.gate}
                </Text>
              </View>
            </View>
          )}

          {/* ── MATRIX VIEW FILTERS (All 100 Tasks View) ──────────────────── */}
          {currentView === 'matrix' && (
            <View
              style={[
                styles.matrixBar,
                {
                  backgroundColor: isDark ? 'rgba(24, 24, 34, 0.75)' : '#FFFFFF',
                  borderColor: colors.clayBorderColor,
                },
                clayStyle(clayShadows.subtle),
              ]}
            >
              <View
                style={[
                  styles.searchWrap,
                  {
                    backgroundColor: isDark ? '#0F0F14' : '#F5F5F7',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Search size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search deliverables by text, assignee, or #num..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {Boolean(searchQuery) && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <X size={15} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              <View style={styles.filterRow}>
                <Text style={[styles.filterLbl, { color: colors.textSecondary }]}>Role:</Text>
                {(['all', 'tech', 'curr', 'sales', 'scale'] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setSelectedRoleFilter(r)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedRoleFilter === r
                          ? colors.primary
                          : isDark ? '#1E1E28' : '#F5F5F7',
                        borderColor: selectedRoleFilter === r ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selectedRoleFilter === r
                            ? '#FFFFFF'
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {r === 'all' ? 'All Owners' : roleThemes[r].shortName}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.filterRow}>
                <Text style={[styles.filterLbl, { color: colors.textSecondary }]}>Status:</Text>
                {(['all', 'todo', 'doing', 'blocked', 'done'] as const).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSelectedStatusFilter(s)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedStatusFilter === s
                          ? colors.primary
                          : isDark ? '#1E1E28' : '#F5F5F7',
                        borderColor: selectedStatusFilter === s ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selectedStatusFilter === s
                            ? '#FFFFFF'
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {s.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* ── 4-ROLE WORKSPACE GRID ────────────────────────────────────── */}
          <View
            style={{
              display: 'grid',
              gridTemplateColumns: isLargeScreen
                ? 'repeat(4, 1fr)'
                : isMediumScreen
                ? 'repeat(2, 1fr)'
                : '1fr',
              gap: 14,
            } as any}
          >
            {(['tech', 'curr', 'sales', 'scale'] as SprintRole[]).map((role) => {
              const rMeta = roleThemes[role];
              const rTasks = filteredTasks.filter((t) => t.role === role);
              const rDone = rTasks.filter((t) => t.status === 'done').length;

              return (
                <View
                  key={role}
                  style={[
                    styles.roleCol,
                    {
                      backgroundColor: isDark ? 'rgba(24, 24, 34, 0.75)' : 'rgba(255, 255, 255, 0.95)',
                      borderColor: colors.clayBorderColor,
                    },
                    clayStyle(clayShadows.clay),
                  ]}
                >
                  <View
                    style={[
                      styles.roleHeader,
                      {
                        backgroundColor: isDark ? 'rgba(34, 34, 46, 0.6)' : 'rgba(245, 245, 247, 0.85)',
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.roleInfo}>
                      <Text style={{ fontSize: 14 }}>{rMeta.icon}</Text>
                      <View style={styles.roleCopy}>
                        <View
                          style={[
                            styles.roleBadge,
                            {
                              backgroundColor: rMeta.bg,
                              borderColor: rMeta.border,
                            },
                          ]}
                        >
                          <Text style={[styles.roleBadgeText, { color: rMeta.color }]}>
                            {rMeta.name}
                          </Text>
                        </View>
                        <Text style={[styles.roleSubtitle, { color: colors.textTertiary }]} numberOfLines={2}>
                          {rMeta.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.roleProgress, { color: colors.textSecondary }]}>
                      {rDone} / {rTasks.length}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.taskStack,
                      currentView === 'matrix' && IS_WEB && ({ maxHeight: '70vh', overflowY: 'auto' } as any),
                    ]}
                  >
                    {rTasks.length === 0 ? (
                      <Text style={[styles.emptyColText, { color: colors.textTertiary }]}>
                        No scheduled tasks for this day.
                      </Text>
                    ) : (
                      rTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isDark={isDark}
                          colors={colors}
                          clayShadows={clayShadows}
                          statusColor={statusColors[task.status]}
                          onSetStatus={handleSetTaskStatus}
                          onOpenDetails={() => {
                            setEditingTask(task);
                            setEditBlockerReason(task.blocker_reason || '');
                            setEditNotes(task.notes || '');
                            setEditAssigneeId(task.assignee_id || null);
                          }}
                        />
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── DAILY STANDUP MODAL ────────────────────────────────────────── */}
      <Modal visible={standupModalOpen} transparent animationType="fade" onRequestClose={() => setStandupModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: isDark ? '#181824' : '#FFFFFF',
                borderColor: colors.clayBorderColor,
              },
              clayStyle(clayShadows.clayElevated),
            ]}
          >
            <View style={styles.modalHead}>
              <Text style={[styles.modalHeadTitle, { color: colors.textPrimary }]}>
                Daily Standup Report Generator
              </Text>
              <Pressable onPress={() => setStandupModalOpen(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Ready to paste directly into Slack, WhatsApp, or Teams for your 09:00 IST standup ritual:
            </Text>
            <TextInput
              style={[
                styles.modalTextarea,
                {
                  backgroundColor: isDark ? '#0F0F14' : '#F5F5F7',
                  borderColor: colors.border,
                  color: isDark ? '#38bdf8' : '#0284C7',
                },
              ]}
              multiline
              editable={false}
              value={standupText}
            />
            <View style={styles.modalFoot}>
              <Pressable
                style={[
                  styles.btn,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                  standupCopied && { backgroundColor: colors.success, borderColor: colors.success },
                  clayStyle(clayShadows.buttonPrimary),
                ]}
                onPress={handleCopyStandup}
              >
                {standupCopied ? <Check size={14} color="#fff" /> : <Copy size={14} color="#fff" />}
                <Text style={styles.btnPrimaryText}>
                  {standupCopied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── TASK DETAILS & BLOCKER MODAL ──────────────────────────────── */}
      <Modal visible={Boolean(editingTask)} transparent animationType="fade" onRequestClose={() => setEditingTask(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: isDark ? '#181824' : '#FFFFFF',
                borderColor: colors.clayBorderColor,
              },
              clayStyle(clayShadows.clayElevated),
            ]}
          >
            {editingTask && (
              <>
                <View style={styles.modalHead}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.modalNumPill, { backgroundColor: colors.primary }]}>
                      #{editingTask.num}
                    </Text>
                    <Text style={[styles.modalHeadTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {roleThemes[editingTask.role].name} Deliverable
                    </Text>
                  </View>
                  <Pressable onPress={() => setEditingTask(null)} style={styles.closeBtn}>
                    <X size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={[styles.modalTaskFullTitle, { color: colors.textPrimary }]}>
                  {editingTask.title}
                </Text>

                {/* Blocker Reason field */}
                <View style={styles.fieldWrap}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <AlertTriangle size={13} color={colors.error} />
                    <Text style={[styles.fieldLbl, { color: colors.error }]}>
                      Blocker Reason (leave blank if not blocked):
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        backgroundColor: isDark ? '#0F0F14' : '#F5F5F7',
                        borderColor: Boolean(editBlockerReason) ? colors.error : colors.border,
                        color: colors.textPrimary,
                      },
                      Boolean(editBlockerReason) && {
                        backgroundColor: isDark ? 'rgba(255, 69, 58, 0.08)' : 'rgba(255, 59, 48, 0.05)',
                      },
                    ]}
                    placeholder="e.g. Waiting for OpenAPI contract approval from Tech Lead..."
                    placeholderTextColor={colors.textTertiary}
                    value={editBlockerReason}
                    onChangeText={setEditBlockerReason}
                  />
                </View>

                {/* Assignee selector */}
                <View style={styles.fieldWrap}>
                  <Text style={[styles.fieldLbl, { color: colors.textSecondary }]}>
                    Assignee (Founder / Member):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                    <Pressable
                      onPress={() => setEditAssigneeId(null)}
                      style={[
                        styles.assigneeChip,
                        {
                          backgroundColor: editAssigneeId === null
                            ? colors.primary
                            : isDark ? '#1E1E28' : '#F5F5F7',
                          borderColor: editAssigneeId === null ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.assigneeChipTxt,
                          {
                            color: editAssigneeId === null
                              ? '#FFFFFF'
                              : colors.textSecondary,
                            fontWeight: editAssigneeId === null ? '700' : '500',
                          },
                        ]}
                      >
                        Unassigned
                      </Text>
                    </Pressable>
                    {members.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => setEditAssigneeId(m.id)}
                        style={[
                          styles.assigneeChip,
                          {
                            backgroundColor: editAssigneeId === m.id
                              ? colors.primary
                              : isDark ? '#1E1E28' : '#F5F5F7',
                            borderColor: editAssigneeId === m.id ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <User
                          size={11}
                          color={editAssigneeId === m.id ? '#FFFFFF' : colors.textSecondary}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.assigneeChipTxt,
                            {
                              color: editAssigneeId === m.id ? '#FFFFFF' : colors.textPrimary,
                              fontWeight: editAssigneeId === m.id ? '700' : '500',
                            },
                          ]}
                        >
                          {m.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Notes & Deliverable Links */}
                <View style={styles.fieldWrap}>
                  <Text style={[styles.fieldLbl, { color: colors.textSecondary }]}>
                    Deliverable Proof / Notes / PR Link{editingTask.status === 'done' ? ' (required to close)' : ''}:
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        backgroundColor: isDark ? '#0F0F14' : '#F5F5F7',
                        borderColor: editingTask.status === 'done' && !editNotes.trim() ? colors.error : colors.border,
                        color: colors.textPrimary,
                        height: 70,
                      },
                    ]}
                    multiline
                    placeholder="e.g. https://github.com/... or PR #104 merged"
                    placeholderTextColor={colors.textTertiary}
                    value={editNotes}
                    onChangeText={setEditNotes}
                  />
                </View>

                <View style={styles.modalFoot}>
                  <Pressable
                    style={[
                      styles.btn,
                      {
                        backgroundColor: isDark ? '#1E1E28' : '#F5F5F7',
                        borderColor: colors.border,
                        marginRight: 8,
                      },
                    ]}
                    onPress={() => setEditingTask(null)}
                  >
                    <Text style={[styles.btnText, { color: colors.textPrimary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }, clayStyle(clayShadows.buttonPrimary)]}
                    onPress={handleSaveTaskDetails}
                    disabled={savingTask}
                  >
                    {savingTask ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Save Deliverable</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── AUDIT LOGS MODAL ──────────────────────────────────────────── */}
      <Modal visible={activityModalOpen} transparent animationType="fade" onRequestClose={() => setActivityModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: isDark ? '#181824' : '#FFFFFF',
                borderColor: colors.clayBorderColor,
              },
              clayStyle(clayShadows.clayElevated),
            ]}
          >
            <View style={styles.modalHead}>
              <Text style={[styles.modalHeadTitle, { color: colors.textPrimary }]}>
                Sprint Activity Logs
              </Text>
              <Pressable onPress={() => setActivityModalOpen(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 350, marginTop: 10 }}>
              {activities.length === 0 ? (
                <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No activity logged yet.
                </Text>
              ) : (
                activities.map((act) => (
                  <View
                    key={act.id}
                    style={[
                      styles.logRow,
                      {
                        backgroundColor: isDark ? '#1F1F2C' : '#F5F5F7',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.logRowTop}>
                      <Text style={[styles.logUser, { color: colors.primary }]}>{act.user_name || 'Founder'}</Text>
                      <Text style={[styles.logTime, { color: colors.textTertiary }]}>
                        {new Date(act.created_at).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Text style={[styles.logDetails, { color: colors.textPrimary }]}>{act.details}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ConsoleAmbientBackground>
  );
}

// ── TASK CARD ───────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: SprintTask;
  isDark: boolean;
  colors: any;
  clayShadows: any;
  statusColor: string;
  onSetStatus: (task: SprintTask, status: SprintTaskStatus) => void;
  onOpenDetails: () => void;
}

function TaskCard({ task, isDark, colors, clayShadows, statusColor, onSetStatus, onOpenDetails }: TaskCardProps) {
  const isDone = task.status === 'done';
  const isBlocked = task.status === 'blocked';
  const isDoing = task.status === 'doing';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E1E2A' : '#FFFFFF',
          borderColor: isBlocked
            ? isDark ? 'rgba(255, 69, 58, 0.4)' : 'rgba(255, 59, 48, 0.3)'
            : isDoing
            ? colors.primary
            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        },
        clayStyle(clayShadows.subtle),
        isDone && {
          opacity: 0.65,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
        },
        isBlocked && {
          backgroundColor: isDark ? 'rgba(255, 69, 58, 0.06)' : 'rgba(255, 59, 48, 0.04)',
        },
      ]}
    >
      <View style={styles.cardTop}>
        <Text
          style={[
            styles.cardId,
            {
              backgroundColor: isDark ? '#121216' : '#F0F0F4',
              borderColor: colors.border,
              color: colors.textSecondary,
            },
          ]}
        >
          #{task.num}
        </Text>
        <Text style={[styles.cardDayTag, { color: colors.textTertiary }]}>Day {task.day}</Text>
        <Pressable onPress={onOpenDetails} style={styles.cardEditTrigger}>
          <Text style={[styles.cardEditText, { color: colors.textSecondary }]}>•••</Text>
        </Pressable>
      </View>

      <Text
        style={[
          styles.cardTitle,
          { color: colors.textPrimary },
          isDone && { textDecorationLine: 'line-through', color: colors.textTertiary },
        ]}
      >
        {task.title}
      </Text>

      {/* Blocker Callout if blocked */}
      {isBlocked && (
        <View
          style={[
            styles.cardBlockerAlert,
            {
              backgroundColor: isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.08)',
              borderColor: isDark ? 'rgba(255, 69, 58, 0.3)' : 'rgba(255, 59, 48, 0.2)',
            },
          ]}
        >
          <AlertTriangle size={11} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={[styles.cardBlockerText, { color: colors.error }]} numberOfLines={2}>
            {task.blocker_reason || 'Blocked: Action needed'}
          </Text>
        </View>
      )}

      {/* Assignee / Remarks Callout if present */}
      {Boolean(task.assignee_name) && (
        <View style={styles.cardAssigneeRow}>
          <User size={10} color={colors.primary} style={{ marginRight: 3 }} />
          <Text style={[styles.cardAssigneeText, { color: colors.primary }]}>
            @{task.assignee_name}
          </Text>
        </View>
      )}

      {/* Card Actions Footer: orig timeline + native select */}
      <View style={[styles.cardActions, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <Text style={[styles.origDay, { color: colors.textTertiary }]}>
          {task.category || task.orig_day_label || `Day ${task.day}`}
        </Text>

        {IS_WEB ? (
          <select
            value={task.status}
            onChange={(e) => onSetStatus(task, e.target.value as SprintTaskStatus)}
            style={{
              backgroundColor: isDark ? '#121216' : '#FFFFFF',
              borderWidth: 1,
              borderColor: statusColor,
              color: statusColor,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="todo" style={{ background: isDark ? '#121216' : '#FFFFFF', color: colors.textSecondary }}>To Do</option>
            <option value="doing" style={{ background: isDark ? '#121216' : '#FFFFFF', color: isDark ? '#38bdf8' : '#0284C7' }}>Doing</option>
            <option value="blocked" style={{ background: isDark ? '#121216' : '#FFFFFF', color: colors.error }}>Blocked</option>
            <option value="done" style={{ background: isDark ? '#121216' : '#FFFFFF', color: colors.success }}>Done</option>
          </select>
        ) : (
          <Pressable
            onPress={() => {
              const next: Record<SprintTaskStatus, SprintTaskStatus> = {
                todo: 'doing',
                doing: 'done',
                done: 'todo',
                blocked: 'doing',
              };
              onSetStatus(task, next[task.status]);
            }}
            style={[styles.statusPillNative, { borderColor: statusColor, backgroundColor: isDark ? '#121216' : '#FFFFFF' }]}
          >
            <Text style={[styles.statusPillNativeText, { color: statusColor }]}>
              {task.status.toUpperCase()}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingTop: IS_WEB ? 76 : 24,
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  container: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },

  // Top Bar
  topBar: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  brand: {
    gap: 4,
    flex: 1,
    minWidth: 300,
    maxWidth: 580,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  zapBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandH1: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  deadlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  deadlineTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  brandP: {
    fontSize: 12,
    lineHeight: 18,
  },
  operatingRule: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  topMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  metricBox: {
    alignItems: 'flex-end',
  },
  metricLbl: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  progressBarWrap: {
    width: 140,
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnResetText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Nav Ribbon
  navRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  dayStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  dayTab: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 76,
    position: 'relative',
  },
  dayTabTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayTabSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  dayTabPassedMark: {
    position: 'absolute',
    top: 3,
    right: 5,
    fontSize: 9,
    fontWeight: '900',
  },
  viewToggles: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Day Brief Card
  dayBrief: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr',
    gap: 16,
  },
  briefColMain: {
    justifyContent: 'center',
  },
  briefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  briefDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  briefBox: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  briefBoxGate: {
    borderLeftColor: '#34d399',
  },
  briefBoxGateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  briefBoxLbl: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  briefBoxVal: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  gatePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Matrix Filter Bar
  matrixBar: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  searchWrap: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 34,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterLbl: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Role Columns Grid
  roleCol: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  roleCopy: {
    flex: 1,
    gap: 5,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  roleSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  roleProgress: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskStack: {
    padding: 12,
    gap: 10,
  },
  emptyColText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Task Card
  card: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardId: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  cardDayTag: {
    fontSize: 10,
    flex: 1,
    marginLeft: 8,
    fontWeight: '500',
  },
  cardEditTrigger: {
    padding: 2,
  },
  cardEditText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  cardBlockerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    padding: 5,
  },
  cardBlockerText: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  cardAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAssigneeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  origDay: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusPillNative: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillNativeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderWidth: 1,
    borderRadius: 14,
    width: '100%',
    maxWidth: 650,
    padding: 20,
    gap: 14,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeadTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalNumPill: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalTaskFullTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  modalSub: {
    fontSize: 11,
  },
  modalTextarea: {
    width: '100%',
    height: 260,
    borderWidth: 1,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    padding: 12,
    textAlignVertical: 'top',
  },
  modalFoot: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLbl: {
    fontSize: 11,
    fontWeight: '700',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  assigneeChipTxt: {
    fontSize: 11,
  },
  logRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  logRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logUser: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 10,
  },
  logDetails: {
    fontSize: 11,
  },
} as any);
