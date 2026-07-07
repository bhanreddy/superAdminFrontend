import { useCallback, useEffect, useState } from 'react';
import type { EnquiryRow } from '../types/founder';
import type { EnquiryListFilters } from '../services/founderSupabase';
import * as founderDb from '../services/founderSupabase';

export function useEnquiries(initial?: Partial<EnquiryListFilters>) {
  const [filters, setFilters] = useState<EnquiryListFilters>({
    status: initial?.status ?? 'ALL',
    source: initial?.source ?? 'ALL',
    category: initial?.category ?? 'ALL',
    assignedTo: initial?.assignedTo ?? 'ALL',
  });
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await founderDb.listEnquiries(filters);
      setEnquiries(rows);
    } catch (e: any) {
      setError(e?.message || 'Failed to load enquiries');
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    enquiries,
    loading,
    error,
    filters,
    setFilters,
    refresh,
  };
}
