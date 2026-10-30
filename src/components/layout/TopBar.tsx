import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  LogOut,
  MessageCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useCluster } from '../../contexts/ClusterContext';
import { Avatar } from '../ui/Avatar';
import { Breadcrumb } from '../ui/Breadcrumb';
import { workspaceModules } from '../../constants/workspaceDesign';
import { FingerprintSecurityControl } from '../auth/FingerprintSecurity';

interface TopBarProps {
  onMenuPress?: () => void;
  showMenu?: boolean;
}
export const TopBar = React.memo(function TopBar({
  onMenuPress,
  showMenu,
}: TopBarProps) {
  const {
    colors,
    isDark,
    toggleTheme,
    workspaceModule = 'overview',
  } = useTheme();
  const {
    currentAdmin,
    founder,
    signOut,
    role,
    roleLabel,
    employeeId,
    isFounder,
  } = useAuth();
  const { selectedCluster } = useCluster();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const name = currentAdmin?.full_name || founder?.full_name || 'Team member';
  const module = workspaceModules[workspaceModule];
  const iconStyle = ({ hovered, pressed }: any) => [
    styles.iconButton,
    {
      backgroundColor: hovered ? colors.hover : 'transparent',
      opacity: pressed ? 0.75 : 1,
    },
    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
  ];
  return (
    <View
      style={[
        styles.topbar,
        {
          backgroundColor: colors.topbarBg,
          borderBottomColor: colors.topbarBorder,
          paddingHorizontal: compact ? 10 : 28,
        },
      ]}
    >
      <View style={[styles.left, compact && { gap: 4 }]}>
        {showMenu && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation"
            onPress={onMenuPress}
            style={iconStyle}
          >
            <Menu size={21} color={colors.textPrimary} />
          </Pressable>
        )}
        <View style={styles.location}>
          {!compact && (
            <View
              style={[
                styles.locationMark,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <View
                style={[styles.mark, { backgroundColor: colors.primary }]}
              />
            </View>
          )}
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text
              style={[styles.moduleLabel, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {compact ? 'NexSyrus' : module.label}
            </Text>
            {!compact && <Breadcrumb />}
          </View>
        </View>
        {selectedCluster &&
          role !== 'CA' &&
          role !== 'CA_LEAD' &&
          width >= 1100 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Switch cluster: ${selectedCluster.label}`}
              onPress={() => router.push('/cluster-selector' as any)}
              style={[styles.cluster, { backgroundColor: colors.primaryMuted }]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {selectedCluster.label}
              </Text>
            </Pressable>
          )}
      </View>
      <View style={styles.right}>
        <FingerprintSecurityControl />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open NexSyrus Connect"
          onPress={() => router.push('/(app)/connect' as any)}
          style={iconStyle}
        >
          <MessageCircle size={19} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isDark ? 'Switch to light theme' : 'Switch to dark theme'
          }
          onPress={toggleTheme}
          style={iconStyle}
        >
          {isDark ? (
            <Sun size={19} color={colors.warning} />
          ) : (
            <Moon size={19} color={colors.textSecondary} />
          )}
        </Pressable>
        {isFounder && !compact && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => router.push('/(app)/console/notifications' as any)}
            style={iconStyle}
          >
            <Bell size={19} color={colors.textSecondary} />
          </Pressable>
        )}
        {!compact && (
          <View
            style={[styles.separator, { backgroundColor: colors.divider }]}
          />
        )}
        <Avatar name={name} size="sm" />
        {width >= 900 && (
          <View style={styles.user}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 13,
                fontWeight: '600',
              }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                marginTop: 3,
              }}
              numberOfLines={1}
            >
              {roleLabel}
              {employeeId ? ` · ${employeeId}` : ''}
            </Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={async () => {
            await signOut();
            if (role === 'CA' || role === 'CA_LEAD')
              router.replace('/(auth)/ca-login' as any);
          }}
          style={iconStyle}
        >
          <LogOut size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  topbar: {
    minHeight: 72,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  locationMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 15,
    height: 15,
    borderRadius: 5,
    transform: [{ rotate: '12deg' }],
  },
  moduleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  cluster: {
    marginLeft: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    maxWidth: 180,
  },
  separator: { width: 1, height: 28, marginHorizontal: 10 },
  user: { maxWidth: 200, marginLeft: 7, marginRight: 8 },
});
