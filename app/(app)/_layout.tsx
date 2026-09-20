import React from 'react';
import { Stack } from 'expo-router';
import { DashboardLayout } from '../../src/components/layout/DashboardLayout';
import { AppRouteGuard } from '../../src/components/auth/AppRouteGuard';

/**
 * The (app) group layout.
 *
 * Uses <Stack> so that detail pages (schools/[id], etc.) properly push
 * onto the navigation stack. DashboardLayout provides the persistent
 * sidebar + topbar shell around all screens in this group.
 *
 * Detail screens fill the content area; root SafeAreaView handles insets.
 */
export default function AppLayout() {
  return (
    <DashboardLayout>
      <AppRouteGuard>
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
      </AppRouteGuard>
    </DashboardLayout>
  );
}
