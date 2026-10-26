# Refactor: Clean Architecture Application Services & Ultra-Thin Endpoints

## Context & Objectives
Refactor the backend to strictly honor Clean Architecture and Single Responsibility Principle:
1. Endpoints in `Api` must be 100% thin delegates: receive HTTP input, invoke Application Service, return HTTP response.
2. Zero database contexts (`DbContext`), zero repositories, zero LINQ queries, and zero business/mapping loops inside `Api/Endpoints`.
3. Introduce cohesive Application Services in `Ledger.Application` (`IAccountService`, `ITransactionService`) and `Ingestion.Application` (`IIngestionService`, `IDraftService`).
4. Provide reusable `ResultExtensions.ToHttpResult()` for clean mapping to ProblemDetails RFC 9457 or 200/201/202 responses.

## Tasks

- [ ] Task 1: Ledger Application Services — Implement `IAccountService` and `ITransactionService` in `Ledger.Application`, moving all account balance calculations, transaction queries, and mutations out of Api.
- [ ] Task 2: Ingestion Application Services — Implement `IIngestionService` and `IDraftService` in `Ingestion.Application`, moving event registration and draft lifecycle logic out of Api.
- [ ] Task 3: HTTP Mapping Helpers — Implement `ResultExtensions.ToHttpResult()` in `Api` for clean, consistent RFC 9457 ProblemDetails responses.
- [ ] Task 4: Ultra-Thin Endpoints Refactor — Rewrite `AccountEndpoints`, `TransactionEndpoints`, `RateEndpoints`, `IngestionEndpoints`, and `DraftEndpoints` to be 1-line delegates delegating to Application Services.
- [ ] Task 5: Architecture & Integration Suite Verification — Run all unit and integration tests across backend (52+ tests, NetArchTest), web, and mobile to verify zero regressions.

## Acceptance Criteria & Checks
1. No `DbContext` or `IRepository` is injected or referenced in any file inside `Api/Endpoints`.
2. All business logic, balance calculations, and DTO projections reside in `Application`.
3. All endpoints in `Api` are thin delegates calling an Application Service.
4. All existing tests pass (NetArchTest, Api.Tests, BuildingBlocks, Ledger, Ingestion).
5. OpenAPI contract remains 100% compatible.

## Progress & Evidence
- Branch `refactor/clean-architecture-application-services` created.

## Next Step
Implement Task 1: Ledger Application Services.
