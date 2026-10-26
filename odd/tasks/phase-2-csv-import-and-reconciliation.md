# Feature: Phase 2 CSV Statement Import & Account Reconciliation

## Context & Objectives
Complete Phase 2 deliverables:
1. **CSV Statement Import (ING-11):**
   - User imports bank statements as CSV.
   - Computes SHA-256 `file_hash`. Detects repeated files (`(user_id, file_hash)`) and emits a warning (ING-11, Architecture 6.3).
   - Flexible column parsing (Date, Amount, Description, Reference).
   - Generates drafts passing through `IDeduplicationService` so overlapping movements from notifications/WhatsApp are automatically deduplicated.
   - Persists `StatementImport` record with summary.
2. **Account Reconciliation (ACC-06):**
   - User reconciles an account by entering the real verified balance.
   - System calculates `difference = realBalance - calculatedBalance`.
   - If difference != 0, registers an adjustment transaction in the Ledger (`Income` if positive, `Expense` if negative) to align derived balances with reality.
3. **Web Dashboard Integration:**
   - Add CSV Statement Import dialog with file upload and preview.
   - Add Account Balance Reconciliation dialog with live difference preview.

## Tasks

- [ ] Task 1: Account Reconciliation Service (ACC-06) — Add `ReconcileAccountAsync` in `IAccountService`/`AccountService` and expose `POST /v1/accounts/{id}/reconcile`.
- [ ] Task 2: Statement Import Entity & Repository (ING-11) — Add `StatementImport` entity in `Ingestion.Domain`, EF configuration in `Ingestion.Infrastructure`, and migration.
- [ ] Task 3: CSV Statement Parser & Import Service — Implement `IStatementImportService` in `Ingestion.Application` with SHA-256 hash detection, CSV parsing, and deduplication integration.
- [ ] Task 4: Import REST Endpoints & OpenAPI Contract — Implement `POST /v1/ingestion/statements/import-csv` and update OpenAPI contract.
- [ ] Task 5: Unit & Integration Tests — Tests for reconciliation adjustments, CSV parsing, duplicate file hash warnings, and movement deduplication.
- [ ] Task 6: Web UI Integration — Add Reconcile Balance and CSV Statement Import dialogs in Next.js dashboard.

## Acceptance Criteria & Checks
1. Reconciling an account with a difference creates an adjustment transaction that restores the derived balance to the real balance (ACC-06).
2. Uploading a CSV statement extracts rows, deduplicates movements against existing drafts/transactions, and returns import summary.
3. Re-importing a CSV with the exact same content triggers a duplicate file warning.
4. Clean Architecture rules hold: endpoints remain ultra-thin, all tests pass (backend, web, mobile).

## Progress & Evidence
- Branch `feat/phase-2-csv-import-and-reconciliation` created.

## Next Step
Implement Task 1: Account Reconciliation Service (ACC-06).
