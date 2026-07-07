import React from 'react';
import { Stack } from 'expo-router';
import { DashboardLayout } from '../../src/components/layout/DashboardLayout';

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
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
    </DashboardLayout>
  );
}
