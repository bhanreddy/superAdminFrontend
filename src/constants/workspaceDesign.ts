import { brandColors as b } from './experienceColors';

/** Functional colour families. Status colours remain independent of screen colour. */
export const workspaceModules = {
  overview: {
    label: 'Overview',
    light: b.red,
    dark: b.redBright,
    fill: b.red,
    tint: b.redSoft,
    night: b.redNight,
  },
  schools: {
    label: 'Schools & operations',
    light: b.blue,
    dark: b.blueBright,
    fill: b.blue,
    tint: b.blueSoft,
    night: '#192B46',
  },
  finance: {
    label: 'Finance',
    light: b.amber,
    dark: b.amberBright,
    fill: b.amber,
    tint: b.honeySoft,
    night: '#3C3327',
  },
  connect: {
    label: 'Collaboration',
    light: b.red,
    dark: b.redBright,
    fill: b.red,
    tint: b.redSoft,
    night: b.redNight,
  },
  sales: {
    label: 'Sales & growth',
    light: b.amber,
    dark: b.amberBright,
    fill: b.amber,
    tint: b.honeySoft,
    night: '#3C3327',
  },
  team: {
    label: 'People & teams',
    light: b.rose,
    dark: b.redBright,
    fill: b.rose,
    tint: b.roseSoft,
    night: b.redNight,
  },
  content: {
    label: 'Content studio',
    light: b.violet,
    dark: b.violetBright,
    fill: b.violet,
    tint: b.violetSoft,
    night: '#352D42',
  },
  support: {
    label: 'Service & support',
    light: b.blue,
    dark: b.blueBright,
    fill: b.blue,
    tint: b.blueSoft,
    night: '#29394B',
  },
  system: {
    label: 'Administration',
    light: b.ink,
    dark: b.blueBright,
    fill: b.ink,
    tint: b.blueSoft,
    night: '#29394B',
  },
} as const;

export type WorkspaceModule = keyof typeof workspaceModules;

export function normalizeWorkspacePath(path: string): string {
  return (
    '/' +
    path
      .split(/[?#]/)[0]
      .split('/')
      .filter((part) => part && part !== '(app)' && part !== 'index')
      .join('/')
  );
}

export function getWorkspaceModule(path: string): WorkspaceModule {
  const parts = normalizeWorkspacePath(path).split('/').filter(Boolean);
  const section = parts[0] === 'console' ? parts[1] : parts[0];
  if (['connect', 'messenger'].includes(section)) return 'connect';
  if (
    [
      'books',
      'billing',
      'collections',
      'collection-approvals',
      'expenses',
      'expense-approvals',
      'payroll',
      'units',
    ].includes(section)
  )
    return 'finance';
  if (['users', 'admins'].includes(section)) return 'team';
  if (
    [
      'sales',
      'field',
      'crm',
      'lead',
      'sales-command',
      'school-prospects',
      'tracking-links',
      'enquiries',
      'field-feedback',
      'sprint',
    ].includes(section)
  )
    return 'sales';
  if (
    [
      'schools',
      'students',
      'checklist',
      'school-intake',
      'school-import',
      'import-history',
      'tenant-assignments',
    ].includes(section)
  )
    return 'schools';
  if (['complaints', 'requirements'].includes(section)) return 'support';
  if (
    [
      'manage-content',
      'content-programs',
      'festival-posters',
      'media-qr',
      'dcgd',
      'dcgdContent',
    ].includes(section)
  )
    return 'content';
  if (
    [
      'settings',
      'clusters',
      'backups',
      'audit-logs',
      'notifications',
      'microservices',
      'medical',
    ].includes(section)
  )
    return 'system';
  return 'overview';
}

/** Prefer the deepest visible navigation item; root must never match every page. */
export function activeWorkspaceRoute(
  path: string,
  routes: string[],
): string | undefined {
  const current = normalizeWorkspacePath(path);
  return routes
    .filter((route) => {
      const candidate = normalizeWorkspacePath(route);
      return (
        current === candidate ||
        (candidate !== '/' && current.startsWith(candidate + '/'))
      );
    })
    .sort(
      (a, b) =>
        normalizeWorkspacePath(b).length - normalizeWorkspacePath(a).length,
    )[0];
}
