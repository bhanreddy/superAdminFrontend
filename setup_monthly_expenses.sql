-- Drop views first to avoid return type mismatch errors during REPLACE
DROP VIEW IF EXISTS public.monthly_expense_summary CASCADE;
DROP VIEW IF EXISTS public.monthly_expense_summary_v2 CASCADE;

-- ── monthly_expense_summary (For ROI) ──────────────────────
CREATE VIEW public.monthly_expense_summary AS
SELECT 
  EXTRACT(year FROM created_at) AS year,
  EXTRACT(month FROM created_at) AS month,
  SUM(amount) AS total_amount
FROM public.expenses
WHERE status = 'APPROVED'
GROUP BY EXTRACT(year FROM created_at), EXTRACT(month FROM created_at);

-- ── monthly_expense_summary_v2 (For Category Breakdown) ────
CREATE VIEW public.monthly_expense_summary_v2 AS
SELECT 
  EXTRACT(year FROM created_at) AS year,
  EXTRACT(month FROM created_at) AS month,
  category,
  SUM(amount) AS total_amount
FROM public.expenses
WHERE status = 'APPROVED'
GROUP BY EXTRACT(year FROM created_at), EXTRACT(month FROM created_at), category;

GRANT SELECT ON public.monthly_expense_summary TO authenticated;
GRANT SELECT ON public.monthly_expense_summary_v2 TO authenticated;

NOTIFY pgrst, 'reload schema';
