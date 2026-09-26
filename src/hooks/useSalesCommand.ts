import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { crmService } from '../services/crmService';
import { acceptSalesResponse, normalizeSalesFilters, salesCacheKey, type SalesFilterInput } from '../services/salesCommandQuery';
import type { SalesCommandSummary, SalesPeriod } from '../types/crm';

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; summary: SalesCommandSummary }>();
const inflight = new Map<string, Promise<SalesCommandSummary>>();

export function clearSalesCommandCache() {
  cache.clear();
  inflight.clear();
}

function failureText(err: unknown): string {
  const error = err as { response?: { data?: { error?: string } }; message?: string };
  return error?.response?.data?.error || 'Sales Command could not be loaded. Counts are unavailable.';
}

export function useSalesCommand(actorId: string | null, initial?: SalesFilterInput) {
  const [period, setPeriod] = useState<SalesPeriod>(initial?.period || 'month');
  const [attributionModel, setAttributionModel] = useState<'first' | 'latest'>(initial?.attribution_model || 'first');
  const [timezone] = useState(initial?.timezone || 'Asia/Kolkata');
  const [summary, setSummary] = useState<SalesCommandSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const keyRef = useRef('');
  const actor = actorId || 'signed-out';

  const load = useCallback(async (force = false) => {
    const filters = normalizeSalesFilters({ period, timezone, attribution_model: attributionModel, campaign_id: initial?.campaign_id, track_link_id: initial?.track_link_id, distribution_medium: initial?.distribution_medium, mandal: initial?.mandal });
    const key = salesCacheKey(actor, filters);
    keyRef.current = key;
    if (actor === 'signed-out') {
      setSummary(null);
      setError('Sign in to view school sales.');
      setLoading(false);
      return;
    }
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.at < TTL_MS) {
      if (acceptSalesResponse(key, keyRef.current)) {
        setSummary(cached.summary);
        setUpdatedAt(cached.summary.meta.evaluated_at);
        setError(null);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    let request = inflight.get(key);
    if (!request) {
      request = crmService.salesSummary(filters, controller.signal).finally(() => inflight.delete(key));
      inflight.set(key, request);
    }
    try {
      const body = await request;
      if (!acceptSalesResponse(key, keyRef.current)) return;
      cache.set(key, { at: Date.now(), summary: body });
      setSummary(body);
      setUpdatedAt(body.meta.evaluated_at);
      setError(null);
    } catch (err) {
      if (!acceptSalesResponse(key, keyRef.current)) return;
      setError(failureText(err));
      setSummary(null);
    } finally {
      if (acceptSalesResponse(key, keyRef.current)) setLoading(false);
    }
  }, [actor, period, timezone, attributionModel, initial?.campaign_id, initial?.track_link_id, initial?.distribution_medium, initial?.mandal]);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load(true);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load(false);
    }, TTL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [load]);

  return { summary, loading, error, updatedAt, period, setPeriod, timezone, attributionModel, setAttributionModel, refresh: () => load(true) };
}
