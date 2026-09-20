import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Menu, Sun, Moon, Bell, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useCluster } from '../../contexts/ClusterContext';
import { Avatar } from '../ui/Avatar';
import { Breadcrumb } from '../ui/Breadcrumb';
import { ROLE_BADGE_COLORS } from '../../constants/rbac';

interface TopBarProps {
  onMenuPress?: () => void;
  showMenu?: boolean;
}

export const TopBar = React.memo(function TopBar({ onMenuPress, showMenu }: TopBarProps) {
  const { colors, layout: layoutTokens, isDark, toggleTheme, zIndex, clayShadows } = useTheme();
  const { currentAdmin, founder, signOut, role, roleLabel, employeeId, assignedSchools, isFounder } = useAuth();
  const { selectedCluster } = useCluster();
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const hideBreadcrumb = winW < 480;
  const isMobileShell = winW < layoutTokens.mobileBreakpoint;
  const compactMobile = winW < 480;

  const userName = currentAdmin?.full_name || founder?.full_name || 'Admin';
  const userEmail = currentAdmin?.email || founder?.email || '';
  const badgeStyle = (role && ROLE_BADGE_COLORS[role]) || {
    bg: 'rgba(10, 132, 255, 0.15)',
    text: '#0A84FF',
    border: 'rgba(10, 132, 255, 0.3)',
  };

  return (
    <View
      style={[
        styles.topbar,
        {
          height: layoutTokens.topbarHeight,
          zIndex: zIndex.topbar,
          paddingHorizontal: compactMobile ? 12 : 20,
          ...(Platform.OS === 'web' && !isMobileShell
            ? {
                position: 'absolute' as any,
                top: 16,
                left: 24,
                right: 24,
                backgroundColor: isDark ? 'rgba(24, 24, 34, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                borderColor: colors.clayBorderColor,
                borderWidth: 1,
                borderRadius: 16,
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: isDark
                  ? 'inset 1px 1px 2px rgba(255,255,255,0.08), 0px 8px 32px rgba(0,0,0,0.3)'
                  : 'inset 1px 1px 2px rgba(255,255,255,0.9), 0px 8px 32px rgba(0,0,0,0.03)',
              }
            : {
                backgroundColor: isMobileShell ? colors.background : colors.topbarBg,
                borderBottomWidth: 1,
                borderBottomColor: colors.topbarBorder,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.2 : 0.03,
                shadowRadius: 8,
                elevation: 3,
              }),
        },
      ]}
    >
      <View style={[styles.left, { minWidth: 0, flex: 1 }]}>
        {showMenu && (
          <Pressable
            onPress={onMenuPress}
            style={({ pressed, hovered }: any) => [
              styles.iconBtn,
              {
                backgroundColor: hovered ? colors.hover : colors.clayInnerLight,
              },
              Platform.OS === 'web' ? clayStyle(clayShadows.subtle) : {},
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Menu size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        {!hideBreadcrumb && (
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Breadcrumb />
          </View>
        )}
        {selectedCluster && (
          <Pressable
            onPress={() => router.push('/cluster-selector' as any)}
            style={({ pressed, hovered }: any) => [
              styles.clusterBadge,
              compactMobile && styles.clusterBadgeCompact,
              {
                backgroundColor: hovered
                  ? `${colors.primary}20`
                  : `${colors.primary}0C`,
              },
              Platform.OS === 'web' ? clayStyle(clayShadows.subtle) : {},
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
          >
            <View style={[styles.clusterDot, { backgroundColor: colors.success }]} />
            {!compactMobile && <Text style={[styles.clusterLabel, { color: colors.primary }]} numberOfLines={1}>{selectedCluster.label}</Text>}
          </Pressable>
        )}
      </View>

      <View style={[styles.right, { flexShrink: 0 }, compactMobile && { gap: 3 }]}>
        {/* Theme toggle */}
        <Pressable
          onPress={toggleTheme}
          style={({ pressed, hovered }: any) => [
            styles.iconBtn,
            {
              backgroundColor: hovered ? colors.hover : colors.clayInnerLight,
            },
            Platform.OS === 'web' ? clayStyle(clayShadows.subtle) : {},
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          {isDark ? (
            <Sun size={17} color="#FCD34D" />
          ) : (
            <Moon size={17} color={colors.primary} />
          )}
        </Pressable>

        {/* Notifications */}
        <Pressable
          style={({ pressed, hovered }: any) => [
            styles.iconBtn,
            {
              backgroundColor: hovered ? colors.hover : colors.clayInnerLight,
            },
            Platform.OS === 'web' ? clayStyle(clayShadows.subtle) : {},
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <Bell size={17} color={colors.textSecondary} />
          <View style={[styles.notifDot, { backgroundColor: colors.error }]} />
        </Pressable>

        {/* Separator — soft gradient */}
        {!compactMobile && <View style={[styles.sep, { backgroundColor: colors.divider }]} />}

        {/* User info */}
        <View style={[styles.userArea, compactMobile && { paddingHorizontal: 1 }]}>
          <Avatar name={userName} size="sm" />
          {Platform.OS === 'web' && !compactMobile && (
            <View style={styles.userText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {userName}
                </Text>
                {employeeId && (
                  <Text style={[styles.empId, { color: colors.textTertiary }]}>
                    ({employeeId})
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
                  ]}
                >
                  <Text style={[styles.roleBadgeText, { color: badgeStyle.text }]} numberOfLines={1}>
                    {roleLabel}
                  </Text>
                </View>
                {!isFounder && assignedSchools.length > 0 && (
                  <View style={styles.schoolPill}>
                    <Text style={styles.schoolPillText}>
                      {assignedSchools.length} {assignedSchools.length === 1 ? 'School' : 'Schools'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          style={({ pressed, hovered }: any) => [
            styles.iconBtn,
            {
              backgroundColor: hovered ? colors.errorDim : colors.clayInnerLight,
            },
            Platform.OS === 'web' ? clayStyle(clayShadows.subtle) : {},
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <LogOut size={16} color={colors.textTertiary} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0 } : {}),
  } as any,
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' } : {}),
  } as any,
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sep: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
    borderRadius: 1,
    opacity: 0.6,
  },
  userArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
  },
  userText: {
    maxWidth: 260,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  empId: {
    fontSize: 11,
    fontWeight: '500',
  },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  schoolPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  schoolPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(245, 245, 247, 0.65)',
  },
  clusterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginLeft: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' } : {}),
  } as any,
  clusterBadgeCompact: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    marginLeft: 0,
  },
  clusterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  clusterLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
