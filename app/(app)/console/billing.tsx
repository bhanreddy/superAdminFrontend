import React from 'react';
import BillingScreen from '../../../src/screens/founder/BillingScreen';
import { RouteGuard } from '../../../src/components/auth/RouteGuard';

export default function BillingRoute() {
  return (
    <RouteGuard requiredPermission="billing.view">
      <BillingScreen />
    </RouteGuard>
  );
}
