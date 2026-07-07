export interface SuperAdmin {
  id: string; // UUID
  email: string;
  full_name: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  last_login: string | null;
  /** True when this row comes from `founders` (console access without a `super_admins` row). */
  is_founder?: boolean;
}

export interface CreateSuperAdminPayload {
  email: string;
  password: string;
  full_name: string;
}
