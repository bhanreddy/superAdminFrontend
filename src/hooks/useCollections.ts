import { useCallback, useEffect, useState } from 'react';
import type { CollectionRow } from '../types/founder';
import type {
  CollectionPeriodFilter,
  CollectionStatusFilter,
} from '../services/founderSupabase';
import * as founderDb from '../services/founderSupabase';

const PAGE_SIZE = 50;

export function useCollections(
  initial?: Partial<{
    period: CollectionPeriodFilter;
    status: CollectionStatusFilter;
    unitId: string | 'ALL';
  }>,
) {
  const [period, setPeriod] = useState<CollectionPeriodFilter>(
    initial?.period ?? 'THIS_MONTH',
  );
  const [status, setStatus] = useState<CollectionStatusFilter>(
    initial?.status ?? 'ALL',
  );
  const [unitId, setUnitId] = useState<string | 'ALL'>(
    initial?.unitId ?? 'ALL',
  );
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [period, status, unitId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await founderDb.listCollections({
          period,
          status,
          business_unit_id: unitId,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!cancelled) {
          setRows(res.rows);
          setTotal(res.total);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load collections');
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, status, unitId, page, refreshKey]);

  const setPageSafe = useCallback((n: number) => {
    setPage(Math.max(0, n));
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    loading,
    error,
    period,
    setPeriod,
    status,
    setStatus,
    unitId,
    setUnitId,
    setPage: setPageSafe,
    refresh,
  };
}
