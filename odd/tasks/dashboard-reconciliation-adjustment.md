# Dashboard reconciliation adjustment classification

## Objective
Ensure explicitly marked reconciliation adjustments are not presented as expenses in dashboard recent activity or cash-flow summaries.

## Acceptance criteria
- Marked adjustments appear as “Ajuste” in recent activity, not as an expense or income.
- Adjustments are absent from the Gastos/Ingresos filter results and cannot open the ordinary transaction edit flow.
- Dashboard cash-flow charts and totals exclude marked adjustments while regular income/expenses remain unchanged.
- Account balance derivation continues to include adjustment entries.

## Scope / constraints
- Platform: web dashboard.
- Preserve all dirty working-tree changes and unrelated edits.
- Use the explicit `isReconciliationAdjustment` marker; never infer classification from transaction descriptions.
- Do not change balance math or backend contracts/migrations in this follow-up.
- No staging, commits, push, PR, servers, or real database mutations.

## Tasks
- [x] T1 — Trace dashboard activity and cash-flow consumption and add focused regression tests.
- [x] T2 — Render adjustments distinctly in activity and exclude them from dashboard income/expense filtering and cash-flow totals.
- [x] T3 — Run focused checks, inspect the final diff, and report remaining caveats.

## Evidence
- Read-only scout found the original fix covers `MovimientosView`, but dashboard activity uses `TransactionsList`, which classifies only by `direction` and still allows ordinary edit.
- Dashboard chart is `CashFlowAreaChart`; it separately derives income/expense buckets from transaction direction and bypasses the shared `getActiveFlowTransactions` helper that already excludes marked adjustments.
- New reconciliation rows carry the marker through `/v1/transactions`; existing rows created before the marker migration may have `false` and cannot be safely identified by description alone. This follow-up deliberately does not apply an unsafe description heuristic or data backfill.

## Verification
- RED observed for new direction-filter regression tests before implementation.
- Independent focused tests passed: `TransactionsList.test.tsx` (2 tests) and `monthly-analytics.test.ts` (13 tests); `git diff --check` clean.
- Source review confirms adjustment rows are displayed in the unfiltered activity list, excluded from income/expense filters, and cannot open the ordinary edit flow; cash-flow chart now calls the existing active-flow helper that excludes adjustments.
- No direct render test for the activity label/edit interaction or direct chart-component integration test; those behaviors were source-reviewed, while filtering and shared helper exclusions are tested.
- Historical rows without `isReconciliationAdjustment` remain unresolved; safe classification requires trustworthy row identity, and description heuristics were intentionally avoided. The prior migration was generated but not applied. Native ASSESS is unassessable due undeclared untracked files; RDD is off. Independent verification was performed; broader suite outcome is not confirmed in this task.

## Commit evidence
- No commit created; user has not authorized delivery/commit.