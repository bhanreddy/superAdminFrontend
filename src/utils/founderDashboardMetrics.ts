/**
 * Parity with founder-console `src/app/page.tsx` dashboard aggregations.
 * Handles both rich views (category / unit columns) and minimal schema.sql-shaped views.
 */

export interface FounderDashboardMetrics {
  approvedIncomeThisMonth: number;
  pendingCollectionsAmount: number;
  approvedExpensesThisMonth: number;
  collectionsNetProfit: number;
  collectionsByCategory: { category: string; amount: number }[];
  topPayingUnit: string;
  totalApprovedThisMonth: number;
  pendingTotal: number;
  approvedCount: number;
  rejectedCount: number;
  expenseCategoryBreakdown: { category: string; amount: number }[];
  newEnquiriesToday: number;
  totalEnquiriesMonth: number;
  enquiriesByWebsite: { website: string; count: number }[];
  enquiriesByCategory: { category: string; count: number }[];
  unassignedEnquiries: number;
  revenueThisMonth: number;
  expenseThisMonthRoi: number;
  netProfitRoi: number;
  conversionRate: number;
  costPerLead: number;
}

function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pick(row: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return num(row[k]);
  }
  return 0;
}

export function currentMonthPrefix(d = new Date()): string {
  return d.toISOString().substring(0, 7);
}

/** Match web: row.month may be "YYYY-MM…" or numeric year/month columns (or a single aggregate row). */
export function pickSeriesRowForMonthPrefix(
  rows: Record<string, unknown>[],
  monthPrefix: string,
): Record<string, unknown> | null {
  if (!rows?.length) return null;
  const byStr = rows.find((r) => {
    const m = r.month;
    return typeof m === 'string' && m.startsWith(monthPrefix);
  });
  if (byStr) return byStr;
  const [py, pm] = monthPrefix.split('-').map((x) => parseInt(x, 10));
  if (Number.isFinite(py) && Number.isFinite(pm)) {
    const byYm = rows.find((r) => {
      const y = num(r.year ?? r.period_year);
      const mo = num(r.month ?? r.period_month);
      return y === py && mo === pm;
    });
    if (byYm) return byYm;
  }
  return rows.length === 1 ? rows[0] : null;
}

export function computeFounderDashboardMetrics(input: {
  pending: Record<string, unknown> | null;
  incomeRows: Record<string, unknown>[];
  expenseRows: Record<string, unknown>[];
  enquiryRows: Record<string, unknown>[];
  monthlyClosedDeals: Record<string, unknown>[];
  monthlyExpenseRoi: Record<string, unknown>[];
  conversionRows: Record<string, unknown>[];
  costPerLeadRows: Record<string, unknown>[];
  enquiriesToday: number;
  unassignedEnquiries: number;
  now?: Date;
}): FounderDashboardMetrics {
  const date = input.now ?? new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1;
  const monthPrefix = currentMonthPrefix(date);

  const pending = input.pending || {};

  const pendingCollectionsAmount = pick(pending, [
    'pending_collections',
    'collections_pending',
    'pending_collection_amount',
  ]);
  const pendingTotal = pick(pending, ['pending_expenses', 'pending_expense_amount', 'expenses_pending']);
  const approvedCount = pick(pending, ['approved_expenses_count', 'approved_count']);
  const rejectedCount = pick(pending, ['rejected_expenses_count', 'rejected_count']);

  let approvedIncomeThisMonth = 0;
  const collectionsByCategoryMap = new Map<string, number>();
  const unitIncomeMap = new Map<string, number>();

  const incomeThisMonth = input.incomeRows.filter(
    (r) => num(r.year) === currentYear && num(r.month) === currentMonth,
  );
  incomeThisMonth.forEach((row) => {
    const amount = pick(row, ['total_income', 'total_amount', 'amount', 'income', 'sum', 'total']);
    approvedIncomeThisMonth += amount;
    const category = String(row.category ?? 'General');
    collectionsByCategoryMap.set(category, (collectionsByCategoryMap.get(category) || 0) + amount);
    const unit = String(row.unit_name ?? row.business_unit_name ?? row.unit ?? 'Unknown');
    unitIncomeMap.set(unit, (unitIncomeMap.get(unit) || 0) + amount);
  });

  const collectionsByCategory = Array.from(collectionsByCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  let topPayingUnit = 'None';
  if (unitIncomeMap.size > 0) {
    topPayingUnit = Array.from(unitIncomeMap.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  let approvedExpensesThisMonth = 0;
  const expenseCategoryBreakdownMap = new Map<string, number>();
  const expenseThisMonth = input.expenseRows.filter(
    (r) => num(r.year) === currentYear && num(r.month) === currentMonth,
  );
  expenseThisMonth.forEach((row) => {
    const amount = pick(row, ['total_expense', 'total_amount', 'amount', 'expense', 'sum', 'total']);
    approvedExpensesThisMonth += amount;
    const category = String(row.category ?? 'General');
    expenseCategoryBreakdownMap.set(category, (expenseCategoryBreakdownMap.get(category) || 0) + amount);
  });

  const expenseCategoryBreakdown = Array.from(expenseCategoryBreakdownMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const collectionsNetProfit = approvedIncomeThisMonth - approvedExpensesThisMonth;

  let totalEnquiriesMonth = 0;
  const enquiriesByCategoryMap = new Map<string, number>();
  const enquiriesByWebsiteMap = new Map<string, number>();

  const enquiryThisMonth = input.enquiryRows.filter(
    (r) => num(r.year) === currentYear && num(r.month) === currentMonth,
  );
  enquiryThisMonth.forEach((row) => {
    const count = pick(row, ['total_enquiries', 'count', 'enquiries', 'leads']);
    totalEnquiriesMonth += count;
    const cat = row.category != null ? String(row.category) : '';
    const web = row.website_source != null ? String(row.website_source) : row.source != null ? String(row.source) : '';
    if (cat) enquiriesByCategoryMap.set(cat, (enquiriesByCategoryMap.get(cat) || 0) + count);
    if (web) enquiriesByWebsiteMap.set(web, (enquiriesByWebsiteMap.get(web) || 0) + count);
  });

  const enquiriesByCategory = Array.from(enquiriesByCategoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const enquiriesByWebsite = Array.from(enquiriesByWebsiteMap.entries())
    .map(([website, count]) => ({ website, count }))
    .sort((a, b) => b.count - a.count);

  const currentClosed = pickSeriesRowForMonthPrefix(input.monthlyClosedDeals, monthPrefix);
  const currentExpenseRoi = pickSeriesRowForMonthPrefix(input.monthlyExpenseRoi, monthPrefix);
  const currentConversion = pickSeriesRowForMonthPrefix(input.conversionRows, monthPrefix);
  const currentCpl = pickSeriesRowForMonthPrefix(input.costPerLeadRows, monthPrefix);

  const revenueThisMonth = pick(currentClosed, [
    'total_revenue',
    'total_deal_value',
    'revenue',
    'amount',
    'sum',
  ]);
  const expenseThisMonthRoi = pick(currentExpenseRoi, [
    'total_expense',
    'total_amount',
    'amount',
    'expense',
    'sum',
  ]);

  let conversionRate = pick(currentConversion, [
    'conversion_ratio',
    'conversion_rate',
    'rate',
    'pct',
  ]);
  if (conversionRate > 0 && conversionRate < 1) {
    conversionRate *= 100;
  }

  const costPerLead = pick(currentCpl, ['cost_per_lead', 'cpl', 'amount', 'cost']);

  return {
    approvedIncomeThisMonth,
    pendingCollectionsAmount,
    approvedExpensesThisMonth,
    collectionsNetProfit,
    collectionsByCategory,
    topPayingUnit,
    totalApprovedThisMonth: approvedExpensesThisMonth,
    pendingTotal,
    approvedCount,
    rejectedCount,
    expenseCategoryBreakdown,
    newEnquiriesToday: input.enquiriesToday,
    totalEnquiriesMonth,
    enquiriesByWebsite,
    enquiriesByCategory,
    unassignedEnquiries: input.unassignedEnquiries,
    revenueThisMonth,
    expenseThisMonthRoi,
    netProfitRoi: revenueThisMonth - expenseThisMonthRoi,
    conversionRate,
    costPerLead,
  };
}
