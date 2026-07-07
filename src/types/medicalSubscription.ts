export interface SubscriptionPlanRow {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_annual: number;
  features?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  is_active: boolean;
}

export interface ClinicSubscriptionRow {
  id: string;
  clinic_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  payment_merchant_order_id?: string | null;
  payment_provider_order_id?: string | null;
}

export interface ClinicSummary {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  is_active?: boolean;
  email?: string;
  phone?: string;
}

export interface SubscriptionInvoiceRow {
  id: string;
  amount: number;
  status: string;
  paid_at?: string | null;
  created_at?: string;
  razorpay_invoice_id?: string | null;
  razorpay_payment_id?: string | null;
}

export interface MedicalShopSubscriptionResponse {
  linked: boolean;
  shop_user_id?: string;
  message?: string;
  clinic_id?: string;
  clinic?: ClinicSummary | null;
  subscription?: ClinicSubscriptionRow | null;
  plans?: SubscriptionPlanRow[];
  invoices?: SubscriptionInvoiceRow[];
}
