# Simple goals and real financial health

## Objective
Make savings goals and financial health understandable, responsive and truthful using real account balances and transaction data. Backend/web only; no mobile, AI calls, synthetic money movements or implicit FX.

## Scope and decisions
- Goals follow their linked account's entire balance, not reserved contributions. Preserve existing shared-account goals, disclose sharing, remove misleading aggregate totals.
- Validate matching currencies for new links and expose invalid/unavailable/unlinked tracking states for legacy data without schema changes.
- Health separates currencies, percentages use one unit, negative cash flow remains visible, missing income/expenses is not fabricated as zero health or twelve months of coverage.
- Present current-month cash flow and current balances honestly; do not claim dedicated emergency-fund coverage or debt-service affordability without data.
- Action leads to existing accounts navigation, never fake goal contributions. Future-date monthly guidance only for valid tracked goals.
- Preserve unrelated and pre-existing changes. No installs, DB mutations, servers, push or PR; no existing migration edits. User now explicitly authorized conditional commits and selected isolating only our planning work in a separate same-clone branch/worktree. Staging/commits allowed only there after candidate checks; exclude peer mobile/loan work.

## Tasks
- [x] S1 — Currency-safe backend health and truthful goal tracking, tests and generated OpenAPI. Independently verified on isolated candidate; committed as cc6c3dc. PostgreSQL runtime proof remains a separate validation limitation in S3.
- [x] S2 — Resilient overview resource and compact responsive goals/month UI; coherent goal creation and accounts navigation; focused tests. Writer checks passed; independent review in S3.
- [ ] S3 — Independent functional/structural verification, full applicable checks, reconcile findings and record limitations. Code review/checks passed; browser visual/mounted interactions not available, final contract artifact pending.
- [ ] S4 — Isolate planning/distribution/budgets/goals work in a dedicated same-clone branch/worktree, verify independent candidate and create focused Conventional Commits. In progress.

## Acceptance
- Mixed currencies never aggregate; transfers excluded from monthly income/expenses; complete monthly activity rather than silently capped sums.
- Valid goal balance reflects same-currency linked account. Missing/archived/wrong-currency links never appear as valid progress.
- No double percentage conversion, fake emergency months, fixed health thresholds, default FX totals or fake contribution action.
- Loading/error/empty and stale states distinct, retry is read-only, stale async responses cannot overwrite newer state.
- Short Spanish UI copy, no duplicated health KPIs, clear real suggestions only when inputs support them, long values fit narrow layouts.

## Evidence and progress
- Read-only explorer mvwwovl2-3-h1s3 mapped defects and files.
- Current branch: feat/web-ui-redesign-drawers-charts; extensive pre-existing modifications must be preserved.
- S1 writer mvwwtuwy-4-9qfk stopped before edits: actual transaction contract is Ledger.Application/Abstractions/ITransactionRepository.cs, not the initially listed Domain path; existing list query clamps at100.
- User explicitly approved adding backend/src/Modules/Ledger/Ledger.Application/Abstractions/ITransactionRepository.cs to S1 allowed surfaces through the blocking choice. Resume same writer with corrected scope.
- S1 writer mvwwxxfo-5-9hcv implemented backend with observed RED/GREEN. New focused tests3 and related7 passed; dotnet build0 warnings/errors; diffcheck clean.
- Full backend test:110 passed plus LoanLifecycle_SimulateCreateAndRegisterPayment_ShouldCascadeAllocate failed in RelationalLoanTransaction.ExecuteAsync (requires closed connection/no active transaction). Isolated reproduction confirmed. Peer session01a1937b-2375-7052-b313-f48ab7a9e481 owns loan/transaction work; notified and released overlapping Ledger/Lending surfaces for its reversal work. Next writer web-only. No agent rollback of peer work.
- Health contract now MonthStartUtc,MonthEndUtcExclusive,Currencies[{Currency,MonthlyIncome,MonthlyExpenses,NetCashFlow,SavingsRatePercentage?,CurrentBalance,OutstandingDebtPrincipal}]. Goal adds AccountName?,TrackingStatus(tracked/unlinked/unavailable/currency_mismatch),SharedGoalCount; progress fields nullable.
- Native ASSESS unassessable due undeclared untracked files; RDD off; separate independent verifier required. No independent acceptance, browser evidence or commits yet.
- S2 writer mvwxkz5z-6-4v96 added planning-overview-resource.test.ts and observed RED (resource absent), then incorrectly requested Split503020Chart.tsx scope although exact path was already listed. Parent clarified unchanged authorization; resumed as mvwxo4p0-7-huyk with full original surfaces. No human scope expansion required.
- Peer loan session repaired API test factory shared SQLite connections and reports API114/114 passing/build0warnings. Factory released for read-only checks. Peer owns single OpenAPI regeneration after T2 loan cancellation endpoint; our writing test remains on hold.
- S2 writer mvwxo4p0-7-huyk complete: resource/model RED then GREEN, focused28 tests; full web24 files176tests, lint/build/diffcheck passed. About450 authored additions; no visual/mounted-browser evidence. No commits.
- Independent backend verifier mvwy7jvr-8-17jj completed: build0warnings/errors, all174backend tests passed (113Api +6Architecture +other suites; excludes OpenAPI-writing test), diffcheck clean. No material S1 findings. Backend Ledger ownership released to peer for T2. Raw parameterized aggregate SQL tested SQLite; production PostgreSQL execution not independently proven.
- Independent web verifier mvwy9boa-9-464e completed:24files176tests, lint, build, diffcheck all passed; no blocking functional/structural findings. Resource identity/race safety, goal status/navigation, currency display and nullable percentage contract reviewed.
- Parent repeated focused resource/model tests:2files8tests passed. No independent claim of writer RED history.
- No browser automation harness installed in web package; mounted interactions and visual layout remain unverified. No server started or install performed. JS number DTO precision at very large magnitudes remains unproven (pre-existing transport design).
- Source implementation accepted by independent reviewers; feature checklist intentionally remains open for coordinated OpenAPI artifact and unavailable browser validation. No stages/commits/push/PR; no real DB changes.

## Next step
Backend/API commit cc6c3dc created in feat/planning-goals-health at /Users/sauterdev/Dev/billefy-planning-delivery. Independent isolated checks: backend168 plus OpenAPI1, web176/lint/build pass. Parent expanded dense CreateGoalModal formatting only and repeated full176 web tests plus file lint/diffcheck successfully. Backend commit includes tests and generated API contract. Web commit and final delivery records still pending; never stage web/node_modules symlink. Source branch/mobile/loans remain untouched. Browser/mounted interactions and PostgreSQL runtime are not verified; S3 stays open for those checks. No push.
