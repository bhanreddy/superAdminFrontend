/** Functional colour families. Status colours remain independent of screen colour. */
export const workspaceModules = {
  overview: {
    label: 'Overview',
    light: '#3155C6',
    dark: '#A8BAFF',
    fill: '#3155C6',
    tint: '#EEF2FF',
    night: '#1B2848',
  },
  schools: {
    label: 'Schools & operations',
    light: '#087579',
    dark: '#75DAD6',
    fill: '#086D71',
    tint: '#E8F6F4',
    night: '#133337',
  },
  finance: {
    label: 'Finance',
    light: '#15704D',
    dark: '#7DDCB1',
    fill: '#126546',
    tint: '#EAF6EF',
    night: '#16372E',
  },
  connect: {
    label: 'Collaboration',
    light: '#7040BB',
    dark: '#CAB0FF',
    fill: '#7040BB',
    tint: '#F3EEFC',
    night: '#302345',
  },
  sales: {
    label: 'Sales & growth',
    light: '#9B5215',
    dark: '#F4C184',
    fill: '#945016',
    tint: '#FCF2E6',
    night: '#392C20',
  },
  team: {
    label: 'People & teams',
    light: '#AC365E',
    dark: '#F2ABC5',
    fill: '#AC365E',
    tint: '#FBEFF4',
    night: '#3C2639',
  },
  content: {
    label: 'Content studio',
    light: '#6544B7',
    dark: '#C4B2F9',
    fill: '#6544B7',
    tint: '#F2EEFC',
    night: '#2B2744',
  },
  support: {
    label: 'Service & support',
    light: '#24679E',
    dark: '#95CBF7',
    fill: '#24679E',
    tint: '#EDF5FC',
    night: '#1B3045',
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
