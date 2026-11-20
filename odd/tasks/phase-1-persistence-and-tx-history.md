# Feature: Phase 1 Persistence & Transaction History

## Objective
Solidify PostgreSQL persistence with EF Core migrations for production deployment, and implement the transaction history querying endpoint (`GET /v1/transactions`) with Web UI support.

## Problem
Running in production or Docker without managed EF Core migrations requires manual table creation, risking schema drift. Users also need to see their transaction history and execute reversals directly from the interface.

## Why
Rule 8 of AGENTS.md mandates EF Core migrations only (never edit applied migrations). Requirement TXN-07 requires searching, filtering, and listing transactions.

## Scope
- Tooling: local `dotnet-ef` manifest, `Microsoft.EntityFrameworkCore.Design` in `Api.csproj`.
- Database Migrations: Initial PostgreSQL migrations for `LedgerDbContext` (`accounts`, `categories`, `transactions`) and `FxDbContext` (`exchange_rates`).
- API: `GET /v1/transactions` with optional filters by `accountId`, `direction`, `from`, `to`, and `limit`.
- Web UI: Recent transactions table with reversal action in `web/src/app/page.tsx`.
- Tests: Integration tests for transaction querying and reversal, OpenAPI contract updated.

## Constraints
- Tables and columns must match the naming map in `docs/DOMAIN_GLOSSARY.md` (snake_case in English).
- Transactions remain strictly immutable.
- Queries filter by authenticated user context.

## Tasks

- [x] Task 1: EF Core Tooling & PostgreSQL Migrations — Add `Microsoft.EntityFrameworkCore.Design` and generate initial migrations for `LedgerDbContext` and `FxDbContext`.
- [x] Task 2: Automatic Migration Execution on Startup — Configure `Program.cs` to apply pending migrations safely in containerized/local environments.
- [x] Task 3: Transaction History Endpoint — Implement `GET /v1/transactions` with filtering and unit/integration tests.
- [x] Task 4: Web Transactions List & Reversal UI — Display transactions and enable reversals from the dashboard.
- [x] Task 5: End-to-End Verification & OpenAPI Refresh — Run all test suites and refresh `docs/openapi.json`.

## Acceptance Criteria & Checks
1. `dotnet ef migrations` compiles and generates migration files for both contexts (`InitialLedger` and `InitialFx`). (PASS)
2. `GET /v1/transactions` returns transactions for the authenticated user, respecting filters (verified in ApiIntegrationTests). (PASS)
3. Reversing a transaction from the UI executes `POST /v1/transactions/{id}/reverse` and updates the list and balance. (PASS)
4. All test suites pass (backend: 42 tests, web: 5 tests, mobile: clean). (PASS)

## Progress & Evidence
- Branch `feat/phase-1-persistence-and-tx-history` created.
- Tasks 1-5 completed: PostgreSQL migrations for Ledger and Fx, automatic startup runner, `GET /v1/transactions`, web reversal UI, and test suite verification (commit `2549041`).

## Next Step
Merge `feat/phase-1-persistence-and-tx-history` into `main` and transition to Phase 2: Smart Capture (Ingestion pipeline, drafts, deduplication, and Android financial detector).
