export type SprintRole = 'tech' | 'curr' | 'sales' | 'scale';
export type SprintTaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type SprintGateStatus = 'pending' | 'in_progress' | 'passed' | 'blocked';

export interface SprintDay {
  day: number;
  date_label: string;
  title: string;
  handoff: string;
  gate: string;
  gate_status: SprintGateStatus;
  gate_notes?: string | null;
  total_tasks: number;
  done_tasks: number;
  doing_tasks: number;
  blocked_tasks: number;
  todo_tasks: number;
  updated_at?: string;
}

export interface SprintTask {
  id: string;
  role: SprintRole;
  num: number;
  title: string;
  category?: string | null;
  day: number;
  orig_day_label?: string;
  status: SprintTaskStatus;
  assignee_id?: string | null;
  assignee_name?: string | null;
  blocker_reason?: string | null;
  notes?: string | null;
  completed_at?: string | null;
  last_updated_by_name?: string | null;
  last_updated_by_id?: string | null;
  updated_at: string;
}

export interface RoleProgressMetric {
  total: number;
  done: number;
  doing: number;
  blocked: number;
  todo: number;
  percentage: number;
}

export interface SprintMetrics {
  total: number;
  done: number;
  doing: number;
  blocked: number;
  todo: number;
  completionPct: number;
  roles: Record<SprintRole, RoleProgressMetric>;
}

export interface SprintActivityLog {
  id: string;
  task_id?: string | null;
  day?: number | null;
  role?: string | null;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  details?: string | null;
  user_name?: string | null;
  user_id?: string | null;
  created_at: string;
}

export interface SprintMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SprintRoleDefinition {
  name: string;
  subtitle: string;
  category: string;
}

export interface SprintDefinition {
  version: string;
  name: string;
  duration_days: number;
  total_deliverables: number;
  operating_rule: string;
  roles: Record<SprintRole, SprintRoleDefinition>;
}

export interface SprintStateResponse {
  definition: SprintDefinition;
  days: SprintDay[];
  tasks: SprintTask[];
  metrics: SprintMetrics;
  recent_activity: SprintActivityLog[];
  members: SprintMember[];
}

export interface UpdateTaskPayload {
  status?: SprintTaskStatus;
  assignee_id?: string | null;
  assignee_name?: string | null;
  blocker_reason?: string | null;
  notes?: string | null;
}
