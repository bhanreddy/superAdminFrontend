import { superAdminClient } from '../api/superAdminClient';
import type { ClusterConfig } from '../config/clusters';

export type OnboardingStatus = 'pending_build' | 'apk_delivered' | 'live' | 'suspended';

export interface BuildConfig {
  env_file: string;
  app_json_changes: Record<string, any>;
  eas_profile: Record<string, any>;
  firebase_package: string;
  setup_commands: string[];
}

export async function getClusterAssignment(): Promise<ClusterConfig> {
  const response = await superAdminClient.get('/api/super-admin/clusters/assign');
  return response.data;
}

export async function getBuildConfig(school_id: string, clusterId?: string): Promise<BuildConfig> {
  const response = await superAdminClient.get(`/api/super-admin/schools/${school_id}/build-config`, {
    params: clusterId ? { cluster_id: clusterId } : undefined,
  });
  return response.data;
}

export async function updateOnboardingStatus(
  school_id: string,
  status: OnboardingStatus,
  clusterId?: string,
): Promise<void> {
  await superAdminClient.patch(`/api/super-admin/schools/${school_id}/onboarding-status`, { status }, {
    params: clusterId ? { cluster_id: clusterId } : undefined,
  });
}
