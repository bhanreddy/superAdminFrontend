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
  enquiry_id?: string | null;
  owner_founder_id?: string | null;
}

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DEMO' | 'PROPOSAL' | 'NEGOTIATION';
export type LeadOutcome = 'OPEN' | 'WON' | 'LOST' | 'DISQUALIFIED' | 'LEGACY_UNKNOWN';

export interface LeadSummary {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  organization?: string | null;
  status: string;
  outcome: LeadOutcome;
  pipeline_stage_code: LeadStage | string;
  assigned_to: string | null;
  owner_name?: string | null;
  row_version: number;
  value_amount?: string | number | null;
  currency?: string | null;
  next_action_task_id?: string | null;
  next_action_title?: string | null;
  next_action_due_at?: string | null;
  next_action_assignee_name?: string | null;
  territory_code?: string | null;
  channel_code?: string | null;
  website_source?: string | null;
  account_id?: string | null;
  updated_at: string;
}

export interface LeadPage {
  data: LeadSummary[];
  page: { limit: number; next_cursor: string | null };
}

export interface OnboardingOperation {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  enquiry_id: string;
  account_id: string | null;
  cluster_id: string | null;
  target_school_id: string | null;
  correlation_key: string;
  failure_reason: string | null;
  attempt_count: number;
  steps: Array<{ name: string; ok?: boolean; error?: string; at?: string }>;
}

export type ProspectClassification = 'NEW' | 'EXACT_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'CONFLICT' | 'INVALID';
export type CustomerMatchStatus = 'CONFIRMED_CUSTOMER' | 'POSSIBLE_CUSTOMER' | 'NO_MATCH' | 'CHECK_INCOMPLETE';
export type ImportAction = 'SKIP' | 'MERGE' | 'UPDATE' | 'ADD_CONTACT' | 'IMPORT_NEW' | 'ALREADY_CUSTOMER';

export interface SchoolProspect {
  id: string;
  name: string;
  account_type: string;
  lifecycle_stage: CrmLifecycle;
  owner_founder_id: string | null;
  owner_name?: string | null;
  phone: string | null;
  email: string | null;
  row_version: number;
  udise_code?: string | null;
  state_normalized?: string | null;
  city_normalized?: string | null;
  has_contact?: boolean;
  has_decision_maker?: boolean;
  sales_stage?: string | null;
  sales_outcome?: string | null;
  updated_at: string;
}

export interface ProspectPage {
  data: SchoolProspect[];
  page: { limit: number; next_cursor: string | null };
}

export interface ImportBatch {
  id: string;
  status: string;
  original_filename?: string;
  counts?: Record<string, number>;
  coverage?: { complete?: boolean; clusters?: Array<{ cluster_id: string; status: string; fresh?: boolean }> };
  preview_revision?: number;
  preview_hash?: string | null;
  row_version?: number;
  structure?: { sheets?: Array<{ headers?: string[] }> };
  created_at?: string;
  updated_at?: string;
}

export interface ImportRow {
  id: string;
  row_number: number;
  classification: ProspectClassification | null;
  customer_status: CustomerMatchStatus | null;
  school_group_id: string | null;
  selected_action: ImportAction | null;
  candidates: Array<{ rule: string; code?: string }>;
  errors: Array<{ code: string; field?: string }>;
  normalized?: {
    school_name?: string | null;
    udise_code?: string | null;
    permitted_actions?: ImportAction[];
    contacts?: Array<{ display_name?: string | null; role_code?: string | null }>;
  } | null;
  result_status?: string | null;
}

export type SalesPeriod = 'today' | 'week' | 'month' | 'custom';

export interface SalesMetric {
  value: number | null;
  unit: string;
  basis: string;
  numerator?: number | null;
  denominator?: number | null;
  excluded_count?: number;
  comparison_value?: number | null;
  change_ratio?: number | null;
  comparison_note?: string | null;
  drilldown?: { metric: string; filters?: Record<string, unknown> } | null;
}

export interface SalesCommandSummary {
  meta: {
    schema_version: number;
    rule_version: number;
    evaluated_at: string;
    timezone: string;
    period: { from: string; to: string; label?: string };
    comparison?: { from: string; to: string };
    scope: { kind: string; founder_id?: string | null };
    coverage?: { capture_started_at?: string | null; unknown_counts?: Record<string, number>; warnings?: string[] };
    permissions?: { view_company?: boolean; write_sales?: boolean; reassign?: boolean; view_performance?: boolean };
  };
  metrics: Record<string, SalesMetric>;
  current_stage: Record<string, SalesMetric>;
  cohort?: { denominator?: number; numerator?: number; excluded_spam?: number; still_open?: number; median_age_seconds?: number | null; label?: string };
  attention_preview: Array<{
    entity_type: string;
    entity_key: string;
    id: string;
    name?: string | null;
    organization?: string | null;
    severity: number;
    reasons: Array<{ code: string; severity: number; suggested_action?: string }>;
  }>;
  scope_label: string;
  attribution?: {
    schema_version: number;
    model: string;
    campaign_leads: number;
    demo_requests: number;
    booked_demos: number;
    completed_demos: number;
    wins: number;
    losses: number;
    raw_opens: number;
    qualified_opens: number;
    external_conversion_coverage: string;
    note?: string;
  };
  open_pipeline_value?: unknown;
  booked_sales?: unknown;
}

export interface SalesOpportunityPage {
  rows: Array<{ id: string; name?: string | null; organization?: string | null; pipeline_stage_code?: string; outcome?: string; entity_type?: string; enquiry_id?: string }>;
  page: { limit: number; next_cursor: string | null; total: number; evaluated_at?: string; unit?: string };
  updated_since_dashboard_refresh?: boolean;
  meta?: SalesCommandSummary['meta'];
}
