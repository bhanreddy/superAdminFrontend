import React from 'react';
import AuditLogsScreen from '../../../src/screens/founder/AuditLogsScreen';
import { RouteGuard } from '../../../src/components/auth/RouteGuard';

export default function AuditLogsRoute() {
  return (
    <RouteGuard requiredPermission="audit.view">
      <AuditLogsScreen />
    </RouteGuard>
  );
}
