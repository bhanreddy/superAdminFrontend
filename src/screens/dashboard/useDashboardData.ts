import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { founderApi, superAdminApi } from '../../services/apiService';
import { getFinancialSummary } from '../../services/founderSupabase';
import type { FinancePeriod, AnalyticsRow } from './dashboardModel';
import type { School } from '../../types/school';

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  updatedAt: Date | null;
  reload: () => Promise<void>;
}
/** One independent, scoped resource. Late responses cannot replace a newer request. */
export function useDashboardResource<T>(
  key: string,
  loader: () => Promise<T>,
): Resource<T> {
  const loadRef = useRef(loader);
  loadRef.current = loader;
  const serial = useRef(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: T | null;
    loading: boolean;
    error: boolean;
    updatedAt: Date | null;
  }>({ key, data: null, loading: true, error: false, updatedAt: null });
  const reload = useCallback(async () => {
    const request = ++serial.current;
    setSnapshot((prev) => ({
      key,
      data: prev.key === key ? prev.data : null,
      loading: true,
      error: false,
      updatedAt: prev.key === key ? prev.updatedAt : null,
    }));
    try {
      const data = await loadRef.current();
      if (request === serial.current)
        setSnapshot({
          key,
          data,
          loading: false,
          error: false,
          updatedAt: new Date(),
        });
    } catch {
      // Hide old amounts on failure so they cannot be mistaken for fresh results.
      if (request === serial.current)
        setSnapshot({
          key,
          data: null,
          loading: false,
          error: true,
          updatedAt: null,
        });
    }
  }, [key]);
  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        serial.current++;
      };
    }, [reload]),
  );
  return {
    ...(snapshot.key === key
      ? snapshot
      : { data: null, loading: true, error: false, updatedAt: null }),
    reload,
  };
}
export interface DashboardAnalytics {
  pending?: AnalyticsRow | null;
  incomeRows?: AnalyticsRow[];
  expenseV2Rows?: AnalyticsRow[];
}
function requireNumbers<T>(data: T, keys: string[]): T {
  for (const key of keys) {
    const value = (data as Record<string, unknown> | null)?.[key];
    if (
      (typeof value !== 'number' && typeof value !== 'string') ||
      value === '' ||
      !Number.isFinite(Number(value))
    )
      throw new Error('Incomplete dashboard response');
  }
  return data;
}
export function useDashboardData(
  period: FinancePeriod,
  unit: string,
  scope: string,
  canReadSchools: boolean,
  canApprove: boolean,
) {
  const stats = useDashboardResource(scope + ':stats', async () =>
    requireNumbers(await superAdminApi.getDashboardStats(), [
      'total_schools',
      'active_schools',
      'total_students',
      'total_staff',
    ]),
  );
  const schools = useDashboardResource<School[]>(
    scope + ':schools:' + canReadSchools,
    async () => {
      if (!canReadSchools) return [];
      const response = await superAdminApi.getSchools();
      if (!Array.isArray(response) && response.cluster_unreachable)
        throw new Error('Cluster unavailable');
      const rows = Array.isArray(response) ? response : response.data;
      if (!Array.isArray(rows)) throw new Error('Incomplete school directory');
      return rows;
    },
  );
  const analytics = useDashboardResource<DashboardAnalytics>(
    scope + ':analytics',
    async () => {
      const response = await founderApi.getAnalytics();
      if (
        !Array.isArray(response?.incomeRows) ||
        !Array.isArray(response?.expenseV2Rows)
      )
        throw new Error('Incomplete analytics response');
      return response;
    },
  );
  const enquiries = useDashboardResource<{
    enquiriesToday: number;
    unassignedEnquiries: number;
  }>(scope + ':enquiries', async () =>
    requireNumbers(await founderApi.getEnquiryStats(), [
      'enquiriesToday',
      'unassignedEnquiries',
    ]),
  );
  const expenses = useDashboardResource<AnalyticsRow[]>(
    scope + ':expenses:' + canApprove,
    async () => {
      if (!canApprove) return [];
      const response = await founderApi.listExpenses({ status: 'PENDING' });
      const rows = Array.isArray(response) ? response : response?.data;
      if (!Array.isArray(rows)) throw new Error('Incomplete expense queue');
      return rows;
    },
  );
  const units = useDashboardResource<{ id: string; name: string }[]>(
    scope + ':units',
    async () => {
      const rows = await founderApi.listBusinessUnits(true);
      if (!Array.isArray(rows))
        throw new Error('Incomplete business unit directory');
      return rows;
    },
  );
  const financial = useDashboardResource(
    scope + ':finance:' + period + ':' + unit,
    async () =>
      requireNumbers(
        await getFinancialSummary({ period, business_unit_id: unit }),
        ['revenue', 'expenses', 'net_profit', 'client_billing_collected'],
      ),
  );
  const resources = [
    stats,
    schools,
    analytics,
    enquiries,
    expenses,
    units,
    financial,
  ];
  return {
    stats,
    schools,
    analytics,
    enquiries,
    expenses,
    units,
    financial,
    refreshing: resources.some((r) => r.loading),
    refresh: () => Promise.all(resources.map((r) => r.reload())),
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
