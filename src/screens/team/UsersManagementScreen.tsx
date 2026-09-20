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
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { superAdminApi } from '../../services/apiService';
import { ROLE_LABELS, ROLE_BADGE_COLORS, Role, PERMISSIONS } from '../../constants/rbac';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { bottomTabPad } from '../founder/founderUi';

interface InternalUserItem {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';
  manager_id?: string | null;
  territory?: string | null;
  assigned_schools?: { school_id: number; school_name?: string; school_code?: string }[];
  assigned_school_ids?: number[];
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

  const [users, setUsers] = useState<InternalUserItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InternalUserItem | null>(null);
  const [editingUser, setEditingUser] = useState<InternalUserItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formRole, setFormRole] = useState<Role>('SALES_EXECUTIVE');
  const [formPassword, setFormPassword] = useState('');
  const [formManagerId, setFormManagerId] = useState('');
  const [formTerritory, setFormTerritory] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED'>('INVITED');
  const [creating, setCreating] = useState(false);

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
      const [usrRes, schRes] = await Promise.all([
        superAdminApi.getInternalUsers(),
        superAdminApi.getSchools(),
      ]);

      if (usrRes?.success && Array.isArray(usrRes.data)) {
        setUsers(usrRes.data);
      }
      const rawSch: any = schRes;
      const schList = Array.isArray(rawSch) ? rawSch : Array.isArray(rawSch?.data) ? rawSch.data : [];
      setSchools(schList);
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
      u.employee_id?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  // Create User
  const handleCreateUser = async () => {
    if (!formName.trim() || (!editingUser && (!formEmail.trim() || !formEmpId.trim() || !formPassword))) {
      if (Platform.OS === 'web') window.alert('Please fill full name, employee ID, email, and password.');
      else Alert.alert('Validation Error', 'Please fill full name, employee ID, email, and password.');
      return;
    }
    try {
      setCreating(true);
      const res = editingUser
        ? await superAdminApi.updateInternalUser(editingUser.id, {
            full_name: formName.trim(),
            phone: formPhone.trim() || null,
            role: formRole,
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
        setFormStatus('INVITED');
        setEditingUser(null);
        await loadData();
      } else {
        const msg = res?.error || 'Failed to create user.';
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
    setFormPassword('');
    setFormManagerId('');
    setFormTerritory('');
    setFormStatus('INVITED');
    setShowCreateModal(true);
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

  // Toggle Status
  const handleToggleStatus = async (u: InternalUserItem) => {
    const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await superAdminApi.toggleUserStatus(u.id, nextStatus);
      if (res?.success) {
        setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, status: nextStatus } : item)));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
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
      catalog.forEach((permission: string) => { modes[permission] = 'INHERIT'; });
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
                <View style={[styles.badge, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
                  <Users size={14} color="#6366F1" />
                  <Text style={[styles.badgeText, { color: '#6366F1' }]}>ORGANIZATION DIRECTORY</Text>
                </View>
              </View>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Internal Team & Access Control</Text>
              <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                Manage internal operators, roles, reporting hierarchies, and school portfolio assignments.
              </Text>
            </View>

            {can(PERMISSIONS.USERS_CREATE) && (
              <Pressable
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={openCreateUser}
              >
                <UserPlus size={16} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Add Team Member</Text>
              </Pressable>
            )}
          </View>

          {/* Search & Filters */}
          <View style={[styles.filterBar, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
            <View style={[styles.searchBox, { borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search by name, email, or employee ID..."
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
                      !isSelected && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
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
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading team members...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <Users size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Users Found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No internal users match your current filter criteria.
              </Text>
            </View>
          ) : (
            <View style={styles.usersGrid}>
              {filteredUsers.map((u) => {
                const roleBadge = ROLE_BADGE_COLORS[u.role] || { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.2)', text: colors.textPrimary };
                const isActive = u.status === 'ACTIVE';
                const assignedCount = u.assigned_school_ids?.length || u.assigned_schools?.length || 0;

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
                        <Text style={styles.avatarText}>
                          {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.userName, { color: colors.textPrimary }]}>{u.full_name}</Text>
                        <Text style={[styles.userEmpId, { color: colors.textSecondary }]}>
                          {u.employee_id}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                        <Text style={[styles.statusText, { color: isActive ? '#10B981' : '#EF4444' }]}>
                          {u.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.userMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
                        <Shield size={12} color={roleBadge.text} />
                        <Text style={[styles.roleText, { color: roleBadge.text }]}>
                          {ROLE_LABELS[u.role] || u.role}
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
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {u.phone}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* School assignment summary */}
                    <View style={[styles.schoolScopeBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                      <School size={14} color={colors.primary} />
                      <Text style={[styles.schoolScopeText, { color: colors.textPrimary }]}>
                        {u.role === 'FOUNDER' || u.role === 'SUPER_ADMIN'
                          ? 'Global Access (All Partner Schools)'
                          : `${assignedCount} Assigned Partner Institution${assignedCount === 1 ? '' : 's'}`}
                      </Text>
                    </View>

                    {/* Actions */}
                    {(can(PERMISSIONS.USERS_MANAGE) || can(PERMISSIONS.SCHOOLS_ASSIGN)) && (
                      <View style={styles.userCardActions}>
                        {u.role !== 'FOUNDER' && u.id !== user?.id && can(PERMISSIONS.SCHOOLS_ASSIGN) && (
                          <Pressable
                            style={[styles.cardActionBtn, { borderColor: colors.border }]}
                            onPress={() => openAssignModal(u)}
                          >
                            <School size={13} color={colors.primary} />
                            <Text style={[styles.cardActionText, { color: colors.primary }]}>Schools</Text>
                          </Pressable>
                        )}

                        {can(PERMISSIONS.USERS_MANAGE) && !['FOUNDER', 'SUPER_ADMIN'].includes(u.role) && <Pressable
                          style={[styles.cardActionBtn, { borderColor: colors.border }]}
                          onPress={() => openPermissionsModal(u)}
                        >
                          <Shield size={13} color={colors.primary} />
                          <Text style={[styles.cardActionText, { color: colors.primary }]}>Permissions</Text>
                        </Pressable>}

                        {can(PERMISSIONS.USERS_MANAGE) && <Pressable
                          style={[styles.cardActionBtn, { borderColor: colors.border }]}
                          onPress={() => openEditUser(u)}
                        >
                          <UserCheck size={13} color={colors.textSecondary} />
                          <Text style={[styles.cardActionText, { color: colors.textSecondary }]}>Edit</Text>
                        </Pressable>}

                        {can(PERMISSIONS.USERS_MANAGE) && <Pressable
                          style={[styles.cardActionBtn, { borderColor: colors.border }]}
                          onPress={() => {
                            setSelectedUser(u);
                            setShowResetModal(true);
                          }}
                        >
                          <KeyRound size={13} color={colors.textSecondary} />
                          <Text style={[styles.cardActionText, { color: colors.textSecondary }]}>Password</Text>
                        </Pressable>}

                        {can(PERMISSIONS.USERS_MANAGE) && <Pressable
                          style={[
                            styles.cardActionBtn,
                            { borderColor: colors.border, backgroundColor: isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)' },
                          ]}
                          onPress={() => handleToggleStatus(u)}
                        >
                          <Text style={[styles.cardActionText, { color: isActive ? '#EF4444' : '#10B981' }]}>
                            {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </Pressable>}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Modal: Create User */}
          <Modal visible={showCreateModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{editingUser ? 'Edit Team Member' : 'Add Team Member'}</Text>
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

                  {!editingUser && <><Text style={[styles.formLabel, { color: colors.textSecondary }]}>Corporate Email *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="name@nexsyrus.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formEmail}
                    onChangeText={setFormEmail}
                  /></>}

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="+919876543210"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />

                  {!editingUser && <><Text style={[styles.formLabel, { color: colors.textSecondary }]}>Employee ID *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. SE-015"
                    placeholderTextColor={colors.textSecondary}
                    value={formEmpId}
                    onChangeText={setFormEmpId}
                  /></>}

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Assigned Role *</Text>
                  <View style={styles.rolePickerWrap}>
                    {availableRoles.map((r) => (
                      <Pressable
                        key={r}
                        style={[
                          styles.roleOption,
                          formRole === r && { backgroundColor: colors.primary, borderColor: colors.primary },
                          formRole !== r && { borderColor: colors.border },
                        ]}
                        onPress={() => setFormRole(r)}
                      >
                        <Text style={[styles.roleOptionText, { color: formRole === r ? '#FFFFFF' : colors.textPrimary }]}>
                          {ROLE_LABELS[r]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Manager</Text>
                  <View style={styles.rolePickerWrap}>
                    <Pressable
                      style={[styles.roleOption, !formManagerId && { backgroundColor: colors.primary, borderColor: colors.primary }, formManagerId ? { borderColor: colors.border } : null]}
                      onPress={() => setFormManagerId('')}
                    >
                      <Text style={[styles.roleOptionText, { color: !formManagerId ? '#FFFFFF' : colors.textPrimary }]}>No Manager</Text>
                    </Pressable>
                    {users.filter((item) => item.id !== editingUser?.id && (item.role === 'FOUNDER' || item.role.endsWith('_MANAGER'))).map((manager) => (
                      <Pressable
                        key={manager.id}
                        style={[styles.roleOption, formManagerId === manager.id && { backgroundColor: colors.primary, borderColor: colors.primary }, formManagerId !== manager.id && { borderColor: colors.border }]}
                        onPress={() => setFormManagerId(manager.id)}
                      >
                        <Text style={[styles.roleOptionText, { color: formManagerId === manager.id ? '#FFFFFF' : colors.textPrimary }]}>{manager.full_name}</Text>
                      </Pressable>
                    ))}
                  </View>

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
                        style={[styles.roleOption, formStatus === statusOption && { backgroundColor: colors.primary, borderColor: colors.primary }, formStatus !== statusOption && { borderColor: colors.border }]}
                        onPress={() => setFormStatus(statusOption)}
                      >
                        <Text style={[styles.roleOptionText, { color: formStatus === statusOption ? '#FFFFFF' : colors.textPrimary }]}>{statusOption}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {!editingUser && <><Text style={[styles.formLabel, { color: colors.textSecondary }]}>Initial Password *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.textSecondary}
                    value={formPassword}
                    onChangeText={setFormPassword}
                    secureTextEntry
                  /></>}
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

          {/* Modal: Assign Schools */}
          <Modal visible={showAssignModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}>
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
                          isChecked && { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff', borderColor: colors.primary },
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
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border, maxWidth: 440 }]}>
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

          <Modal visible={showPermissionsModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? '#161b22' : '#FFFFFF', borderColor: colors.border }]}> 
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Permission Overrides</Text>
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{selectedUser?.full_name}</Text>
                  </View>
                  <Pressable onPress={() => setShowPermissionsModal(false)}><X size={20} color={colors.textSecondary} /></Pressable>
                </View>
                <ScrollView style={styles.modalForm}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Inherit uses the selected role's default permission.</Text>
                  {permissionCatalog.map((permission) => (
                    <View key={permission} style={[styles.schoolCheckRow, { borderColor: colors.border }]}> 
                      <Text style={[styles.schoolCheckName, { color: colors.textPrimary, flex: 1 }]}>{permission}</Text>
                      <View style={styles.rolePickerWrap}>
                        {(['INHERIT', 'GRANT', 'DENY'] as const).map((mode) => (
                          <Pressable
                            key={mode}
                            style={[styles.roleOption, permissionModes[permission] === mode && { backgroundColor: colors.primary, borderColor: colors.primary }, permissionModes[permission] !== mode && { borderColor: colors.border }]}
                            onPress={() => setPermissionModes((current) => ({ ...current, [permission]: mode }))}
                          >
                            <Text style={[styles.roleOptionText, { color: permissionModes[permission] === mode ? '#FFFFFF' : colors.textPrimary }]}>{mode}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <Pressable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowPermissionsModal(false)}>
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSavePermissions} disabled={savingPermissions}>
                    {savingPermissions ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Save Permissions</Text>}
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
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardActionText: { fontSize: 11, fontWeight: '700' },

  // Modal styles
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
