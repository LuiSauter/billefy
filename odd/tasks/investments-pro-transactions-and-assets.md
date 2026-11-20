# Investments Pro: Transactions Ledger, Tickers, Dividends & Asset Specialization

This document tracks the implementation of professional-grade investment management in Billefy.

## Context & Objectives
- Transform the investments module from an aesthetic MVP into a production-ready investment ledger.
- Introduce `InvestmentTransaction` in the backend database to track immutable operations (Buy, Sell, Dividend, Fee, Revaluation).
- Add `Ticker` support to investments (stocks, ETFs, crypto).
- Provide specialized creation & operation experiences for Stocks, Funds, Real Estate, and Crypto.
- Support Dividend/Rental income operations that credit cash accounts without distorting holdings.
- Display real persisted transaction history in the investment detail view.

## Tasks
1. Domain & Database (Backend):
   - [x] 1.1 Create `InvestmentTransaction` entity and enum in `Planning.Domain.Investments`.
   - [x] 1.2 Add `Ticker` property to `Investment` entity and domain method `RecordTransaction`.
   - [x] 1.3 Add EF Core entity configuration and forward migration `AddInvestmentTransactionsAndTicker`.
2. Application & Endpoints (Backend):
   - [x] 2.1 Add contracts/DTOs: `InvestmentTransactionDto`, `RegisterInvestmentOperationRequest`.
   - [x] 2.2 Implement operation registration and query methods in `IInvestmentService` and `InvestmentService` (with ledger cash linkage).
   - [x] 2.3 Expose `GET /v1/planning/investments/{id}/transactions` and `POST /v1/planning/investments/{id}/operations` in `PlanningEndpoints.cs`.
   - [x] 2.4 Verify backend builds and tests pass.
   - Evidence: Commit `7b05e3b`.
3. Frontend Domain & Application Layer:
   - [x] 3.1 Update `investment.types.ts` with `ticker`, transaction interfaces, and asset-specific metadata.
   - [x] 3.2 Update `useInvestments.ts` to support fetching transactions and posting operations with backend persistence.
4. Asset Creation Specialization (`CreateInvestmentModal.tsx`):
   - [x] 4.1 Add Ticker and stock/ETF presets for `stocks` and `funds`.
   - [x] 4.2 Add property-specific fields (property type, m², unit label) for `realestate`.
5. Operation Registration Specialization (`RegisterOperationModal.tsx`):
   - [x] 4.3 Add Dividendo/Renta operation type (income without altering position quantity).
   - [x] 4.4 Support asset-aware labels (acciones, fondos, m², cripto) and custom notes.
6. Detail View Real Transaction History:
   - [x] 4.5 Connect `InvestmentOperationsTable.tsx` and `InvestmentDetailView.tsx` to real persisted transactions.
7. Verification & Quality Gates:
   - [x] 5.1 Run backend tests (`dotnet test backend/`).
   - [x] 5.2 Run frontend tests (`pnpm --dir web test`).
   - [x] 5.3 Run linter (`pnpm --dir web lint`) and production build (`pnpm --dir web build`).
   - Evidence: Commit `f42f4f4`.
