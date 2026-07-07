import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Plus, Store, MapPin, Phone, ShieldCheck, ShieldOff,
  Eye, Pencil, Trash2, LogIn, Copy, Calendar, Mail,
  FileText, Building2, Hash, ArrowLeft, Save, Lock, Terminal,
} from 'lucide-react-native';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { DataTable, Column } from '../../../src/components/ui/DataTable';
import { Drawer } from '../../../src/components/ui/Drawer';
import { useToast } from '../../../src/components/ui/Toast';
import { superAdminClient } from '../../../src/api/superAdminClient';
import { MedicalShopSubscriptionPanel } from '../../../src/components/medical/MedicalShopSubscriptionPanel';

interface MedicalShop {
  id: string;
  medical_name: string;
  owner_name: string;
  city: string;
  state: string;
  phone_number: string;
  verified: boolean;
  created_at: string;
  email?: string;
  gst_number?: string;
  drug_license_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  pincode?: string;
  logo_url?: string;
  plan?: string;
  amount_paid?: number;
  cluster_id?: string;
  onboarding_status?: string;
  subscription_status?: string;
}

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onPress: () => void;
  variant?: 'default' | 'danger' | 'success';
}

export default function MedicalShopsListScreen() {
  const router = useRouter();
  const { colors, isDark, layout: layoutTokens } = useTheme();
  const { width: winW } = useWindowDimensions();
  const shellMobile = winW < layoutTokens.mobileBreakpoint;
  /** Matches DataTable card breakpoint so row cells wrap when shown as stacked cards. */
  const narrowTable = winW < 520;
  const { showToast } = useToast();

  const [shops, setShops] = useState<MedicalShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterUnreachable, setClusterUnreachable] = useState(false);
  const [selectedShop, setSelectedShop] = useState<MedicalShop | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredShops = shops.filter(shop => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return shop.onboarding_status === 'pending_build';
    if (statusFilter === 'live') return shop.onboarding_status === 'live';
    if (statusFilter === 'suspended') return shop.onboarding_status === 'suspended';
    return true;
  });

  const fetchShops = async () => {
    try {
      setLoading(true);
      setClusterUnreachable(false);
      const response = await superAdminClient.get('/api/v1/medical/shops');
      if (response.data?.success) {
        setShops(response.data.data || []);
        if (response.data.cluster_unreachable) setClusterUnreachable(true);
      } else {
        throw new Error(response.data?.error || 'Failed to load');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to load medical shops', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchShops(); }, []));

  const handleRowPress = (shop: MedicalShop) => {
    setSelectedShop(shop);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedShop(null);
      setEditMode(false);
      setEditForm({});
      setNewPassword('');
      setConfirmPassword('');
    }, 300);
  };

  const openEditMode = () => {
    if (!selectedShop) return;
    setEditForm({
      medical_name: selectedShop.medical_name || '',
      owner_name: selectedShop.owner_name || '',
      gst_number: selectedShop.gst_number || '',
      drug_license_number: selectedShop.drug_license_number || '',
      phone_number: selectedShop.phone_number || '',
      address_line_1: selectedShop.address_line_1 || '',
      address_line_2: selectedShop.address_line_2 || '',
      city: selectedShop.city || '',
      state: selectedShop.state || '',
      pincode: selectedShop.pincode || '',
      logo_url: selectedShop.logo_url || '',
      plan: selectedShop.plan || 'trial',
      amount_paid: (selectedShop.amount_paid || 0).toString(),
    });
    setEditMode(true);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedShop) return;
    if (!editForm.medical_name || !editForm.owner_name || !editForm.phone_number ||
        !editForm.city || !editForm.state) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await superAdminClient.put(
        `/api/v1/medical/shops/${selectedShop.id}`,
        editForm,
      );
      if (response.data?.success) {
        const updated = response.data.data as MedicalShop;
        setShops(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
        setSelectedShop(prev => prev ? { ...prev, ...updated } : null);
        setEditMode(false);
        showToast('Shop updated successfully', 'success');
      } else {
        throw new Error(response.data?.error || 'Update failed');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to update shop', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedShop) return;
    if (!newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await superAdminClient.patch(
        `/api/v1/medical/shops/${selectedShop.id}/password`,
        { password: newPassword },
      );
      if (response.data?.success) {
        showToast('Password changed successfully', 'success');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(response.data?.error || 'Failed');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleVerify = async () => {
    if (!selectedShop) return;
    const newStatus = !selectedShop.verified;
    setActionLoading(true);
    try {
      const response = await superAdminClient.patch(`/api/v1/medical/shops/${selectedShop.id}/verify`, {
        verified: newStatus,
      });
      if (response.data?.success) {
        showToast(`Shop ${newStatus ? 'verified' : 'unverified'} successfully`, 'success');
        setShops(prev => prev.map(s => s.id === selectedShop.id ? { ...s, verified: newStatus } : s));
        setSelectedShop(prev => prev ? { ...prev, verified: newStatus } : null);
      } else {
        throw new Error(response.data?.error || 'Failed');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedShop) return;
    const doDelete = async () => {
      setActionLoading(true);
      try {
        const response = await superAdminClient.delete(`/api/v1/medical/shops/${selectedShop.id}`);
        if (response.data?.success) {
          showToast('Shop deleted successfully', 'success');
          setShops(prev => prev.filter(s => s.id !== selectedShop.id));
          closeDrawer();
        } else {
          throw new Error(response.data?.error || 'Failed');
        }
      } catch (err: any) {
        showToast(err.response?.data?.error || err.message || 'Failed to delete shop', 'error');
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${selectedShop.medical_name}"? This action cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Shop',
        `Delete "${selectedShop.medical_name}"? This action cannot be undone.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }],
      );
    }
  };

  const handleCopyId = () => {
    if (!selectedShop) return;
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(selectedShop.id);
    }
    showToast('Shop ID copied to clipboard', 'success');
  };

  const handleImpersonate = () => {
    if (!selectedShop) return;
    showToast(`Impersonating ${selectedShop.medical_name}...`, 'success');
    closeDrawer();
  };

  const getActions = (): ActionItem[] => {
    if (!selectedShop) return [];
    return [
      {
        icon: <Terminal size={18} color={colors.primary} />,
        label: 'Build Config',
        subtitle: 'Generate Tauri configuration',
        onPress: () => {
          closeDrawer();
          router.push(`/(app)/medical/${selectedShop.id}/build-config`);
        },
      },
      {
        icon: <Eye size={18} color={colors.primary} />,
        label: 'View Full Details',
        subtitle: 'Shop profile, documents & history',
        onPress: () => {
          closeDrawer();
          // Future: navigate to detail page
          showToast('Detail page coming soon', 'info');
        },
      },
      {
        icon: <Pencil size={18} color={colors.primary} />,
        label: 'Edit Shop',
        subtitle: 'Update shop information',
        onPress: openEditMode,
      },
      {
        icon: <LogIn size={18} color={colors.warning} />,
        label: 'Impersonate',
        subtitle: 'Login as this shop owner',
        onPress: handleImpersonate,
      },
      {
        icon: selectedShop.verified
          ? <ShieldOff size={18} color={colors.warning} />
          : <ShieldCheck size={18} color={colors.success} />,
        label: selectedShop.verified ? 'Unverify Shop' : 'Verify Shop',
        subtitle: selectedShop.verified
          ? 'Revoke verification status'
          : 'Mark shop as verified',
        onPress: handleToggleVerify,
        variant: selectedShop.verified ? 'default' : 'success',
      },
      {
        icon: <Copy size={18} color={colors.textSecondary} />,
        label: 'Copy Shop ID',
        subtitle: selectedShop.id.slice(0, 20) + '...',
        onPress: handleCopyId,
      },
      {
        icon: <Trash2 size={18} color={colors.error} />,
        label: 'Delete Shop',
        subtitle: 'Permanently remove this shop',
        onPress: handleDelete,
        variant: 'danger',
      },
    ];
  };

  const isPhone = winW < layoutTokens.mobileBreakpoint;

  const columns: Column<MedicalShop>[] = [
    {
      key: 'medical_name',
      title: 'Shop Name',
      flex: 2,
      sortable: true,
      render: (item) => (
        <View style={[st.nameCell, narrowTable && st.nameCellNarrow]}>
          <View style={[st.iconWrap, { backgroundColor: colors.primaryDim }]}>
            <Store size={16} color={colors.primary} />
          </View>
          <View style={st.nameTextBlock}>
            <Text
              style={[st.nameText, { color: colors.textPrimary }]}
              numberOfLines={narrowTable ? 2 : 1}
            >
              {item.medical_name}
            </Text>
            <Text
              style={[st.ownerText, { color: colors.textTertiary }]}
              numberOfLines={narrowTable ? 2 : 1}
            >
              {item.owner_name}
            </Text>
            {item.cluster_id && (
              <Text style={[{ fontSize: 10, marginTop: 2 }, { color: colors.textTertiary }]}>
                Cluster: {item.cluster_id}
              </Text>
            )}
          </View>
        </View>
      ),
    },
    {
      key: 'city',
      title: 'Location',
      flex: 1,
      sortable: true,
      render: (item) => (
        <View style={[st.locCell, narrowTable && st.locCellNarrow]}>
          <MapPin size={12} color={colors.textTertiary} style={narrowTable ? { marginTop: 2 } : undefined} />
          <Text
            style={[st.locText, { color: colors.textSecondary }, narrowTable && st.locTextWrap]}
            numberOfLines={narrowTable ? 4 : 1}
          >
            {item.city}, {item.state}
          </Text>
        </View>
      ),
    },
    {
      key: 'phone_number',
      title: 'Phone',
      width: 130,
      render: (item) => (
        <View style={[st.locCell, narrowTable && st.locCellNarrow]}>
          <Phone size={12} color={colors.textTertiary} style={narrowTable ? { marginTop: 2 } : undefined} />
          <Text style={[st.locText, { color: colors.textSecondary }, narrowTable && st.locTextWrap]}>
            {item.phone_number}
          </Text>
        </View>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: isPhone ? 110 : 130,
      render: (item) => {
        let obLabel = 'Pending';
        let obVariant: any = 'warning';
        if (item.onboarding_status === 'app_delivered') { obLabel = 'App Delivered'; obVariant = 'info'; }
        else if (item.onboarding_status === 'live') { obLabel = 'Live'; obVariant = 'success'; }
        else if (item.onboarding_status === 'suspended') { obLabel = 'Suspended'; obVariant = 'error'; }

        let subLabel = 'Trial';
        let subVariant: any = 'warning';
        if (item.subscription_status === 'active') { subLabel = 'Active'; subVariant = 'success'; }
        else if (item.subscription_status === 'expired' || item.subscription_status === 'suspended') { subLabel = 'Expired'; subVariant = 'error'; }

        return (
          <View style={{ gap: 4 }}>
            <Badge label={obLabel} variant={obVariant} dot />
            <Badge label={subLabel} variant={subVariant} />
          </View>
        );
      },
    },
    {
      key: 'actions', title: '', width: isPhone ? 50 : 80,
      render: (item) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          {!isPhone && (
            <Pressable onPress={() => router.push(`/(app)/medical/${item.id}/build-config`)} style={st.iconButton}>
              <Terminal size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      ),
    },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={shellMobile ? { flex: 1, paddingHorizontal: 12 } : { flex: 1 }}>
      <ScreenHeader
        title="Medical Shops"
        subtitle={`${shops.length} shops`}
        rightAction={
          <Button
            title="Add Shop"
            leftIcon={<Plus size={narrowTable ? 18 : 16} color="#fff" />}
            size={narrowTable ? 'md' : 'sm'}
            onPress={() => router.push('/medical/add' as any)}
            style={narrowTable ? ({ width: '100%', minHeight: 44 } as const) : undefined}
          />
        }
      />

      {clusterUnreachable && !loading && (
        <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, padding: 12, borderRadius: 12, marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>
            Warning: One or more clusters are unreachable. Partial data is being shown.
          </Text>
        </View>
      )}

      <View style={[st.filterBar, { backgroundColor: isDark ? '#1E1E1E' : '#F1F5F9', borderColor: colors.border }]}>
        {(['all', 'pending', 'live', 'suspended']).map((filter) => {
          const active = statusFilter === filter;
          let label = filter.charAt(0).toUpperCase() + filter.slice(1);
          return (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[st.filterPill, active && { backgroundColor: colors.primary }]}
            >
              <Text style={[st.filterText, active ? { color: '#FFF' } : { color: colors.textSecondary }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DataTable
        columns={columns}
        data={filteredShops}
        keyExtractor={(item) => item.id}
        loading={loading}
        narrowLayout="cards"
        searchPlaceholder="Search shops..."
        searchKeys={['medical_name', 'owner_name', 'city', 'state']}
        emptyTitle="No medical shops"
        emptyDescription="Register your first medical shop to get started"
        emptyIcon={<Store size={32} color={colors.textTertiary} />}
        emptyActionLabel="Add Shop"
        onEmptyAction={() => router.push('/medical/add' as any)}
        onRowPress={handleRowPress}
      />
      </View>

      {/* ── Shop Options / Edit Drawer ── */}
      <Drawer
        visible={drawerOpen}
        onClose={closeDrawer}
        title={editMode ? 'Edit Shop' : 'Shop Options'}
        width={editMode ? 480 : 420}
      >
        {selectedShop && !editMode && (
          <View style={st.drawerContent}>
            {/* Shop Identity Card */}
            <View style={[st.shopCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.12)',
            }]}>
              <View style={[st.shopIconLarge, { backgroundColor: `${colors.primary}18` }]}>
                <Store size={24} color={colors.primary} />
              </View>
              <Text style={[st.shopName, { color: colors.textPrimary }]}>{selectedShop.medical_name}</Text>
              <Text style={[st.shopOwner, { color: colors.textSecondary }]}>{selectedShop.owner_name}</Text>
              <View style={{ marginTop: 8 }}>
                <Badge
                  label={selectedShop.verified ? 'Verified' : 'Pending Verification'}
                  variant={selectedShop.verified ? 'success' : 'warning'}
                  dot
                />
              </View>
            </View>

            {/* Quick Info */}
            <View style={[st.infoSection, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
              {[
                { icon: <MapPin size={14} color={colors.textTertiary} />, label: 'Location', value: `${selectedShop.city}, ${selectedShop.state}` },
                { icon: <Phone size={14} color={colors.textTertiary} />, label: 'Phone', value: selectedShop.phone_number },
                ...(selectedShop.gst_number ? [{ icon: <FileText size={14} color={colors.textTertiary} />, label: 'GST', value: selectedShop.gst_number }] : []),
                ...(selectedShop.drug_license_number ? [{ icon: <Hash size={14} color={colors.textTertiary} />, label: 'Drug License', value: selectedShop.drug_license_number }] : []),
                { icon: <Calendar size={14} color={colors.textTertiary} />, label: 'Registered', value: formatDate(selectedShop.created_at) },
                { icon: <Building2 size={14} color={colors.textTertiary} />, label: 'Plan', value: selectedShop.plan || 'trial' },
                { icon: <Hash size={14} color={colors.textTertiary} />, label: 'Amount Paid', value: `₹${selectedShop.amount_paid || 0}` },
              ].map((info, i) => (
                <View key={i} style={[st.infoRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={st.infoLeft}>
                    {info.icon}
                    <Text style={[st.infoLabel, { color: colors.textTertiary }]}>{info.label}</Text>
                  </View>
                  <Text style={[st.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{info.value || '—'}</Text>
                </View>
              ))}
            </View>

            <MedicalShopSubscriptionPanel shopId={selectedShop.id} />

            {/* Actions */}
            <Text style={[st.sectionTitle, { color: colors.textTertiary }]}>ACTIONS</Text>
            <View style={[st.actionsContainer, {
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
              {getActions().map((action, i) => (
                <Pressable
                  key={i}
                  onPress={action.onPress}
                  disabled={actionLoading}
                  style={({ pressed, hovered }: any) => [
                    st.actionItem,
                    {
                      backgroundColor: pressed
                        ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                        : hovered
                          ? isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                          : 'transparent',
                      opacity: actionLoading ? 0.5 : 1,
                    },
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
                    i === 0 && { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
                    i === getActions().length - 1 && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
                    Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.15s ease' } as any : {},
                  ]}
                >
                  <View style={[st.actionIconWrap, {
                    backgroundColor: action.variant === 'danger'
                      ? `${colors.error}12`
                      : action.variant === 'success'
                        ? `${colors.success}12`
                        : `${colors.primary}10`,
                  }]}>
                    {action.icon}
                  </View>
                  <View style={st.actionText}>
                    <Text style={[st.actionLabel, {
                      color: action.variant === 'danger' ? colors.error : colors.textPrimary,
                    }]}>{action.label}</Text>
                    <Text style={[st.actionSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>{action.subtitle}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {selectedShop && editMode && (
          <View style={st.drawerContent}>
            {/* Back to options */}
            <Pressable
              onPress={() => setEditMode(false)}
              style={({ hovered }: any) => [
                st.backBtn,
                { backgroundColor: hovered ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent' },
                Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.15s' } as any : {},
              ]}
            >
              <ArrowLeft size={16} color={colors.textSecondary} />
              <Text style={[st.backBtnText, { color: colors.textSecondary }]}>Back to options</Text>
            </Pressable>

            {/* Identity Section */}
            <View style={st.editSectionHeader}>
              <Building2 size={18} color={colors.primary} />
              <Text style={[st.editSectionLabel, { color: colors.textPrimary }]}>Identity</Text>
            </View>
            <View style={[st.editCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            }]}>
              <Input
                label="Medical Shop Name *"
                placeholder="e.g. Apollo Pharmacy"
                value={editForm.medical_name}
                onChangeText={(t) => handleEditChange('medical_name', t)}
              />
              <Input
                label="Owner Name *"
                placeholder="Full name of owner"
                value={editForm.owner_name}
                onChangeText={(t) => handleEditChange('owner_name', t)}
              />
              <Input
                label="Logo URL"
                placeholder="https://example.com/logo.png"
                value={editForm.logo_url}
                onChangeText={(t) => handleEditChange('logo_url', t)}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Legal Section */}
            <View style={st.editSectionHeader}>
              <FileText size={18} color={colors.primary} />
              <Text style={[st.editSectionLabel, { color: colors.textPrimary }]}>Legal Details</Text>
            </View>
            <View style={[st.editCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            }]}>
              <Input
                label="GST Number"
                placeholder="Enter GSTIN"
                autoCapitalize="characters"
                value={editForm.gst_number}
                onChangeText={(t) => handleEditChange('gst_number', t)}
              />
              <Input
                label="Drug License Number"
                placeholder="Enter Drug License Number"
                autoCapitalize="characters"
                value={editForm.drug_license_number}
                onChangeText={(t) => handleEditChange('drug_license_number', t)}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Subscription Section */}
            <View style={st.editSectionHeader}>
              <ShieldCheck size={18} color={colors.primary} />
              <Text style={[st.editSectionLabel, { color: colors.textPrimary }]}>Subscription (Manual)</Text>
            </View>
            <View style={[st.editCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            }]}>
              <Input
                label="Active Plan"
                placeholder="trial | basic | pro | custom"
                value={editForm.plan}
                onChangeText={(t) => handleEditChange('plan', t)}
              />
              <Input
                label="Amount Paid (Physical)"
                placeholder="e.g. 5000"
                keyboardType="numeric"
                value={editForm.amount_paid}
                onChangeText={(t) => handleEditChange('amount_paid', t)}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Address & Contact Section */}
            <View style={st.editSectionHeader}>
              <MapPin size={18} color={colors.primary} />
              <Text style={[st.editSectionLabel, { color: colors.textPrimary }]}>Address & Contact</Text>
            </View>
            <View style={[st.editCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            }]}>
              <Input
                label="Phone Number *"
                placeholder="e.g. +91 9876543210"
                keyboardType="phone-pad"
                value={editForm.phone_number}
                onChangeText={(t) => handleEditChange('phone_number', t)}
              />
              <Input
                label="Address Line 1"
                placeholder="Building, Street"
                value={editForm.address_line_1}
                onChangeText={(t) => handleEditChange('address_line_1', t)}
              />
              <Input
                label="Address Line 2"
                placeholder="Locality, Landmark"
                value={editForm.address_line_2}
                onChangeText={(t) => handleEditChange('address_line_2', t)}
              />
              <View style={st.editRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="City *"
                    placeholder="City"
                    value={editForm.city}
                    onChangeText={(t) => handleEditChange('city', t)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="State *"
                    placeholder="State"
                    value={editForm.state}
                    onChangeText={(t) => handleEditChange('state', t)}
                  />
                </View>
              </View>
              <Input
                label="Pincode"
                placeholder="Postal Code"
                keyboardType="number-pad"
                value={editForm.pincode}
                onChangeText={(t) => handleEditChange('pincode', t)}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Change Password Section */}
            <View style={st.editSectionHeader}>
              <Lock size={18} color={colors.warning} />
              <Text style={[st.editSectionLabel, { color: colors.textPrimary }]}>Change Password</Text>
            </View>
            <View style={[st.editCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            }]}>
              <Text style={[st.pwHint, { color: colors.textTertiary }]}>
                Leave blank to keep the current password. Minimum 6 characters.
              </Text>
              <Input
                label="New Password"
                placeholder="Enter new password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Input
                label="Confirm Password"
                placeholder="Re-enter new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                containerStyle={{ marginBottom: 4 }}
              />
              {newPassword.length > 0 && (
                <Button
                  title="Update Password"
                  variant={newPassword === confirmPassword && newPassword.length >= 6 ? 'primary' : 'outline'}
                  onPress={handleChangePassword}
                  loading={savingPassword}
                  style={{ marginTop: 8, marginBottom: 12 }}
                />
              )}
            </View>

            {/* Save / Cancel */}
            <View style={st.editActions}>
              <Button
                title="Save Changes"
                onPress={handleSaveEdit}
                loading={saving}
                style={{ flex: 1 }}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditMode(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </Drawer>
    </View>
  );
}

const st = StyleSheet.create({
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  nameCellNarrow: { alignItems: 'flex-start' },
  nameTextBlock: { flex: 1, minWidth: 0 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nameText: { fontSize: 14, fontWeight: '500' },
  ownerText: { fontSize: 12, marginTop: 1 },
  locCell: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  locCellNarrow: { alignItems: 'flex-start' },
  locText: { fontSize: 13, flexShrink: 1 },
  locTextWrap: { flex: 1 },

  drawerContent: { gap: 20, width: '100%' as const, minWidth: 0 },

  shopCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  shopIconLarge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shopName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  shopOwner: { fontSize: 14, marginTop: 2, textAlign: 'center' },

  infoSection: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, fontWeight: '500' },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    alignSelf: 'stretch',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, minWidth: 0 },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  actionSubtitle: { fontSize: 12, marginTop: 1 },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  backBtnText: { fontSize: 13, fontWeight: '500' },

  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  editSectionLabel: { fontSize: 15, fontWeight: '600' },
  editCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 4,
  },
  editRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pwHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingBottom: 20,
  },
});
