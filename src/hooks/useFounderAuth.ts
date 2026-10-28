import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { FounderRole } from '../types/founder';

export function useFounderAuth() {
  const { founder, session, refreshSessionProfile, isSuperAdmin } = useAuth();

  return useMemo(() => {
    const role = (founder?.role ?? null) as FounderRole | null;
    const isApprover = role === 'APPROVER';
    const isFounderOnly = role === 'FOUNDER';
    const canApproveReject =
      isApprover || isSuperAdmin;

    return {
      founder,
      session,
      role,
      isApprover,
      isFounderOnly,
      /** Approval authority matches the API; super admins may have no founder FK. */
      canApproveReject,
      refreshProfile: refreshSessionProfile,
      /** Matches dashboard: super admins use the console without a `founders` row. */
      hasFounderAccess: Boolean(founder || isSuperAdmin),
    };
  }, [founder, session, refreshSessionProfile, isSuperAdmin]);
}
