import { useCallback, useEffect, useState } from 'react';
import type { ExpenseRow } from '../types/founder';
import type { ExpenseListFilters } from '../services/founderSupabase';
import * as founderDb from '../services/founderSupabase';

export function useExpenses(initial?: Partial<ExpenseListFilters>) {
  const [filters, setFilters] = useState<ExpenseListFilters>({
    status: initial?.status ?? 'ALL',
    category: initial?.category ?? 'ALL',
  });
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await founderDb.listExpenses(filters);
      setExpenses(rows);
    } catch (e: any) {
      setError(e?.message || 'Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    expenses,
    loading,
    error,
    filters,
    setFilters,
    refresh,
  };
}
