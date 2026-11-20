# Budget distribution overrun charts with shadcn

## Objective
Provide visual comparative charts and status indicators in the Budget Distribution card using shadcn UI charts, allowing users to immediately see whether their configured category budget limits exceed their income distribution rule (e.g. 50% Necesidades = 1000 Bs allocated vs 1180 Bs budgeted = 180 Bs overrun) and if actual spending exceeds the rule.

## Decisions and acceptance
- Calculate comparative metrics for each distribution group:
  - Target amount from income (rule percentage * income).
  - Configured budget caps (sum of active monthly budget limits assigned to the group's categories).
  - Spent amount (sum of spent amounts in those categories).
  - Overrun status and difference (budgeted vs target, spent vs target).
- In `BudgetDistributionCard`:
  - Integrate shadcn chart (`ChartContainer`, `ChartTooltip`, `BarChart`) comparing "Cupo (Regla)" vs "Presupuestado" per group.
  - Highlight overruns prominently with warning/rose badge (`+180 Bs excedido` / `118%`).
  - Keep the income distribution donut available via tab/mode toggle ("Comparativa" / "Porcentajes").
  - Show breakdown of assigned category budgets under each group.
  - Handle TargetOnly buckets (savings/investments) appropriately without spending metrics.
  - Surface unassigned category budgets if any exist.
- Wire `budgets` and category resolution into `BudgetDistributionCard` from `BudgetsTabView`.
- Zero database changes, strictly client-side presentation & domain calculation.
- Write deterministic unit tests for calculation logic and component rendering.

## Tasks
- [x] T1: Domain calculation helper for budget distribution overrun comparison (`budget-distribution-metrics.ts` and unit tests).
- [x] T2: Enhanced `BudgetDistributionCard` with shadcn comparative bar chart, overrun alert badges, and category breakdown.
- [x] T3: Connect `BudgetsTabView` with updated props, verify with integration tests and regression suite.

## Verification evidence
- T1: `budget-distribution-metrics.test.ts` verified target calculations, category aggregations, overrun detection and unassigned handling (3/3 tests pass).
- T2: `BudgetDistributionCard.test.tsx` verified overrun badges, margin calculations and adjust rule controls (3/3 tests pass).
- T3: `BudgetsTabView.test.tsx` verified overrun rendering when category budgets exceed the plan (12/12 tests pass).
- Full web regression suite: 51 test files, 253 tests pass (`pnpm --dir web test`).
- Web lint & build: `pnpm --dir web lint` and `pnpm --dir web build` pass with exit code 0.
- Backend: `dotnet build backend/` clean (0 warnings, 0 errors).
