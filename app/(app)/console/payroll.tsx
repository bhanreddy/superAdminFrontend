import React from 'react';
import PayrollScreen from '../../../src/screens/founder/PayrollScreen';
import { RouteGuard } from '../../../src/components/auth/RouteGuard';

export default function PayrollRoute() {
  return (
    <RouteGuard requiredPermission="payroll.manage">
      <PayrollScreen />
    </RouteGuard>
  );
}
