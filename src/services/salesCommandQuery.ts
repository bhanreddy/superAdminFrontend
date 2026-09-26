import type { SalesPeriod } from '../types/crm';

export interface SalesFilterInput {
  period?: SalesPeriod;
  timezone?: string;
  from_date?: string;
  to_date?: string;
  metric?: string;
  owner?: string;
  stage?: string;
  campaign_id?: string;
  track_link_id?: string;
  distribution_medium?: 'QR' | 'LINK';
  attribution_model?: 'first' | 'latest';
  conversion_kind?: string;
  mandal?: string;
  locality?: string;
}

const PERIODS = new Set(['today', 'week', 'month', 'custom']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeSalesFilters(input: SalesFilterInput): Record<string, string> {
  const period = input.period && PERIODS.has(input.period) ? input.period : 'month';
  const timezone = input.timezone && input.timezone.length <= 64 ? input.timezone : 'Asia/Kolkata';
  const filters: Record<string, string> = { period, timezone, attribution_model: input.attribution_model === 'latest' ? 'latest' : 'first' };
  if (period === 'custom' && input.from_date && input.to_date) {
    filters.from_date = input.from_date;
    filters.to_date = input.to_date;
  }
  if (input.metric) filters.metric = input.metric;
  if (input.owner) filters.owner = input.owner;
  if (input.stage) filters.stage = input.stage;
  if (input.campaign_id && UUID.test(input.campaign_id)) filters.campaign_id = input.campaign_id;
  if (input.track_link_id && UUID.test(input.track_link_id)) filters.track_link_id = input.track_link_id;
  if (input.distribution_medium === 'QR' || input.distribution_medium === 'LINK') filters.distribution_medium = input.distribution_medium;
  if (input.conversion_kind && /^[A-Z_]{3,40}$/.test(input.conversion_kind)) filters.conversion_kind = input.conversion_kind;
  if (input.mandal && input.mandal.length <= 80) filters.mandal = input.mandal;
  if (input.locality && input.locality.length <= 80) filters.locality = input.locality;
  return filters;
}

export function salesCacheKey(actorId: string, filters: Record<string, string>): string {
  const parts = Object.keys(filters).sort().map((key) => `${key}=${filters[key]}`);
  return `${actorId}|${parts.join('&')}`;
}

export function acceptSalesResponse(startedKey: string, currentKey: string): boolean {
  return startedKey === currentKey;
}
