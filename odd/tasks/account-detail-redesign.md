# Feature: Detalle de Cuenta (Redesign)

Implement the detailed account view matching `docs/redesign/detalle-cuenta.png`, including account hero card, balance evolution chart, cash flow donut chart, recent movements table with running balances, account info, and period stats cards.

## Tasks

- [x] Task 1: Domain & Calculations - Implement `account-detail.ts` (running balance per transaction, period stats, cash flow donut comparison, time range filters) and comprehensive Vitest tests.
- [x] Task 2: Visual Components - Build `AccountDetailHeader`, `AccountHeroCard`, `AccountBalanceEvolutionChart`, `AccountCashFlowDonutCard`, `AccountMovementsTable`, `AccountInfoCard`, and `AccountPeriodStatsCard`.
- [x] Task 3: Orchestration & Tabs - Build `AccountDetailView` coordinating tabs (`Resumen`, `Movimientos`, `Conciliación`, `Configuración`), state, and modal bindings.
- [x] Task 4: Integration & Verification - Wire `AccountDetailView` into `AccountsTabView`, support card click navigation and back navigation, verify with tests (`pnpm --dir web test`) and build (`pnpm --dir web build`).
