# Feature: Binance Spot API Crypto Integration & Portfolio Sync

Professional cryptocurrency integration using the official Binance Spot REST API (`binance-spot-api-docs/rest-api.md`).

## Scope & Requirements
- **Crypto Catalog & Live Market Prices**: Curated list of top cryptocurrencies (BTC, ETH, SOL, BNB, XRP, ADA, etc.) with real-time price queries to `https://api.binance.com/api/v3/ticker/24hr?symbol={TICKER}USDT`.
- **Smart Crypto Registration**: In `CreateInvestmentModal`, selecting a crypto and entering the quantity calculates the exact total value in USDT based on live market price.
- **Backend Portfolio Sync**: Server endpoint (`/v1/integrations/binance/sync-portfolio`) that connects to Binance using user's read-only API keys, fetches non-zero balances (`GET /api/v3/account?omitZeroBalances=true`), values them with Binance tickers, and creates/updates investments in the database.
- **UI Sync Flow**: Sincronizar con Binance button in `InvestmentsView` and API key configuration in `SettingsView`.
- **Manual Assets Intact**: Real estate (inmuebles en alquiler), stocks, funds, and other assets remain 100% manual.

## Tasks
- [x] Task 1: Binance Market Service & Crypto Catalog - Implement `binance-market.service.ts` with curated crypto list, live price fetcher, and unit tests.
- [x] Task 2: Smart Crypto Registration Modal - Enhance `CreateInvestmentModal.tsx` with crypto picker, coin search, live Binance price, and automatic USDT valuation.
- [x] Task 3: Backend Binance Portfolio Sync - Implement portfolio sync service and endpoint in .NET backend querying `/api/v3/account` and creating/updating investments.
- [x] Task 4: Frontend Settings & Sync Button - Add Binance API Key configuration in `SettingsView.tsx` and "Sincronizar con Binance" button in `InvestmentsView.tsx`.
- [x] Task 5: Verification & Full Suite Checks - Run Vitest tests (`pnpm --dir web test`), Next.js build (`pnpm --dir web build`), and backend build (`dotnet build backend/`).
