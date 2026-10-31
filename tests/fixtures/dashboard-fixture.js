// Disposable visual-review data only. Never imported by application source.
export function dashboardFixture(url, options = {}) {
  const now = new Date(),
    month = now.getMonth() + 1,
    year = now.getFullYear();
  if (url.endsWith('/dashboard/stats'))
    return {
      total_schools: 8,
      active_schools: 7,
      total_students: 2840,
      total_staff: 196,
      total_super_admins: 3,
    };
  if (url.endsWith('/schools'))
    return [
      ['QA Cedar Grove Academy', 'QA001', 'live', true],
      ['QA Riverdale School', 'QA002', 'live', true],
      ['QA Maple International', 'QA003', 'pending_build', true],
      ['QA Summit Public School', 'QA004', 'apk_delivered', true],
      ['QA Orchid School', 'QA005', 'suspended', false],
      ['QA Harbour Academy', 'QA006', 'live', true],
      ['QA Valley School', 'QA007', 'live', true],
      ['QA Northstar Academy', 'QA008', 'live', true],
    ].map(([name, code, onboarding_status, is_active], i) => ({
      id: i + 101,
      cluster_id: 'qa_cluster',
      name,
      code,
      address: 'Synthetic QA address',
      onboarding_status,
      is_active,
      created_at: new Date(year, month - 2, 10).toISOString(),
    }));
  if (url.endsWith('/founder/analytics')) {
    const incomeRows = [128000, 184000, 165000, 234000, 208000, 286500].map(
      (amount, i) => {
        const d = new Date(year, month - 6 + i, 1);
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          total_income: amount,
        };
      },
    );
    const expenseV2Rows = [81000, 95000, 87000, 132000, 119000, 146000].map(
      (amount, i) => {
        const d = new Date(year, month - 6 + i, 1);
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          total_amount: amount,
          category: 'Operations',
        };
      },
    );
    expenseV2Rows[5].total_amount = 96000;
    expenseV2Rows.push(
      { year, month, category: 'Travel', total_amount: 32000 },
      { year, month, category: 'Software', total_amount: 18000 },
    );
    return {
      pending: { pending_collections: 24500 },
      incomeRows,
      expenseV2Rows,
      expenseRoiRows: [],
      enquiryRows: [],
      closedDealsRows: [],
      conversionRows: [],
      costPerLeadRows: [],
    };
  }
  if (url.endsWith('/enquiries/stats'))
    return { enquiriesToday: 9, unassignedEnquiries: 7 };
  if (url.endsWith('/founder/expenses'))
    return [1, 2, 3, 4].map((id) => ({
      id: String(id),
      title: 'QA expense',
      amount: 2500,
      status: 'PENDING',
    }));
  if (url.endsWith('/business-units'))
    return [
      { id: 'qa-unit-a', name: 'QA Education' },
      { id: 'qa-unit-b', name: 'QA Learning Labs' },
    ];
  if (url.includes('/financial-summary')) {
    if (new URLSearchParams(location.search).get('state') === 'finance-error')
      throw new Error('Synthetic finance-only outage');
    const factor = { THIS_MONTH: 1, LAST_MONTH: 0.8, THIS_YEAR: 7.2, ALL: 12 }[
      options.params?.period || 'THIS_MONTH'
    ];
    return {
      period: options.params?.period || 'THIS_MONTH',
      business_unit_id: options.params?.business_unit_id || 'ALL',
      revenue: 286500 * factor,
      expenses: 146000 * factor,
      net_profit: 140500 * factor,
      profit_margin: 49.04,
      client_billing_collected: 219000 * factor,
      business_unit_collections:
        options.params?.business_unit_id === 'qa-unit-b'
          ? 18000 * factor
          : 47000 * factor,
      expenses_scope: 'platform',
    };
  }
}
