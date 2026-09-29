import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { useTheme } from '../../../src/contexts/ThemeContext';

export default function ConsoleStackLayout() {
  const { founder, isSuperAdmin, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const canUseConsole = Boolean(founder || isSuperAdmin);

  useEffect(() => {
    if (loading) return;
    if (!canUseConsole) {
      router.replace('/(app)/');
    }
  }, [loading, canUseConsole, router]);

  if (loading || !canUseConsole) {
    return (
      <View style={[st.fallback, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        ...(Platform.OS === 'ios' ? { fullScreenGestureEnabled: true } : {}),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="expense-approvals" />
      <Stack.Screen name="collections" />
      <Stack.Screen name="collection-approvals" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="sprint" />
      <Stack.Screen name="backups" />
      <Stack.Screen name="enquiries" />
      <Stack.Screen name="crm" />
      <Stack.Screen name="field-feedback" />
      <Stack.Screen name="sales-command" />
      <Stack.Screen name="school-prospects/index" />
      <Stack.Screen name="school-prospects/[id]" />
      <Stack.Screen name="school-intake/index" />
      <Stack.Screen name="school-intake/[id]" />
      <Stack.Screen name="school-import" />
      <Stack.Screen name="import-history" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="units" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="audit-logs" />
      <Stack.Screen name="festival-posters" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

const st = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
