import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider as NavThemeProvider, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { useAuth } from '../src/hooks/useAuth';
import { useCluster } from '../src/contexts/ClusterContext';
import { theme } from '../src/constants/theme';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ClusterProvider } from '../src/contexts/ClusterContext';
import { ToastProvider } from '../src/components/ui/Toast';
import AppSplash from '../src/components/ui/AppSplash';

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  const { session, loading, isSuperAdmin, founder } = useAuth();

  // Expo Router wraps screens in a React Navigation navigator that paints its own
  // background from the *navigation* theme (default: light rgb(242,242,242)). Left
  // as-is it draws a light box over our themed content. Make it transparent so our
  // app background shows through and the shell + content share one surface.
  const navTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavDefaultTheme;
    return { ...base, colors: { ...base.colors, background: 'transparent', card: 'transparent' } };
  }, [isDark]);
  const { isClusterReady, selectedCluster } = useCluster();
  const segments = useSegments();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  const hasAppAccess = Boolean(isSuperAdmin || founder);

  useEffect(() => {
    if (loading || !splashDone || !isClusterReady) return;

    // If no cluster selected, redirect to cluster selector
    const onClusterSelector = segments[0] === 'cluster-selector';
    if (!selectedCluster) {
      if (!onClusterSelector) {
        router.replace('/cluster-selector');
      }
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!session || !hasAppAccess) {
      if (!inAuthGroup && !onClusterSelector) {
        router.replace('/(auth)/login');
      }
    } else if (session && hasAppAccess) {
      if (inAuthGroup || onClusterSelector) {
        router.replace('/(app)/');
      }
    }
  }, [session, loading, hasAppAccess, segments, router, splashDone, isClusterReady, selectedCluster]);

  return (
    <NavThemeProvider value={navTheme}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Slot />
        {/* Show animated splash on initial load */}
        {(loading || !splashDone || !isClusterReady) && (
          <AppSplash onFinish={() => setSplashDone(true)} />
        )}
      </SafeAreaView>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClusterProvider>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <RootLayoutInner />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </ClusterProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
