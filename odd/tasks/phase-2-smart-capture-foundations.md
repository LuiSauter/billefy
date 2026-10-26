# Feature: Phase 2 Smart Capture Foundations

## Context & Objectives
Implement the foundational Smart Capture pipeline for Billefy as defined in `docs/REQUIREMENTS.md` (ING-01 to ING-10, ING-13) and `docs/ARCHITECTURE.md` (Section 7.1).
The smart capture pipeline enables semi-automatic ingestion of financial movements from notifications, WhatsApp, and statements without ever turning automatic data into ledger transactions without explicit user confirmation (Rule 9).

## Tasks

- [x] Task 1: Ingestion Domain Layer — Create `Ingestion.Domain` project with `RawEvent`, `Draft`, `DraftEvent`, `FinancialSource`, `DraftStatus`, and deterministic SHA-256 `FingerprintGenerator`.
- [x] Task 2: Parsing & Deduplication Engine — Implement rule-based financial notification detector/parser and deduplication service in `Ingestion.Application`.
- [x] Task 3: Ingestion Application Handlers & Ledger Interop — Implement use cases for registering raw events, listing drafts, confirming drafts (dispatching to Ledger via contract), and discarding drafts.
- [x] Task 4: Ingestion Infrastructure & Database Schema — Create `Ingestion.Infrastructure`, `IngestionDbContext`, EF Core configurations, composite/partial indexes, and register in DI.
- [x] Task 5: HTTP Endpoints & OpenAPI Contract — Implement `POST /v1/ingestion/events`, `GET /v1/drafts`, `POST /v1/drafts/{id}/confirm`, and `POST /v1/drafts/{id}/discard`.
- [x] Task 6: Domain & Integration Testing — Unit tests for fingerprinting, state transitions, parsing rules, and integration tests for deduplication and draft confirmation.
- [x] Task 7: Web Inbox & Draft Confirmation UI — Add Drafts inbox in Next.js dashboard with live confirmation/discard actions.

## Acceptance Criteria & Checks
1. `POST /v1/ingestion/events` is idempotent on `(user_id, event_id)` and returns 200/202 (verified in ApiIntegrationTests). (PASS)
2. Identical financial events (same amount, currency, direction, and reference or 5-min bucket) are deduplicated into `draft_events` without creating duplicate drafts across channels. (PASS)
3. Confirming a draft with `POST /v1/drafts/{id}/confirm` creates an immutable transaction in `Ledger` and marks draft as `confirmed`. (PASS)
4. Discarding a draft marks it as `discarded` while preserving its fingerprint to prevent reappearance. (PASS)
5. All backend architecture rules and unit/integration tests pass: 52 backend tests, 5 web tests, mobile clean. (PASS)
6. Web client renders live drafts inbox and handles confirmation/discard. (PASS)

## Progress & Evidence
- Branch `feat/phase-2-smart-capture-foundations` created.
- Task 1: `Ingestion.Domain` created (commit `0d2f911`).
- Task 2: Rule-based parser and deduplication service (commit `728c285`).
- Task 3: Application handlers and Ledger interop (commit `4b520b0`).
- Task 4: `Ingestion.Infrastructure`, `IngestionDbContext`, and `InitialIngestion` migration (commit `1277fc6`).
- Task 5: Endpoints in Api and OpenAPI refresh (commit `9d77af8`).
- Task 6: Ingestion & Draft integration tests (commit `13e8c89`).
- Task 7: Web Inbox & Draft Confirmation UI (commit `68c60fc`).

## Next Step
Merge `feat/phase-2-smart-capture-foundations` into `main` and continue with Android On-Device Notification Listener & Disclosure Screen.
