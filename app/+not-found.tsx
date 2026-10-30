import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { EmptyState } from '../src/components/ui/EmptyState';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
    <EmptyState title="Page not found" description="This link may be incomplete or the page may have moved." actionLabel="Open dashboard" onAction={() => router.replace('/(app)/')} />
  </View>;
}
