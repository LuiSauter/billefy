# Feature: Phase 3 Lending Engine & Loan Management

## Context & Objectives
Implement the lending and debt engine for Billefy as defined in `docs/REQUIREMENTS.md` (LOAN-01 to LOAN-15), `docs/LOAN_ENGINE.md`, and `docs/ARCHITECTURE.md` (Section 7.3).
Key rules:
- Math follows `docs/LOAN_ENGINE.md` strictly: decimal only, MidpointRounding.AwayFromZero, last installment absorbs rounding differences.
- Golden Vectors A, B, C, D, E, F, G, H must pass with exact values.
- TEA solver using internal double and rounding to 6 decimal places.
- Clean Architecture: `Lending.Domain` -> `Lending.Application` (services) -> `Lending.Infrastructure` -> `Api.Endpoints` (ultra-thin).
- Counterparty privacy: counterparties are never contacted (Rule 20).

## Tasks

- [ ] Task 1: Lending Domain Engine & Math — Implement `ILoanScheduleGenerator`, the 6 amortization templates, `AprCalculator` (TEA), `LateInterestCalculator`, and `PaymentAllocator`.
- [ ] Task 2: Golden Vectors Unit Tests — Create `Lending.Domain.Tests` reproducing Vectors A through H from `LOAN_ENGINE.md` with exact assertions.
- [ ] Task 3: Lending Domain Entities — Implement `Counterparty`, `Loan`, `LoanInstallment`, `LoanPayment`, `PaymentAllocation`, and state machines.
- [ ] Task 4: Lending Application Services — Implement `ILoanService`/`LoanService` and `ILoanSimulationService` in `Lending.Application`, with Ledger interop for disbursements and payments.
- [ ] Task 5: Lending Infrastructure & EF Core Migrations — Implement `LendingDbContext`, configurations, repositories, and generate PostgreSQL migration `InitialLending`.
- [ ] Task 6: REST Endpoints & OpenAPI Contract — Implement `LoanEndpoints` (`POST /v1/loans/simulate`, `POST /v1/loans`, `GET /v1/loans`, `GET /v1/loans/{id}`, `POST /v1/loans/{id}/payments`).
- [ ] Task 7: Web Lending UI Dashboard — Add Prestamos y Deudas view with interactive schedule simulator, active loans, and installment payment modal.

## Acceptance Criteria & Checks
1. Golden Vectors A, B, C, D, E, F, G, H pass with 0 delta.
2. Loan terms are immutable once activated; principal portions sum exactly to loan principal.
3. Payment allocation follows configured order (default: late interest -> interest -> principal).
4. All Clean Architecture tests and build pass with 0 warnings.
5. Web dashboard allows simulating, creating, and recording payments on loans.

## Progress & Evidence
- Branch `feat/phase-3-lending-engine` created.

## Next Step
Implement Task 1: Lending Domain Engine & Math.
