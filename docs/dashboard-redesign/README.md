# Executive dashboard rebuild

The home route and Founder Console now share a new executive dashboard. The design uses an emerald financial panel, warm neutral surfaces, a single row of network metrics, an operational review queue, collection/spending history, a searchable school portfolio and a searchable workspace directory.

## Architecture

- `app/(app)/index.tsx` chooses the dashboard for the authenticated role. Accountant password redirects, sales, implementation, support and generic-role dashboards retain their existing destinations.
- `src/screens/founder/FounderDashboardScreen.tsx` points to the same executive implementation as home.
- `ExecutiveDashboard.tsx` owns page composition and financial-period/unit selection.
- `useDashboardData.ts` owns independent, scoped resources. Changing the finance period reloads finance only. Retries work per source, incomplete payloads cannot become zero-valued metrics, and late responses cannot overwrite a newer selection. Account/cluster changes remount the workspace.
- `dashboardModel.ts` owns aggregation, lifecycle filtering and currency formatting. Multiple categories are summed within a calendar month; missing months remain gaps. Financial values keep paise when present.
- `DashboardFinance.tsx`, `DashboardOperations.tsx`, `SchoolPortfolio.tsx`, `CollectionsChart.tsx` and `WorkspaceDirectory.tsx` own individual sections.
- `DashboardPrimitives.tsx` and `dashboardStyles.ts` provide opaque light/dark surfaces, readable text, focusable actions, 44px controls and consistent section states.
- `dashboardWorkspaces.ts` provides the destination catalog. Relevant effective permissions filter school/team/import actions; the existing route guard and backend remain authoritative.

The global shell removes its extra padding for the executive routes. Other role dashboards and feature routes retain the original shell layout. There are no added runtime dependencies.

## Data and behavior

Financial pulse uses the existing financial-summary endpoint with a real period selection. Books revenue, expenses and net result remain platform-wide. Client billing receipts and selected business-unit collections are clearly distinguished. The trend chart shows approved operational collections/expenses, not Books revenue. It supports three/six calendar months and an accessible values view. Unsupported month-over-month claims, industry comparisons and inferred pipeline stages were removed.

The review queue uses actual unassigned-enquiry totals, actual pending expense records and the pending collection amount. It does not treat monetary amounts as record counts. Approval links use the existing approval authority. School search supports name/code/address and All/Live/Onboarding/Paused filters. School links preserve the row's cluster context. Full management workflows remain in their existing feature screens.

## Local preview

The read-only fixture serves actual route components with synthetic data. No live API connections or mutations are permitted.

```sh
PHASE8_PREVIEW_PORT=47942 node tests/phase8-preview.cjs
```

- Light preview: http://127.0.0.1:47942/?dashboard=1
- Dark preview: http://127.0.0.1:47942/?dashboard=1&dark=1
- Finance-only error: http://127.0.0.1:47942/?dashboard=1&state=finance-error
- All-source failure: http://127.0.0.1:47942/?dashboard=1&state=error
- Loading: http://127.0.0.1:47942/?dashboard=1&state=loading
- Empty data: http://127.0.0.1:47942/

`tests/fixtures/dashboard-fixture.js` is test-only and is not imported by application code.

## Validation

TypeScript, lint, all 122 frontend tests, the production web export, Android JavaScript export and iOS JavaScript export pass. The route audit reports no unresolved static destinations. Twelve new dashboard tests cover aggregation, missing/negative history, school filtering, stale-response handling, retry recovery, independent data failures, cluster-aware links, workspace permission/search behavior, specialist/accountant routing and light/dark contrast.

The source contains responsive layouts for phone, tablet and desktop. **Visual browser review and screenshots could not be completed:** local browser use is disabled in Work settings. The preview is provided for manual review; the earlier Phase 8 screenshots do not depict this rebuild. Signed native installation, screen-reader/device acceptance and authenticated staging workflows were not performed. JavaScript exports do not establish native-device acceptance.

No backend changes, database mutations or deployment were performed for this rebuild.
