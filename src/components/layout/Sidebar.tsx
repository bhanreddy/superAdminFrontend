import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import {
  School,
  Users,
  ShieldCheck,
  BookOpen,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  Receipt,
  FileText,
  Sparkles,
  ContactRound,
  MessageCircle,
  Network,
  Database,
  QrCode,
  Zap,
  Server,
  PlusCircle,
  CheckSquare,
  AlertCircle,
  UploadCloud,
  Layers,
  Headphones,
  UserCheck,
  ClipboardList,
  ScrollText,
} from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import {
  Role,
  PERMISSIONS,
  isFounderOrSuperAdmin,
  isSalesRole,
  isImplementationRole,
  isSupportRole,
} from '../../constants/rbac';

// ─── Nav Item Types ─────────────────────────────────────────────────────────
interface NavItem {
  key: string;
  label: string;
  icon: (color: string, size: number) => React.ReactNode;
  route: string;
  badge?: number;
  requiresSuperAdmin?: boolean;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// ─── Build Dynamic Navigation tailored to user role ─────────────────────────
function getNavGroupsForRole(
  role: Role | null,
  isFounder: boolean,
  isSales: boolean,
  isImpl: boolean,
  isSupport: boolean,
  can: (permission: string) => boolean,
): NavGroup[] {
  // 1. FOUNDER / SUPER_ADMIN
  if (isFounder) {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Dashboard',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'MANAGEMENT',
        items: [
          {
            key: 'schools',
            label: 'Schools',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'users',
            label: 'Team Management',
            icon: (c, s) => <Users size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/users',
          },
          {
            key: 'clusters',
            label: 'Clusters',
            icon: (c, s) => <Server size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/clusters/',
          },
          {
            key: 'admins',
            label: 'Super Admins',
            icon: (c, s) => <ShieldCheck size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/admins/',
          },
        ],
      },
      {
        title: 'OPERATIONS',
        items: [
          {
            key: 'checklist',
            label: 'Onboarding Checklist',
            icon: (c, s) => <CheckSquare size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/checklist',
          },
          {
            key: 'requirements',
            label: 'Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
          {
            key: 'complaints',
            label: 'Complaints & Support',
            icon: (c, s) => <AlertCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/complaints',
          },
          {
            key: 'students',
            label: 'Data Imports',
            icon: (c, s) => <UploadCloud size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/students/',
          },
        ],
      },
      {
        title: 'BUSINESS & AUDIT',
        items: [
          {
            key: 'sprint',
            label: '10-Day RED ALERT',
            icon: (c, s) => <Zap size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/sprint',
          },
          {
            key: 'crm',
            label: 'CRM',
            icon: (c, s) => <ContactRound size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/crm',
          },
          {
            key: 'messenger',
            label: 'Messenger',
            icon: (c, s) => <MessageCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/messenger/',
          },
          {
            key: 'billing',
            label: 'Billing',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/billing',
          },
          {
            key: 'expenses',
            label: 'Expenses',
            icon: (c, s) => <Receipt size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/expenses',
          },
          {
            key: 'enquiries',
            label: 'Enquiries',
            icon: (c, s) => <ClipboardList size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/enquiries',
          },
          {
            key: 'field-feedback',
            label: 'Field Feedback',
            icon: (c, s) => <ClipboardList size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/field-feedback',
          },
          {
            key: 'sales-command',
            label: 'Sales Command',
            icon: (c, s) => <BarChart3 size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/sales-command',
          },
          {
            key: 'tracking-links',
            label: 'Tracking Links',
            icon: (c, s) => <QrCode size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/tracking-links',
          },
          {
            key: 'school-prospects',
            label: 'School Prospects',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/school-prospects',
          },
          {
            key: 'school-import',
            label: 'Import Schools',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/school-import',
          },
          {
            key: 'import-history',
            label: 'Import History',
            icon: (c, s) => <ScrollText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/import-history',
          },
          {
            key: 'tenant-assignments',
            label: 'Tenant Assignments',
            icon: (c, s) => <Network size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/tenant-assignments',
            requiresSuperAdmin: true,
          },
          {
            key: 'festival-posters',
            label: 'Festival Posters',
            icon: (c, s) => <Sparkles size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/festival-posters',
          },
          {
            key: 'audit-logs',
            label: 'Audit Logs',
            icon: (c, s) => <ShieldCheck size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/audit-logs',
          },
          {
            key: 'settings',
            label: 'Settings',
            icon: (c, s) => <Settings size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/settings',
          },
        ],
      },
      {
        title: 'INFRASTRUCTURE',
        items: [
          {
            key: 'backups',
            label: 'Database Backups',
            icon: (c, s) => <Database size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/backups',
          },
        ],
      },
    ];
  }

  // 2. SALES MANAGER
  if (role === 'SALES_MANAGER') {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Sales Dashboard',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'SALES OPERATIONS',
        items: [
          {
            key: 'team',
            label: 'My Team',
            icon: (c, s) => <Users size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/users',
          },
          {
            key: 'schools',
            label: 'Schools Pipeline',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'checklist',
            label: 'Onboarding Tracker',
            icon: (c, s) => <CheckSquare size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/checklist',
          },
          {
            key: 'requirements',
            label: 'Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
          {
            key: 'complaints',
            label: 'Complaints',
            icon: (c, s) => <AlertCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/complaints',
          },
        ],
      },
    ];
  }

  // 3. SALES EXECUTIVE
  if (role === 'SALES_EXECUTIVE') {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'My Dashboard',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'MY PIPELINE',
        items: [
          {
            key: 'schools',
            label: 'My Schools',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'new-school',
            label: 'New School Request',
            icon: (c, s) => <PlusCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/add',
          },
          {
            key: 'checklist',
            label: 'Onboarding Checklist',
            icon: (c, s) => <CheckSquare size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/checklist',
          },
          {
            key: 'uploads',
            label: 'Data Uploads',
            icon: (c, s) => <UploadCloud size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/students/',
          },
          {
            key: 'requirements',
            label: 'Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
          {
            key: 'complaints',
            label: 'Raise Complaint',
            icon: (c, s) => <AlertCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/complaints',
          },
        ],
      },
    ];
  }

  // 4. IMPLEMENTATION MANAGER
  if (role === 'IMPLEMENTATION_MANAGER') {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Implementation Dashboard',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'IMPLEMENTATION OPS',
        items: [
          {
            key: 'sprint',
            label: '10-Day RED ALERT',
            icon: (c, s) => <Zap size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/console/sprint',
          },
          {
            key: 'team',
            label: 'Implementation Team',
            icon: (c, s) => <Users size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/users',
          },
          {
            key: 'schools',
            label: 'Schools Under Implementation',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'checklist',
            label: 'Launch Readiness Checklist',
            icon: (c, s) => <CheckSquare size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/checklist',
          },
          {
            key: 'imports',
            label: 'Data Imports & Validation',
            icon: (c, s) => <UploadCloud size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/students/',
          },
          {
            key: 'requirements',
            label: 'School Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
        ],
      },
    ];
  }

  // 5. IMPLEMENTATION EXECUTIVE
  if (role === 'IMPLEMENTATION_EXECUTIVE') {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Dashboard',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'MY IMPLEMENTATIONS',
        items: [
          {
            key: 'schools',
            label: 'Assigned Schools',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'checklist',
            label: 'Launch Checklist',
            icon: (c, s) => <CheckSquare size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/checklist',
          },
          {
            key: 'imports',
            label: 'Data Imports',
            icon: (c, s) => <UploadCloud size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/students/',
          },
          {
            key: 'requirements',
            label: 'Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
        ],
      },
    ];
  }

  // 6. SUPPORT MANAGER
  if (role === 'SUPPORT_MANAGER') {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Support Command Center',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'SUPPORT OPERATIONS',
        items: [
          {
            key: 'team',
            label: 'Support Team',
            icon: (c, s) => <Users size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/users',
          },
          {
            key: 'complaints',
            label: 'Complaints & Tickets',
            icon: (c, s) => <AlertCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/complaints',
          },
          {
            key: 'schools',
            label: 'School Directory',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'requirements',
            label: 'Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
        ],
      },
    ];
  }

  // 7. SUPPORT EXECUTIVE
  if (role === 'SUPPORT_EXECUTIVE' || role === 'TECHNICAL_SUPPORT') {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Dashboard',
            icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'MY TICKETS',
        items: [
          {
            key: 'complaints',
            label: 'Assigned Complaints',
            icon: (c, s) => <AlertCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/complaints',
          },
          {
            key: 'schools',
            label: 'My Schools',
            icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/',
          },
          {
            key: 'requirements',
            label: 'Requirements',
            icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/requirements',
          },
        ],
      },
    ];
  }

  // Permission-aware fallback for future roles.
  const fallbackItems: NavItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: (c, s) => <LayoutDashboard size={s} color={c} strokeWidth={1.8} />,
      route: '/(app)/',
    },
  ];

  if (can(PERMISSIONS.SCHOOLS_READ_ALL) || can(PERMISSIONS.SCHOOLS_READ_ASSIGNED)) {
    fallbackItems.push({
      key: 'schools',
      label: 'Schools',
      icon: (c, s) => <School size={s} color={c} strokeWidth={1.8} />,
      route: '/(app)/schools/',
    });
  }
  if (can(PERMISSIONS.CHECKLIST_READ)) {
    fallbackItems.push({
      key: 'checklist',
      label: 'Onboarding Checklist',
      icon: (c, s) => <CheckSquare size={s} color={c} strokeWidth={1.8} />,
      route: '/(app)/checklist',
    });
  }
  if (can(PERMISSIONS.STUDENTS_IMPORT)) {
    fallbackItems.push({
      key: 'imports',
      label: 'Data Imports',
      icon: (c, s) => <UploadCloud size={s} color={c} strokeWidth={1.8} />,
      route: '/(app)/students/',
    });
  }
  if (can(PERMISSIONS.REQUIREMENTS_READ)) {
    fallbackItems.push({
      key: 'requirements',
      label: 'Requirements',
      icon: (c, s) => <FileText size={s} color={c} strokeWidth={1.8} />,
      route: '/(app)/requirements',
    });
  }
  if (can(PERMISSIONS.COMPLAINTS_READ)) {
    fallbackItems.push({
      key: 'complaints',
      label: 'Complaints & Support',
      icon: (c, s) => <AlertCircle size={s} color={c} strokeWidth={1.8} />,
      route: '/(app)/complaints',
    });
  }

  return [
    {
      items: fallbackItems,
    },
  ];
}

// ─── Match active route ─────────────────────────────────────────────────────
function isActiveRoute(segments: string[], route: string): boolean {
  const cleaned = route.replace(/^\/(app\/|\(app\)\/)/, '').replace(/\/$/, '');
  const segJoined = segments.filter((s) => s !== '(app)').join('/').replace(/\/$/, '');
  if (cleaned === '' && (segJoined === '' || segJoined === 'index')) return true;
  return segJoined.startsWith(cleaned);
}

// ─── Sidebar Component ──────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = React.memo(function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { colors, layout: layoutTokens, isDark, clayShadows } = useTheme();
  const { role, isFounder, isSales, isImplementation, isSupport, can, isSuperAdmin } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const widthAnim = useRef(
    new Animated.Value(collapsed ? layoutTokens.sidebarCollapsedWidth : layoutTokens.sidebarWidth)
  ).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: collapsed ? layoutTokens.sidebarCollapsedWidth : layoutTokens.sidebarWidth,
      tension: 200,
      friction: 22,
      useNativeDriver: false,
    }).start();
  }, [collapsed]);

  const navGroups = useMemo(
    () => {
      const groups = getNavGroupsForRole(role, isFounder, isSales, isImplementation, isSupport, can);
      if (isFounder || isSales) groups.push({
        title: 'SALES ENABLEMENT',
        items: [
          { key: 'sales-playbook', label: 'Sales Playbook', icon: (c, s) => <BookOpen size={s} color={c} />, route: '/(app)/sales/playbook' },
          { key: 'sales-training', label: 'Sales Training', icon: (c, s) => <UserCheck size={s} color={c} />, route: '/(app)/sales/training' },
        ],
      });
      return groups;
    },
    [role, isFounder, isSales, isImplementation, isSupport, can]
  );

  const navigate = useCallback(
    (route: string) => {
      router.push(route as any);
    },
    [router]
  );

  return (
    <Animated.View
      style={[
        styles.sidebar,
        {
          width: widthAnim,
          backgroundColor:
            Platform.OS === 'web'
              ? isDark
                ? 'rgba(10,10,14,0.45)'
                : 'rgba(245,245,247,0.55)'
              : colors.sidebarBg,
          borderRightWidth: Platform.OS === 'web' ? 0 : 1,
          borderRightColor: colors.sidebarBorder,
        },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow: isDark
                ? 'inset -1px 0 0 rgba(255,255,255,0.03), 1px 0 0 rgba(0,0,0,0.45), 12px 0 40px rgba(0,0,0,0.18)'
                : 'inset -1px 0 0 rgba(0,0,0,0.02), 1px 0 0 rgba(255,255,255,0.8), 12px 0 40px rgba(0,0,0,0.02)',
            } as any)
          : {},
      ]}
    >
      {/* Logo area */}
      <View style={styles.logoArea}>
        <View style={styles.logoRow}>
          <View
            style={[
              styles.logoMark,
              clayStyle(clayShadows.clay),
              {
                backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
                borderRadius: 14,
              },
            ]}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          {!collapsed && (
            <View style={styles.logoText}>
              <Text style={[styles.brandName, { color: colors.sidebarText }]}>NexSyrus</Text>
              <Text style={[styles.brandSub, { color: colors.sidebarTextMuted }]}>
                Admin Console
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Navigation */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {navGroups.map((group, gi) => (
          <View key={gi} style={styles.navGroup}>
            {group.title && !collapsed && (
              <Text style={[styles.groupTitle, { color: colors.sidebarTextMuted }]}>
                {group.title}
              </Text>
            )}
            {collapsed && group.title && (
              <View style={[styles.groupDivider, { backgroundColor: colors.sidebarBorder }]} />
            )}
            {group.items.map((item) => {
              if (item.requiresSuperAdmin && !isSuperAdmin) return null;
              const active = isActiveRoute(segments, item.route);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => navigate(item.route)}
                  style={({ pressed, hovered }: any) => [
                    styles.navItem,
                    collapsed && styles.navItemCollapsed,
                    {
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(10, 132, 255, 0.08)'
                          : 'rgba(0, 122, 255, 0.06)'
                        : hovered
                        ? colors.sidebarItemHover
                        : 'transparent',
                      borderColor: active
                        ? isDark
                          ? 'rgba(10, 132, 255, 0.15)'
                          : 'rgba(0, 122, 255, 0.12)'
                        : 'transparent',
                      borderWidth: 1,
                    },
                    active && Platform.OS === 'web'
                      ? ({
                          boxShadow: isDark
                            ? 'inset 1px 1px 1px rgba(255,255,255,0.08), 0px 4px 12px rgba(10, 132, 255, 0.12)'
                            : 'inset 1px 1px 1px rgba(255,255,255,0.9), 0px 4px 12px rgba(0, 122, 255, 0.05)',
                        } as any)
                      : {},
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {/* Soft pill indicator on the left edge */}
                  {active && (
                    <View
                      style={[
                        styles.activeIndicator,
                        {
                          backgroundColor: colors.primary,
                          opacity: isDark ? 0.8 : 1,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 6,
                        },
                      ]}
                    />
                  )}
                  {item.icon(active ? (isDark ? '#FFFFFF' : colors.primary) : colors.sidebarTextMuted, 18)}
                  {!collapsed && (
                    <Text
                      style={[
                        styles.navLabel,
                        {
                          color: active ? colors.primary : colors.sidebarText,
                          fontWeight: active ? '600' : '400',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Collapse toggle */}
      <View style={[styles.collapseArea, { borderTopColor: colors.sidebarBorder }]}>
        <Pressable
          onPress={onToggle}
          style={({ pressed, hovered }: any) => [
            styles.collapseBtn,
            {
              backgroundColor: hovered ? colors.sidebarItemHover : 'transparent',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          {collapsed ? (
            <ChevronRight size={16} color={colors.sidebarTextMuted} />
          ) : (
            <ChevronLeft size={16} color={colors.sidebarTextMuted} />
          )}
          {!collapsed && (
            <Text style={[styles.collapseText, { color: colors.sidebarTextMuted }]}>Collapse</Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    ...Platform.select({
      web: { position: 'relative' as any, flexShrink: 0 },
      default: {},
    }),
  },
  logoArea: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 24,
    height: 24,
  },
  logoText: {
    flex: 1,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingVertical: 8,
  },
  navGroup: {
    marginBottom: 6,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginTop: 8,
  },
  groupDivider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 1,
    opacity: 0.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginHorizontal: 10,
    borderRadius: 14,
    position: 'relative',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }
      : {}),
  } as any,
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 12,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 3,
  },
  navLabel: {
    fontSize: 13.5,
    flex: 1,
    letterSpacing: 0.1,
  },
  collapseArea: {
    borderTopWidth: 1,
    padding: 12,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  } as any,
  collapseText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
