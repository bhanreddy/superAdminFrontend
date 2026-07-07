import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter, useSegments } from 'expo-router';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

// Auto-generate pretty labels from route segments
function segmentToLabel(segment: string): string {
  const map: Record<string, string> = {
    '(app)': '',
    index: 'Dashboard',
    schools: 'Schools',
    students: 'Students',
    admins: 'Admins',
    microservices: 'Microservices',
    dcgd: 'DCGD',
    dcgdContent: 'DCGD Content',
    console: 'Console',
    medical: 'Medical',
    add: 'Add New',
    list: 'List',
    'manage-content': 'Content',
  };
  if (map[segment] !== undefined) return map[segment];
  if (segment.startsWith('[') && segment.endsWith(']')) return 'Detail';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export const Breadcrumb = React.memo(function Breadcrumb({ items }: BreadcrumbProps) {
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const breadcrumbs: BreadcrumbItem[] = items || segments
    .map((s) => ({ label: segmentToLabel(s), segment: s }))
    .filter((b) => b.label.length > 0);

  if (breadcrumbs.length === 0) return null;

  return (
    <View style={styles.container}>
      {breadcrumbs.map((item, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return (
          <View key={i} style={styles.row}>
            {i > 0 && (
              <ChevronRight size={12} color={colors.textTertiary} style={styles.separator} />
            )}
            {isLast ? (
              <View style={[
                styles.currentPill,
                {
                  backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.08)',
                },
              ]}>
                <Text style={[styles.current, { color: colors.primary }]}>{item.label}</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (item.href) router.push(item.href as any);
                }}
                style={({ pressed, hovered }: any) => [
                  styles.link,
                  {
                    opacity: pressed ? 0.6 : hovered ? 0.8 : 1,
                  },
                  Platform.OS === 'web' ? { cursor: item.href ? 'pointer' : 'default' } as any : {},
                ]}
              >
                <Text style={[styles.linkText, { color: colors.textTertiary }]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  separator: {
    marginHorizontal: 1,
    opacity: 0.5,
  },
  link: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  currentPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  current: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
