# Feature: Encrypted Binance Credentials & Production-Grade Portfolio Sync

Secure database storage of Binance API credentials with AES-256-GCM encryption and production-ready portfolio synchronization.

## Scope & Requirements
- **AES-256-GCM Encryption**: `IEncryptionService` implementing authenticated symmetric encryption for secrets at rest.
- **Database Persistence**: Entity `BinanceCredential` in `Ingestion` module with user multi-tenancy, configured via EF Core migration.
- **Binance Server-Time Sync & Error Handling**: Query `/api/v3/time` and use `recvWindow=60000` to prevent timing error `-1021`. Friendly error mapping instead of generic 500s.
- **Automatic Portfolio Sync Endpoint**: `POST /v1/integrations/binance/sync-portfolio` retrieves the user's stored encrypted credentials, decrypts them in memory, fetches spot balances, values them in USDT, upserts investments, and updates `LastSyncedAt`.
- **Status Endpoint**: `GET /v1/integrations/binance/status` returning connection status, masked API key, and last sync timestamp.
- **Frontend Security**: No plaintext secrets in localStorage. Settings connects keys to backend, and Inversiones sync button executes seamlessly with clear feedback.

## Tasks
- [x] Task 1: AES-256-GCM Encryption Service - Implement `IEncryptionService`, `AesGcmEncryptionService`, and unit tests in `BuildingBlocks`.
- [x] Task 2: BinanceCredential Entity & Migration - Create entity, repository, and EF Core migration in `Ingestion` module.
- [x] Task 3: Backend Binance Sync & Connect Service - Enhance `BinanceSyncService` with encryption, server time sync, portfolio upserting, and endpoints in `BinanceEndpoints.cs`.
- [x] Task 4: Frontend Settings & Inversiones Sync Flow - Update `BinanceModal.tsx`, `SettingsView.tsx`, `useInvestments.ts`, and `InvestmentsView.tsx` to use backend credentials and smooth feedback.
- [x] Task 5: Verification & Full Suite Checks - Run .NET tests, Vitest tests, and verify clean production builds.
