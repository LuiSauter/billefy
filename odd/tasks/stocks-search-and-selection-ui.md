# Stock & ETF Search and Selection with shadcn UI

This document tracks building an interactive stock & ETF search and selector powered by public market data and shadcn components.

## Context & Objectives
- Provide an intuitive, real-time search interface for stocks and ETFs (search by ticker or company name, e.g. "Apple", "NVDA", "S&P 500").
- Use shadcn components (`Command`, `Popover`, `Input`, `Badge`, `Button`) for a cohesive design system UX.
- Backend and Next.js proxy endpoints (`GET /v1/planning/market/search` and `GET /api/market/search`) to eliminate browser CORS.
- Seamlessly populate ticker, asset name, and trigger live price fetching on selection.

## Tasks
1. Search Endpoints & Contracts (Backend & Next.js):
   - [x] 1.1 Add `MarketSearchResultDto` in `Planning.Contracts`.
   - [x] 1.2 Implement `GET /v1/planning/market/search?query={q}` in `PlanningEndpoints.cs`.
   - [x] 1.3 Implement `GET /api/market/search?q={q}` Route Handler in Next.js.
   - [x] 1.4 Add integration tests in `Api.Tests`.
2. Frontend Domain Service:
   - [x] 2.1 Add `searchStocks(query, http)` and `StockSearchResult` in `stock-market.service.ts`.
   - [x] 2.2 Add unit tests in `stock-market.service.test.ts`.
3. Presentation Component (`StockPicker.tsx`):
   - [x] 3.1 Implement `StockPicker` with shadcn `Command`, `Popover`, `Badge`, and instant popular suggestions.
   - [x] 3.2 Add unit test for `StockPicker.test.tsx`.
4. Modals Integration:
   - [x] 4.1 Integrate `StockPicker` into `CreateInvestmentModal.tsx` for stocks and funds.
5. Verification & Quality Gates:
   - [x] 5.1 Run backend tests (`dotnet test backend/`).
   - [x] 5.2 Run frontend tests (`pnpm --dir web test`).
   - [x] 5.3 Run linter (`pnpm --dir web lint`) and production build (`pnpm --dir web build`).
   - Evidence: Commit `6be0317`.
