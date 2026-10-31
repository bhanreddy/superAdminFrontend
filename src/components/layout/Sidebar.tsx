import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  Search,
  X,
  School,
  Users,
  ShieldCheck,
  BookOpen,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
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
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import {
  Role,
  PERMISSIONS,
  isFounderOrSuperAdmin,
  isSalesRole,
  isImplementationRole,
  isSupportRole,
} from '../../constants/rbac';

import { activeWorkspaceRoute } from '../../constants/workspaceDesign';

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
  can: (permission: string) => boolean
): NavGroup[] {
  if (role === 'CA' || role === 'CA_LEAD')
    return [
      {
        title: 'ACCOUNTING',
        items: [
          {
            key: 'books',
            label: 'Books',
            icon: (c, s) => <BookOpen size={s} color={c} />,
            route: '/(app)/books',
          },
          ...(role === 'CA_LEAD'
            ? [
                {
                  key: 'books-access',
                  label: 'CA team',
                  icon: (c: string, s: number) => <Users size={s} color={c} />,
                  route: '/(app)/books/access',
                },
              ]
            : []),
          {
            key: 'books-account',
            label: 'My account',
            icon: (c, s) => <ShieldCheck size={s} color={c} />,
            route: '/(app)/books/account',
          },
        ],
      },
    ];
  // 1. FOUNDER / SUPER_ADMIN
  if (isFounder) {
    return [
      {
        items: [
          {
            key: 'dashboard',
            label: 'Dashboard',
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'MANAGEMENT',
        items: [
          {
            key: 'media-qr',
            label: 'Media QR Manager',
            icon: (c, s) => <QrCode size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/media-qr',
          },
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
            icon: (c, s) => (
              <ShieldCheck size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/admins/',
          },
        ],
      },
      {
        title: 'OPERATIONS',
        items: [
          {
            key: 'school-intake',
            label: 'School Intake',
            icon: (c, s) => (
              <ClipboardList size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/console/school-intake',
          },
          {
            key: 'checklist',
            label: 'Onboarding Checklist',
            icon: (c, s) => (
              <CheckSquare size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <AlertCircle size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/complaints',
          },
          {
            key: 'students',
            label: 'Data Imports',
            icon: (c, s) => (
              <UploadCloud size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <ContactRound size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/console/crm',
          },
          {
            key: 'messenger',
            label: 'Messenger',
            icon: (c, s) => (
              <MessageCircle size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/messenger/',
          },
          {
            key: 'books',
            label: 'Books & Accounting',
            icon: (c, s) => <BookOpen size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/books',
          },
          {
            key: 'books-access',
            label: 'CA access',
            icon: (c, s) => <ShieldCheck size={s} color={c} />,
            route: '/(app)/books/access',
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
            icon: (c, s) => (
              <ClipboardList size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/console/enquiries',
          },
          {
            key: 'field-feedback',
            label: 'Field Feedback',
            icon: (c, s) => (
              <ClipboardList size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/console/field-feedback',
          },
          {
            key: 'field-board',
            label: 'Field Visits',
            icon: (c, s) => <Network size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/field/today',
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
            key: 'content-studio',
            label: 'Content Studio',
            icon: (c, s) => <BookOpen size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/manage-content',
            requiresSuperAdmin: true,
          },
          {
            key: 'audit-logs',
            label: 'Audit Logs',
            icon: (c, s) => (
              <ShieldCheck size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <CheckSquare size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <AlertCircle size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/',
          },
        ],
      },
      {
        title: 'FIELD SALES',
        items: [
          {
            key: 'field-planner',
            label: 'Planner',
            icon: (c, s) => <Calendar size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/field/planner',
          },
          {
            key: 'field-today',
            label: 'Today',
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/field/today',
          },
          {
            key: 'field-route',
            label: 'Route',
            icon: (c, s) => <Network size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/field/route',
          },
          {
            key: 'field-performance',
            label: 'Performance',
            icon: (c, s) => <BarChart3 size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/field/performance',
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
            label: 'School Onboarding',
            icon: (c, s) => <PlusCircle size={s} color={c} strokeWidth={1.8} />,
            route: '/(app)/schools/add',
          },
          {
            key: 'checklist',
            label: 'Onboarding Checklist',
            icon: (c, s) => (
              <CheckSquare size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/checklist',
          },
          {
            key: 'uploads',
            label: 'Data Uploads',
            icon: (c, s) => (
              <UploadCloud size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <AlertCircle size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <CheckSquare size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/checklist',
          },
          {
            key: 'imports',
            label: 'Data Imports & Validation',
            icon: (c, s) => (
              <UploadCloud size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <CheckSquare size={s} color={c} strokeWidth={1.8} />
            ),
            route: '/(app)/checklist',
          },
          {
            key: 'imports',
            label: 'Data Imports',
            icon: (c, s) => (
              <UploadCloud size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <AlertCircle size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <LayoutDashboard size={s} color={c} strokeWidth={1.8} />
            ),
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
            icon: (c, s) => (
              <AlertCircle size={s} color={c} strokeWidth={1.8} />
            ),
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

  if (
    can(PERMISSIONS.SCHOOLS_READ_ALL) ||
    can(PERMISSIONS.SCHOOLS_READ_ASSIGNED)
  ) {
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export const Sidebar = React.memo(function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: SidebarProps) {
  const { colors, layout: layoutTokens } = useTheme();
  const {
    role,
    roleLabel,
    isFounder,
    isSales,
    isImplementation,
    isSupport,
    can,
    isSuperAdmin,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [query, setQuery] = useState('');
  const navGroups = useMemo(() => {
    const groups = getNavGroupsForRole(
      role,
      isFounder,
      isSales,
      isImplementation,
      isSupport,
      can
    );
    if (role)
      groups.splice(1, 0, {
        title: 'COLLABORATION',
        items: [
          {
            key: 'connect',
            label: 'NexSyrus Connect',
            icon: (c, s) => <MessageCircle size={s} color={c} />,
            route: '/(app)/connect',
          },
        ],
      });
    if (isFounder || isSales)
      groups.push({
        title: 'SALES ENABLEMENT',
        items: [
          {
            key: 'sales-playbook',
            label: 'Sales Playbook',
            icon: (c, s) => <BookOpen size={s} color={c} />,
            route: '/(app)/sales/playbook',
          },
          {
            key: 'sales-training',
            label: 'Sales Training',
            icon: (c, s) => <UserCheck size={s} color={c} />,
            route: '/(app)/sales/training',
          },
        ],
      });
    return groups.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.requiresSuperAdmin || isSuperAdmin
      ),
    }));
  }, [
    role,
    isFounder,
    isSales,
    isImplementation,
    isSupport,
    can,
    isSuperAdmin,
  ]);
  const activeRoute = activeWorkspaceRoute(
    pathname,
    navGroups.flatMap((group) => group.items.map((item) => item.route))
  );
  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || collapsed) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          (item.label + ' ' + (group.title || ''))
            .toLowerCase()
            .includes(needle)
        ),
      }))
      .filter((group) => group.items.length);
  }, [query, collapsed, navGroups]);
  const navigate = useCallback(
    (route: string) => {
      router.push(route as any);
      onNavigate?.();
    },
    [router, onNavigate]
  );
  return (
    <View
      style={[
        styles.sidebar,
        {
          width: collapsed
            ? layoutTokens.sidebarCollapsedWidth
            : layoutTokens.sidebarWidth,
          backgroundColor: colors.sidebarBg,
          borderRightColor: colors.sidebarBorder,
        },
      ]}
    >
      <View style={[styles.logoArea, collapsed && { paddingHorizontal: 16 }]}>
        <View style={styles.logoMark}>
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
        </View>
        {!collapsed && (
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>NexSyrus</Text>
            <Text style={[styles.brandSub, { color: colors.sidebarTextMuted }]}>
              Your workspace, connected.
            </Text>
          </View>
        )}
      </View>
      {!collapsed && (
        <View
          style={[
            styles.search,
            { borderColor: colors.sidebarBorder, backgroundColor: '#FFFFFF05' },
          ]}
        >
          <Search size={16} color={colors.sidebarTextMuted} />
          <TextInput
            accessibilityLabel="Find a page"
            placeholder="Find a page…"
            placeholderTextColor={colors.sidebarTextMuted}
            value={query}
            onChangeText={setQuery}
            style={[
              styles.searchInput,
              { color: colors.sidebarText },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            ]}
            selectionColor={colors.sidebarTextMuted}
            underlineColorAndroid="transparent"
          />
          {!!query && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear navigation search"
              onPress={() => setQuery('')}
              style={styles.clear}
            >
              <X size={14} color={colors.sidebarText} />
            </Pressable>
          )}
        </View>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredGroups.map((group, index) => (
          <View key={group.title || index} style={styles.group}>
            {group.title && !collapsed && (
              <Text
                style={[styles.groupTitle, { color: colors.sidebarTextMuted }]}
              >
                {group.title}
              </Text>
            )}
            {group.title && collapsed && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.sidebarBorder },
                ]}
              />
            )}
            {group.items.map((item) => {
              const active = activeRoute === item.route;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  aria-selected={active}
                  onPress={() => navigate(item.route)}
                  style={({ pressed, hovered }: any) => [
                    styles.navItem,
                    collapsed && styles.collapsedItem,
                    {
                      backgroundColor: active
                        ? colors.sidebarItemActive
                        : hovered
                        ? colors.sidebarItemHover
                        : 'transparent',
                      opacity: pressed ? 0.82 : 1,
                    },
                    Platform.OS === 'web'
                      ? ({
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease',
                        } as any)
                      : null,
                  ]}
                >
                  <View
                    style={[
                      styles.iconTile,
                      {
                        backgroundColor: active ? '#E1EAF9' : '#FFFFFF08',
                      },
                    ]}
                  >
                    {item.icon(
                      active ? '#2455C6' : colors.sidebarTextMuted,
                      18
                    )}
                  </View>
                  {!collapsed && (
                    <Text
                      style={[
                        styles.navLabel,
                        {
                          color: active ? '#14243A' : colors.sidebarText,
                          fontWeight: active ? '600' : '500',
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
        {!filteredGroups.length && (
          <Text style={[styles.noResults, { color: colors.sidebarTextMuted }]}>
            No pages match “{query}”.
          </Text>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.sidebarBorder }]}>
        {!collapsed && (
          <View style={styles.workspaceLabel}>
            <Text
              style={{
                color: colors.sidebarText,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              NexSyrus workspace
            </Text>
            <Text
              style={{
                color: colors.sidebarTextMuted,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              {roleLabel || 'Team workspace'}
            </Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            onNavigate
              ? 'Close navigation'
              : collapsed
              ? 'Expand navigation'
              : 'Collapse navigation'
          }
          onPress={onToggle}
          style={({ hovered, pressed }: any) => [
            styles.collapse,
            {
              backgroundColor: hovered
                ? colors.sidebarItemHover
                : 'transparent',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {collapsed ? (
            <ChevronRight size={18} color={colors.sidebarTextMuted} />
          ) : (
            <ChevronLeft size={18} color={colors.sidebarTextMuted} />
          )}
        </Pressable>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  sidebar: { height: '100%', flexShrink: 0, borderRightWidth: 1 },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoMark: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  brandSub: { fontSize: 10, marginTop: 4 },
  search: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    minHeight: 44,
    gap: 8,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    paddingVertical: 10,
    paddingRight: 8,
  },
  clear: {
    minHeight: 44,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navContent: { paddingHorizontal: 12, paddingBottom: 16 },
  group: { marginBottom: 8 },
  groupTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 9,
  },
  divider: { height: 1, marginHorizontal: 8, marginVertical: 12 },
  navItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 3,
  },
  collapsedItem: { paddingHorizontal: 0, justifyContent: 'center' },
  iconTile: {
    width: 30,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { flex: 1, fontSize: 13, lineHeight: 20 },
  noResults: { padding: 12, fontSize: 13, lineHeight: 20 },
  footer: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  workspaceLabel: { flex: 1, paddingLeft: 8 },
  collapse: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
});
