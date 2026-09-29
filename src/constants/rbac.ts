export type Role =
  | 'FOUNDER'
  | 'SUPER_ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_EXECUTIVE'
  | 'IMPLEMENTATION_MANAGER'
  | 'IMPLEMENTATION_EXECUTIVE'
  | 'SUPPORT_MANAGER'
  | 'SUPPORT_EXECUTIVE'
  | 'OPERATIONS_MANAGER'
  | 'ACCOUNTS_MANAGER'
  | 'TECHNICAL_SUPPORT'
  | 'QA'
  | 'DEPLOYMENT_MANAGER'
  | 'VIEW_ONLY_ADMIN';

export const ROLES: Record<string, Role> = {
  FOUNDER: 'FOUNDER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_EXECUTIVE: 'SALES_EXECUTIVE',
  IMPLEMENTATION_MANAGER: 'IMPLEMENTATION_MANAGER',
  IMPLEMENTATION_EXECUTIVE: 'IMPLEMENTATION_EXECUTIVE',
  SUPPORT_MANAGER: 'SUPPORT_MANAGER',
  SUPPORT_EXECUTIVE: 'SUPPORT_EXECUTIVE',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  ACCOUNTS_MANAGER: 'ACCOUNTS_MANAGER',
  TECHNICAL_SUPPORT: 'TECHNICAL_SUPPORT',
  QA: 'QA',
  DEPLOYMENT_MANAGER: 'DEPLOYMENT_MANAGER',
  VIEW_ONLY_ADMIN: 'VIEW_ONLY_ADMIN',
};

export const ROLE_LABELS: Record<Role, string> = {
  FOUNDER: 'Founder / Super Admin',
  SUPER_ADMIN: 'Super Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  IMPLEMENTATION_MANAGER: 'Implementation Manager',
  IMPLEMENTATION_EXECUTIVE: 'Implementation Executive',
  SUPPORT_MANAGER: 'Support Manager',
  SUPPORT_EXECUTIVE: 'Support Executive',
  OPERATIONS_MANAGER: 'Operations Manager',
  ACCOUNTS_MANAGER: 'Accounts Manager',
  TECHNICAL_SUPPORT: 'Technical Support',
  QA: 'QA Engineer',
  DEPLOYMENT_MANAGER: 'Deployment Manager',
  VIEW_ONLY_ADMIN: 'View-Only Admin',
};

export const ROLE_BADGE_COLORS: Record<Role, { bg: string; text: string; border: string }> = {
  FOUNDER: { bg: 'rgba(255, 45, 85, 0.15)', text: '#FF2D55', border: 'rgba(255, 45, 85, 0.3)' },
  SUPER_ADMIN: { bg: 'rgba(175, 82, 222, 0.15)', text: '#AF52DE', border: 'rgba(175, 82, 222, 0.3)' },
  SALES_MANAGER: { bg: 'rgba(10, 132, 255, 0.15)', text: '#0A84FF', border: 'rgba(10, 132, 255, 0.3)' },
  SALES_EXECUTIVE: { bg: 'rgba(100, 210, 255, 0.15)', text: '#64D2FF', border: 'rgba(100, 210, 255, 0.3)' },
  IMPLEMENTATION_MANAGER: { bg: 'rgba(48, 209, 88, 0.15)', text: '#30D158', border: 'rgba(48, 209, 88, 0.3)' },
  IMPLEMENTATION_EXECUTIVE: { bg: 'rgba(52, 199, 89, 0.15)', text: '#34C759', border: 'rgba(52, 199, 89, 0.3)' },
  SUPPORT_MANAGER: { bg: 'rgba(255, 159, 10, 0.15)', text: '#FF9F0A', border: 'rgba(255, 159, 10, 0.3)' },
  SUPPORT_EXECUTIVE: { bg: 'rgba(255, 214, 10, 0.15)', text: '#FFD60A', border: 'rgba(255, 214, 10, 0.3)' },
  OPERATIONS_MANAGER: { bg: 'rgba(94, 92, 230, 0.15)', text: '#5E5CE6', border: 'rgba(94, 92, 230, 0.3)' },
  ACCOUNTS_MANAGER: { bg: 'rgba(102, 212, 207, 0.15)', text: '#66D4CF', border: 'rgba(102, 212, 207, 0.3)' },
  TECHNICAL_SUPPORT: { bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', border: 'rgba(255, 149, 0, 0.3)' },
  QA: { bg: 'rgba(191, 90, 242, 0.15)', text: '#BF5AF2', border: 'rgba(191, 90, 242, 0.3)' },
  DEPLOYMENT_MANAGER: { bg: 'rgba(255, 69, 58, 0.15)', text: '#FF453A', border: 'rgba(255, 69, 58, 0.3)' },
  VIEW_ONLY_ADMIN: { bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', border: 'rgba(142, 142, 147, 0.3)' },
};

/** Permission names are shared with the backend RBAC catalogue. */
export const PERMISSIONS = {
  SCHOOLS_READ_ALL: 'schools.read.all',
  SCHOOLS_READ_ASSIGNED: 'schools.read.assigned',
  SCHOOLS_CREATE: 'schools.create',
  SCHOOLS_UPDATE_ASSIGNED: 'schools.update.assigned',
  SCHOOLS_UPDATE_ALL: 'schools.update.all',
  SCHOOLS_ASSIGN: 'schools.assign',
  SCHOOLS_DELETE: 'schools.delete',
  STUDENTS_READ_ASSIGNED: 'students.read.assigned',
  STUDENTS_IMPORT: 'students.import',
  STAFF_IMPORT: 'staff.import',
  TRANSPORT_IMPORT: 'transport.import',
  REQUIREMENTS_READ: 'requirements.read',
  REQUIREMENTS_CREATE: 'requirements.create',
  REQUIREMENTS_MANAGE: 'requirements.manage',
  COMPLAINTS_READ: 'complaints.read',
  COMPLAINTS_CREATE: 'complaints.create',
  COMPLAINTS_UPDATE_ASSIGNED: 'complaints.update.assigned',
  COMPLAINTS_MANAGE: 'complaints.manage',
  CHECKLIST_READ: 'checklist.read',
  CHECKLIST_UPDATE: 'checklist.update',
  CHECKLIST_DELEGATE: 'checklist.delegate',
  CONFIGS_READ: 'configs.read',
  CONFIGS_MODIFY: 'configs.modify',
  CONFIGS_APPROVE: 'configs.approve',
  BUILDS_READ: 'builds.read',
  BUILDS_TRIGGER: 'builds.trigger',
  BUILDS_APPROVE: 'builds.approve',
  DEPLOYMENTS_APPROVE: 'deployments.approve',
  USERS_CREATE: 'users.create',
  USERS_MANAGE: 'users.manage',
  USERS_READ_TEAM: 'users.read.team',
  AUDIT_READ: 'audit.read',
  ANALYTICS_READ: 'analytics.read',
} as const;

export function isFounderOrSuperAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  const norm = role.trim().toUpperCase();
  return norm === 'FOUNDER' || norm === 'SUPER_ADMIN';
}

export function isSalesRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const norm = role.trim().toUpperCase();
  return norm === 'SALES_MANAGER' || norm === 'SALES_EXECUTIVE';
}

export function isImplementationRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const norm = role.trim().toUpperCase();
  return norm === 'IMPLEMENTATION_MANAGER' || norm === 'IMPLEMENTATION_EXECUTIVE';
}

export function isSupportRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const norm = role.trim().toUpperCase();
  return norm === 'SUPPORT_MANAGER' || norm === 'SUPPORT_EXECUTIVE';
}

export function canManageRole(managerRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  if (!managerRole || !targetRole) return false;
  const m = managerRole.trim().toUpperCase();
  const t = targetRole.trim().toUpperCase();
  if (m === 'FOUNDER' || m === 'SUPER_ADMIN') {
    return t !== 'FOUNDER' && t !== 'SUPER_ADMIN';
  }
  if (m === 'SALES_MANAGER') return t === 'SALES_EXECUTIVE';
  if (m === 'IMPLEMENTATION_MANAGER') return t === 'IMPLEMENTATION_EXECUTIVE';
  if (m === 'SUPPORT_MANAGER') return t === 'SUPPORT_EXECUTIVE' || t === 'TECHNICAL_SUPPORT';
  if (m === 'OPERATIONS_MANAGER') return t === 'ACCOUNTS_MANAGER' || t === 'VIEW_ONLY_ADMIN';
  if (m === 'DEPLOYMENT_MANAGER') return t === 'QA';
  return false;
}
