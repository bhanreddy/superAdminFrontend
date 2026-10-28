import type {
  ExpenseCategory,
  ExpenseRow,
  ExpenseStatus,
} from "../../types/founder";
export const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "MARKETING", label: "Marketing" },
  { value: "HOSTING", label: "Hosting" },
  { value: "TOOLS", label: "Tools & software" },
  { value: "TRAVEL", label: "Travel" },
  { value: "SALARY", label: "Salary" },
  { value: "MISC", label: "Miscellaneous" },
];
export const categoryLabel = (key: string) =>
  categories.find((c) => c.value === key)?.label || key;
export const indiaToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export function expenseDate(row: ExpenseRow): string {
  return (
    row.expense_date?.slice(0, 10) ||
    new Date(row.created_at).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    })
  );
}
export function filterExpenses(
  rows: ExpenseRow[],
  filters: {
    search: string;
    category: string;
    status: string;
    period: string;
    month: string;
  }
) {
  const query = filters.search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (filters.category === "ALL" || row.category === filters.category) &&
      (filters.status === "ALL" ||
        (filters.status === "UNPAID"
          ? row.status === "APPROVED" && !row.paid_at
          : row.status === filters.status)) &&
      (filters.period === "all" ||
        expenseDate(row).slice(0, 7) === filters.month) &&
      (!query ||
        `${row.title} ${row.description || ""} ${categoryLabel(row.category)}`
          .toLowerCase()
          .includes(query))
  );
}
export function expenseSummary(rows: ExpenseRow[]) {
  const sum = (status: ExpenseStatus, unpaid = false) =>
    rows
      .filter((row) => row.status === status && (!unpaid || !row.paid_at))
      .reduce((n, row) => n + Math.round(Number(row.amount) * 100), 0) / 100;
  return {
    approved: sum("APPROVED"),
    pending: sum("PENDING"),
    unpaid: sum("APPROVED", true),
    receipts: rows.filter(
      (row) => !row.receipt_url && row.status !== "REJECTED"
    ).length,
  };
}
export function expenseInputAmount(value: string): number {
  const clean = value.replace(/,/g, "").trim();
  if (
    !/^\d+(\.\d{1,2})?$/.test(clean) ||
    Number(clean) <= 0 ||
    !Number.isSafeInteger(Math.round(Number(clean) * 100))
  )
    throw new Error("Enter a positive amount with at most two decimal places.");
  return Number(clean);
}
