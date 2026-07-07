import { Stack } from 'expo-router';

export default function SchoolLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup-guide" />
      <Stack.Screen name="app-config" />
    </Stack>
  );
}
