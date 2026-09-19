import { superAdminClient } from '../api/superAdminClient';
import type {
  SprintStateResponse,
  SprintTask,
  SprintDay,
  UpdateTaskPayload,
  SprintGateStatus,
} from '../types/sprint';

export const sprintService = {
  /** Fetch the entire live sprint state including days, 100 tasks, metrics, and activity log. */
  async fetchSprintState(): Promise<SprintStateResponse> {
    const res = await superAdminClient.get('/api/super-admin/sprint/state');
    return res.data;
  },

  /** Update task status, assignee, blocker note, or remarks in DB. */
  async updateSprintTask(id: string, payload: UpdateTaskPayload): Promise<{ success: boolean; task: SprintTask }> {
    const res = await superAdminClient.patch(`/api/super-admin/sprint/tasks/${id}`, payload);
    return res.data;
  },

  /** Update exit gate status and gate notes for a given sprint day. */
  async updateSprintDayGate(
    day: number,
    gate_status: SprintGateStatus,
    gate_notes?: string | null
  ): Promise<{ success: boolean; day: SprintDay }> {
    const res = await superAdminClient.patch(`/api/super-admin/sprint/days/${day}/gate`, {
      gate_status,
      gate_notes,
    });
    return res.data;
  },

  /** Generate formatted Standup Report markdown for Slack/WhatsApp/Teams for the specified day. */
  async getStandupReport(day: number): Promise<{ report: string; day: SprintDay }> {
    const res = await superAdminClient.get(`/api/super-admin/sprint/standup/${day}`);
    return res.data;
  },

  /** Reset all 100 tasks back to 'todo' (SuperAdmin action). */
  async resetSprintTasks(): Promise<{ success: boolean; message: string }> {
    const res = await superAdminClient.post('/api/super-admin/sprint/reset');
    return res.data;
  },
};
