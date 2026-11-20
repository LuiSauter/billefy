# Feature: Patrimonio Module & Investments Fake Data Cleanup

Redesign and complete implementation of the Patrimonio module (`docs/redesign/patrimonio.png`) and removal of all fake hardcoded data in Investments (`docs/redesign/inversiones.png`) so all data is 100% authentic.

## Scope & Requirements
- **Zero fake/dummy data**: remove hardcoded mock goals and mock events in Investments. Connect with authentic user data or show clean empty states with call-to-actions.
- **Patrimonio domain & calculations**: pure mathematical logic (`net-worth-analytics.ts`) calculating total assets, total liabilities, net worth, debt ratio, distribution, evolution, and insights.
- **Patrimonio UI presentation**: modular components matching `docs/redesign/patrimonio.png` (header, 4 KPI cards, evolution area chart, distribution donut, composition bar, assets list, liabilities list, insights card).
- **Interactive Modals**: `AddAssetModal` (real physical/digital assets like properties, vehicles, collectibles) and `AddLiabilityModal`.
- **Navigation**: add `patrimonio` tab in `Sidebar.tsx`, `MobileBottomNav.tsx`, and `page.tsx` right after `inversiones`.
- **Verification**: unit tests passing (`pnpm --dir web test`) and clean Next.js build (`pnpm --dir web build`).

## Tasks
- [x] Task 1: Clean fake data from Investments - Connect `InvestmentGoalsCard` to real goals or clean empty state, clean `InvestmentUpcomingEventsCard`, `InvestmentNotesCard` and `InvestmentPriceAlertsCard`.
- [x] Task 2: Patrimonio Domain & Calculations - Implement `net-worth-analytics.ts` and unit tests for net worth, debt ratio, asset/liability grouping, evolution, and insights.
- [x] Task 3: Patrimonio UI Subcomponents - Build `PatrimonioHeader`, `PatrimonioKpiCards`, `PatrimonioEvolutionChart`, `PatrimonioDistributionDonut`, `PatrimonioCompositionBar`, `PatrimonioAssetsList`, `PatrimonioLiabilitiesList`, and `PatrimonioInsightsCard`.
- [x] Task 4: Interactive Modals for Patrimonio - Implement `AddAssetModal` and `AddLiabilityModal`.
- [x] Task 5: Navigation, Integration & Verification - Wire `patrimonio` tab into `Sidebar.tsx`, `MobileBottomNav.tsx`, and `page.tsx`, verify Vitest test suite (`pnpm --dir web test`) and Next.js build (`pnpm --dir web build`).
