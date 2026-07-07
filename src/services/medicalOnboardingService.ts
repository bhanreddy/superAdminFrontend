import { superAdminClient } from '../api/superAdminClient';
import { ClusterConfig } from '../config/clusters';

export type MedicalOnboardingStatus = 'pending_build' | 'app_delivered' | 'live' | 'suspended';

export interface MedicalBuildConfig {
  env_file: string;
  tauri_config_changes: Record<string, any>;
  setup_commands: string[];
  subscription_info: {
    razorpay_plan_id: string | null;
    subscription_status: string;
    trial_ends_at: string | null;
  };
}

export const getMedicalClusterAssignment = async (): Promise<ClusterConfig> => {
  const { data } = await superAdminClient.get<ClusterConfig>('/api/super-admin/clusters/assign?vertical=medical');
  return data;
};

export const getMedicalBuildConfig = async (shop_id: string): Promise<MedicalBuildConfig> => {
  const { data } = await superAdminClient.get<{ data: MedicalBuildConfig }>(`/api/v1/medical/shops/${shop_id}/build-config`);
  return data.data;
};

export const updateMedicalOnboardingStatus = async (
  shop_id: string,
  status: MedicalOnboardingStatus
): Promise<void> => {
  await superAdminClient.patch(`/api/v1/medical/shops/${shop_id}/onboarding-status`, { status });
};
