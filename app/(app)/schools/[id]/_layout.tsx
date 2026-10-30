import { Stack } from 'expo-router';
import { useTheme } from '../../../../src/contexts/ThemeContext';

export default function SchoolLayout() {
  const { reducedMotion } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'default' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup-guide" />
      <Stack.Screen name="app-config" />
    </Stack>
  );
}
