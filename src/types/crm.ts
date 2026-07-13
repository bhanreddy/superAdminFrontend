export type CrmLifecycle = 'LEAD' | 'QUALIFIED' | 'ONBOARDING' | 'ACTIVE' | 'AT_RISK' | 'CHURNED';
export type CrmTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type CrmPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CrmOverview {
  pipeline: Array<{ status: string; count: number; value: number | string }>;
  accounts: Array<{ lifecycle_stage: CrmLifecycle; count: number }>;
  tasks: { open: number; overdue: number; due_today: number };
  unassigned: number;
}

export interface CrmAccount {
  id: string;
  name: string;
  account_type: string;
  vertical: string;
  lifecycle_stage: CrmLifecycle;
  owner_founder_id: string | null;
  owner_name?: string | null;
  email: string | null;
  phone: string | null;
  health_score: number | null;
  contact_count?: number;
  open_task_count?: number;
  updated_at: string;
}

export interface CrmTask {
  id: string;
  title: string;
  task_type: string;
  status: CrmTaskStatus;
  priority: CrmPriority;
  owner_name?: string | null;
  account_name?: string | null;
  enquiry_name?: string | null;
  due_at: string | null;
}
