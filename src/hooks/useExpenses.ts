import { useCallback, useEffect, useState, useRef } from 'react';
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

  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await founderDb.listExpenses(filters);
      if (request === sequence.current) setExpenses(rows);
    } catch (e: any) {
      if (request === sequence.current) setError(e?.response?.data?.details || e?.response?.data?.error || e?.message || 'Failed to load expenses');
    } finally {
      if (request === sequence.current) setLoading(false);
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
