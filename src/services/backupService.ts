import { superAdminClient } from '../api/superAdminClient';

export interface BackupJob {
  id: string;
  backup_id: string;
  backup_type: 'daily' | 'weekly' | 'monthly' | 'manual';
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  storage_path?: string;
  checksum_sha256?: string;
  database_version?: string;
  verification_status: 'unverified' | 'verified' | 'failed';
  verified_at?: string;
  error_message?: string;
  created_at: string;
}

export interface BackupEvent {
  id: string;
  backup_job_id: string;
  event_type: string;
  message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BackupStats {
  lastSuccessfulBackup: (BackupJob & { age_hours: number | null }) | null;
  currentStatus: BackupJob | null;
  nextScheduledBackup: string;
  staleBackup?: {
    isStale: boolean;
    ageHours: number | null;
    thresholdHours: number;
    message: string;
  };
  thirtyDayStats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    successRatePercent: number | null;
    totalStorageBytes: number;
    averageDurationSeconds: number;
    dailyTimeline: Array<{
      date: string;
      status: 'success' | 'failed' | 'none';
      count: number;
    }>;
  };
  recentFailures: BackupJob[];
  settings?: Record<string, any>;
}

export const backupApi = {
  getStats: async (): Promise<BackupStats> => {
    const res = await superAdminClient.get('/api/super-admin/backups/stats');
    return res.data?.data || res.data;
  },

  getBackups: async (params: { page?: number; limit?: number; status?: string; type?: string } = {}): Promise<{
    data: BackupJob[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    const res = await superAdminClient.get('/api/super-admin/backups', { params });
    return res.data?.data || res.data;
  },

  getBackupDetails: async (id: string): Promise<{ job: BackupJob; events: BackupEvent[] }> => {
    const res = await superAdminClient.get(`/api/super-admin/backups/${id}`);
    return res.data?.data || res.data;
  },

  triggerManualBackup: async (): Promise<{ message: string; backupId?: string }> => {
    const res = await superAdminClient.post('/api/super-admin/backups/trigger');
    return res.data?.data || res.data;
  },
};
