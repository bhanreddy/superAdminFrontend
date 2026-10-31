import type { School } from '../../types/school';

export type AnalyticsRow = Record<string, unknown>;
export type FinancePeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL';
export const PERIODS: { value: FinancePeriod; label: string }[] = [
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'LAST_MONTH', label: 'Last month' },
  { value: 'THIS_YEAR', label: 'This year' },
  { value: 'ALL', label: 'All time' },
];
export function number(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
export function money(value: unknown): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number(value));
}
export function metric(row: AnalyticsRow, keys: string[]): number {
  for (const key of keys) if (row[key] != null) return number(row[key]);
  return 0;
}
function calendarKey(row: AnalyticsRow): string | null {
  if (
    typeof row.month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])(?:$|-)/.test(row.month)
  )
    return row.month.slice(0, 7);
  const year = number(row.year ?? row.period_year),
    month = number(row.month ?? row.period_month);
  return Number.isInteger(year) &&
    year > 1900 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
    ? `${year}-${String(month).padStart(2, '0')}`
    : null;
}
export interface TrendPoint {
  key: string;
  label: string;
  collections: number | null;
  expenses: number | null;
}
/** Aggregate categories within a month; missing months stay missing, never invented zeroes. */
export function collectionTrend(
  income: AnalyticsRow[],
  expense: AnalyticsRow[],
  limit = 6,
): TrendPoint[] {
  const rows = new Map<string, TrendPoint>();
  for (const [source, field, keys] of [
    [
      income,
      'collections',
      ['total_income', 'total_amount', 'amount', 'income', 'total'],
    ],
    [
      expense,
      'expenses',
      ['total_expense', 'total_amount', 'amount', 'expense', 'total'],
    ],
  ] as const) {
    for (const row of source) {
      const key = calendarKey(row);
      if (!key) continue;
      const point = rows.get(key) || {
        key,
        label: new Date(
          Number(key.slice(0, 4)),
          Number(key.slice(5)) - 1,
          1,
        ).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        collections: null,
        expenses: null,
      };
      point[field] = (point[field] ?? 0) + metric(row, [...keys]);
      rows.set(key, point);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => a.key.localeCompare(b.key));
  if (!sorted.length) return [];
  const last = sorted[sorted.length - 1].key;
  const end = new Date(Number(last.slice(0, 4)), Number(last.slice(5)) - 1, 1);
  const points: TrendPoint[] = [];
  for (let back = Math.max(1, limit) - 1; back >= 0; back--) {
    const date = new Date(end.getFullYear(), end.getMonth() - back, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (key < sorted[0].key) continue;
    points.push(
      rows.get(key) || {
        key,
        label: date.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        collections: null,
        expenses: null,
      },
    );
  }
  return points;
}
export function schoolState(school: School): 'Live' | 'Onboarding' | 'Paused' {
  if (!school.is_active || school.onboarding_status === 'suspended')
    return 'Paused';
  if (school.onboarding_status === 'live') return 'Live';
  return 'Onboarding';
}
export function filterSchools(
  schools: School[],
  query: string,
  status: string,
): School[] {
  const q = query.trim().toLocaleLowerCase();
  return schools.filter(
    (s) =>
      (status === 'All' || schoolState(s) === status) &&
      (!q ||
        `${s.name} ${s.code} ${s.address || ''}`
          .toLocaleLowerCase()
          .includes(q)),
  );
}
export function spendComposition(rows: AnalyticsRow[], now = new Date()) {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totals = new Map<string, number>();
  for (const row of rows)
    if (calendarKey(row) === month) {
      const name = String(row.category || 'Other');
      totals.set(
        name,
        (totals.get(name) || 0) +
          metric(row, ['total_amount', 'total_expense', 'amount']),
      );
    }
  return [...totals]
    .map(([label, amount]) => ({ label, amount }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
