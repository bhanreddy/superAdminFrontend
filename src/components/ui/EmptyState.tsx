import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { FolderOpen } from 'lucide-react-native';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, isDark, clayShadows } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[
        styles.iconWrap,
        { backgroundColor: colors.primaryMuted },
        Platform.OS === 'web' ? {
          boxShadow: isDark
            ? 'inset 3px 3.5px 7px rgba(0,0,0,0.35), inset -3px -3.5px 7px rgba(255,255,255,0.03)'
            : 'inset 3px 3.5px 7px rgba(0,0,0,0.05), inset -3px -3.5px 7px rgba(255,255,255,0.9)',
        } as any : {},
      ]}>
        {icon || <FolderOpen size={32} color={colors.textTertiary} />}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed, hovered }: any) => [
            styles.actionBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
            clayStyle(clayShadows.subtle),
            pressed && { transform: [{ scale: 0.97 }] },
            Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } as any : {},
          ]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  actionBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
