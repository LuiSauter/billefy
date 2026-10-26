# Architecture

This document describes how the Personal Finance Manager is structured and why. It is the reference for implementation. Decisions and their rationale are recorded in [DECISIONS.md](DECISIONS.md). Diagrams are in [diagrams/](diagrams/).

## 1. Architectural drivers

| Driver | Consequence |
|---|---|
| Money must be exact and auditable | Decimal arithmetic, immutable ledger, derived balances, audit log |
| Users' financial data is sensitive and the app is public | Data minimization, on-device filtering, encryption, deletion on request |
| Money is scattered across channels with no bank APIs | Unified ingestion pipeline that produces drafts from notifications, WhatsApp, statements, and Binance |
| Automatic capture is imperfect | Human confirmation, deduplication, idempotency everywhere |
| Exchange rates come from the parallel market via an unofficial endpoint | Rate-source port with adapters, cached history, manual override, staleness indicator |
| WhatsApp access is unofficial today | Messaging gateway port so the provider can be replaced |
| Small team using AI-assisted development | Simple deployment, strong module boundaries, executable specifications, thorough tests |

## 2. Principles

1. **Correctness over cleverness.** Money logic is boring, explicit, and heavily tested.
2. **The server is the source of truth.** Clients preview and queue; the server decides.
3. **Automation proposes, the user disposes.** Every automated entry is a draft.
4. **Minimize data.** Collect only what is needed, keep it only as long as needed.
5. **Ports and adapters at every unstable boundary.** Binance, WhatsApp, LLM, email, push.
6. **Modular monolith first.** Split into services only when a measured need appears.
7. **Everything retryable is idempotent.**

## 3. Technology stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile | Kotlin Multiplatform, Compose Multiplatform | Android and iOS share logic and UI; iOS host is a thin SwiftUI shell |
| Web | Next.js, TypeScript (strict) | Generated API client |
| Backend | ASP.NET Core, C# | Modular monolith, two hosts: `Api` and `Worker` |
| Data access | EF Core with Npgsql | One DbContext per module over the same database |
| Database | PostgreSQL | Data, job queue (Hangfire), advisory locks |
| Jobs | Hangfire (PostgreSQL storage) | Queued and recurring jobs, no Redis |
| Cache | In-process memory cache | Replaceable by a distributed cache if the API scales out |
| Object storage | S3-compatible | Statement files, backups |
| Ingress | Traefik with TLS | Reverse proxy |
| Packaging | Docker images | Deployed with Coolify on a VPS |
| Contract | OpenAPI | Generates Kotlin and TypeScript clients |

## 4. System context

External actors and systems:

- **User** on Android, iOS, or the web, and on WhatsApp.
- **Google Identity** and **Sign in with Apple** for authentication.
- **Binance** for the parallel-market rate (P2P, unofficial endpoint) and, optionally, read-only account data.
- **WhatsApp provider** (unofficial API today) for the bot.
- **LLM provider** for fallback parsing, bot interpretation, and optional recommendations.
- **Push services** (FCM, APNs, Web Push) and an **email provider**.

See `diagrams/01-casos-de-uso.puml` and `diagrams/02-componentes.puml`.

## 5. Backend structure

### 5.1 Solution layout

```text
backend/src/
  Api/                     HTTP host: endpoints, authentication, validation, rate limiting, OpenAPI
  Worker/                  Hangfire server host (same codebase, separate process)
  BuildingBlocks/          Money, Clock, Result, Idempotency, Auditing, Pagination
  Modules/<Module>/
    <Module>.Contracts/    Public interfaces and DTOs other modules may use
    <Module>.Domain/       Entities, value objects, domain rules (no framework dependencies)
    <Module>.Application/  Use cases (one handler per use case)
    <Module>.Infrastructure/ EF Core configuration, repositories, module-specific adapters
  Integrations/            Binance, WhatsApp (unofficial and official), Email, Push, LLM
```

### 5.2 Modules

| Module | Responsibility | Main tables |
|---|---|---|
| Identity | Sign-in, sessions, devices, profile, account deletion | `users`, `external_identities`, `sessions`, `devices` |
| Ledger | Accounts, categories, transactions, templates, balances | `accounts`, `categories`, `transactions`, `transaction_templates` |
| Ingestion | Raw events, drafts, deduplication, statement imports, Binance sync | `financial_sources`, `raw_events`, `drafts`, `draft_events`, `imports`, `binance_integrations` |
| Lending | Counterparties, loans, schedules, payments, late interest | `counterparties`, `loans`, `installments`, `payments`, `payment_allocations` |
| Planning | Budgets, goals, suggestions, health indicators | `budgets`, `goals` |
| Fx | Parallel-market rates, history, manual rates, conversion | `exchange_rates` |
| Analytics | Dashboards, reports, forecasts, recommendations | none (reads through contracts) |
| Messaging | WhatsApp bot, conversation handling, gateway port | `whatsapp_links`, `whatsapp_messages` |
| Notifications | Alerts, reminders, preferences, push and email delivery | `notifications`, `notification_preferences` |

Cross-cutting: `audit_log`.

### 5.3 Rules between modules

- A module calls another only through its `Contracts` project.
- No module reads or writes another module's tables directly. Foreign keys across modules may exist in the database, but access goes through contracts.
- Dependencies point inward: `Api` → `Application` → `Domain`. `Domain` depends on nothing but `BuildingBlocks`.
- Architecture tests fail the build if these rules are broken (see [TESTING.md](TESTING.md)).

### 5.4 Allowed module dependencies

```text
Api ───────► every module's Application layer
Ingestion ─► Ledger (confirm draft), Notifications
Lending ───► Ledger (payments, disbursement), Notifications
Planning ──► Ledger, Notifications, Fx
Analytics ─► Ledger, Planning, Lending, Fx
Messaging ─► Ingestion (drafts), Lending (debts)
Ledger ────► Fx (rate snapshot)
Notifications ► none of the business modules
Identity ──► Notifications (deletion confirmation email)
```

## 6. Data architecture

### 6.1 Conventions

- One PostgreSQL database. Table and column names are `snake_case` English (see the naming map in [DOMAIN_GLOSSARY.md](DOMAIN_GLOSSARY.md)).
- Primary keys are UUIDs generated by the application.
- Timestamps are `timestamptz` in UTC. Dates without time are `date`.
- Money is `numeric(20,6)` with a currency code (`varchar(10)`: ISO 4217 such as `BOB`, `USD`, or an asset code such as `USDT`).
- Every business table has `user_id`. All queries filter by it (global query filters in EF Core). Row-level security can be added later if needed.
- Enumerations are stored as text and validated in the application.

### 6.2 Ledger model

- `transactions` are **immutable**. A correction is a new transaction with `reverses_id` pointing to the original.
- `amount > 0`; the `direction` (`income` or `expense`) defines the sign.
- A transfer is two transactions that share a `transfer_id`.
- **Balance = `initial_balance` + sum of signed transactions.** Not stored. If volume requires it, add a materialized balance table maintained by the application, never edited by hand.
- Each transaction stores `applied_rate` and `rate_source` (snapshot at creation).

### 6.3 Idempotency

- Resource-creating endpoints accept `Idempotency-Key`. It is stored as `idempotency_key` with a unique index on `(user_id, idempotency_key)` on `transactions`, `payments`, and `loans`.
- Raw events: unique `(user_id, event_id)` where `event_id` is generated by the client.
- WhatsApp messages: unique `provider_message_id`.
- Imports: unique `(user_id, file_hash)`.
- Notifications: unique `(user_id, dedup_key)`.
- Retrying a request with the same key returns the original result.

### 6.4 Deletion and retention

- Account deletion sets `users.deleted_at`, revokes sessions, removes push tokens, unlinks WhatsApp, deletes Binance keys, and schedules a purge job after a 30-day grace period. The purge deletes all user data and stored files.
- Raw event text is purged 30 days after receipt. Normalized fields are kept.
- Backups expire after 35 days; deleted users leave backups at expiry.

## 7. Core flows

### 7.1 Ingestion pipeline

```text
Source ─► Capture ─► Raw event ─► Parse ─► Normalize ─► Deduplicate ─► Draft ─► User confirms ─► Transaction
```

**Sources:** Android notifications, WhatsApp messages, statement imports (CSV, later PDF), Binance sync.

**Android capture (on device):**

1. `NotificationListenerService` receives a notification.
2. The **financial detector** (rules) checks for an amount with a currency and a financial keyword (for example "received", "transfer", "deposit", "payment", in Spanish and English).
3. If it does not look financial: discard locally. Nothing is uploaded or stored.
4. If the originating app has no decision yet: ask the user once whether it is a financial source and remember the answer. Rejected apps are discarded.
5. Accepted: write the event to the **local outbox** with a client-generated `event_id`.
6. The outbox posts to `POST /ingestion/events` with `Idempotency-Key = event_id`, retrying offline.

**Server side:**

1. Insert into `raw_events` with `ON CONFLICT (user_id, event_id) DO NOTHING`. A conflict means a retry: respond `200`. Otherwise enqueue a parse job and respond `202`.
2. The parse job extracts amount, currency, direction, reference, date, and account hint using generic rules. If the rules fail and the user consented, it masks account numbers and names and asks the LLM for structured output with a confidence value. If it still fails, create a draft in `review` state with the original text for manual completion.
3. **Deduplication** runs inside a transaction that holds a per-user advisory lock (`pg_advisory_xact_lock`):
   - Compute the **fingerprint**: `sha256(user_id | amount | currency | direction | reference)` when a reference exists, otherwise the same fields with a 5-minute time bucket.
   - Look for an existing draft or confirmed transaction with the same reference or fingerprint, or the same amount, currency, and direction within ±5 minutes.
   - If found: link this event as an additional source (`draft_events`). Do not create a new draft.
   - If not found: insert the draft in `pending` state, with suggested account and category.
   - A unique partial index on `(user_id, fingerprint)` for `pending` and `confirmed` drafts is the last line of defense.
4. Notify the user of new drafts (grouped when many arrive together).

**Confirmation:** the user reviews, edits, and confirms. In one database transaction the system inserts the transaction (with the rate snapshot) and marks the draft `confirmed`. Discarding keeps the fingerprint so the same movement does not reappear. A draft can also be linked to another draft as a transfer between the user's own accounts.

**Draft states:** `received → parsing → pending | review | duplicate`, then `confirmed | discarded`. See `diagrams/06-estados-borrador.puml`.

**Other sources:**

- **Statement import:** upload, preview with column mapping, asynchronous processing, one draft per row through the same flow. A repeated file hash warns the user.
- **WhatsApp:** the bot interprets text, creates a draft, and asks the user to confirm by replying.
- **Binance:** read-only sync creates drafts with `external_reference` (the Binance operation id) and balance-reconciliation adjustments when balances differ.

### 7.2 Exchange rates

- A recurring job asks the `IRateSource` port for parallel rates (and market rates for single-rate countries). The primary adapter consumes **DolarApi** (e.g. `bo.dolarapi.com/v1/dolares/binance` for Binance P2P in Bolivia; `mx.dolarapi.com`, `br.dolarapi.com` for respective market rates), with direct Binance P2P scraping as a secondary/fallback adapter to avoid cloud datacenter IP blocks.
- Rates with dual markets store explicit `buy` and `sell` rates in `exchange_rates` with source, side, sample size, and timestamp. History is append-only.
- **Reading rule:** a user holding local currency sees the **buy** rate; a user holding US dollars sees the **sell** rate. Valuing local currency in dollars uses buy; valuing dollars in local currency uses sell.
- **Staleness:** the API returns `stale = true` when the latest rate is older than a threshold. Clients show the timestamp and a warning.
- **Fallback:** if the source fails, keep the last rate in the database. Users can enter a manual rate (`source = manual`, scoped to the user).
- **Support list:** a currency is offered with live rates only if a recent rate exists for it. Others are shown without conversion.
- Official rates are never used for dual-currency markets (e.g., Bolivia). Only local currency and US dollars are converted in the MVP; other currencies are shown unconverted.

### 7.3 Lending

- Counterparties are plain records owned by the user. They are not users and are never contacted.
- Users choose a **template** and parameters; the server computes the schedule using the loan engine ([LOAN_ENGINE.md](LOAN_ENGINE.md)) and stores installments.
- Lifecycle: simulated (not stored) → pending acceptance → active → in arrears → paid, forgiven, or canceled. See `diagrams/07-estados-prestamo.puml`.
- Terms are **immutable after activation**. Changes are made by creating a new loan (refinancing).
- Payments are allocated in a database transaction that locks the loan row (`SELECT … FOR UPDATE`), computes late interest, applies the allocation order, handles early payments by the chosen policy, optionally creates a ledger transaction, and updates states.
- The counterparty's acceptance is a manual record with a date and an optional note.
- Users can share an agreement summary (text or PDF) through the operating system's share sheet. The app does not send it.

### 7.4 Notifications

- Types: new draft, budget threshold and excess, installment due soon and overdue, import finished, Binance connection problem, monthly summary.
- Channels: push (FCM, APNs, Web Push) and email. Per-type preferences and quiet hours per user.
- `notifications` has a unique `(user_id, dedup_key)` to prevent repeated alerts.
- Invalid push tokens are removed on delivery errors.
- Notifications go **only to the account owner**.

### 7.5 WhatsApp bot

- **Linking:** the user enters their number in the app; the system creates a pending link. The user sends the confirmation text to the bot number. A matching inbound message activates the link.
- **Inbound:** the provider's webhook reaches the API; the adapter normalizes it into an `IncomingMessage`; the bot deduplicates by provider message id.
- **Interpretation:** simple rules first; if they fail and the user consented, the masked text goes to the LLM.
- **Output:** the bot creates a draft and replies with a summary and options (for example "1 to confirm, 2 to cancel"). A reply of `1` confirms the draft linked to the last outgoing message.
- **Constraints:** plain text only; replies only to inbound messages; never initiates a conversation.
- **Gateway:** `IMessagingGateway` exposes `SendText` and message normalization. The unofficial adapter implements it today. A Cloud API adapter can replace it without touching the rest. Send failures retry with backoff; a failed reply does not roll back a confirmed transaction.

### 7.6 Analytics

- Dashboards aggregate by period, category, account, and currency, converting to the view currency with the reading rule.
- Results are cached in memory per `(user, period, data_version)`. The version increments when the user registers, reverses, or imports transactions.
- Forecasts use moving averages and recurring patterns. They are rule-based first.
- LLM recommendations are opt-in and receive **aggregated indicators only**, never descriptions or counterparty names.

## 8. Asynchronous processing

| Job | Trigger | Notes |
|---|---|---|
| `ingestion.parse-event` | On enqueue | Idempotent per raw event |
| `ingestion.process-import` | On enqueue | One draft per statement row |
| `ingestion.purge-raw-events` | Daily | Clears text older than 30 days |
| `fx.refresh-rates` | Every 5 minutes | Per supported currency and side |
| `planning.evaluate-budget` | On enqueue after a transaction | Deduplicated alerts |
| `lending.installment-reminders` | Hourly sweep, per user time zone | Due in 3 days, 1 day, today, overdue |
| `notifications.dispatch` | On enqueue | Respects quiet hours |
| `binance.sync` | Every 15 minutes per integration | Read-only; backoff on rate limits |
| `identity.purge-deleted-users` | Daily | After 30-day grace period |
| `analytics.monthly-summary` | Monthly | Optional email |

All jobs are idempotent and safe to execute twice. Hangfire stores jobs in PostgreSQL, so enqueueing can share a transaction with the data change when needed.

## 9. API design

- **Style:** REST over HTTPS, JSON, OpenAPI. Versioned by URL prefix (`/v1`).
- **Authentication:** short-lived JWT access token and rotating refresh token, stored in the Android Keystore, iOS Keychain, or secure web cookies.
- **Errors:** RFC 9457 problem details with a stable `code`.
- **Idempotency:** `Idempotency-Key` header on creating endpoints.
- **Pagination:** cursor-based for lists (`limit`, `cursor`).
- **Concurrency:** `ETag` and `If-Match` for editable resources where needed.
- **Rate limiting:** per user and per IP, stricter on authentication and webhooks.
- **Webhooks:** verify the provider's signature or shared secret; deduplicate by message id; respond quickly and process asynchronously.
- **Contract:** the OpenAPI file is committed. CI fails if it differs from the generated one. Kotlin and TypeScript clients are generated from it.

## 10. Client architecture

### 10.1 Mobile (Kotlin Multiplatform)

```text
mobile/
  shared/        Domain models, Money, API client (generated), offline outbox, sync
  composeApp/
    commonMain/  Compose Multiplatform screens and view models
    androidMain/ Notification listener, financial detector, Keystore, push
    iosMain/     Keychain, push, platform glue
  iosApp/        Thin Xcode host
```

- **Offline outbox:** every write is stored locally with an idempotency key and sent when connected.
- **Money on the client** uses a decimal type from a multiplatform library. Loan previews call the server; local calculation is allowed only if the shared golden vectors pass.
- **Android capture subsystem** lives entirely in `androidMain`: it needs the user's special notification-access permission and a prominent in-app disclosure. Some manufacturers kill background services, so the app guides users to exclude it from battery optimization.
- **iOS** cannot read other apps' notifications. iOS users rely on the WhatsApp bot, quick entry, templates, and statement import.

### 10.2 Web (Next.js)

- Server-rendered shell with client components for interactive screens.
- Generated TypeScript API client; decimal helper for money.
- Web Push through a service worker. On iOS, web push works only when the site is installed as a web app.

## 11. Integrations

| Integration | Port | Failure strategy |
|---|---|---|
| Parallel & Market FX (DolarApi / Binance P2P) | `IRateSource` | Keep last rate in DB, mark stale, allow manual rate |
| Binance account (read-only) | `IExchangeAccountClient` | Backoff on rate limits, mark integration `error` on invalid keys, ask the user to reconnect |
| WhatsApp | `IMessagingGateway` | Retry with backoff, mark message failed, continue without the bot |
| LLM | `ILlmClient` | Fall back to review drafts, apply per-user daily caps, enforce consent and masking |
| Push | `IPushSender` | Remove invalid tokens, retry transient errors |
| Email | `IEmailSender` | Retry with backoff |
| Identity providers | OIDC | Validate tokens against cached JWKS |

## 12. Security overview

Detailed in [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md). Highlights: TLS everywhere, encryption of secrets at rest, short-lived tokens with rotation, per-user data isolation, on-device filtering of notifications, LLM data minimization, account deletion, and audit logging.

## 13. Deployment

```text
Internet ─► Traefik (TLS) ─┬─► web      (Next.js container)
                           ├─► api      (ASP.NET Core container)
                           └─► webhook  (routes to api)
                  worker (Hangfire server container)
                  postgres (container with persistent volume)
                  S3-compatible object storage (statements, backups)
```

- Docker images built in CI and deployed with Coolify.
- **Environments:** local (Docker Compose), staging, production. Configuration through environment variables and a secret store; no secrets in the repository.
- **Backups:** daily full backup plus continuous WAL archiving to object storage; restore drills are scheduled.
- **Scaling path:** scale `api` and `worker` horizontally first. Move the in-memory cache to a distributed one when running more than one API replica. Move PostgreSQL to a managed service when needed.

## 14. Observability

- Structured logs with correlation ids and redaction of sensitive fields.
- Metrics: request latency, job duration and failures, queue depth, rate freshness, draft volume, deduplication hits, bot send failures.
- Error tracking (for example Sentry).
- Alerts on stale rates, failing jobs, and elevated error rates.

## 15. Evolution

Split a module into a separate service only when measurements show that it needs independent scaling or deployment. The first candidates are Messaging (webhook load) and Ingestion (parse throughput). Module contracts and idempotent jobs make that split mechanical.

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Binance P2P endpoint changes or blocks requests | Adapter behind `IRateSource`, cached history, manual rate, staleness warnings, alert on failures |
| WhatsApp number is banned | Gateway port, user-initiated conversations only, app works fully without the bot, migration path to the official API |
| Store rejection for notification access | Prominent disclosure, on-device filtering, user-selected financial sources, privacy policy, minimal data |
| Wrong parsing creates bad data | Drafts require confirmation, original text kept for 30 days, review state, corpus-based tests |
| Duplicate movements across channels | Idempotency, fingerprint, advisory lock, unique partial index |
| Loan calculation mistakes | Server-authoritative engine, golden vectors, property tests, immutable terms after activation |
| LLM cost and privacy | Rules first, masking, consent, daily caps, aggregated data for recommendations |
| Single-VPS failure | Backups with restore drills, infrastructure as configuration, horizontal scale path |

## 17. Diagram index

| File | Content |
|---|---|
| `diagrams/01-casos-de-uso.puml` | Use cases |
| `diagrams/02-componentes.puml` | Logical components, interfaces, adapters |
| `diagrams/03-despliegue.puml` | Deployment |
| `diagrams/04-modelo-de-datos.puml` | Data model |
| `diagrams/05-secuencia-ingesta.puml` | Ingestion sequence |
| `diagrams/06-estados-borrador.puml` | Draft state machine |
| `diagrams/07-estados-prestamo.puml` | Loan and installment state machines |
| `diagrams/08-secuencia-bot-whatsapp.puml` | WhatsApp bot sequence |
| `diagrams/09-clases-motor-prestamos.puml` | Loan engine classes |
