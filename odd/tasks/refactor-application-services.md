# Refactor: Clean Architecture Application Services & Ultra-Thin Endpoints

## Context & Objectives
Refactor the backend to strictly honor Clean Architecture and Single Responsibility Principle:
1. Endpoints in `Api` must be 100% thin delegates: receive HTTP input, invoke Application Service, return HTTP response.
2. Zero database contexts (`DbContext`), zero repositories, zero LINQ queries, and zero business/mapping loops inside `Api/Endpoints`.
3. Introduce cohesive Application Services in `Ledger.Application` (`IAccountService`, `ITransactionService`) and `Ingestion.Application` (`IIngestionService`, `IDraftService`).
4. Provide reusable `ResultExtensions.ToHttpResult()` for clean mapping to ProblemDetails RFC 9457 or 200/201/202 responses.

## Tasks

- [x] Task 1: Ledger Application Services — Implement `IAccountService` and `ITransactionService` in `Ledger.Application`, moving all account balance calculations, transaction queries, and mutations out of Api.
- [x] Task 2: Ingestion Application Services — Implement `IIngestionService` and `IDraftService` in `Ingestion.Application`, moving event registration and draft lifecycle logic out of Api.
- [x] Task 3: HTTP Mapping Helpers — Implement `ResultExtensions.ToHttpResult()` in `Api` for clean, consistent RFC 9457 ProblemDetails responses.
- [x] Task 4: Ultra-Thin Endpoints Refactor — Rewrite `AccountEndpoints`, `TransactionEndpoints`, `RateEndpoints`, `IngestionEndpoints`, and `DraftEndpoints` to be 1-line delegates delegating to Application Services.
- [x] Task 5: Architecture & Integration Suite Verification — Run all unit and integration tests across backend (53 tests, NetArchTest), web, and mobile to verify zero regressions.

## Acceptance Criteria & Checks
1. No `DbContext` or `IRepository` is injected or referenced in any file inside `Api/Endpoints` (enforced by `Api_Endpoints_Should_Not_Depend_On_DbContext_Or_Repositories` in NetArchTest). (PASS)
2. All business logic, balance calculations, and DTO projections reside in `Application`. (PASS)
3. All endpoints in `Api` are thin delegates calling an Application Service. (PASS)
4. All existing tests pass: 53 backend tests, 5 web tests, 13 mobile tests. (PASS)
5. OpenAPI contract remains 100% compatible. (PASS)

## Progress & Evidence
- Branch `refactor/clean-architecture-application-services` created.
- Tasks 1-5 completed in commit `9f708c2`.

## Next Step
Merge `refactor/clean-architecture-application-services` into `main`.
