import { superAdminClient as client } from './superAdminClient';
let booksCompanyId: string | null = null;
export const setBooksCompany = (id: string | null) => { booksCompanyId = id; };
client.interceptors.request.use(config => {
  if (String(config.url || '').startsWith('/api/super-admin/books') && booksCompanyId) config.headers.set('X-Books-Company-Id', booksCompanyId);
  return config;
});
export const BOOKS_BASE = '/api/super-admin/books';
export type DocumentKind =
  | 'quote'
  | 'sales_order'
  | 'invoice'
  | 'credit_note'
  | 'purchase_order'
  | 'bill'
  | 'expense'
  | 'vendor_credit'
  | 'delivery_challan';
export interface Contact {
  id: string;
  kind: 'customer' | 'vendor' | 'both';
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  state_code: string;
  payment_terms: number;
  active: boolean;
}
export interface Item {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  hsn_sac: string;
  sale_rate: string | number;
  purchase_rate: string | number;
  tax_rate: number;
  track_inventory: boolean;
  stock_milli: string | number;
  active: boolean;
}
export interface Account {
  code: string;
  name: string;
  type: string;
  is_cash: boolean;
  cash_flow_activity?: string | null;
  balance?: string | number;
}
export interface Settings {
  organization_name: string;
  address: string;
  gstin: string;
  state_code: string;
  currency: string;
  fiscal_year_month: number;
}
export interface BookLine {
  item_id: string | null;
  description: string;
  hsn_sac: string;
  quantity_milli: number;
  rate: number;
  discount: number;
  tax_rate: number;
  amount: number;
  tax: number;
  document_discount?: number;
}
export interface Payment {
  id: string;
  document_id: string;
  date: string;
  amount: string | number;
  account_code: string;
  method: string;
  reference: string;
  status: string;
  number?: string;
  kind?: string;
  contact_name?: string;
}
export interface BookDocument {
  id: string;
  kind: DocumentKind;
  number: string;
  contact_id: string | null;
  contact_snapshot: Contact;
  organization_snapshot: Settings;
  date: string;
  due_date: string | null;
  reference: string;
  notes: string;
  subject?: string;
  salesperson?: string;
  terms?: string;
  discount_type?: 'amount' | 'percent';
  discount_value?: number | string;
  discount_total?: number | string;
  adjustment?: number | string;
  adjustment_description?: string;
  challan_type?: string;
  lines: BookLine[];
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  balance: string | number;
  settled: string | number;
  status: 'draft' | 'posted' | 'void';
  tax_breakup: { cgst: number; sgst: number; igst: number };
  paid_account: string | null;
  payments?: Payment[];
  credits?: {
    id: string;
    credit_id: string;
    document_id: string;
    amount: string | number;
  }[];
}
export interface LineInput {
  item_id?: string | null;
  description: string;
  hsn_sac?: string;
  quantity: string;
  rate: string;
  discount: string;
  tax_rate: string;
}
export interface DocumentInput {
  kind: DocumentKind;
  contact_id?: string;
  date: string;
  due_date?: string;
  reference: string;
  notes: string;
  subject?: string;
  salesperson?: string;
  terms?: string;
  discount_type?: 'amount' | 'percent';
  discount_value?: string;
  adjustment?: string;
  adjustment_description?: string;
  challan_type?: string;
  lines: LineInput[];
  paid_account?: string;
  state_code?: string;
}
export interface StatementAccount { code: string; name: string; type: string; amount: number }
export interface LedgerReport {
  organization_name: string; currency: string; account: Account; from: string; to: string; opening_balance: number; closing_balance: number;
  period_debit: number; period_credit: number; total: number; page: number; page_size: number;
  data: { id: string; journal_id: string; date: string; reference: string; source: string; notes: string;
    debit: string; credit: string; running_balance: number; reversal_of: string | null }[];
}
export interface Report {
  organization_name: string;
  currency: string;
  profit_loss: { income: StatementAccount[]; expenses: StatementAccount[]; total_income: number; total_expenses: number; net_profit: number };
  balance_sheet: { as_of: string; assets: StatementAccount[]; liabilities: StatementAccount[]; equity: StatementAccount[];
    total_assets: number; total_liabilities: number; owner_equity: number; prior_earnings: number; period_earnings: number;
    accumulated_earnings: number; total_equity: number; liabilities_and_equity: number; difference: number };
  cash_flow: { method: string; opening_cash: number; closing_cash: number; net_change: number; difference: number; classification_complete: boolean;
    activities: { activity: string; inflow: number; outflow: number; net: number; journal_count: number }[] };
  from: string;
  to: string;
  income: number;
  expenses: number;
  profit: number;
  cash: number;
  assets: number;
  liabilities: number;
  equity: number;
  retained: number;
  receivables: number;
  payables: number;
  aging_as_of: string;
  trial: (Account & {
    debit: string;
    credit: string;
    period_debit: string;
    period_credit: string;
    opening_balance: number;
    balance: number;
    period_balance: number;
  })[];
  aging: {
    id: string;
    number: string;
    kind: string;
    contact_name: string;
    balance: string;
    bucket: string;
    source?: string;
    due_date: string | null;
  }[];
  cashflow: { month: string; inflow: string | number; outflow: string | number }[];
  taxes: {
    kind: string;
    taxable: string;
    tax: string;
    cgst: string;
    sgst: string;
    igst: string;
  }[];
}
export type DashboardReport = Pick<Report, 'from' | 'to' | 'income' | 'expenses' | 'profit' | 'cash' | 'receivables' | 'payables' | 'aging_as_of' | 'cashflow'>;
export const labels: Record<DocumentKind, string> = {
  quote: 'Quotes',
  sales_order: 'Sales orders',
  invoice: 'Invoices',
  credit_note: 'Credit notes',
  purchase_order: 'Purchase orders',
  bill: 'Bills',
  expense: 'Expenses',
  vendor_credit: 'Vendor credits',
  delivery_challan: 'Delivery challans',
};
export const singular: Record<DocumentKind, string> = {
  quote: 'Quote',
  sales_order: 'Sales order',
  invoice: 'Invoice',
  credit_note: 'Credit note',
  purchase_order: 'Purchase order',
  bill: 'Bill',
  expense: 'Expense',
  vendor_credit: 'Vendor credit',
  delivery_challan: 'Delivery challan',
};
export { money, decimal } from '../utils/booksMoney';
export const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const message = (e: any) =>
  e?.response?.data?.details || e?.message || 'Unable to complete this action.';
export const get = async <T = any>(path: string, params?: object): Promise<T> =>
  (await client.get(`${BOOKS_BASE}${path}`, { params })).data;
export const post = async <T = any>(
  path: string,
  body: unknown = {},
): Promise<T> => (await client.post(`${BOOKS_BASE}${path}`, body)).data;
export const put = async <T = any>(path: string, body: unknown): Promise<T> =>
  (await client.put(`${BOOKS_BASE}${path}`, body)).data;
export const remove = async (path: string) =>
  (await client.delete(`${BOOKS_BASE}${path}`)).data;
export const printHtml = async (id: string): Promise<string> =>
  (
    await client.get(
      `${BOOKS_BASE}/documents/${encodeURIComponent(id)}/print`,
      { responseType: 'text' },
    )
  ).data;
export function requestKey(): string {
  const crypto = (globalThis as any).crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  if (crypto?.getRandomValues) {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    const s = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }
  // A request ID is an idempotency key, never an authentication credential.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
