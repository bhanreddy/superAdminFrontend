import { SuperAdmin } from './superAdmin';
import { FounderRow } from './founder';

// Minimal local types replacing @supabase/supabase-js Session & User
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
}
