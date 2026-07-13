import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Pressable,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = React.memo(function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { colors, layout: layoutTokens, isDark, zIndex, clayShadows } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
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
        el.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
        document.head.appendChild(el);
      }
    } catch {}
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />

      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && mobileOpen && (
        <View style={[styles.mobileSidebarOverlay, { zIndex: zIndex.sidebar }]}>
          <Pressable
            style={[styles.mobileSidebarBackdrop, { backgroundColor: colors.overlay }]}
            onPress={closeMobileSidebar}
          />
          <View style={[styles.mobileSidebarPanel, { width: layoutTokens.sidebarWidth }]}>
            <Sidebar collapsed={false} onToggle={closeMobileSidebar} />
          </View>
        </View>
      )}

      {/* Main content area */}
      <View style={styles.mainArea}>
        <TopBar
          onMenuPress={toggleSidebar}
          showMenu={isMobile}
        />

        {/* Content — transparent scroll surface. Padding lives here directly so
            page elements are its immediate children: no wrapper div, no container. */}
        <View
          style={[
            styles.scroller,
            {
              paddingTop: isMobile ? 16 : layoutTokens.topbarHeight + 28,
              paddingHorizontal: isCompactMobile ? 12 : isMobile ? 16 : 40,
              paddingBottom: 48,
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
    height: Platform.OS === 'web' ? '100vh' as any : '100%',
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
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
