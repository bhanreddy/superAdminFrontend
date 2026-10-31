import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { isFounderOrSuperAdmin } from '../../src/constants/rbac';
import ExecutiveDashboard from '../../src/screens/dashboard/ExecutiveDashboard';
import SalesManagerDashboard from '../../src/screens/dashboards/SalesManagerDashboard';
import SalesExecutiveDashboard from '../../src/screens/dashboards/SalesExecutiveDashboard';
import ImplementationDashboard from '../../src/screens/dashboards/ImplementationDashboard';
import SupportDashboard from '../../src/screens/dashboards/SupportDashboard';
import GenericRoleDashboard from '../../src/screens/dashboards/GenericRoleDashboard';

/** Routing owns role selection; data and presentation live in their feature modules. */
export default function DashboardScreen() {
  const { role, mustChangePassword } = useAuth();
  if (role === 'CA' || role === 'CA_LEAD')
    return (
      <Redirect
        href={
          (mustChangePassword ? '/(app)/books/account' : '/(app)/books') as any
        }
      />
    );
  if (isFounderOrSuperAdmin(role)) return <ExecutiveDashboard />;
  if (role === 'SALES_MANAGER') return <SalesManagerDashboard />;
  if (role === 'SALES_EXECUTIVE') return <SalesExecutiveDashboard />;
  if (role === 'IMPLEMENTATION_MANAGER' || role === 'IMPLEMENTATION_EXECUTIVE')
    return <ImplementationDashboard />;
  if (
    role === 'SUPPORT_MANAGER' ||
    role === 'SUPPORT_EXECUTIVE' ||
    role === 'TECHNICAL_SUPPORT'
  )
    return <SupportDashboard />;
  return <GenericRoleDashboard />;
}
