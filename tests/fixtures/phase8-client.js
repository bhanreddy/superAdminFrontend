// Browser-side boundary used only by phase8-preview.cjs. All values are synthetic.
import { getRolePermissions } from './src/constants/rbac';
const params = new URLSearchParams(location.search);
const self = { id: '10000000-0000-4000-8000-000000000001', full_name: 'QA Demo User', employee_id: 'QA-001', role: 'FOUNDER' };
const permissions = getRolePermissions(params.get('role') || 'FOUNDER');
const school = { id: 101, name: 'QA Academy', school_name: 'QA Academy', code: 'QA101', city: 'Hyderabad', state: 'Telangana', address: 'Synthetic QA address', school_code: 'QA101', is_active: true, onboarding_status: 'pending_build', cluster_id: 'qa_cluster', student_count: 120, staff_count: 12 };
const report = { organization_name: 'QA Books', currency: 'INR', from: '2026-04-01', to: '2026-10-30', aging_as_of: '2026-10-30', income: 0, expenses: 0, profit: 0, cash: 0, assets: 0, liabilities: 0, equity: 0, retained: 0, receivables: 0, payables: 0, trial: [], aging: [], cashflow: [], taxes: [], profit_loss: { income: [], expenses: [], total_income: 0, total_expenses: 0, net_profit: 0 }, balance_sheet: { as_of: '2026-10-30', assets: [], liabilities: [], equity: [], total_assets: 0, total_liabilities: 0, total_equity: 0, owner_equity: 0, prior_earnings: 0, period_earnings: 0, accumulated_earnings: 0, liabilities_and_equity: 0, difference: 0 }, cash_flow: { method: 'direct', opening_cash: 0, closing_cash: 0, net_change: 0, difference: 0, classification_complete: true, activities: [] } };
function body(url) {
  if (url === '/api/v1/medical/shops/101/build-config') return { data: { env_file: '# Synthetic local QA configuration', tauri_config_changes: { productName: 'QA Medical' }, setup_commands: [], subscription_info: { razorpay_plan_id: null, subscription_status: 'trialing', trial_ends_at: null } } };
  if (url === '/api/v1/medical/shops') return { data: [] };
  if (url.includes('/books/')) {
    if (url.endsWith('/organizations')) return [{ id: 'qa-company', code: 'nexsyrus', name: 'QA Books · synthetic', permissions }];
    if (url.endsWith('/bootstrap')) return { settings: { organization_name: 'QA Books', currency: 'INR', state_code: '36', fiscal_year_month: 4 }, stats: { contacts: 0, items: 0, documents: 0 } };
    if (url.endsWith('/lookups')) return { contacts: [], items: [], accounts: [], payments: [], projects: [] };
    if (url.endsWith('/dashboard') || url.endsWith('/reports')) return report;
    if (url.endsWith('/access/options')) return { companies: [], leads: [] };
    if (url.endsWith('/documents')) return { data: [], total: 0 };
    if (url.endsWith('/settings')) return { organization_name: 'QA Books', currency: 'INR', state_code: '36', fiscal_year_month: 4 };
    if (url.endsWith('/connections')) return { summary: [], rows: [], limit: 100 };
    return [];
  }
  if (url.includes('/connect/')) {
    if (url.endsWith('/bootstrap')) return { organization: { id: 'qa-org', name: 'QA company' }, self, can_manage: true, channels: [{ id: '20000000-0000-4000-8000-000000000001', name: 'general', purpose: 'Local QA only', visibility: 'public', category: 'company', joined: true, can_manage: true, unread_count: 0 }], direct_messages: [], unread_notifications: 0, preferences: { mode: 'mentions', push_enabled: false } };
    if (url.endsWith('/messages')) return { messages: [], has_more: false, last_sequence: 0 };
    if (url.endsWith('/employees')) return [self];
    return [];
  }
  if (url.endsWith('/dashboard/stats')) return { total_schools: 1, active_schools: 1, total_students: 120, total_staff: 12, total_super_admins: 1 };
  if (url.endsWith('/schools')) return params.get('state') === 'empty' ? [] : [school];
  if (/\/schools\/101$/.test(url)) return school;
  if (url === '/api/super-admin/schools/101/health') return { student_count: 120, staff_count: 12, user_count: 132, last_activity: null, defaults_seeded: false, first_admin_exists: false };
  if (url.endsWith('/features')) return { school_id: 101, features: [] };
  if (url.endsWith('/configuration')) return { school_id: 101, draft: null, jobs: [], assets: [], diagnostics: [] };
  if (url.endsWith('/analytics')) return { pending: {}, monthlyIncome: [], monthlyExpenses: [], monthlyEnquiries: [], monthlyClosedDeals: [], monthlyExpensesV2: [], monthlyExpensesRoi: [], conversionRate: [], costPerLead: [] };
  if (url.includes('financial-summary')) return { revenue: 0, client_billing_collected: 0, expenses: 0, net_profit: 0, profit_margin: null, business_unit_id: 'ALL' };
  if (url.endsWith('/settings')) return { value: null };
  if (url.endsWith('/enquiries/stats')) return { enquiriesToday: 0, unassignedEnquiries: 0 };
  if (url.endsWith('/users/permissions')) return [];
  if (url.endsWith('/users')) return { data: [], total: 0 };
  if (url.endsWith('/support/tickets')) return { data: [], stats: { open: 0, resolved: 0, critical: 0, escalated: 0 } };
  if (url.includes('/checklist')) return { success: true, data: { schoolId: 101, items: [], progress: { total: 0, completed: 0, percentage: 0 } } };
  if (url.endsWith('/requirements')) return { data: [], total: 0 };
  if (url.includes('/workspace/')) return { summary: {}, schools: [], tasks: [], alerts: [], activity: [], stats: {} };
  if (url.endsWith('/business-units')) return [];
  if (url.endsWith('/students') || url.endsWith('/admins') || url.endsWith('/notifications') || url.endsWith('/founders')) return [];
  // Unsupported fixture contracts fail explicitly; they are recorded as gaps,
  // never silently treated as successful live integration tests.
  throw new Error(`QA fixture has no response contract for ${url}`);
}
async function get(url) {
  const state = new URLSearchParams(location.search).get('state');
  if (state === 'loading') return new Promise(() => {});
  if (state === 'error') throw new Error('QA simulated network failure. Retry is available where the screen supports it.');
  return { data: body(url) };
}
const blocked = async () => { throw new Error('QA fixture is read only; this action did not change production data.'); };
export const superAdminClient = { get, post: blocked, put: blocked, patch: blocked, delete: blocked, defaults: { headers: {} }, interceptors: { request: { use() {} }, response: { use() {} } } };
export const setGlobalBackendUrl = () => {};
export const setAuthInvalidationHandler = () => {};
