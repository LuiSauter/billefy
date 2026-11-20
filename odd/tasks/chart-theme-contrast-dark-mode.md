# Chart theme contrast and dark mode support

## Objective
Fix dark mode and light mode contrast across all charts in the application. Remove broken `hsl(var(--...))` evaluations (which caused SVG text to fall back to black `#000000` in dark mode), remove hardcoded dark-only colors (e.g. `#131B2E` / `#64748b`), add global recharts SVG text styling tokens, and verify high visual appeal across light and dark themes.

## Decisions and acceptance
- In `globals.css`:
  - Added base recharts styles so `.recharts-cartesian-axis-tick text`, `.recharts-text`, and axis labels always render with `var(--muted-foreground)` (`#64748b` in light, `#94a3b8` in dark).
  - Ensured grid lines adapt to `var(--border)`.
  - Ensured default recharts tooltips use `var(--popover)` and `var(--popover-foreground)`.
- In `MonthProjectionChart.tsx`:
  - Fixed invalid `hsl(var(--...))` to `var(--...)`.
  - Fixed projection pill text color for dual theme (`text-purple-600 dark:text-purple-300`).
  - Fixed tooltip text contrast using popover tokens.
- In `BudgetDistributionCard.tsx`:
  - Fixed `hsl(var(--...))` in chart config, bars, and donut tooltips.
  - Set explicit `tick={{ fill: "var(--muted-foreground)" }}` on XAxis and YAxis.
- In `AccountsAnalyticsSidePanels.tsx`:
  - Replaced hardcoded `stroke="#64748b"` with theme-aware `var(--muted-foreground)`.
  - Fixed tooltip `contentStyle`, `itemStyle`, and `labelStyle` colors.
  - Dual theme pill styling: `text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/30`.
- In `GoalsSummaryPanel.tsx`:
  - Replaced hardcoded dark-only background (`bg-[#131B2E] border-[#1E293B] text-white`) with theme tokens (`bg-card border-border text-foreground`).
  - Adapted progress tracks and labels to dual theme.
- In `BudgetsComparisonChart.tsx`, `LendingOverviewChart.tsx`, `CashFlowAreaChart.tsx`:
  - Ensured XAxis and YAxis use `tick={{ fill: "var(--muted-foreground)" }}`.
- Verified full test suite passes and build completes with 0 errors.

## Tasks
- [x] T1: Global recharts theme rules in `globals.css` and `shared/ui/chart.tsx`.
- [x] T2: Fix broken `hsl()` and contrast in planning charts (`MonthProjectionChart.tsx`, `BudgetDistributionCard.tsx`, `GoalsSummaryPanel.tsx`).
- [x] T3: Fix contrast in ledger and lending charts (`AccountsAnalyticsSidePanels.tsx`, `CashFlowAreaChart.tsx`, `LendingOverviewChart.tsx`, `BudgetsComparisonChart.tsx`).
- [x] T4: Independent verification across web tests, lint, and build.

## Verification evidence
- 53 test files, 263 tests passed cleanly (`pnpm --dir web test`).
- `pnpm --dir web lint` passed with 0 errors.
- `pnpm --dir web build` passed with exit code 0.
- `dotnet build backend/` clean (0 warnings, 0 errors).
