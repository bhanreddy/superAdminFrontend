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

export interface ConfigBlocker {
  field: string;
  platform: string | null;
  message: string;
}

export interface SchoolConfiguration {
  cluster_id: string;
  school_id: number;
  version: number;
  origin: string;
  config: Record<string, any>;
  suggestions: Record<string, any>;
  preview: Record<string, any>;
  assets: Record<string, { id: string; sha256: string; mime: string; width: number | null; height: number | null }>;
  readiness: {
    status: string;
    blockers: ConfigBlocker[];
    platforms: Record<string, { status: string; missing?: string[] }>;
  };
  latest_revision: { revision: number } | null;
  latest_job: { id: string; revision: number; status: string; attempt_count: number; error?: { message?: string } | null } | null;
}

export async function getSchoolConfiguration(schoolId: string, clusterId: string): Promise<SchoolConfiguration> {
  const response = await superAdminClient.get(`/api/super-admin/schools/${schoolId}/configuration`, {
    params: { cluster_id: clusterId },
  });
  return response.data;
}

export async function saveSchoolConfiguration(schoolId: string, clusterId: string, expectedVersion: number, config: Record<string, any>) {
  const response = await superAdminClient.put(`/api/super-admin/schools/${schoolId}/configuration`, {
    expected_version: expectedVersion,
    config,
  }, { params: { cluster_id: clusterId } });
  return response.data as SchoolConfiguration;
}

export async function uploadSchoolAsset(schoolId: string, clusterId: string, slot: string, file: any, expectedVersion?: number) {
  const body = new FormData();
  body.append('slot', slot);
  body.append('file', file);
  if (expectedVersion != null) body.append('expected_version', String(expectedVersion));
  const response = await superAdminClient.post(`/api/super-admin/schools/${schoolId}/configuration/assets`, body, {
    params: { cluster_id: clusterId },
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return response.data as { asset_id: string; version: number; slot: string };
}

export async function generateSchoolPackage(schoolId: string, clusterId: string, idempotencyKey: string) {
  const response = await superAdminClient.post(`/api/super-admin/schools/${schoolId}/packages`, { note: 'wizard' }, {
    params: { cluster_id: clusterId },
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data as { job_id: string; revision: number; status: string };
}

export async function getSchoolPackageJob(schoolId: string, clusterId: string, jobId: string) {
  const response = await superAdminClient.get(`/api/super-admin/schools/${schoolId}/packages/jobs/${jobId}`, {
    params: { cluster_id: clusterId },
  });
  return response.data as { id: string; revision: number; status: string; attempt_count: number; error?: { message?: string } | null };
}

export async function listSchoolPackages(schoolId: string, clusterId: string) {
  const response = await superAdminClient.get(`/api/super-admin/schools/${schoolId}/packages`, {
    params: { cluster_id: clusterId },
  });
  return response.data as { jobs: any[]; artifacts: Array<{ id: string; revision: number; file_name: string; sha256: string }> };
}

export async function retrySchoolPackage(schoolId: string, clusterId: string, jobId: string) {
  const response = await superAdminClient.post(`/api/super-admin/schools/${schoolId}/packages/jobs/${jobId}/retry`, {}, {
    params: { cluster_id: clusterId },
  });
  return response.data as { job_id: string; revision: number; status: string };
}

export async function diffSchoolRevisions(schoolId: string, clusterId: string, revision: number, against: number) {
  const response = await superAdminClient.get(`/api/super-admin/schools/${schoolId}/configuration/revisions/${revision}/diff`, {
    params: { cluster_id: clusterId, against },
  });
  return response.data as { config: Array<{ field: string; from: unknown; to: unknown }> };
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
