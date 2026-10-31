/** Functional colour families. Status colours remain independent of screen colour. */
export const workspaceModules = {
  overview: {
    label: 'Overview',
    light: '#2455C6',
    dark: '#A8C2FF',
    fill: '#2455C6',
    tint: '#EDF2FA',
    night: '#21314B',
  },
  schools: {
    label: 'Schools & operations',
    light: '#2455C6',
    dark: '#A8C2FF',
    fill: '#2455C6',
    tint: '#EDF2FC',
    night: '#21314B',
  },
  finance: {
    label: 'Finance',
    light: '#187154',
    dark: '#8AD9B5',
    fill: '#187154',
    tint: '#EAF5EE',
    night: '#183B32',
  },
  connect: {
    label: 'Collaboration',
    light: '#5A4C97',
    dark: '#C2B6EB',
    fill: '#5A4C97',
    tint: '#F1EEF8',
    night: '#302A45',
  },
  sales: {
    label: 'Sales & growth',
    light: '#8A5E16',
    dark: '#EBCD89',
    fill: '#8A5E16',
    tint: '#FFF5DC',
    night: '#3C3223',
  },
  team: {
    label: 'People & teams',
    light: '#5C568F',
    dark: '#C5BDEB',
    fill: '#5C568F',
    tint: '#F1EFF8',
    night: '#302B45',
  },
  content: {
    label: 'Content studio',
    light: '#5A4C97',
    dark: '#C2B6EB',
    fill: '#5A4C97',
    tint: '#F1EEF8',
    night: '#302A45',
  },
  support: {
    label: 'Service & support',
    light: '#226D80',
    dark: '#9FD5E1',
    fill: '#226D80',
    tint: '#EDF6F8',
    night: '#213B43',
  },
  system: {
    label: 'Administration',
    light: '#52617A',
    dark: '#BAC9E3',
    fill: '#52617A',
    tint: '#EFF2F7',
    night: '#273248',
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
  routes: string[]
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
        normalizeWorkspacePath(b).length - normalizeWorkspacePath(a).length
    )[0];
}
