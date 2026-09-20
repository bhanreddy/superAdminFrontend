import { SuperAdmin } from './superAdmin';
import { FounderRow } from './founder';
import { Role } from '../constants/rbac';

export interface InternalUser {
  id: string;
  employee_id: string;
  employeeId?: string;
  full_name: string;
  fullName?: string;
  email: string;
  phone?: string | null;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';
  manager_id?: string | null;
  territory?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: User | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  currentAdmin: SuperAdmin | null;
  founder: FounderRow | null;
  internalUser: InternalUser | null;
  role: Role | null;
  employeeId: string | null;
  permissions: string[];
  assignedSchools: number[];
  status: string | null;
}
