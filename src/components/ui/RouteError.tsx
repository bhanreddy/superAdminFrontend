import React from 'react';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { EmptyState } from './EmptyState';

function ErrorContent({ retry }: { retry: () => void }) {
  const { colors } = useTheme();
  return <View accessibilityLiveRegion="polite" style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
    <EmptyState title="This screen could not open" description="Please try again. If this continues, return after checking your connection." actionLabel="Try again" onAction={retry} />
  </View>;
}
export function RouteError({ retry }: { retry: () => void }) {
  return <ThemeProvider><ErrorContent retry={retry} /></ThemeProvider>;
}
