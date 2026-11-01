# Practical budgets with distribution-plan guidance

## Objective
Improve current-month recurrent budgets without changing them automatically. User approved a distribution-plan summary in Budgets and practical management improvements. Recommended scope adopted: current-month recurring caps, no historical per-month budget model.

## Decisions and acceptance
- Read-only plan guide uses explicit group category assignments and Expenses/TargetOnly modes. No automatic budget creation or updates.
- Show allocation percentage and category-budget caps grouped under plan groups. General budgets and unassigned category caps stay separate; never double-count general plus category caps or savings goals.
- Monetary allocation targets require a reliable income basis; never imply incomplete/mixed-currency totals are authoritative. Percent-only guidance is acceptable while reliable totals are unavailable, with explicit explanatory copy.
- Edit existing budget limit and alert threshold without delete/recreate, preserving owner/category/currency/period/ID; server validates tenant access and inputs.
- Practical list: responsive layout, clear amount/currency, exceeded/near-limit prioritization, available/exceeded amounts, configured alert thresholds; retain existing data.
- Explicit budgets loading/error/retry distinct from empty; preserve last successful data on failed refresh. Useful mutation errors; no silent unauthenticated success.
- Existing budget/plan behavior stays independent, TargetOnly never implies contribution tracking.

## Tasks
- [x] P1 (independently verified; commit not authorized): Guide domain/component/wiring and deterministic tests for group caps, general/unassigned separation, disabled plan and target-only behavior.
- [x] P2 (independently verified; commit not authorized): Backend edit-limit/alert API with ownership validation and tests; document generated OpenAPI contract.
- [x] P3 (independently accepted; commit not authorized): Web edit flow, actionable list/alerts/responsive state handling and tests.
  - [x] P3a (independently accepted): Repository PUT/types and budget-resource helper integrate loading/error/retry/stale/client ordering. 293 incremental lines; RED missing resource/PUT then GREEN 112 tests/lint/build/diffcheck. Hook exposes budgetsLoading, budgetsError, refreshBudgets, updateBudget. Update returns {applied:true, refresh}; failed refresh after successful write is not mutation failure. create still Promise<void> but rejects missing client/write failure and preserves budgets. Independent 112 tests/diffcheck accepted helper/repo integration; no mounted hook/browser transition evidence, existing goals/health async guards unchanged.
  - [x] P3b (independently accepted): Edit form/local selection/Decimal validation/duplicate-submit guard. Initial BUILD FAIL on dashboard.updateBudget corrected after user-approved useDashboardData.ts passthrough (4 lines). Total 283 incremental lines. RED missing suites -> GREEN 136 tests/lint/build/diffcheck. Same planning instance; preserved readonly category/currency/period, precise existing threshold and integer percent save, failed write retains edits; applied+reloadfailed closes with warning not repeat PUT. Independent 136 tests/diffcheck accepted validation/currency scales, readonly metadata, duplicate protection and same-instance wiring. No mounted/browser evidence.
  - [x] P3c1 (independently accepted inline unit): Budgets resolveBudgetsLoadState/BudgetsLoadStatus (loading/error/stale/refreshing/ready) hides guide/chart/list without data; retry calls dashboard.refreshBudgets. Plan hook adds loadStatus (loading/loaded/error/stale)+reloadPlan via distribution-plan-load.ts guard (newer read/client cleanup/local edit discard late GET); guide claims not-configured only after load, stale warning+retry. RED 10 then 3+suite -> GREEN 157 tests/lint/build exit 0/diffcheck. Limitation: client switch keeps prior plan visible until new read resolves.
  - [x] P3c2 (independently accepted inline unit): Responsive actionable list in MonthlyBudgetView.tsx and buildBudgetRows in budget-calculator.ts. Prioritizes exceeded (red) then alert (amber, based on each budget's alertThreshold, e.g. 75%), then normal; shows exceeded amount ("Excedido USD 30.00") and available ("Disponible BTC 0.20000000") in original currency with correct decimals; responsive flex layout replaces min-w-[620px] table; priority summary chips ("1 excedido", "1 cerca del límite"); explanatory header copy updated. RED 6 -> GREEN 163 tests, lint and build pass, diffcheck clean.
- [x] P4 (verified; commit not authorized): Final independent checks:
  - Web: 20 test files, 163 tests passing; eslint clean; next build clean (exit 0).
  - Backend: dotnet build (0 warnings, 0 errors); dotnet test (112 tests passing across Architecture.Tests and Api.Tests; OpenApi spec generation test excluded per policy).
  - git diff --check: clean (no trailing whitespace / carriage returns).
  - No servers running, no manual DB mutations, no mobile edits. Commit/push/PR not authorized; all work remains uncommitted.

## Evidence and constraints
Previous feature: odd/tasks/distribution-plan-and-budgets.md, independently145backend/88web tests and builds pass. All changes still uncommitted; preserve prior19feature paths and unrelated external Topbar/page-width edits. No commits/staging/push/PR without explicit request. No servers, installs, real database mutations, migration edits or mobile work.
Prior known backend metrics issues: pagination cap (repository must be checked; conflicting100 vs1000 call-site reports), unconverted currency sums, transfer reversal identity. Do not silently treat as fixed or expand into broad metrics redesign. Per-test API factories isolate SQLite/rate limit; preserve production limiter.
Use test-first for deterministic changes and ordinary structural verification for copy/static layout. Each writer unit targets <=400diff lines; split before expanding multi-area scope. Native RDD previouslyoff; read status before final completion. No browser claim without observed browser verification.

## P1 evidence
Writer completed six files,296 incremental lines. Domain grouping separates currencies/general/unassigned caps and excludes inactive/non-monthly limits, deduplicating IDs; TargetOnly has no spending/monetary metrics. Removed generic503020 chart from Budgets guide, retaining other goals/health. Test-first RED4 domain then7 combined failures -> GREEN96web tests (baseline88); lint/build/diffcheck pass. Existing plan hook reused. No income-allocation amount claim. No browser evidence; neutral unavailable state until P3 adds explicit load/error. ASSESS unavailable due untracked declaration -> independent verifier ran96 tests and accepted grouping, but blocked P1 on a conflicting fixed50/30/20 tile in HealthIndicatorsCard. Narrow correction complete: optional showDistributionReference defaults true, Budgets passes false,3column layout preserves other indicators/default consumers.58 incremental lines; RED hidden-reference regression then GREEN99tests/lint/build/diffcheck. Independent recheck accepted P1:99tests pass/diffcheck clean, guide grouping and scoped hidden reference verified. Browser remains untested. No broader metrics change.

## P2 map
Budget.UpdateLimit already exists; alert threshold fraction(0,1]. Add UpdateBudgetRequest(LimitAmount,AlertThreshold) and PUT /v1/planning/budgets/{id}; authenticate, tenant-owned lookup/notfound, validate before mutation, preserve currency/category/period/identity. Existing repository update method; no migration. Surfaces: PlanningDtos.cs, BudgetService.cs, PlanningEndpoints.cs, ApiIntegrationTests.cs and generated docs/openapi.json.

## P2 evidence
Writer implemented PUT with204success/400invalid/401unauthorized/404missing-foreign-inactive; nullable required transport handles missing/null without500. Validates amount after currency rounding, preserves original currency/category/period/identity. RED17new405failures +7priorpass -> finalGREEN27budgettests incl20regressions; exporter1/build0warnings0errors/diffcheck pass.209authored+93generated lines. PostgreSQL alert threshold(3,2) precision risk flagged, no migration. Independent P2 accepted27tests/build0warnings0errors/diffcheck. Precision risk also exists on create, not a new observed PUT regression; record follow-up and use integer percent alert UI. Native assessment unassessable due untracked declaration so separate verification performed.

## Next step
All tasks P1–P4 complete and verified. Work remains uncommitted as requested. Ready for human inspection or explicit commit/branch authorization. Keep units bounded and no parallel writers. Preserve existing uncommitted work.
