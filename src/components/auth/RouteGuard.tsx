import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../constants/rbac';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  anyPermissions?: string[];
  allowedRoles?: Role[];
  founderOnly?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredPermission,
  anyPermissions,
  allowedRoles,
  founderOnly = false,
}) => {
  const { colors, isDark } = useTheme();
  const { role, isFounder, can, roleLabel } = useAuth();
  const router = useRouter();

  let hasAccess = true;

  if (founderOnly && !isFounder) {
    hasAccess = false;
  } else if (allowedRoles && allowedRoles.length > 0) {
    if (!role || (!allowedRoles.includes(role) && !isFounder)) {
      hasAccess = false;
    }
  } else if (anyPermissions && anyPermissions.length > 0 && !anyPermissions.some(can)) {
    hasAccess = false;
  } else if (requiredPermission && !can(requiredPermission)) {
    hasAccess = false;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.deniedContainer, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.deniedCard,
          {
            backgroundColor: isDark ? 'rgba(28, 28, 40, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: isDark ? 'rgba(255, 69, 58, 0.3)' : 'rgba(255, 69, 58, 0.2)',
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <ShieldAlert size={36} color="#FF453A" />
        </View>

        <Text style={[styles.deniedTitle, { color: colors.textPrimary }]}>Access Restricted</Text>

        <Text style={[styles.deniedSubtitle, { color: colors.textSecondary }]}>
          Your account role ({roleLabel}) does not have permission to access this module.
        </Text>

        {requiredPermission && (
          <View style={styles.permPill}>
            <Text style={styles.permText}>Required permission: {requiredPermission}</Text>
          </View>
        )}
        {!requiredPermission && anyPermissions && (
          <View style={styles.permPill}>
            <Text style={styles.permText}>One of these permissions is required</Text>
          </View>
        )}

        <Pressable
          onPress={() => router.replace('/(app)/' as any)}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <ArrowLeft size={16} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Return to Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  deniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deniedCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  deniedTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  deniedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  permPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  permText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'rgba(245,245,247,0.7)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
