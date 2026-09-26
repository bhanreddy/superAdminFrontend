const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '../src/services/salesCommandQuery.ts');
const source = fs.readFileSync(sourcePath, 'utf8').replace("import type { SalesPeriod } from '../types/crm';\n\n", '');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, { module: sandbox, exports: sandbox.exports });
const { normalizeSalesFilters, salesCacheKey, acceptSalesResponse } = sandbox.exports;

test('sales command filters and cache identity', () => {
  const filters = normalizeSalesFilters({ period: 'week', timezone: 'Asia/Kolkata', metric: 'overdue' });
  assert.equal(filters.period, 'week');
  assert.equal(filters.timezone, 'Asia/Kolkata');
  assert.equal(filters.metric, 'overdue');
  const founderA = salesCacheKey('founder-a', filters);
  const founderB = salesCacheKey('founder-b', filters);
  assert.notEqual(founderA, founderB);
  assert.equal(acceptSalesResponse(founderA, founderA), true);
  assert.equal(acceptSalesResponse(founderA, founderB), false);
  const custom = normalizeSalesFilters({ period: 'custom', from_date: '2026-09-01', to_date: '2026-09-26', timezone: 'Asia/Kolkata' });
  assert.equal(custom.from_date, '2026-09-01');
  assert.equal(custom.to_date, '2026-09-26');
  const tracked = normalizeSalesFilters({
    period: 'month',
    attribution_model: 'latest',
    campaign_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    distribution_medium: 'QR',
  });
  assert.equal(tracked.attribution_model, 'latest');
  assert.equal(tracked.campaign_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(tracked.distribution_medium, 'QR');
  assert.equal(Object.prototype.hasOwnProperty.call(normalizeSalesFilters({ period: 'month' }), 'campaign_id'), false);
  const latestKey = salesCacheKey('founder-a', tracked);
  const firstKey = salesCacheKey('founder-a', normalizeSalesFilters({ period: 'month', attribution_model: 'first' }));
  assert.notEqual(latestKey, firstKey);
});
