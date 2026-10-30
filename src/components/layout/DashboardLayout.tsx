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
import { useTheme, WorkspaceThemeProvider } from '../../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardShell = React.memo(function DashboardShell({
  children,
}: DashboardLayoutProps) {
  const { colors, layout: layoutTokens, isDark, zIndex } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isConnect = usePathname() === '/connect';
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
          animationType="none"
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
            <View
              style={[
                styles.mobileSidebarPanel,
                { width: layoutTokens.sidebarWidth },
              ]}
            >
              <Sidebar
                collapsed={false}
                onToggle={closeMobileSidebar}
                onNavigate={closeMobileSidebar}
              />
            </View>
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
              paddingTop: isConnect ? 0 : isMobile ? 16 : 28,
              paddingHorizontal: isConnect
                ? 0
                : isCompactMobile
                  ? 12
                  : isMobile
                    ? 16
                    : screenWidth < 1200
                      ? 24
                      : 36,
              paddingBottom: isConnect ? 0 : 48,
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
  return (
    <WorkspaceThemeProvider path={pathname}>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceThemeProvider>
  );
});
