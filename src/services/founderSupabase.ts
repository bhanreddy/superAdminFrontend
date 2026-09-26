/**
 * Founder/CRM data layer — ALL data fetched from NexSyrus backend.
 * Zero direct Supabase calls.
 */
import { superAdminClient } from '../api/superAdminClient';
import { founderApi } from './apiService';
import { currentMonthPrefix, pickSeriesRowForMonthPrefix } from '../utils/founderDashboardMetrics';
import type {
  ActivityLogRow,
  BusinessUnitRow,
  CollectionPaymentMode,
  CollectionRow,
  CollectionStatus,
  EnquiryRow,
  EnquiryStatus,
  ExpenseCategory,
  ExpenseRow,
  ExpenseStatus,
  FounderRow,
  NotificationRow,
} from '../types/founder';

export const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts';

export function formatInr(amount: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

// Internal cache for the batched analytics call
let _cachedAnalytics: any = null;
let _cacheTs = 0;
let _cacheActor = '';
let _inflight: Promise<any> | null = null;
const CACHE_TTL = 30_000; // 30 seconds

export function setAnalyticsActor(actorId: string | null) {
  const next = actorId || '';
  if (next !== _cacheActor) {
    _cachedAnalytics = null;
    _cacheTs = 0;
    _inflight = null;
  }
  _cacheActor = next;
}

async function getAnalyticsData() {
  if (_cachedAnalytics && Date.now() - _cacheTs < CACHE_TTL) {
    return _cachedAnalytics;
  }
  if (_inflight) return _inflight;
  const actorAtStart = _cacheActor;
  _inflight = founderApi.getAnalytics().then((data) => {
    if (actorAtStart === _cacheActor) {
      _cachedAnalytics = data;
      _cacheTs = Date.now();
    }
    return data;
  }).finally(() => {
    _inflight = null;
  });
  return _inflight;
}

/** Invalidate the analytics cache (call after mutations) */
export function invalidateAnalyticsCache() {
  _cachedAnalytics = null;
  _cacheTs = 0;
}

export async function fetchPendingMetricsSummary(): Promise<Record<string, unknown> | null> {
  const data = await getAnalyticsData();
  return data.pending || null;
}

export async function fetchMonthlyIncomeSummary(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.incomeRows || [];
}

export async function fetchMonthlyExpenseSummaryV2(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.expenseV2Rows || [];
}

export async function fetchMonthlyExpenseSummaryRoi(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.expenseRoiRows || [];
}

export async function fetchMonthlyEnquirySummary(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.enquiryRows || [];
}

export async function fetchMonthlyClosedDeals(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.closedDealsRows || [];
}

export async function fetchConversionRateSeries(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.conversionRows || [];
}

export async function fetchCostPerLeadSeries(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.costPerLeadRows || [];
}

export async function fetchConversionRateView(): Promise<Record<string, unknown> | null> {
  const rows = await fetchConversionRateSeries();
  return pickSeriesRowForMonthPrefix(rows, currentMonthPrefix());
}

export async function fetchCostPerLeadView(): Promise<Record<string, unknown> | null> {
  const rows = await fetchCostPerLeadSeries();
  return pickSeriesRowForMonthPrefix(rows, currentMonthPrefix());
}

export async function fetchLeadsByWebsite(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.leadsByWebsiteRows || [];
}

export async function fetchFounderLeadPerformance(): Promise<Record<string, unknown>[]> {
  const data = await getAnalyticsData();
  return data.leadPerformanceRows || [];
}

// ─── Expenses ───────────────────────────────────────────────────────────────

export interface ExpenseListFilters {
  status: ExpenseStatus | 'ALL';
  category: ExpenseCategory | 'ALL';
}

export async function listExpenses(
  filters: ExpenseListFilters,
): Promise<ExpenseRow[]> {
  const data = await founderApi.listExpenses({
    status: filters.status !== 'ALL' ? filters.status : undefined,
    category: filters.category !== 'ALL' ? filters.category : undefined,
  });
  return (data || []) as ExpenseRow[];
}

export async function createExpense(payload: {
  title: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  receipt_url: string | null;
  created_by_founder_id: string;
}): Promise<ExpenseRow> {
  return await founderApi.createExpense(payload) as ExpenseRow;
}

export async function approveExpense(
  id: string,
  approverFounderId: string,
): Promise<void> {
  await founderApi.approveExpense(id, approverFounderId);
}

export async function rejectExpense(
  id: string,
  approverFounderId: string,
  reason: string,
): Promise<void> {
  await founderApi.rejectExpense(id, approverFounderId, reason);
}

/** Upload receipt via the backend (server-side storage) */
export async function uploadExpenseReceipt(
  localUri: string,
  founderId: string,
  expenseId: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const file = new File([blob], `receipt.${ext}`, { type: mimeType });

  const result = await founderApi.uploadReceipt(expenseId, file, founderId);
  return result.path;
}

export async function updateExpenseReceiptPath(
  expenseId: string,
  _receiptPath: string,
): Promise<void> {
  // Receipt path is already updated by the upload endpoint — this is a no-op now
}

export async function getReceiptSignedUrl(
  storagePath: string,
  _expiresSec = 3600,
): Promise<string | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith('http')) return storagePath;

  // We need the expense ID to get a signed URL — storagePath format: {founderId}/{expenseId}.{ext}
  // For now, use the path components to reconstruct. The backend expects an expense ID.
  // This is a workaround: we call with the expense ID extracted from the path.
  const parts = storagePath.split('/');
  const filename = parts[parts.length - 1];
  const expenseId = filename?.split('.')[0];
  if (!expenseId) return null;

  try {
    const result = await founderApi.getReceiptUrl(expenseId, _expiresSec);
    return result.signedUrl || null;
  } catch {
    return null;
  }
}

// ─── Collections ────────────────────────────────────────────────────────────

export type CollectionPeriodFilter =
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'ALL';

export type CollectionStatusFilter = CollectionStatus | 'PENDING' | 'APPROVED' | 'ALL';

export interface CollectionListParams {
  period: CollectionPeriodFilter;
  status: CollectionStatusFilter;
  business_unit_id?: string;
  page: number;
  pageSize: number;
}

export async function listCollections(
  params: CollectionListParams,
): Promise<{ rows: CollectionRow[]; total: number }> {
  const data = await founderApi.listCollections({
    period: params.period,
    status: params.status,
    business_unit_id: params.business_unit_id,
    page: params.page,
    pageSize: params.pageSize,
  });
  return { rows: (data.rows || []) as CollectionRow[], total: data.total ?? 0 };
}

export interface FinancialSummary {
  period: CollectionPeriodFilter;
  business_unit_id: string;
  revenue: number;
  business_unit_collections: number;
  client_billing_collected: number;
  expenses: number;
  net_profit: number;
  profit_margin: number | null;
  expenses_scope: 'platform';
}

export async function getFinancialSummary(params: { period: CollectionPeriodFilter; business_unit_id?: string }): Promise<FinancialSummary> {
  return founderApi.getFinancialSummary(params) as Promise<FinancialSummary>;
}

export async function createCollection(payload: {
  business_unit_id: string;
  amount: number;
  month: number;
  year: number;
  payment_mode: CollectionPaymentMode;
  created_by_founder_id: string;
  notes?: string | null;
}): Promise<CollectionRow> {
  return await founderApi.createCollection(payload) as CollectionRow;
}

export async function approveCollection(
  id: string,
  approverFounderId: string,
): Promise<void> {
  await founderApi.approveCollection(id, approverFounderId);
}

export async function rejectCollection(
  id: string,
  approverFounderId: string,
  reason: string,
): Promise<void> {
  await founderApi.rejectCollection(id, approverFounderId, reason);
}

// ─── Enquiries ──────────────────────────────────────────────────────────────

export interface EnquiryListFilters {
  status: EnquiryStatus | 'ALL';
  source: string | 'ALL';
  category: string | 'ALL';
  assignedTo: string | 'ALL' | 'UNASSIGNED';
  q?: string;
  limit?: number;
  cursor?: string;
}

export async function countEnquiriesCreatedToday(): Promise<number> {
  const stats = await founderApi.getEnquiryStats();
  return stats.enquiriesToday ?? 0;
}

export async function countUnassignedEnquiries(): Promise<number> {
  const stats = await founderApi.getEnquiryStats();
  return stats.unassignedEnquiries ?? 0;
}

export async function listEnquiries(filters: EnquiryListFilters): Promise<EnquiryRow[]> {
  const data = await founderApi.listEnquiries({
    status: filters.status !== 'ALL' ? filters.status : undefined,
    source: filters.source !== 'ALL' ? filters.source : undefined,
    category: filters.category !== 'ALL' ? filters.category : undefined,
    assignedTo: filters.assignedTo !== 'ALL' ? filters.assignedTo : undefined,
    q: filters.q || undefined,
    limit: filters.limit,
    cursor: filters.cursor,
  });
  if (Array.isArray(data)) return data as EnquiryRow[];
  return ((data && data.data) || []) as EnquiryRow[];
}

export async function updateEnquiry(
  id: string,
  patch: Partial<{
    status: EnquiryStatus;
    assigned_to: string | null;
    deal_value: number | null;
    notes: string | null;
  }>,
): Promise<void> {
  await founderApi.updateEnquiry(id, patch);
}

// ─── Business Units ─────────────────────────────────────────────────────────

export async function listBusinessUnits(includeInactive = false): Promise<BusinessUnitRow[]> {
  const data = await founderApi.listBusinessUnits(includeInactive);
  return (data || []) as BusinessUnitRow[];
}

export async function createBusinessUnit(payload: {
  name: string;
  code: string;
  subscription_price: number;
  subscription_plan: string;
  phone?: string | null;
}): Promise<BusinessUnitRow> {
  return await founderApi.createBusinessUnit(payload) as BusinessUnitRow;
}

export async function updateBusinessUnit(
  id: string,
  patch: Partial<{
    name: string;
    code: string | null;
    subscription_price: number | null;
    subscription_plan: string | null;
    phone: string | null;
  }>,
): Promise<void> {
  await founderApi.updateBusinessUnit(id, patch);
}

export async function setBusinessUnitActive(id: string, is_active: boolean): Promise<void> {
  await founderApi.updateBusinessUnit(id, { is_active } as any);
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function listNotificationsForUser(
  authUserId: string,
  founderId: string | null,
): Promise<NotificationRow[]> {
  const data = await founderApi.listNotifications(authUserId, founderId);
  return (data || []) as NotificationRow[];
}

export async function getUnreadNotificationCount(
  authUserId: string,
  founderId: string | null,
): Promise<number> {
  const data = await founderApi.getUnreadCount(authUserId, founderId);
  return data.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await founderApi.markNotificationRead(id);
}

export async function markNotificationUnread(id: string): Promise<void> {
  await founderApi.markNotificationUnread(id);
}

export async function deleteNotification(id: string): Promise<void> {
  await founderApi.deleteNotification(id);
}

// ─── Activity Logs ──────────────────────────────────────────────────────────

export interface ActivityLogFilters {
  entity_type: string | 'ALL';
  action: string | 'ALL';
}

export async function listActivityLogs(
  filters: ActivityLogFilters,
): Promise<ActivityLogRow[]> {
  const data = await founderApi.listAuditLogs({
    entity_type: filters.entity_type !== 'ALL' ? filters.entity_type : undefined,
    action: filters.action !== 'ALL' ? filters.action : undefined,
  });
  return (data || []) as ActivityLogRow[];
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<unknown | null> {
  const data = await founderApi.getSetting(key);
  return data?.value ?? null;
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  await founderApi.upsertSetting(key, value);
}

export async function listFoundersForSettings(): Promise<FounderRow[]> {
  const data = await founderApi.listFounders();
  return (data || []) as FounderRow[];
}

export async function setFounderActive(id: string, is_active: boolean): Promise<void> {
  await founderApi.setFounderActive(id, is_active);
}

export async function updateAuthPassword(newPassword: string): Promise<void> {
  await superAdminClient.post('/api/super-admin/auth/change-password', { newPassword });
}

// ─── Pure Utilities (no Supabase) ───────────────────────────────────────────

export function pickMetric(row: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) {
      return num(row[k]);
    }
  }
  return 0;
}

export function sumSeriesRows(
  rows: Record<string, unknown>[],
  amountKeys: string[],
): number {
  return rows.reduce((acc, r) => acc + pickMetric(r, amountKeys), 0);
}
