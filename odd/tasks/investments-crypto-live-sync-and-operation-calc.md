# Inversiones: Bidirectional Conversions and Live Market Price Sync

Fix and enhance calculations and live market updates in Inversiones:
1. In `CreateInvestmentModal`, typing USDT value must convert and update quantity, and typing quantity must update USDT value.
2. In `RegisterOperationModal` (buy & sell), allow entering Cantidad, Precio Unitario, and Monto Total with bidirectional conversion.
3. Automatically sync and update market prices for all crypto investments after creation and on dashboard load using Binance Spot public market data.

## Tasks

- [x] Task 1: Crypto Domain Helpers - Add `calculateCryptoQuantityFromUsdt` and `extractCryptoSymbol` in `binance-market.service.ts` with unit tests. (Commit: `1a7e562`)
- [x] Task 2: Bidirectional Input Conversion in CreateInvestmentModal - Ensure typing USDT value converts to quantity and vice-versa in real time. (Commit: `3fead6c`)
- [x] Task 3: Auto Market Price Sync on Creation & Dashboard - Implement automatic crypto price updates in `useInvestments` and `InvestmentsView` using live Binance tickers. (Commit: `20ad68d`)
- [x] Task 4: Bidirectional Conversion in RegisterOperationModal - Add Monto Total input, bidirectional conversions with Cantidad/Precio Unitario, and live market price prefill. (Commit: `967cdf9`)
- [x] Task 5: Testing & Verification - Execute full test suites, verify Next.js build and linter. (Commit: `verified`)
