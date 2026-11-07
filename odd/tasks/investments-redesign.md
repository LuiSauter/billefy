# Feature: Investments Module & Detail Redesign

Redesign of the Investments module (`docs/redesign/inversiones.png`) and Investment Detail view (`docs/redesign/detalle-inversion.png`) in the web interface (`web/`).

## Scope & Requirements
- Dark mode theme with purple accents (`purple-600`) matching existing design system and mockups.
- 100% manual pricing and valuation updates (supporting price increases/decreases, quantity updates, and recording historical points).
- Portfolio analytics (total value, total cost, gain/loss, YTD return, category breakdown, performance ranking, evolution charts).
- Investment detail view with 5 tabs (`Resumen`, `Operaciones`, `Evolución`, `Alertas`, `Documentos`), hero KPI card, value evolution chart, portfolio share donut, recent operations table, asset info, notes, and price alerts with interactive toggles.
- Modals for manual price/valuation updates, operation registrations (buys/sells/contributions/withdrawals), and creating/editing investments.
- Test-driven / verified calculations and Next.js clean build.

## Tasks
- [x] Task 1: Domain & Portfolio Calculations - Pure business logic (`portfolio-analytics.ts`, `investment-detail.ts`) and unit tests for total value, cost basis, gain/loss, YTD/ROI, distribution percentages, ranking, historical evolution, and asset-specific metrics.
- [x] Task 2: Main Investments View Subcomponents - Modular components for header, 4 KPI cards, portfolio evolution chart, distribution donut, performance ranking list, filtered investments table with pill tabs, investment goals card, and upcoming events card.
- [x] Task 3: Investment Detail View Subcomponents - Detail view orchestrator (`InvestmentDetailView.tsx`) with header, hero card, 5 tabs, value evolution chart, portfolio share donut, 4 mini KPIs, operations table, asset info card, editable notes card, and price alerts card.
- [x] Task 4: Interactive Modals - `UpdatePriceModal` (manual price and total valuation update), `RegisterOperationModal` (buys/sells/cash), and enhanced `CreateInvestmentModal` / `EditInvestmentModal`.
- [x] Task 5: Integration, Navigation & Verification - Connect selection state in `InvestmentsView.tsx` to display detail view on row or action click, back button navigation, Vitest suite (`pnpm --dir web test`), and Next.js build (`pnpm --dir web build`).
