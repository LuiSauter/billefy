# Feature: Phase 1 Core Ledger (MVP)

## Objective
Implement the immutable Ledger subsystem: accounts, categories, transactions with exchange rate snapshots, reversals, and derived balance calculations with PostgreSQL/EF Core persistence and strict multi-tenant user isolation.

## Problem
Financial software that allows mutable balances or direct edits/deletes on transaction records suffers from reconciliation loss, audit trail corruption, and race conditions.

## Why
Rule 6 and Rule 7 of AGENTS.md mandate that transactions are immutable, corrections are reversals (`reverses_id`), and balances are derived strictly from `initial_balance + sum(transactions)`. Every entity must isolate data by `user_id`.

## Scope
- Base data access abstractions: `ICurrentUserContext`, auditable base entity.
- EF Core and Npgsql configuration for PostgreSQL.
- `Ledger.Domain`: `Account`, `AccountType`, `Category`, `Transaction`, `TransactionDirection`, `RateSnapshot`.
- `Ledger.Infrastructure`: `LedgerDbContext` with global query filters for `user_id`, snake_case table mappings (`accounts`, `categories`, `transactions`).
- `Ledger.Application`: Use cases for `CreateAccount`, `RegisterTransaction`, `ReverseTransaction`, `RegisterTransfer`, `GetAccountBalance`.
- Comprehensive domain and integration tests verifying immutability, reversals, and balance derivations.

## Constraints
- Money uses `decimal` only via `BuildingBlocks.ValueObjects.Money`.
- No mutable balance column stored on accounts table.
- All transactions store the rate snapshot (`applied_rate`, `rate_source`).
- Inward dependencies: `Domain` depends only on `BuildingBlocks`.

## Tasks

- [x] Task 1: Base Data Access & User Context — `ICurrentUserContext`, `Entity` base class with `user_id`, EF Core Npgsql packages in backend.
- [x] Task 2: Ledger Domain Modeling — `Account`, `Category`, `Transaction`, and domain invariants with unit tests.
- [x] Task 3: Ledger Infrastructure & EF Core Persistence — `LedgerDbContext`, entity configurations, global query filters, and balance queries.
- [x] Task 4: Ledger Application Use Cases — Handlers for `CreateAccount`, `RegisterTransaction`, `ReverseTransaction`, `RegisterTransfer`.
- [x] Task 5: Ledger Integration Tests & Verification — In-memory/Postgres integration tests verifying immutability, reversal restoring balance, and user isolation.

## Acceptance Criteria & Checks
1. `dotnet build backend/` succeeds with 0 warnings. (PASS)
2. `dotnet test backend/` passes all domain and integration tests (29/29 tests passed). (PASS)
3. Transactions cannot be updated or deleted; attempting to modify an existing transaction throws an exception or fails validation (verified in ImmutabilityGuard tests). (PASS)
4. Reversal transactions cancel the effect on the derived balance without altering the original row (verified in DerivedBalance test). (PASS)
5. Queries for user A never return user B's accounts or transactions (verified in MultiTenantIsolation test). (PASS)

## Progress & Evidence
- Branch `feat/phase-1-core-ledger` created.
- Task 1 completed: `ICurrentUserContext` and `Entity` base class (commit `6c53001`).
- Task 2 completed: Account, Category, Transaction with reversal and transfer mechanics and 5 unit tests (commit `336906f`).
- Task 3 completed: LedgerDbContext with Npgsql mapping, global user_id filter, and transaction immutability enforcement (commit `d2f93ee`).
- Task 4 completed: Ledger.Application use cases with repository and unit of work implementations (commit `d678d49`).
- Task 5 completed: Ledger integration tests covering immutability, reversals, derived balance, and user isolation (commit `4a2d4ae`).

## Next Step
Slice 1.1 and 1.2 completed. Next slice: Slice 1.3 (Fx Module & DolarApi Rate Source integration).
