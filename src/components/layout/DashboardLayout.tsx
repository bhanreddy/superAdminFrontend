import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../hooks/useAuth';
import { isFounderOrSuperAdmin } from '../../constants/rbac';
import { useTheme, WorkspaceThemeProvider } from '../../contexts/ThemeContext';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { animation, workspaceUi } from '../../constants/theme';
import { getRoleWorkspaceModule } from '../../constants/workspaceDesign';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardShell = React.memo(function DashboardShell({
  children,
}: DashboardLayoutProps) {
  const {
    colors,
    layout: layoutTokens,
    isDark,
    zIndex,
    reducedMotion,
  } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const pathname = usePathname();
  const { role } = useAuth();
  const isConnect = pathname === '/connect';
  const isExecutive =
    (pathname === '/' || pathname === '/console') &&
    isFounderOrSuperAdmin(role);
  const isMobile = screenWidth < layoutTokens.mobileBreakpoint;
  const isCompactMobile = screenWidth < 480;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((p) => !p);
    } else {
      setCollapsed((p) => !p);
    }
  }, [isMobile]);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Load Inter font on web
  if (Platform.OS === 'web') {
    try {
      const link = document.getElementById('inter-font-link');
      if (!link) {
        const el = document.createElement('link');
        el.id = 'inter-font-link';
        el.rel = 'stylesheet';
        el.href =
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
        document.head.appendChild(el);
      }
    } catch {}
  }

  return (
    <View
      nativeID="nexsyrus-workspace"
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={colors.background}
      />

      {/* Desktop sidebar */}
      {!isConnect && !isMobile && (
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      )}

      {/* Mobile sidebar overlay */}
      {!isConnect && isMobile && mobileOpen && (
        <Modal
          transparent
          visible={mobileOpen}
          animationType={reducedMotion ? 'none' : 'fade'}
          onRequestClose={closeMobileSidebar}
        >
          <View
            style={[styles.mobileSidebarOverlay, { zIndex: zIndex.sidebar }]}
          >
            <Pressable
              style={[
                styles.mobileSidebarBackdrop,
                { backgroundColor: colors.overlay },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss navigation"
              onPress={closeMobileSidebar}
            />
            <Animated.View
              entering={
                reducedMotion ? undefined : FadeInLeft.duration(animation.slow)
              }
              style={[
                styles.mobileSidebarPanel,
                {
                  width: Math.min(layoutTokens.sidebarWidth, screenWidth - 44),
                },
              ]}
            >
              <Sidebar
                collapsed={false}
                onToggle={closeMobileSidebar}
                onNavigate={closeMobileSidebar}
              />
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Main content area */}
      <View style={styles.mainArea}>
        {!isConnect && (
          <TopBar onMenuPress={toggleSidebar} showMenu={isMobile} />
        )}

        {/* Content — transparent scroll surface. Padding lives here directly so
            page elements are its immediate children: no wrapper div, no container. */}
        <View
          style={[
            styles.scroller,
            {
              maxWidth: isConnect || isExecutive ? undefined : 1480,
              width: '100%',
              alignSelf: 'center',
              paddingTop: isConnect || isExecutive ? 0 : isMobile ? workspaceUi.phoneGutter : workspaceUi.pageGutter,
              paddingHorizontal:
                isConnect || isExecutive
                  ? 0
                  : isMobile ? workspaceUi.phoneGutter : workspaceUi.pageGutter,
              paddingBottom: isConnect || isExecutive ? 0 : 48,
              ...(isConnect ? { overflow: 'hidden' as const } : {}),
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  scroller: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: Platform.OS === 'web' ? ('auto' as any) : 'scroll',
  },
  mobileSidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  mobileSidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mobileSidebarPanel: {
    height: '100%',
  },
});

export const DashboardLayout = React.memo(function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname() || '/';
  const { role } = useAuth();
  const homeModule = pathname === '/' || pathname === '/console'
    ? getRoleWorkspaceModule(role)
    : undefined;
  return (
    <WorkspaceThemeProvider path={pathname} module={homeModule}>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceThemeProvider>
  );
});
