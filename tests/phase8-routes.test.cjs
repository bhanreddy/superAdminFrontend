const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { uiLoader, frontend, textOf } = require('./helpers.cjs');
const { inventory } = require('../scripts/qa-routes.cjs');
const { ROLES, getRolePermissions } = require('../../SuperAdminBackend/src/config/rbac');
test('every static app/auth destination resolves to an existing route', () => {
  const result = inventory();
  assert.ok(result.routes.length >= 73);
  assert.deepEqual(result.references.filter(r => !r.resolves), []);
});
test('every discovered protected route renders its guard for every role; unknown paths fail closed', () => {
  let pathname = '/', role = 'FOUNDER';
  const load = uiLoader({
    'expo-router': { usePathname: () => pathname, useRouter: () => ({ replace() {} }) },
    [path.join(frontend, 'src/hooks/useAuth.ts')]: { useAuth: () => ({ role, roleLabel: role, isFounder: role === 'FOUNDER' || role === 'SUPER_ADMIN', permissions: getRolePermissions(role), can: p => getRolePermissions(role).includes(p) }) },
    [path.join(frontend, 'src/components/auth/RouteGuard.tsx')]: null,
  });
  const { AppRouteGuard } = load(path.join(frontend, 'src/components/auth/AppRouteGuard.tsx'));
  const routes = inventory().routes.filter(r => r.source.includes('(app)')).map(r => r.route.replace(/\[[^\]]+\]/g, '101'));
  for (role of Object.values(ROLES)) {
    for (pathname of routes) {
      let screen;
      act(() => { screen = create(React.createElement(AppRouteGuard, null, React.createElement('Text', null, 'AUTHORIZED_CONTENT'))); });
      const content = textOf(screen.root);
      assert.ok(content.includes('AUTHORIZED_CONTENT') || content.includes('Access Restricted'), `${role} ${pathname}`);
      if ((role === 'CA' || role === 'CA_LEAD') && !/^\/books(?:\/|$)|^\/connect$|^\/$/.test(pathname)) assert.match(content, /Access Restricted/, `${role} ${pathname}`);
      if (role === 'FOUNDER') assert.match(content, /AUTHORIZED_CONTENT/, pathname);
      act(() => screen.unmount());
    }
  }
  role = 'VIEW_ONLY_ADMIN'; pathname = '/unknown-admin-module';
  let screen;
  act(() => { screen = create(React.createElement(AppRouteGuard, null, React.createElement('Text', null, 'SECRET'))); });
  assert.match(textOf(screen.root), /Access Restricted/);
  act(() => screen.unmount());
});
