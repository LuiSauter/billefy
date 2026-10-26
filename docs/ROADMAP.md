# Roadmap

Delivery phases for the Personal Finance Manager. Requirement ids refer to [REQUIREMENTS.md](REQUIREMENTS.md). The phases are ordered by dependency and value, and they carry no dates: estimate them once the team and the pace are known. The order is a proposal and can be adjusted, for example by moving Lending ahead of Smart capture.

## Strategy

- **Android and web first.** Android has the notification capture that defines the product. The shared Kotlin Multiplatform code makes iOS cheap to add afterwards.
- **Foundations before features.** Money, ledger, idempotency, and testing patterns are set once, early.
- **Every phase ships something usable** and keeps the rules of [AGENTS.md](../AGENTS.md).

## Phase 0: Foundations

**Goal:** a working skeleton that deploys and tests itself.

- Repository, solution, and project scaffolding (backend, mobile, web, infra).
- CI: build, format, tests, OpenAPI generation and diff, client generation, vulnerability scan.
- Docker, Coolify, Traefik, PostgreSQL with backups, object storage, staging environment.
- Building blocks: `Money`, `IClock`, `Result`, idempotency, auditing, error format, pagination.
- Architecture tests and the test harness (Testcontainers, golden-vector loader).
- Observability: structured logs, metrics, error tracking.
- Design system basics and localization setup (Spanish and English).

**Exit criteria:** an empty authenticated endpoint is deployed to staging from CI, with tests and architecture rules enforced.

## Phase 1: Core ledger (MVP, Android and web)

**Goal:** a user can consolidate balances and register movements manually in two currencies.

- Authentication: AUTH-01, AUTH-03, AUTH-04, AUTH-05, AUTH-06.
- Accounts: ACC-01 to ACC-05.
- Transactions: TXN-01 to TXN-08 (quick entry, templates, transfers, categories, reversals, offline).
- Exchange rates: FX-01 to FX-07 (Binance P2P adapter, buy and sell rule, staleness, manual rate, history).
- Basic dashboard: DASH-01 (basic).
- Notifications: NOT-01, NOT-02, NOT-03, NOT-06.
- Platform: PLAT-01, PLAT-02, PLAT-03, PLAT-05.

**Exit criteria:** acceptance scenarios 3.2 and 3.4 pass; offline entry syncs without duplicates; account deletion works end to end.

## Phase 2: Smart capture and iOS

**Goal:** movements arrive on their own and the user only confirms them.

- Android notification capture: ING-01 to ING-05, with the financial detector and the prominent disclosure.
- Draft pipeline: ING-06 to ING-10, ING-13 (parsing, optional LLM fallback with consent, deduplication, suggestions, inbox).
- CSV statement import: ING-11.
- Reconciliation: ACC-06.
- iOS release: AUTH-02, ING-16 and the shared screens.
- Notifications: NOT-04 (drafts and imports), NOT-05. Consent: PLAT-04.

**Exit criteria:** acceptance scenarios 3.1, 3.2, and 3.3 pass; the detector meets its corpus thresholds; the concurrency test for deduplication passes.

## Phase 3: Lending

**Goal:** the user manages money lent and borrowed with interest.

- Loan engine and golden vectors: LOAN-02 to LOAN-07 (see [LOAN_ENGINE.md](LOAN_ENGINE.md)).
- Loans and counterparties: LOAN-01, LOAN-08 to LOAN-15.
- Reminders to the user: NOT-04 (installments).

**Exit criteria:** all golden vectors pass on the server; scenarios 3.5 and 3.7 pass; payment concurrency tests pass.

## Phase 4: Planning and insights

**Goal:** the user learns to distribute income and sees where the money goes.

- Budgets and goals: BUD-01 to BUD-04, BUD-06.
- Dashboards, charts, forecasts, and export: DASH-01 (full), DASH-02, DASH-03, DASH-05.
- Recurring transactions: TXN-09.
- Notifications: budget alerts and the monthly summary (NOT-04).
- Data export: AUTH-07.

**Exit criteria:** dashboard targets in the non-functional requirements are met with 100,000 transactions per user.

## Phase 5: Integrations and AI

**Goal:** more capture channels and smarter guidance.

- WhatsApp bot: BOT-01 to BOT-09, behind `IMessagingGateway`.
- Binance sync: ING-14, ING-15.
- PDF statement import: ING-12.
- Income-distribution assistant: BUD-05.
- AI recommendations: DASH-04.

**Exit criteria:** scenario 3.6 passes; the bot never sends a message without an inbound one; the gateway contract tests pass for both adapters.

## Phase 6: Growth

- Shared workspaces and multi-user: AUTH-08.
- Subscription plans, if the business model requires them.
- Migration to the official WhatsApp API.
- Additional currencies and markets.
- Materialized balances if volume requires them.

## Dependencies between phases

```text
Phase 0 ─► Phase 1 ─┬─► Phase 2 ─► Phase 5
                    ├─► Phase 3
                    └─► Phase 4
```

Phases 2, 3, and 4 depend only on Phase 1 and can be reordered. Phase 5 builds on the draft pipeline from Phase 2.

## Risks that can change the order

| Risk | Effect |
|---|---|
| Binance P2P endpoint becomes unavailable | Phase 1 ships with manual rates only; the adapter is fixed or replaced |
| Store review rejects notification access | Phase 2 prioritizes statement import and the WhatsApp bot |
| Real notification formats resist the generic detector | Expand the corpus and rules; rely more on review drafts |
| Lending is the most urgent need | Move Phase 3 ahead of Phase 2 |
