import React from "react";
import { NotificationProvider } from "../../src/contexts/NotificationContext";
import { useAuth } from "../../src/hooks/useAuth";
import { useCluster } from "../../src/contexts/ClusterContext";
import { Stack } from "expo-router";
import { DashboardLayout } from "../../src/components/layout/DashboardLayout";
import { AppRouteGuard } from "../../src/components/auth/AppRouteGuard";

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
  const { user, role, permissions, assignedSchools } = useAuth();
  const { selectedCluster } = useCluster();
  return (
    <NotificationProvider
      key={`${user?.id || "guest"}:${selectedCluster?.cluster_id || "default"}:${role}:${permissions.join(",")}:${assignedSchools.join(",")}`}
    >
      <DashboardLayout>
        <AppRouteGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </AppRouteGuard>
      </DashboardLayout>
    </NotificationProvider>
  );
}
