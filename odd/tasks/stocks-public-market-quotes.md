# Stocks & Funds: Live Public Market Quotes (Yahoo Finance)

This document tracks the integration of live public market data for stocks and ETFs in Billefy.

## Context & Objectives
- Enable real-time market quote queries for stocks (e.g. AAPL, NVDA, MSFT) and ETFs (e.g. SPY, VOO, QQQ).
- Connect to public Yahoo Finance data via a resilient backend endpoint `GET /v1/planning/market/quote?ticker={ticker}` to eliminate browser CORS limits and serve both Web and Mobile.
- Support live price cards, bidirectional share <-> dollar conversion in `CreateInvestmentModal` and `RegisterOperationModal`.
- Support portfolio-wide live price sync for stocks and funds alongside crypto.

## Tasks
1. Backend Market Quote Service & Endpoint:
   - [x] 1.1 Define `StockQuoteDto` in `Planning.Contracts`.
   - [x] 1.2 Implement Yahoo Finance quote fetcher and caching in `Planning.Infrastructure` or `Api.Endpoints`.
   - [x] 1.3 Expose `GET /v1/planning/market/quote?ticker={ticker}` in `PlanningEndpoints.cs`.
   - [x] 1.4 Add integration tests for market quote endpoint in `Api.Tests`.
2. Frontend Stock Market Service:
   - [x] 2.1 Create `stock-market.service.ts` with `fetchStockQuote` and exact Decimal.js share/dollar math.
   - [x] 2.2 Add unit tests for `stock-market.service.test.ts`.
3. Frontend Modals Integration:
   - [x] 3.1 In `CreateInvestmentModal.tsx`: fetch live quote on ticker selection, display live price banner, and enable bidirectional conversion for stocks/funds.
   - [x] 3.2 In `RegisterOperationModal.tsx`: fetch live stock quote on open, show live price banner, and calculate shares/dollars dynamically.
4. Portfolio Live Sync Expansion:
   - [x] 4.1 Update `useInvestments.ts` to sync live prices for stocks and funds with tickers alongside crypto.
5. Verification & Quality Gates:
   - [x] 5.1 Run backend tests (`dotnet test backend/`).
   - [x] 5.2 Run frontend tests (`pnpm --dir web test`).
   - [x] 5.3 Run linter (`pnpm --dir web lint`) and production build (`pnpm --dir web build`).
   - Evidence: Commit `438285a`.
