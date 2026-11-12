# Reports Multicurrency Consolidation and USDC Fix

## Background & Objective
The Reports module fails with `No se pudo calcular el reporte. Revisa los datos y el tipo de cambio de las monedas utilizadas.` when user accounts, loans, or transactions use `USDC` or other currencies, because `calculateFinancialReport` in `reports-analytics.ts` only normalized `USDT` to `USD` (`replace(/^USDT$/, "USD")`), rejecting `USDC` as unsupported cross-currency. Furthermore, the user expects accounts in different currencies (Bs, USD, USDT, USDC) to stay separated in the ledger, but unifiable in Reports/Patrimonio under their chosen currency (BOB or USD) using the P2P exchange rate with explicit approximate (`≈`) indicators.

## Current Outcome
- All 3 tasks completed and verified with automated tests.
- `reports-analytics.ts` normalizes `USDC` (along with `USDT`) as 1:1 USD equivalent, handles empty/whitespace currency safely, and provides robust budget period mapping (`mensual`, `anual`, fallback to 1).
- `ReportsView.tsx` and `ReportsHeader.tsx` support currency toggling (BOB / USD), show explicit approximate consolidation banner (`≈ aprox. P2P ...`), and log errors via `console.error` for developer observability.
- `app/page.tsx` wires `onToggleCurrency` to `ReportsView`.
- Full test suite passes: 109 test files, 790 tests. Production build succeeds cleanly.

## Tasks

- [x] Task 1: Domain currency normalization and safe period parsing in `reports-analytics.ts`
  - Supported `USDC` alongside `USDT` as 1:1 USD equivalent.
  - Safely handle null/undefined/whitespace in `currency`.
  - Added safe mapping/fallback for budget periods (including Spanish variants `mensual`, `anual`).
  - Added unit tests verifying `USDC` accounts and transactions convert seamlessly to BOB and USD.

- [x] Task 2: Presentation layer currency toggle, approximate indicators, and observability
  - In `ReportsView.tsx`: log calculation errors via `console.error` instead of silently swallowing them.
  - In `ReportsHeader.tsx` / `ReportsView.tsx`: added currency toggle (`BOB` / `USD`), show approximate indicator (`≈` / aprox.) with active P2P exchange rate note.
  - Updated `ReportsView.test.tsx` to assert new currency toggle and error logging behavior.

- [x] Task 3: App integration and end-to-end verification
  - Connected `selectedCurrency`, `onToggleCurrency`, and `p2pRate` properly in `app/page.tsx`.
  - Ran full test suite (`pnpm --dir web test`) and verified no regressions.
