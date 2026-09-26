export type FounderRole = 'FOUNDER' | 'APPROVER';

export interface FounderRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: FounderRole;
  is_active: boolean;
  created_at?: string;
}

export type ExpenseCategory =
  | 'MARKETING'
  | 'HOSTING'
  | 'TOOLS'
  | 'TRAVEL'
  | 'SALARY'
  | 'MISC';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExpenseRow {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  receipt_url: string | null;
  created_by_founder_id: string | null;
  approved_by_founder_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at?: string;
}

export type CollectionPaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER';

export type CollectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CollectionRow {
  id: string;
  business_unit_id: string;
  amount: number;
  month: number;
  year: number;
  payment_mode: CollectionPaymentMode;
  status: CollectionStatus;
  notes: string | null;
  created_by_founder_id: string | null;
  approved_by_founder_id: string | null;
  rejection_reason?: string | null;
  created_at: string;
  business_unit_name?: string | null;
  business_unit_code?: string | null;
  business_units?: { name: string; code?: string | null } | null;
}

export type EnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'CLOSED'
  | 'REJECTED';

export interface EnquiryRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: EnquiryStatus;
  source: string | null;
  category: string | null;
  assigned_to: string | null;
  deal_value: number | null;
  notes: string | null;
  account_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BusinessUnitRow {
  id: string;
  name: string;
  /** Required for new units (legacy rows may be null). */
  code: string | null;
  /** Price for the subscription plan (e.g. INR); used with monthly collections for gain vs cost. */
  subscription_price?: number | string | null;
  /** FREE | STARTER | PRO | ENTERPRISE — drives plan tier for monthly gain/loss context. */
  subscription_plan?: string | null;
  /** Contact for calls when subscription / payment needs follow-up */
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface NotificationRow {
  id: string;
  user_id: string | null;
  founder_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  entity_type: string;
  action: string;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SettingsRow {
  key: string;
  value: unknown;
}
