import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { Shield, ChevronRight } from 'lucide-react-native';
import { SuperAdmin } from '../../types/superAdmin';
import { theme } from '../../constants/theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface AdminCardProps {
  admin: SuperAdmin;
  currentAdminId: string | undefined;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function AdminCard({ admin, currentAdminId, onPress, onLongPress }: AdminCardProps) {
  const isSelf = admin.id === currentAdminId;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 0.7 })]}
    >
      <Card style={styles.card}>
        <View style={styles.info}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield size={24} color="#FFB800" />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{admin.full_name}</Text>
                {isSelf && (
                  <View style={styles.selfBadge}>
                    <Badge label="You" variant="primary" />
                  </View>
                )}
              </View>
              <Text style={styles.email}>{admin.email}</Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            <Badge
              label={admin.is_active ? 'Active' : 'Inactive'}
              variant={admin.is_active ? 'success' : 'error'}
            />
          </View>
        </View>
        <ChevronRight size={20} color={theme.colors.textSecondary} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 184, 0, 0.1)', // Light gold background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.xs,
  },
  selfBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  email: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  badgeContainer: {
    marginLeft: theme.spacing.md,
  },
});
