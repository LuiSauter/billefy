# Feature: Phase 2 Smart Capture Foundations

## Context & Objectives
Implement the foundational Smart Capture pipeline for Billefy as defined in `docs/REQUIREMENTS.md` (ING-01 to ING-10, ING-13) and `docs/ARCHITECTURE.md` (Section 7.1).
The smart capture pipeline enables semi-automatic ingestion of financial movements from notifications, WhatsApp, and statements without ever turning automatic data into ledger transactions without explicit user confirmation (Rule 9).

## Tasks

- [ ] Task 1: Ingestion Domain Layer — Create `Ingestion.Domain` project with `RawEvent`, `Draft`, `DraftEvent`, `FinancialSource`, `DraftStatus`, and deterministic SHA-256 `FingerprintGenerator`.
- [ ] Task 2: Parsing & Deduplication Engine — Implement rule-based financial notification detector/parser and deduplication service in `Ingestion.Application`.
- [ ] Task 3: Ingestion Application Handlers & Ledger Interop — Implement use cases for registering raw events, listing drafts, confirming drafts (dispatching to Ledger via contract), and discarding drafts.
- [ ] Task 4: Ingestion Infrastructure & Database Schema — Create `Ingestion.Infrastructure`, `IngestionDbContext`, EF Core configurations, composite/partial indexes, and register in DI.
- [ ] Task 5: HTTP Endpoints & OpenAPI Contract — Implement `POST /v1/ingestion/events`, `GET /v1/drafts`, `POST /v1/drafts/{id}/confirm`, and `POST /v1/drafts/{id}/discard`.
- [ ] Task 6: Domain & Integration Testing — Unit tests for fingerprinting, state transitions, parsing rules, and integration tests for deduplication and draft confirmation.
- [ ] Task 7: Web Inbox & Draft Confirmation UI — Add Drafts inbox in Next.js dashboard with live confirmation/discard actions.

## Acceptance Criteria & Checks
1. `POST /v1/ingestion/events` is idempotent on `(user_id, event_id)` and returns 200/202.
2. Identical financial events (same amount, currency, direction, and reference or 5-min bucket) are deduplicated into `draft_events` without creating duplicate drafts.
3. Confirming a draft with `POST /v1/drafts/{id}/confirm` creates an immutable transaction in `Ledger` and marks draft as `confirmed`.
4. Discarding a draft marks it as `discarded` while preserving its fingerprint to prevent reappearance.
5. All backend architecture rules and unit/integration tests pass (0 warnings, 0 errors).
6. Web client renders live drafts inbox and handles confirmation/discard.

## Progress & Evidence
- Branch `feat/phase-2-smart-capture-foundations` created.

## Next Step
Implement Task 1: Ingestion Domain Layer.
