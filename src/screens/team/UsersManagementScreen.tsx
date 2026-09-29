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
  Users,
  UserPlus,
  UserCheck,
  Shield,
  School,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Layers,
  ChevronRight,
  GitBranch,
  Mail,
  Phone,
  Lock,
  X,
  Building,
  AlertTriangle,
  Briefcase,
  UserCog,
  CheckSquare,
  ArrowRight,
  Info,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { ROLE_LABELS, ROLE_BADGE_COLORS, Role, PERMISSIONS, canManageRole } from '../../constants/rbac';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { bottomTabPad } from '../founder/founderUi';

interface InternalUserItem {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: Role;
  job_title?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';
  manager_id?: string | null;
  manager_name?: string | null;
  manager_employee_id?: string | null;
  territory?: string | null;
  assigned_schools?: { school_id: number; school_name?: string; school_code?: string }[];
  assigned_school_ids?: number[];
  assigned_schools_count?: number;
  direct_reports_count?: number;
  created_at: string;
}

interface SchoolItem {
  id: number;
  name: string;
  code: string;
}

export default function UsersManagementScreen() {
  const { colors, isDark, clayShadows } = useTheme();
  const { user, role, can } = useAuth();

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'HIERARCHY'>('DIRECTORY');
  const [users, setUsers] = useState<InternalUserItem[]>([]);
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<InternalUserItem | null>(null);
  const [editingUser, setEditingUser] = useState<InternalUserItem | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<InternalUserItem | null>(null);
  const [userImpact, setUserImpact] = useState<any>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formRole, setFormRole] = useState<Role>('SALES_EXECUTIVE');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formManagerId, setFormManagerId] = useState('');
  const [formTerritory, setFormTerritory] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED'>('ACTIVE');
  const [creating, setCreating] = useState(false);

  // Deactivation transfer states
  const [reassignReportsTo, setReassignReportsTo] = useState('');
  const [reassignSchoolsTo, setReassignSchoolsTo] = useState('');
  const [reassignTasksTo, setReassignTasksTo] = useState('');
  const [reassignSupervisionTo, setReassignSupervisionTo] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('Employee deactivation');
  const [deactivating, setDeactivating] = useState(false);

  // Assign schools state
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Reset password state
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [permissionCatalog, setPermissionCatalog] = useState<string[]>([]);
  const [permissionModes, setPermissionModes] = useState<Record<string, 'INHERIT' | 'GRANT' | 'DENY'>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usrRes, schRes, hierRes] = await Promise.all([
        superAdminApi.getInternalUsers(),
        superAdminApi.getSchools(),
        superAdminApi.getUserHierarchy().catch(() => null),
      ]);

      if (usrRes?.success && Array.isArray(usrRes.data)) {
        setUsers(usrRes.data);
      }
      const rawSch: any = schRes;
      const schList = Array.isArray(rawSch) ? rawSch : Array.isArray(rawSch?.data) ? rawSch.data : [];
      setSchools(schList);
      if (hierRes?.success && hierRes.data) {
        setHierarchyData(hierRes.data);
      }
    } catch (err) {
      console.error('Failed to load team users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employee_id?.toLowerCase().includes(q) ||
      (u.job_title && u.job_title.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  // Eligible managers for the currently selected formRole
  const eligibleManagers = users.filter((m) => {
    if (editingUser && m.id === editingUser.id) return false;
    if (m.status !== 'ACTIVE') return false;
    return canManageRole(m.role, formRole);
  });

  // Create or Update User
  const handleCreateUser = async () => {
    if (!formName.trim() || (!editingUser && (!formEmail.trim() || !formEmpId.trim() || !formPassword))) {
      const msg = 'Please fill full name, employee ID, email, and password.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Validation Error', msg);
      return;
    }

    // Manager validation for active non-root roles
    const isRoot = formRole === 'FOUNDER' || formRole === 'SUPER_ADMIN';
    if (formStatus === 'ACTIVE' && !isRoot && !formManagerId) {
      const msg = 'Active non-root employees must have an eligible reporting manager selected.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Validation Error', msg);
      return;
    }

    try {
      setCreating(true);
      const res = editingUser
        ? await superAdminApi.updateInternalUser(editingUser.id, {
            full_name: formName.trim(),
            phone: formPhone.trim() || null,
            role: formRole,
            job_title: formJobTitle.trim() || null,
            manager_id: formManagerId || null,
            territory: formTerritory.trim() || null,
            status: formStatus,
          })
        : await superAdminApi.createInternalUser({
            full_name: formName.trim(),
            email: formEmail.trim(),
            phone: formPhone.trim() || undefined,
            employee_id: formEmpId.trim(),
            role: formRole,
            job_title: formJobTitle.trim() || undefined,
            password: formPassword,
            manager_id: formManagerId || undefined,
            territory: formTerritory.trim() || undefined,
            status: formStatus,
          });

      if (res?.success) {
        setShowCreateModal(false);
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormEmpId('');
        setFormPassword('');
        setFormJobTitle('');
        setFormStatus('ACTIVE');
        setEditingUser(null);
        await loadData();
      } else {
        const msg = res?.error || 'Failed to save user.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Create user error';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const openEditUser = (target: InternalUserItem) => {
    setEditingUser(target);
    setFormName(target.full_name || '');
    setFormEmail(target.email || '');
    setFormPhone(target.phone || '');
    setFormEmpId(target.employee_id || '');
    setFormRole(target.role);
    setFormJobTitle(target.job_title || '');
    setFormPassword('');
    setFormManagerId(target.manager_id || '');
    setFormTerritory(target.territory || '');
    setFormStatus(target.status);
    setShowCreateModal(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormEmpId('');
    setFormRole('SALES_EXECUTIVE');
    setFormJobTitle('');
    setFormPassword('');
    // Auto-select first active founder or sales manager if available
    const defaultManager = users.find((u) => u.status === 'ACTIVE' && canManageRole(u.role, 'SALES_EXECUTIVE'));
    setFormManagerId(defaultManager?.id || '');
    setFormTerritory('');
    setFormStatus('ACTIVE');
    setShowCreateModal(true);
  };

  // Open Details Modal
  const openUserDetails = async (target: InternalUserItem) => {
    setSelectedUser(target);
    setShowDetailsModal(true);
    try {
      const res = await superAdminApi.getUserPermissions(target.id);
      if (res?.success && res.data?.effectivePermissions) {
        setEffectivePermissions(res.data.effectivePermissions);
      } else {
        setEffectivePermissions([]);
      }
    } catch {
      setEffectivePermissions([]);
    }
  };

  // Open Deactivation / Impact Modal
  const openDeactivateModal = async (target: InternalUserItem) => {
    setDeactivatingUser(target);
    setShowDeactivateModal(true);
    setLoadingImpact(true);
    setReassignReportsTo('');
    setReassignSchoolsTo('');
    setReassignTasksTo('');
    setReassignSupervisionTo('');
    setDeactivateReason('Employee deactivation');

    try {
      const res = await superAdminApi.getUserImpact(target.id);
      if (res?.success && res.data) {
        setUserImpact(res.data);
      }
    } catch (err) {
      console.error('Error fetching impact:', err);
    } finally {
      setLoadingImpact(false);
    }
  };

  // Execute Deactivation with Explicit Reassignment
  const handleConfirmDeactivation = async () => {
    if (!deactivatingUser) return;
    try {
      setDeactivating(true);
      const res = await superAdminApi.deactivateUser(deactivatingUser.id, {
        reassign_reports_to: reassignReportsTo || undefined,
        reassign_schools_to: reassignSchoolsTo || undefined,
        reassign_tasks_to: reassignTasksTo || undefined,
        reassign_supervision_to: reassignSupervisionTo || undefined,
        reason: deactivateReason.trim(),
      });

      if (res?.success) {
        setShowDeactivateModal(false);
        setDeactivatingUser(null);
        const msg = 'Employee has been deactivated and responsibilities safely transferred.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Success', msg);
        await loadData();
      } else {
        const msg = res?.error || 'Failed to deactivate user.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Deactivation error';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setDeactivating(false);
    }
  };

  // Reactivate user
  const handleReactivateUser = async (u: InternalUserItem) => {
    try {
      const res = await superAdminApi.toggleUserStatus(u.id, 'ACTIVE');
      if (res?.success) {
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // Open Assign Schools Modal
  const openAssignModal = (u: InternalUserItem) => {
    setSelectedUser(u);
    const existing = u.assigned_school_ids || (u.assigned_schools?.map((s) => s.school_id) ?? []);
    setSelectedSchoolIds(existing);
    setShowAssignModal(true);
  };

  // Save School Assignment
  const handleSaveAssignments = async () => {
    if (!selectedUser) return;
    try {
      setAssigning(true);
      const res = await superAdminApi.assignSchoolsToUser(selectedUser.id, selectedSchoolIds);
      if (res?.success) {
        setShowAssignModal(false);
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setAssigning(false);
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    try {
      setResetting(true);
      const res = await superAdminApi.resetUserPassword(selectedUser.id, newPassword.trim());
      if (res?.success) {
        setShowResetModal(false);
        setNewPassword('');
        if (Platform.OS === 'web') window.alert('Password updated successfully.');
        else Alert.alert('Success', 'Password updated successfully.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setResetting(false);
    }
  };

  const openPermissionsModal = async (target: InternalUserItem) => {
    setSelectedUser(target);
    setShowPermissionsModal(true);
    try {
      const [catalogRes, userRes] = await Promise.all([
        superAdminApi.getPermissionCatalog(),
        superAdminApi.getUserPermissions(target.id),
      ]);
      const catalog = Array.isArray(catalogRes?.data) ? catalogRes.data : [];
      const modes: Record<string, 'INHERIT' | 'GRANT' | 'DENY'> = {};
      catalog.forEach((permission: string) => {
        modes[permission] = 'INHERIT';
      });
      (userRes?.data?.overrides || []).forEach((item: { permission: string; effect: 'GRANT' | 'DENY' }) => {
        modes[item.permission] = item.effect;
      });
      setPermissionCatalog(catalog);
      setPermissionModes(modes);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to load permissions';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
      setShowPermissionsModal(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      setSavingPermissions(true);
      const overrides = permissionCatalog
        .filter((permission) => permissionModes[permission] !== 'INHERIT')
        .map((permission) => ({ permission, effect: permissionModes[permission] as 'GRANT' | 'DENY' }));
      const res = await superAdminApi.updateUserPermissions(selectedUser.id, overrides);
      if (res?.success) setShowPermissionsModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to save permissions';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSavingPermissions(false);
    }
  };

  const availableRoles: Role[] = [
    'SALES_MANAGER',
    'SALES_EXECUTIVE',
    'IMPLEMENTATION_MANAGER',
    'IMPLEMENTATION_EXECUTIVE',
    'SUPPORT_MANAGER',
    'SUPPORT_EXECUTIVE',
    'OPERATIONS_MANAGER',
    'ACCOUNTS_MANAGER',
    'TECHNICAL_SUPPORT',
    'QA',
    'DEPLOYMENT_MANAGER',
    'VIEW_ONLY_ADMIN',
    'FOUNDER',
  ];

  return (
    <RouteGuard anyPermissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_READ_TEAM]}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomTabPad }]}>
          {/* Header */}
          <View style={styles.topHeader}>
            <View>
              <View style={styles.titleBadgeRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.3)' },
                  ]}
                >
                  <Users size={14} color="#6366F1" />
                  <Text style={[styles.badgeText, { color: '#6366F1' }]}>OPERATIONAL DELEGATION & TEAM</Text>
                </View>
              </View>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Employee Hierarchy & Accountability</Text>
              <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                Supervise teams, assign routine responsibilities, prevent orphaning of work, and enforce clear reporting lines.
              </Text>
            </View>

            {can(PERMISSIONS.USERS_CREATE) && (
              <Pressable style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={openCreateUser}>
                <UserPlus size={16} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Add Employee</Text>
              </Pressable>
            )}
          </View>

          {/* View Mode Switcher: Directory vs Hierarchy */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[
                styles.tabBtn,
                activeTab === 'DIRECTORY' && { backgroundColor: colors.primary, borderColor: colors.primary },
                activeTab !== 'DIRECTORY' && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' },
              ]}
              onPress={() => setActiveTab('DIRECTORY')}
            >
              <Users size={15} color={activeTab === 'DIRECTORY' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.tabBtnText, { color: activeTab === 'DIRECTORY' ? '#FFFFFF' : colors.textSecondary }]}>
                Employee Directory ({users.length})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabBtn,
                activeTab === 'HIERARCHY' && { backgroundColor: colors.primary, borderColor: colors.primary },
                activeTab !== 'HIERARCHY' && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' },
              ]}
              onPress={() => setActiveTab('HIERARCHY')}
            >
              <GitBranch size={15} color={activeTab === 'HIERARCHY' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.tabBtnText, { color: activeTab === 'HIERARCHY' ? '#FFFFFF' : colors.textSecondary }]}>
                Reporting Hierarchy Tree
              </Text>
              {hierarchyData?.legacyUnmanagedCount > 0 && (
                <View style={styles.unmanagedCountBadge}>
                  <Text style={styles.unmanagedCountText}>{hierarchyData.legacyUnmanagedCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* TAB 1: DIRECTORY */}
          {activeTab === 'DIRECTORY' && (
            <>
              {/* Search & Filters */}
              <View
                style={[
                  styles.filterBar,
                  { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' },
                ]}
              >
                <View style={[styles.searchBox, { borderColor: colors.border }]}>
                  <Search size={16} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search by name, job title, email, or employee ID..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
                  {['ALL', ...availableRoles].map((r) => {
                    const isSelected = roleFilter === r;
                    return (
                      <Pressable
                        key={r}
                        style={[
                          styles.filterPill,
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                          !isSelected && {
                            borderColor: colors.border,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          },
                        ]}
                        onPress={() => setRoleFilter(r)}
                      >
                        <Text style={[styles.filterPillText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                          {r === 'ALL' ? 'All Roles' : ROLE_LABELS[r as Role] || r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Users List */}
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading employees...</Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Users size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Employees Found</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    No internal users match your current filter criteria.
                  </Text>
                </View>
              ) : (
                <View style={styles.usersGrid}>
                  {filteredUsers.map((u) => {
                    const roleBadge = ROLE_BADGE_COLORS[u.role] || {
                      bg: 'rgba(255,255,255,0.1)',
                      border: 'rgba(255,255,255,0.2)',
                      text: colors.textPrimary,
                    };
                    const isActive = u.status === 'ACTIVE';
                    const assignedCount = u.assigned_schools_count ?? u.assigned_school_ids?.length ?? 0;

                    return (
                      <View
                        key={u.id}
                        style={[
                          styles.userCard,
                          clayStyle(clayShadows.clay),
                          {
                            backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF',
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.userCardTop}>
                          <View style={styles.avatarWrap}>
                            <Text style={styles.avatarText}>{(u.full_name || 'U').slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: colors.textPrimary }]}>{u.full_name}</Text>
                            <Text style={[styles.userEmpId, { color: colors.textSecondary }]}>
                              {u.employee_id} {u.job_title ? `• ${u.job_title}` : ''}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              },
                            ]}
                          >
                            <Text style={[styles.statusText, { color: isActive ? '#10B981' : '#EF4444' }]}>
                              {u.status}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.userMeta}>
                          <View
                            style={[
                              styles.roleBadge,
                              { backgroundColor: roleBadge.bg, borderColor: roleBadge.border },
                            ]}
                          >
                            <Shield size={12} color={roleBadge.text} />
                            <Text style={[styles.roleText, { color: roleBadge.text }]}>
                              {ROLE_LABELS[u.role] || u.role}
                            </Text>
                          </View>

                          {/* Reporting Manager */}
                          <View style={styles.metaRow}>
                            <GitBranch size={13} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                              Manager: {u.manager_name ? `${u.manager_name}` : u.role === 'FOUNDER' ? 'Self (Platform Root)' : '⚠️ Unassigned'}
                            </Text>
                          </View>

                          <View style={styles.metaRow}>
                            <Mail size={13} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {u.email}
                            </Text>
                          </View>
                          {u.phone && (
                            <View style={styles.metaRow}>
                              <Phone size={13} color={colors.textSecondary} />
                              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{u.phone}</Text>
                            </View>
                          )}
                        </View>

                        {/* School Portfolio Scope */}
                        <View
                          style={[
                            styles.schoolScopeBox,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' },
                          ]}
                        >
                          <School size={14} color={colors.primary} />
                          <Text style={[styles.schoolScopeText, { color: colors.textPrimary }]}>
                            {assignedCount} Assigned School{assignedCount === 1 ? '' : 's'}
                            {u.direct_reports_count ? ` • ${u.direct_reports_count} Direct Reports` : ''}
                          </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.userCardActions}>
                          <Pressable
                            style={[styles.cardActionBtn, { borderColor: colors.border }]}
                            onPress={() => openUserDetails(u)}
                          >
                            <Info size={13} color={colors.primary} />
                            <Text style={[styles.cardActionText, { color: colors.primary }]}>Details</Text>
                          </Pressable>

                          {can(PERMISSIONS.SCHOOLS_ASSIGN) && (
                            <Pressable
                              style={[styles.cardActionBtn, { borderColor: colors.border }]}
                              onPress={() => openAssignModal(u)}
                            >
                              <School size={13} color={colors.textSecondary} />
                              <Text style={[styles.cardActionText, { color: colors.textSecondary }]}>Schools</Text>
                            </Pressable>
                          )}

                          {can(PERMISSIONS.USERS_MANAGE) && (
                            <Pressable
                              style={[styles.cardActionBtn, { borderColor: colors.border }]}
                              onPress={() => openEditUser(u)}
                            >
                              <UserCog size={13} color={colors.textSecondary} />
                              <Text style={[styles.cardActionText, { color: colors.textSecondary }]}>Edit</Text>
                            </Pressable>
                          )}

                          {can(PERMISSIONS.USERS_MANAGE) && (
                            <Pressable
                              style={[styles.cardActionBtn, { borderColor: colors.border }]}
                              onPress={() => openPermissionsModal(u)}
                            >
                              <Shield size={13} color={colors.textSecondary} />
                              <Text style={[styles.cardActionText, { color: colors.textSecondary }]}>Overrides</Text>
                            </Pressable>
                          )}

                          {can(PERMISSIONS.USERS_MANAGE) && (
                            <Pressable
                              style={[
                                styles.cardActionBtn,
                                {
                                  borderColor: colors.border,
                                  backgroundColor: isActive
                                    ? 'rgba(239, 68, 68, 0.08)'
                                    : 'rgba(16, 185, 129, 0.08)',
                                },
                              ]}
                              onPress={() => {
                                if (isActive) {
                                  openDeactivateModal(u);
                                } else {
                                  handleReactivateUser(u);
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.cardActionText,
                                  { color: isActive ? '#EF4444' : '#10B981' },
                                ]}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* TAB 2: HIERARCHY TREE */}
          {activeTab === 'HIERARCHY' && (
            <View style={styles.hierarchyContainer}>
              {/* Legacy Unassigned Alert Banner */}
              {hierarchyData?.legacyUnmanagedCount > 0 && (
                <View style={[styles.alertBanner, { backgroundColor: 'rgba(255, 159, 10, 0.12)', borderColor: 'rgba(255, 159, 10, 0.3)' }]}>
                  <AlertTriangle size={20} color="#FF9F0A" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertTitle, { color: '#FF9F0A' }]}>
                      {hierarchyData.legacyUnmanagedCount} Legacy Employee(s) Without Reporting Manager
                    </Text>
                    <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
                      These employees are active but lack an assigned reporting supervisor. Edit their profile to establish clear operational accountability.
                    </Text>
                  </View>
                </View>
              )}

              {/* Founders Section */}
              <View style={styles.hierarchySection}>
                <View style={styles.sectionHeaderRow}>
                  <Shield size={18} color="#FF2D55" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Platform Leadership (Founders)
                  </Text>
                </View>
                <View style={styles.hierarchyGrid}>
                  {(hierarchyData?.founders || []).map((f: any) => (
                    <View
                      key={f.id}
                      style={[
                        styles.treeNodeCard,
                        clayStyle(clayShadows.clay),
                        { backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF', borderColor: '#FF2D55' },
                      ]}
                    >
                      <View style={styles.treeNodeTop}>
                        <View style={[styles.avatarWrap, { backgroundColor: '#FF2D55' }]}>
                          <Text style={styles.avatarText}>{(f.full_name || 'F').slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.userName, { color: colors.textPrimary }]}>{f.full_name}</Text>
                          <Text style={[styles.userEmpId, { color: colors.textSecondary }]}>
                            {f.employee_id} {f.job_title ? `• ${f.job_title}` : '• Founder / Executive'}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 45, 85, 0.12)' }]}>
                          <Text style={[styles.statusText, { color: '#FF2D55' }]}>ROOT</Text>
                        </View>
                      </View>
                      <Text style={[styles.treeScopeText, { color: colors.textSecondary }]}>
                        Directly supervises: {f.direct_reports_count || 0} manager(s) & direct executive(s)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Managers and Direct Reports Trees */}
              <View style={styles.hierarchySection}>
                <View style={styles.sectionHeaderRow}>
                  <Users size={18} color="#0A84FF" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Supervising Managers & Reporting Teams
                  </Text>
                </View>

                {(hierarchyData?.hierarchy || []).length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Department Managers</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      Add a Sales Manager or Support Manager to establish delegated supervision.
                    </Text>
                  </View>
                ) : (
                  (hierarchyData?.hierarchy || []).map((tree: any) => {
                    const mgr = tree.manager;
                    const subordinates = tree.executives || [];
                    return (
                      <View
                        key={mgr.id}
                        style={[
                          styles.managerTreeCard,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F9FAFB', borderColor: colors.border },
                        ]}
                      >
                        {/* Manager Header */}
                        <View style={styles.managerHeaderRow}>
                          <View style={[styles.avatarWrap, { backgroundColor: '#0A84FF' }]}>
                            <Text style={styles.avatarText}>{(mgr.full_name || 'M').slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.managerName, { color: colors.textPrimary }]}>{mgr.full_name}</Text>
                            <Text style={[styles.userEmpId, { color: colors.textSecondary }]}>
                              {mgr.employee_id} • {mgr.job_title || ROLE_LABELS[mgr.role as Role] || mgr.role}
                            </Text>
                          </View>
                          <View style={[styles.teamCountBadge, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
                            <Text style={[styles.teamCountText, { color: '#0A84FF' }]}>
                              {subordinates.length} Direct Report{subordinates.length === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </View>

                        {/* Subordinates / Executives List */}
                        <View style={styles.subordinatesList}>
                          {subordinates.length === 0 ? (
                            <Text style={[styles.noReportsText, { color: colors.textSecondary }]}>
                              No direct reports assigned to this manager yet.
                            </Text>
                          ) : (
                            subordinates.map((sub: any) => (
                              <Pressable
                                key={sub.id}
                                style={[
                                  styles.subordinateCard,
                                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border },
                                ]}
                                onPress={() => openUserDetails(sub)}
                              >
                                <View style={styles.subLeft}>
                                  <ArrowRight size={14} color="#64D2FF" />
                                  <View>
                                    <Text style={[styles.subName, { color: colors.textPrimary }]}>{sub.full_name}</Text>
                                    <Text style={[styles.subMeta, { color: colors.textSecondary }]}>
                                      {sub.employee_id} {sub.job_title ? `• ${sub.job_title}` : ''}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.subRight}>
                                  <View style={[styles.schoolPill, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                    <School size={11} color="#6366F1" />
                                    <Text style={[styles.schoolPillText, { color: '#6366F1' }]}>
                                      {sub.assigned_schools_count || 0} School{sub.assigned_schools_count === 1 ? '' : 's'}
                                    </Text>
                                  </View>
                                  <ChevronRight size={14} color={colors.textSecondary} />
                                </View>
                              </Pressable>
                            ))
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Direct Founder Executives (Founder -> Sales Executive) */}
              {(hierarchyData?.directExecutives || []).length > 0 && (
                <View style={styles.hierarchySection}>
                  <View style={styles.sectionHeaderRow}>
                    <Briefcase size={18} color="#30D158" />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      Direct Founder Reports (Founder → Sales Executive)
                    </Text>
                  </View>
                  <View style={styles.hierarchyGrid}>
                    {(hierarchyData?.directExecutives || []).map((sub: any) => (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.treeNodeCard,
                          clayStyle(clayShadows.clay),
                          { backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : '#FFFFFF', borderColor: colors.border },
                        ]}
                        onPress={() => openUserDetails(sub)}
                      >
                        <View style={styles.treeNodeTop}>
                          <View style={[styles.avatarWrap, { backgroundColor: '#30D158' }]}>
                            <Text style={styles.avatarText}>{(sub.full_name || 'E').slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: colors.textPrimary }]}>{sub.full_name}</Text>
                            <Text style={[styles.userEmpId, { color: colors.textSecondary }]}>
                              {sub.employee_id} {sub.job_title ? `• ${sub.job_title}` : ''}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.treeScopeText, { color: colors.textSecondary }]}>
                          Reports directly to Founder • {sub.assigned_schools_count || 0} assigned schools
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Unassigned / Legacy Employees Section */}
              {(hierarchyData?.unassignedExecutives || []).length > 0 && (
                <View style={styles.hierarchySection}>
                  <View style={styles.sectionHeaderRow}>
                    <AlertTriangle size={18} color="#FF9F0A" />
                    <Text style={[styles.sectionTitle, { color: '#FF9F0A' }]}>
                      Unassigned Employees ({hierarchyData.unassignedExecutives.length})
                    </Text>
                  </View>
                  <View style={styles.hierarchyGrid}>
                    {hierarchyData.unassignedExecutives.map((sub: any) => (
                      <View
                        key={sub.id}
                        style={[
                          styles.treeNodeCard,
                          { backgroundColor: isDark ? 'rgba(255, 159, 10, 0.05)' : '#FFFBEB', borderColor: '#FF9F0A' },
                        ]}
                      >
                        <View style={styles.treeNodeTop}>
                          <View style={[styles.avatarWrap, { backgroundColor: '#FF9F0A' }]}>
                            <Text style={styles.avatarText}>{(sub.full_name || 'U').slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: colors.textPrimary }]}>{sub.full_name}</Text>
                            <Text style={[styles.userEmpId, { color: colors.textSecondary }]}>
                              {sub.employee_id} • {ROLE_LABELS[sub.role as Role] || sub.role}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          style={[styles.assignManagerQuickBtn, { backgroundColor: colors.primary }]}
                          onPress={() => openEditUser(sub)}
                        >
                          <GitBranch size={13} color="#FFFFFF" />
                          <Text style={styles.assignManagerQuickBtnText}>Assign Reporting Manager</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Modal: Create / Edit User */}
          <Modal visible={showCreateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {editingUser ? 'Edit Employee Account' : 'Create Employee Account'}
                  </Text>
                  <Pressable onPress={() => setShowCreateModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. Rajesh Kumar"
                    placeholderTextColor={colors.textSecondary}
                    value={formName}
                    onChangeText={setFormName}
                  />

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Job Title / Operational Function</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. Senior Enterprise Sales Executive"
                    placeholderTextColor={colors.textSecondary}
                    value={formJobTitle}
                    onChangeText={setFormJobTitle}
                  />

                  {!editingUser && (
                    <>
                      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Corporate Email *</Text>
                      <TextInput
                        style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="name@nexsyrus.com"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formEmail}
                        onChangeText={setFormEmail}
                      />
                    </>
                  )}

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="+919876543210"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />

                  {!editingUser && (
                    <>
                      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Employee ID *</Text>
                      <TextInput
                        style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="e.g. SE-015"
                        placeholderTextColor={colors.textSecondary}
                        value={formEmpId}
                        onChangeText={setFormEmpId}
                      />
                    </>
                  )}

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Assigned Permission Role *</Text>
                  <View style={styles.rolePickerWrap}>
                    {availableRoles.map((r) => (
                      <Pressable
                        key={r}
                        style={[
                          styles.roleOption,
                          formRole === r && { backgroundColor: colors.primary, borderColor: colors.primary },
                          formRole !== r && { borderColor: colors.border },
                        ]}
                        onPress={() => {
                          setFormRole(r);
                          // Revalidate manager selection
                          if (formManagerId) {
                            const mgr = users.find((u) => u.id === formManagerId);
                            if (mgr && !canManageRole(mgr.role, r)) {
                              setFormManagerId('');
                            }
                          }
                        }}
                      >
                        <Text style={[styles.roleOptionText, { color: formRole === r ? '#FFFFFF' : colors.textPrimary }]}>
                          {ROLE_LABELS[r]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Reporting Manager Dropdown */}
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                    Reporting Manager * {formRole !== 'FOUNDER' && formRole !== 'SUPER_ADMIN' ? '(Required)' : '(Optional)'}
                  </Text>
                  <View style={styles.rolePickerWrap}>
                    {(formRole === 'FOUNDER' || formRole === 'SUPER_ADMIN') && (
                      <Pressable
                        style={[
                          styles.roleOption,
                          !formManagerId && { backgroundColor: colors.primary, borderColor: colors.primary },
                          formManagerId ? { borderColor: colors.border } : null,
                        ]}
                        onPress={() => setFormManagerId('')}
                      >
                        <Text style={[styles.roleOptionText, { color: !formManagerId ? '#FFFFFF' : colors.textPrimary }]}>
                          No Manager (Root)
                        </Text>
                      </Pressable>
                    )}
                    {eligibleManagers.map((manager) => (
                      <Pressable
                        key={manager.id}
                        style={[
                          styles.roleOption,
                          formManagerId === manager.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                          formManagerId !== manager.id && { borderColor: colors.border },
                        ]}
                        onPress={() => setFormManagerId(manager.id)}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            { color: formManagerId === manager.id ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {manager.full_name} ({ROLE_LABELS[manager.role] || manager.role})
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {eligibleManagers.length === 0 && formRole !== 'FOUNDER' && formRole !== 'SUPER_ADMIN' && (
                    <Text style={{ fontSize: 11, color: '#FF9F0A', marginTop: 4 }}>
                      ⚠️ No eligible active managers found for this role. Create or activate a {formRole.replace('_EXECUTIVE', '_MANAGER')} or select Founder.
                    </Text>
                  )}

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Territory</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. Hyderabad Central"
                    placeholderTextColor={colors.textSecondary}
                    value={formTerritory}
                    onChangeText={setFormTerritory}
                  />

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Account Status *</Text>
                  <View style={styles.rolePickerWrap}>
                    {(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'INVITED'] as const).map((statusOption) => (
                      <Pressable
                        key={statusOption}
                        style={[
                          styles.roleOption,
                          formStatus === statusOption && { backgroundColor: colors.primary, borderColor: colors.primary },
                          formStatus !== statusOption && { borderColor: colors.border },
                        ]}
                        onPress={() => setFormStatus(statusOption)}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            { color: formStatus === statusOption ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {statusOption}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {!editingUser && (
                    <>
                      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Initial Password *</Text>
                      <TextInput
                        style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="Minimum 8 characters"
                        placeholderTextColor={colors.textSecondary}
                        value={formPassword}
                        onChangeText={setFormPassword}
                        secureTextEntry
                      />
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreateUser}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>{editingUser ? 'Save Changes' : 'Create Account'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Employee Details & Effective Permissions */}
          <Modal visible={showDetailsModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Employee Accountability Card</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                      {selectedUser?.full_name} ({selectedUser?.employee_id})
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowDetailsModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  {/* Summary Card */}
                  <View style={[styles.detailsCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Job Title:</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedUser?.job_title || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Permission Role:</Text>
                      <Text style={[styles.detailValue, { color: colors.primary }]}>{ROLE_LABELS[selectedUser?.role as Role] || selectedUser?.role}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reporting Manager:</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedUser?.manager_name || (selectedUser?.role === 'FOUNDER' ? 'Self (Platform Administrator)' : 'Unassigned')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status:</Text>
                      <Text style={[styles.detailValue, { color: selectedUser?.status === 'ACTIVE' ? '#10B981' : '#EF4444' }]}>{selectedUser?.status}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Direct Reports:</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedUser?.direct_reports_count || 0} employees</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned Schools:</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedUser?.assigned_schools_count ?? selectedUser?.assigned_school_ids?.length ?? 0} schools</Text>
                    </View>
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                    Authorised Server-Side Permissions ({effectivePermissions.length}):
                  </Text>
                  <View style={styles.permissionChipsWrap}>
                    {effectivePermissions.map((perm) => (
                      <View key={perm} style={[styles.permChip, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF' }]}>
                        <CheckSquare size={12} color="#6366F1" />
                        <Text style={styles.permChipText}>{perm}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowDetailsModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Deactivation & Responsibilities Transfer */}
          <Modal visible={showDeactivateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: '#EF4444' },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Deactivate Employee Account</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                      {deactivatingUser?.full_name} ({deactivatingUser?.employee_id})
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowDeactivateModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  {loadingImpact ? (
                    <View style={{ padding: 30, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#EF4444" />
                      <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
                        Analyzing dependent responsibilities...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Impact Warning */}
                      <View style={[styles.impactBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                        <AlertTriangle size={20} color="#EF4444" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.impactTitle, { color: '#EF4444' }]}>
                            Impact Assessment on Responsibilities
                          </Text>
                          <Text style={[styles.impactSub, { color: colors.textSecondary }]}>
                            {userImpact?.hasActiveWork
                              ? 'This employee has active responsibilities. You must explicitly transfer accountability before deactivating.'
                              : 'This employee has no active direct reports, assigned schools, or open tasks. Account can be safely deactivated.'}
                          </Text>
                        </View>
                      </View>

                      {/* Responsibilities Counters */}
                      <View style={styles.impactCountersRow}>
                        <View style={[styles.impactCounterCard, { borderColor: colors.border }]}>
                          <Text style={[styles.impactCountNum, { color: colors.primary }]}>{userImpact?.counts?.directReports || 0}</Text>
                          <Text style={[styles.impactCountLabel, { color: colors.textSecondary }]}>Direct Reports</Text>
                        </View>
                        <View style={[styles.impactCounterCard, { borderColor: colors.border }]}>
                          <Text style={[styles.impactCountNum, { color: colors.primary }]}>{userImpact?.counts?.assignedSchools || 0}</Text>
                          <Text style={[styles.impactCountLabel, { color: colors.textSecondary }]}>Schools</Text>
                        </View>
                        <View style={[styles.impactCounterCard, { borderColor: colors.border }]}>
                          <Text style={[styles.impactCountNum, { color: colors.primary }]}>{userImpact?.counts?.openTasks || 0}</Text>
                          <Text style={[styles.impactCountLabel, { color: colors.textSecondary }]}>Open Tasks</Text>
                        </View>
                      </View>

                      {/* Transfer Selection if reports exist */}
                      {userImpact?.counts?.directReports > 0 && (
                        <>
                          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                            Transfer Direct Reports To (Required) *
                          </Text>
                          <View style={styles.rolePickerWrap}>
                            {users
                              .filter((u) => u.id !== deactivatingUser?.id && u.status === 'ACTIVE' && (u.role === 'FOUNDER' || u.role.endsWith('_MANAGER')))
                              .map((mgr) => (
                                <Pressable
                                  key={mgr.id}
                                  style={[
                                    styles.roleOption,
                                    reassignReportsTo === mgr.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    reassignReportsTo !== mgr.id && { borderColor: colors.border },
                                  ]}
                                  onPress={() => setReassignReportsTo(mgr.id)}
                                >
                                  <Text style={[styles.roleOptionText, { color: reassignReportsTo === mgr.id ? '#FFFFFF' : colors.textPrimary }]}>
                                    {mgr.full_name} ({ROLE_LABELS[mgr.role] || mgr.role})
                                  </Text>
                                </Pressable>
                              ))}
                          </View>
                        </>
                      )}

                      {/* Transfer Selection if schools exist */}
                      {userImpact?.counts?.assignedSchools > 0 && (
                        <>
                          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                            Transfer Assigned Schools To (Required) *
                          </Text>
                          <View style={styles.rolePickerWrap}>
                            {users
                              .filter((u) => u.id !== deactivatingUser?.id && u.status === 'ACTIVE')
                              .map((emp) => (
                                <Pressable
                                  key={emp.id}
                                  style={[
                                    styles.roleOption,
                                    reassignSchoolsTo === emp.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    reassignSchoolsTo !== emp.id && { borderColor: colors.border },
                                  ]}
                                  onPress={() => setReassignSchoolsTo(emp.id)}
                                >
                                  <Text style={[styles.roleOptionText, { color: reassignSchoolsTo === emp.id ? '#FFFFFF' : colors.textPrimary }]}>
                                    {emp.full_name} ({emp.employee_id})
                                  </Text>
                                </Pressable>
                              ))}
                          </View>
                        </>
                      )}

                      {/* Transfer Selection if tasks exist */}
                      {userImpact?.counts?.openTasks > 0 && (
                        <>
                          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                            Transfer Open Work Tasks To (Required) *
                          </Text>
                          <View style={styles.rolePickerWrap}>
                            {users
                              .filter((u) => u.id !== deactivatingUser?.id && u.status === 'ACTIVE')
                              .map((emp) => (
                                <Pressable
                                  key={emp.id}
                                  style={[
                                    styles.roleOption,
                                    reassignTasksTo === emp.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                                    reassignTasksTo !== emp.id && { borderColor: colors.border },
                                  ]}
                                  onPress={() => setReassignTasksTo(emp.id)}
                                >
                                  <Text style={[styles.roleOptionText, { color: reassignTasksTo === emp.id ? '#FFFFFF' : colors.textPrimary }]}>
                                    {emp.full_name} ({emp.employee_id})
                                  </Text>
                                </Pressable>
                              ))}
                          </View>
                        </>
                      )}

                      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Deactivation Reason</Text>
                      <TextInput
                        style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="e.g. Employee resignation or role transition"
                        placeholderTextColor={colors.textSecondary}
                        value={deactivateReason}
                        onChangeText={setDeactivateReason}
                      />
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowDeactivateModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
                    onPress={handleConfirmDeactivation}
                    disabled={deactivating || loadingImpact}
                  >
                    {deactivating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Confirm Deactivation</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Assign Schools */}
          <Modal visible={showAssignModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Assign Partner Schools</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                      {selectedUser?.full_name} ({selectedUser?.employee_id})
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowAssignModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                    Select institutions this operator is authorized to access:
                  </Text>
                  {schools.map((s) => {
                    const isChecked = selectedSchoolIds.includes(s.id);
                    return (
                      <Pressable
                        key={s.id}
                        style={[
                          styles.schoolCheckRow,
                          isChecked && {
                            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
                            borderColor: colors.primary,
                          },
                          !isChecked && { borderColor: colors.border },
                        ]}
                        onPress={() => {
                          setSelectedSchoolIds((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                          );
                        }}
                      >
                        <Building size={16} color={isChecked ? colors.primary : colors.textSecondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.schoolCheckName, { color: colors.textPrimary }]}>{s.name}</Text>
                          <Text style={[styles.schoolCheckCode, { color: colors.textSecondary }]}>
                            Code: {s.code} • ID #{s.id}
                          </Text>
                        </View>
                        {isChecked ? (
                          <CheckCircle2 size={18} color={colors.primary} />
                        ) : (
                          <View style={[styles.checkCircleEmpty, { borderColor: colors.border }]} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowAssignModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveAssignments}
                    disabled={assigning}
                  >
                    {assigning ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Assignments</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Reset Password */}
          <Modal visible={showResetModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border, maxWidth: 440 },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Reset Password</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                      {selectedUser?.full_name} ({selectedUser?.email})
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowResetModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={{ padding: 20 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>New Password</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Enter strong password (min 8 chars)"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowResetModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleResetPassword}
                    disabled={resetting}
                  >
                    {resetting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Update Password</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Permissions Overrides */}
          <Modal visible={showPermissionsModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Permission Overrides</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{selectedUser?.full_name}</Text>
                  </View>
                  <Pressable onPress={() => setShowPermissionsModal(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                    Inherit uses the selected role's default permission.
                  </Text>
                  {permissionCatalog.map((permission) => (
                    <View key={permission} style={[styles.schoolCheckRow, { borderColor: colors.border }]}>
                      <Text style={[styles.schoolCheckName, { color: colors.textPrimary, flex: 1 }]}>{permission}</Text>
                      <View style={styles.rolePickerWrap}>
                        {(['INHERIT', 'GRANT', 'DENY'] as const).map((mode) => (
                          <Pressable
                            key={mode}
                            style={[
                              styles.roleOption,
                              permissionModes[permission] === mode && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                              permissionModes[permission] !== mode && { borderColor: colors.border },
                            ]}
                            onPress={() => setPermissionModes((current) => ({ ...current, [permission]: mode }))}
                          >
                            <Text
                              style={[
                                styles.roleOptionText,
                                { color: permissionModes[permission] === mode ? '#FFFFFF' : colors.textPrimary },
                              ]}
                            >
                              {mode}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowPermissionsModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSavePermissions}
                    disabled={savingPermissions}
                  >
                    {savingPermissions ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Permissions</Text>
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
    marginBottom: 20,
  },
  titleBadgeRow: { marginBottom: 6 },
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

  tabSwitcher: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBtnText: { fontSize: 13, fontWeight: '700' },
  unmanagedCountBadge: {
    backgroundColor: '#FF9F0A',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unmanagedCountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

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
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  userCard: {
    width: Platform.OS === 'web' ? '32%' : '100%',
    minWidth: 290,
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  userName: { fontSize: 15, fontWeight: '700' },
  userEmpId: { fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  userMeta: { gap: 6, marginBottom: 12 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12 },
  schoolScopeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginBottom: 14,
  },
  schoolScopeText: { fontSize: 11.5, fontWeight: '600' },
  userCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardActionText: { fontSize: 11, fontWeight: '700' },

  // Hierarchy Tree styles
  hierarchyContainer: { gap: 24 },
  hierarchySection: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  hierarchyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  treeNodeCard: {
    width: Platform.OS === 'web' ? '32%' : '100%',
    minWidth: 280,
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  treeNodeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  treeScopeText: { fontSize: 12, lineHeight: 16 },
  managerTreeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginBottom: 12,
  },
  managerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  managerName: { fontSize: 16, fontWeight: '800' },
  teamCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teamCountText: { fontSize: 11, fontWeight: '700' },
  subordinatesList: { gap: 8, paddingLeft: Platform.OS === 'web' ? 24 : 8 },
  subordinateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  subLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 13, fontWeight: '700' },
  subMeta: { fontSize: 11 },
  subRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  schoolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  schoolPillText: { fontSize: 11, fontWeight: '700' },
  noReportsText: { fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
  assignManagerQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  assignManagerQuickBtnText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  alertTitle: { fontSize: 14, fontWeight: '800' },
  alertSub: { fontSize: 12, marginTop: 2 },

  // Details Modal styles
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700' },
  permissionChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  permChipText: { fontSize: 10.5, fontWeight: '600', color: '#6366F1' },

  // Impact Modal styles
  impactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  impactTitle: { fontSize: 13, fontWeight: '700' },
  impactSub: { fontSize: 11.5, marginTop: 2 },
  impactCountersRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  impactCounterCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  impactCountNum: { fontSize: 18, fontWeight: '800' },
  impactCountLabel: { fontSize: 11, marginTop: 2 },

  // Generic Modal styles
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
  rolePickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  roleOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleOptionText: { fontSize: 11, fontWeight: '600' },
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

  schoolCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  schoolCheckName: { fontSize: 13, fontWeight: '700' },
  schoolCheckCode: { fontSize: 11 },
  checkCircleEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
});
