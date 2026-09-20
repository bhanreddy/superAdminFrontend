import { superAdminClient } from '../api/superAdminClient';

export type ChecklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'NOT_APPLICABLE';
export interface ChecklistItem {
  id: string;
  school_id: number;
  category: string;
  task_code: string;
  title: string;
  description?: string;
  status: ChecklistStatus;
  blocker_reason?: string | null;
  notes?: string | null;
  sort_order: number;
}
export interface ChecklistData {
  schoolId: number;
  items: ChecklistItem[];
  progress: { total: number; completed: number; percentage: number };
}
export interface ChecklistUpdate {
  status: ChecklistStatus;
  blocker_reason?: string;
  /** Omit to preserve existing notes; send an empty string to clear them. */
  notes?: string;
}
interface ChecklistResponse<T> { success: true; data: T }

// Canonical mount: backend src/routes/index.js -> /checklist.
// Contract tests exercise these calls through the actual mounted Express router.
const schoolPath = (schoolId: number) => `/api/super-admin/checklist/${schoolId}`;
export const checklistApi = {
  getSchoolChecklist: async (schoolId: number): Promise<ChecklistResponse<ChecklistData>> => {
    const response = await superAdminClient.get(schoolPath(schoolId));
    return response.data;
  },
  initSchoolChecklist: async (schoolId: number): Promise<ChecklistResponse<ChecklistData>> => {
    const response = await superAdminClient.post(`${schoolPath(schoolId)}/init`);
    return response.data;
  },
  updateChecklistItem: async (schoolId: number, itemId: string, payload: ChecklistUpdate): Promise<ChecklistResponse<ChecklistItem>> => {
    const response = await superAdminClient.patch(`${schoolPath(schoolId)}/items/${encodeURIComponent(itemId)}`, payload);
    return response.data;
  },
};
