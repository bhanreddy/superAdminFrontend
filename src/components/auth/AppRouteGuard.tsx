import React from 'react';
import { usePathname } from 'expo-router';
import { SALES_ROLES } from '../../content/salesPlaybook';
import type { Role } from '../../constants/rbac';
import { PERMISSIONS } from '../../constants/rbac';
import { RouteGuard } from './RouteGuard';

type RoutePolicy =
  | { pattern: RegExp; allowedRoles: Role[] }
  | { pattern: RegExp; founderOnly: true }
  | { pattern: RegExp; permission: string }
  | { pattern: RegExp; anyPermissions: string[] }
  | { pattern: RegExp; publicForAuthenticated: true };

/**
 * Central route policy for the single SuperAdmin application. Unknown routes
 * fail closed to Founder access until a policy is explicitly added.
 */
const ROUTE_POLICIES: RoutePolicy[] = [
  { pattern: /^\/field(?:\/.*)?$/, allowedRoles: [...SALES_ROLES] },
  { pattern: /^\/sales\/(?:playbook|training)\/?$/, allowedRoles: [...SALES_ROLES] },
  { pattern: /^\/$/, publicForAuthenticated: true },
  { pattern: /^\/schools\/add\/?$/, permission: PERMISSIONS.SCHOOLS_CREATE },
  { pattern: /^\/schools\/[^/]+\/features\/?$/, permission: PERMISSIONS.CONFIGS_MODIFY },
  { pattern: /^\/schools\/[^/]+\/app-config\/?$/, permission: PERMISSIONS.CONFIGS_MODIFY },
  { pattern: /^\/schools\/[^/]+\/build-config\/?$/, permission: PERMISSIONS.BUILDS_READ },
  { pattern: /^\/schools\/[^/]+\/setup-guide\/?$/, permission: PERMISSIONS.CONFIGS_READ },
  {
    pattern: /^\/schools(?:\/.*)?$/,
    anyPermissions: [PERMISSIONS.SCHOOLS_READ_ALL, PERMISSIONS.SCHOOLS_READ_ASSIGNED],
  },
  { pattern: /^\/students\/import\/?$/, permission: PERMISSIONS.STUDENTS_IMPORT },
  { pattern: /^\/students(?:\/.*)?$/, permission: PERMISSIONS.STUDENTS_READ_ASSIGNED },
  {
    pattern: /^\/users(?:\/.*)?$/,
    anyPermissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_READ_TEAM],
  },
  { pattern: /^\/requirements(?:\/.*)?$/, permission: PERMISSIONS.REQUIREMENTS_READ },
  { pattern: /^\/complaints(?:\/.*)?$/, permission: PERMISSIONS.COMPLAINTS_READ },
  { pattern: /^\/checklist(?:\/.*)?$/, permission: PERMISSIONS.CHECKLIST_READ },
  {
    pattern: /^\/(?:console|admins|clusters|manage-content|medical|microservices|messenger)(?:\/.*)?$/,
    founderOnly: true,
  },
];

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const policy = ROUTE_POLICIES.find((candidate) => candidate.pattern.test(pathname));

  if (!policy || 'founderOnly' in policy) {
    return <RouteGuard founderOnly>{children}</RouteGuard>;
  }
  if ('allowedRoles' in policy) {
    return <RouteGuard allowedRoles={policy.allowedRoles}>{children}</RouteGuard>;
  }
  if ('permission' in policy) {
    return <RouteGuard requiredPermission={policy.permission}>{children}</RouteGuard>;
  }
  if ('anyPermissions' in policy) {
    return <RouteGuard anyPermissions={policy.anyPermissions}>{children}</RouteGuard>;
  }
  return <>{children}</>;
}

