# Task: Dashboard Distribution Reflection of User-Configured Plan

## Context & Motivation
The user noted that the Dashboard displays "Distribución recomendada (50/30/20)" with hardcoded proportions even after the user configures their custom income distribution rule in the Presupuestos (Budgets) module. The dashboard must dynamically reflect the user's authentic configured distribution plan (`DistributionPlan`), including rule ratio, bucket names, colors, and allocated amounts calculated from real monthly income.

## Scope of Work
1. **Domain Analytics (`dashboard-home-analytics.ts`)**:
   - Accept optional `distributionPlan` in `DashboardHomeAnalyticsInput`.
   - Calculate dynamic buckets from `distributionPlan.buckets` when enabled, with exact `Decimal.js` proportional math based on authentic income.
   - Fall back to standard 50/30/20 when no plan is enabled or configured.
   - Include `ruleLabel`, `isCustom`, and `buckets` array in `RecommendedDistribution`.
2. **Dashboard Distribution Card (`DashboardDistributionCard.tsx`)**:
   - Render dynamic rule label in header (e.g. "Distribución recomendada (50/30/20)" or "Distribución configurada (40/30/20/10)").
   - Render multi-segment dynamic progress bar respecting bucket percentages and theme colors.
   - Render all configured buckets with their authentic percentage, name, and allocated amount.
   - Provide a quick shortcut to adjust the rule in Presupuestos if `onOpenPlanTab` is passed.
3. **Integration (`DashboardHomeView.tsx` & `page.tsx`)**:
   - Pass `distributionPlan={planCtl.plan}` from `app/page.tsx` to `DashboardHomeView`.
   - Forward `distributionPlan` to `calculateDashboardHomeAnalytics`.
4. **Verification**:
   - Add/update unit tests in `dashboard-home-analytics.test.ts`.
   - Update tests in `DashboardHomeView.test.tsx`.
   - Run linter and tests (`pnpm --dir web test`, `pnpm --dir web lint`).
