# Feature: Phase 4 Planning & Analytics (Budgets, Goals, and Financial Health)

## Context & Objectives
Implement the Planning module for Billefy as defined in `docs/REQUIREMENTS.md` (BUD-01 to BUD-06, DASH-01, DASH-02) and `docs/ARCHITECTURE.md` (Section 7.4).
Key capabilities:
- Budgets (BUD-01, BUD-06): Monthly limits per category or overall, alert thresholds (default 80% and 100%), tracking real spending from Ledger.
- Goals (BUD-03): Target amounts, target dates, associated savings account, progress tracking, and monthly contribution needed.
- Financial Health Indicators (BUD-04, BUD-02): Savings rate, emergency fund coverage in months, debt load, and 50/30/20 guideline.
- Clean Architecture: `Planning.Domain` -> `Planning.Application` (services) -> `Planning.Infrastructure` -> `Api.Endpoints` (ultra-thin).

## Tasks

- [x] Task 1: Planning Domain Layer — Implement `Budget` and `Goal` entities, value objects, and progress calculations in `Planning.Domain`.
- [x] Task 2: Planning Application Services — Implement `IBudgetService`, `IGoalService`, and `IFinancialHealthService` in `Planning.Application`, querying Ledger and Lending through contracts.
- [x] Task 3: Planning Infrastructure & EF Core Migrations — Implement `PlanningDbContext`, configurations, repositories, and generate PostgreSQL migration `InitialPlanning`.
- [x] Task 4: REST Endpoints & OpenAPI Contract — Implement `PlanningEndpoints` (budgets, goals, financial health) and update OpenAPI specification.
- [x] Task 5: Unit & Integration Tests — Tests for budget consumption, goal progress calculations, emergency fund coverage, and API endpoints.
- [x] Task 6: Web Planning & Analytics UI Dashboard — Add Presupuestos, Metas, and Indicadores de Salud Financiera to the Next.js dashboard.

## Acceptance Criteria & Checks
1. Budgets track real monthly expenses against configured limits with 80%/100% threshold alerts (verified in ApiIntegrationTests). (PASS)
2. Goals calculate progress percentage and required monthly contribution to reach target by target date. (PASS)
3. Financial health indicators accurately compute savings rate, emergency fund coverage (liquid cash / monthly expenses), and debt load (verified in ApiIntegrationTests). (PASS)
4. Clean Architecture rules hold: endpoints remain ultra-thin, all tests pass (65 backend tests, 5 web tests, 13 mobile tests). (PASS)
5. Web dashboard allows creating budgets, tracking goals, and visualizing financial health metrics. (PASS)

## Progress & Evidence
- Branch `feat/phase-4-planning-and-analytics` created.
- Tasks 1-6 completed in commit `83aadf9`.

## Next Step
Merge `feat/phase-4-planning-and-analytics` into `main`.
