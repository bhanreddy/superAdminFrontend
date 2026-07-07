import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ShieldCheck, Trash2, Power, Search, Mail, X } from 'lucide-react-native';
import { superAdminApi } from '../../../src/services/apiService';
import { SuperAdmin } from '../../../src/types/superAdmin';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { DataTable, Column } from '../../../src/components/ui/DataTable';
import { KebabMenu } from '../../../src/components/ui/KebabMenu';
import { Avatar } from '../../../src/components/ui/Avatar';
import { useToast } from '../../../src/components/ui/Toast';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';

const COMPACT_BREAKPOINT = 640;

export default function AdminsListScreen() {
  const { colors, isDark, layout: layoutTokens } = useTheme();
  const { showToast } = useToast();
  const { width: winW } = useWindowDimensions();
  const isCompact = winW < COMPACT_BREAKPOINT;
  const shellMobile = winW < layoutTokens.mobileBreakpoint;
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getSuperAdmins();
      setAdmins(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load admins', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = useMemo(() => {
    if (!search.trim()) return admins;
    const q = search.toLowerCase();
    return admins.filter(
      (a) =>
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)),
    );
  }, [admins, search]);

  const isFiltering = search.length > 0 && filteredAdmins.length !== admins.length;

  const handleToggle = async (admin: SuperAdmin) => {
    if (admin.is_founder) return;
    try {
      await superAdminApi.toggleSuperAdminActive(admin.id, !admin.is_active);
      showToast(`${admin.full_name} ${admin.is_active ? 'deactivated' : 'activated'}`, 'success');
      fetchAdmins();
    } catch {
      showToast('Failed to update admin', 'error');
    }
  };

  const handleDelete = async (admin: SuperAdmin) => {
    if (admin.is_founder) return;
    try {
      await superAdminApi.deleteSuperAdmin(admin.id);
      showToast(`${admin.full_name} removed`, 'success');
      fetchAdmins();
    } catch {
      showToast('Failed to delete admin', 'error');
    }
  };

  const columns: Column<SuperAdmin>[] = [
    {
      key: 'full_name',
      title: 'Admin',
      flex: 2,
      sortable: true,
      render: (item) => (
        <View style={st.nameCell}>
          <Avatar name={item.full_name} size="sm" online={item.is_active} />
          <View style={st.nameBlock}>
            <View style={st.nameRow}>
              <Text style={[st.nameText, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.full_name}
              </Text>
              {item.is_founder ? <Badge label="Founder" variant="info" /> : null}
            </View>
            <Text style={[st.emailText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.email || '—'}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'is_active',
      title: 'Status',
      width: 100,
      sortable: true,
      render: (item) => (
        <Badge
          label={item.is_active ? 'Active' : 'Inactive'}
          variant={item.is_active ? 'success' : 'error'}
          dot
        />
      ),
    },
    {
      key: 'actions',
      title: '',
      width: 44,
      render: (item) =>
        item.is_founder ? (
          <View style={st.actionsPlaceholder} />
        ) : (
          <KebabMenu
            items={[
              {
                label: item.is_active ? 'Deactivate' : 'Activate',
                icon: <Power size={14} color={item.is_active ? colors.error : colors.success} />,
                onPress: () => handleToggle(item),
                danger: item.is_active,
              },
              {
                label: 'Delete',
                icon: <Trash2 size={14} color={colors.error} />,
                onPress: () => handleDelete(item),
                danger: true,
              },
            ]}
          />
        ),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1, paddingHorizontal: 0 }}>
      <ScreenHeader
        title="Super Admins"
        subtitle={`${admins.length} user${admins.length === 1 ? '' : 's'} with access`}
        subtitleColor={colors.textSecondary}
        rightAction={
          <Button
            title="Add Admin"
            leftIcon={<Plus size={isCompact ? 18 : 16} color="#fff" />}
            size={isCompact ? 'md' : 'sm'}
            onPress={() => router.push('/(app)/admins/add')}
          />
        }
      />

      {loading || !isCompact ? (
        <DataTable
          columns={columns}
          data={admins}
          keyExtractor={(item) => item.id}
          loading={loading}
          searchPlaceholder="Search admins..."
          searchKeys={['full_name', 'email']}
          emptyTitle="No admins yet"
          emptyDescription="Add your first super admin"
          emptyIcon={<ShieldCheck size={32} color={colors.textTertiary} />}
          emptyActionLabel="Add Admin"
          onEmptyAction={() => router.push('/(app)/admins/add')}
        />
      ) : (
        <ScrollView
          style={st.compactScroll}
          contentContainerStyle={st.compactScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              st.compactSearchWrap,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: searchFocused
                  ? `${colors.primary}70`
                  : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.1)',
              },
              searchFocused && st.compactSearchFocused,
            ]}
          >
            <Search size={18} color={searchFocused ? colors.primary : colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={[st.compactSearchInput, { color: colors.textPrimary }]}
              placeholder="Search admins..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                style={({ pressed }) => [st.compactClear, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={8}
              >
                <X size={16} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {isFiltering && (
            <View
              style={[
                st.filterPill,
                { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}22` },
              ]}
            >
              <View style={[st.filterDot, { backgroundColor: colors.primary }]} />
              <Text style={[st.filterText, { color: colors.primary }]}>
                {filteredAdmins.length} {filteredAdmins.length === 1 ? 'match' : 'matches'}
              </Text>
              <Pressable onPress={() => setSearch('')}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Clear</Text>
              </Pressable>
            </View>
          )}

          {filteredAdmins.length === 0 ? (
            <View style={st.compactEmptyWrap}>
              <EmptyState
                title={admins.length === 0 ? 'No admins yet' : 'No matches'}
                description={
                  admins.length === 0
                    ? 'Add your first super admin'
                    : 'Try a different name or email'
                }
                icon={<ShieldCheck size={36} color={colors.textTertiary} />}
                actionLabel={admins.length === 0 ? 'Add Admin' : undefined}
                onAction={admins.length === 0 ? () => router.push('/(app)/admins/add') : undefined}
              />
            </View>
          ) : (
            filteredAdmins.map((item) => (
              <Card
                key={item.id}
                variant="elevated"
                noPadding
                style={st.adminCard}
              >
                <View style={st.cardInner}>
                  <View style={st.cardTopRow}>
                    <Avatar name={item.full_name} size="lg" online={item.is_active} />
                    <View style={st.cardMain}>
                      <View style={st.cardTitleRow}>
                        <Text
                          style={[st.cardName, { color: colors.textPrimary }]}
                          numberOfLines={2}
                        >
                          {item.full_name}
                        </Text>
                        {item.is_founder ? <Badge label="Founder" variant="info" /> : null}
                      </View>
                      <View style={st.emailLine}>
                        <Mail size={15} color={colors.textSecondary} strokeWidth={2} />
                        <Text
                          style={[st.cardEmail, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.email || '—'}
                        </Text>
                      </View>
                      <View style={st.statusRow}>
                        <Badge
                          label={item.is_active ? 'Active' : 'Inactive'}
                          variant={item.is_active ? 'success' : 'error'}
                          dot
                        />
                      </View>
                    </View>
                    {item.is_founder ? (
                      <View style={st.cardKebabSpacer} />
                    ) : (
                      <View style={st.cardKebab}>
                        <KebabMenu
                          items={[
                            {
                              label: item.is_active ? 'Deactivate' : 'Activate',
                              icon: (
                                <Power size={14} color={item.is_active ? colors.error : colors.success} />
                              ),
                              onPress: () => handleToggle(item),
                              danger: item.is_active,
                            },
                            {
                              label: 'Delete',
                              icon: <Trash2 size={14} color={colors.error} />,
                              onPress: () => handleDelete(item),
                              danger: true,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameBlock: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nameText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  emailText: { fontSize: 12, marginTop: 1 },
  actionsPlaceholder: { width: 44, height: 32 },
  compactScroll: { flex: 1 },
  compactScrollContent: { paddingBottom: 40, flexGrow: 1 },
  compactSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 50,
    gap: 10,
    marginBottom: 14,
  },
  compactSearchFocused: {
    ...Platform.select({
      ios: {
        shadowColor: '#7C83FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  compactClear: { padding: 4 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { fontSize: 13, fontWeight: '600', flex: 1 },
  compactEmptyWrap: { paddingVertical: 32 },
  adminCard: { marginBottom: 12, borderRadius: 16 },
  cardInner: { padding: 16 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardMain: { flex: 1, minWidth: 0, marginLeft: 12 },
  cardTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cardName: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  emailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  cardEmail: { fontSize: 14, lineHeight: 20, flex: 1, fontWeight: '400' },
  statusRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  cardKebab: { marginLeft: 4, marginTop: -2 },
  cardKebabSpacer: { width: 36 },
});
