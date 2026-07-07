export interface School {
  id: number;
  name: string;
  code: string;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  cluster_id?: string;
  backend_url?: string;
  android_package?: string;
  ios_bundle_id?: string;
  primary_color?: string;
  onboarding_status?: 'pending_build' | 'apk_delivered' | 'live' | 'suspended';
  onboarding_completed_at?: string;
  minimum_app_version?: string;
  force_update_enabled?: boolean;
  payment_banner_enabled?: boolean;
  payment_banner_reason?: string | null;
}

export interface SchoolAppConfigPatch {
  minimum_app_version?: string;
  force_update_enabled?: boolean;
  payment_banner_enabled?: boolean;
  payment_banner_reason?: string | null;
}

export interface CreateSchoolPayload {
  name: string;
  code: string;
  address?: string;
  logo_url?: string;
  android_package?: string;
  ios_bundle_id?: string;
  primary_color?: string;
}

export interface SchoolHealth {
  school_id: number;
  student_count: number;
  staff_count: number;
  active_users: number;
  last_activity: string | null;
}

export interface FirstAdminPayload {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  gender_id?: number;
  dob?: string;
}
