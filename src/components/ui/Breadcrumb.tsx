import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { usePathname, useRouter, useSegments } from 'expo-router';

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

export const Breadcrumb = React.memo(function Breadcrumb({
  items,
}: BreadcrumbProps) {
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname.split('/').filter(Boolean);
  const parents: Record<string, string> = {
    '/medical': '/medical/list', '/field': '/field/today',
    '/field/visit': '/field/today', '/sales': '/sales/playbook',
    '/microservices': '/microservices/dcgd', '/console/lead': '/console/enquiries',
  };

  const breadcrumbs: BreadcrumbItem[] =
    items ||
    segments
      .map((s) => ({ label: segmentToLabel(s), segment: s }))
      .filter((b) => b.label.length > 0)
      .map((item, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        return { ...item, href: parents[path] || (/^\/clusters\/[^/]+$/.test(path) ? '/clusters' : path) };
      });

  if (breadcrumbs.length === 0) return null;

  return (
    <View style={styles.container}>
      {breadcrumbs.map((item, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return (
          <View key={i} style={styles.row}>
            {i > 0 && (
              <ChevronRight
                size={12}
                color={colors.textTertiary}
                style={styles.separator}
              />
            )}
            {isLast ? (
              <View
                style={[
                  styles.currentPill,
                  {
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                <Text style={[styles.current, { color: colors.primary }]}>
                  {item.label}
                </Text>
              </View>
            ) : item.href ? (
              <Pressable accessibilityRole="button"
                onPress={() => {
                  if (item.href) router.push(item.href as any);
                }}
                style={({ pressed, hovered }: any) => [
                  styles.link,
                  {
                    opacity: pressed ? 0.6 : hovered ? 0.8 : 1,
                  },
                  Platform.OS === 'web'
                    ? ({ cursor: item.href ? 'pointer' : 'default' } as any)
                    : {},
                ]}
              >
                <Text
                  style={[styles.linkText, { color: colors.textSecondary }]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ) : <Text style={[styles.linkText, { color: colors.textSecondary }]}>{item.label}</Text>}
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
    paddingHorizontal: 0,
    borderRadius: 8,
  },
  current: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
