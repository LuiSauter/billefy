# Architecture Decision Records

Each record states the context, the decision, and its consequences. Status values:

- **Accepted:** decided by the product owner.
- **Proposed:** recommended by the architecture work and open to review.

To change an accepted decision, add a new record that supersedes it. Do not edit history.

---

## ADR-001: Modular monolith

**Status:** Accepted

**Context.** A small team builds a public product with AI-assisted development. The domain has clear areas (ledger, ingestion, lending, planning, rates, messaging, notifications) but no proven need for independent scaling.

**Decision.** Build one deployable backend divided into modules with explicit contracts, plus a separate worker process from the same codebase.

**Consequences.** Simple deployment, debugging, and transactions. Module boundaries must be enforced by architecture tests. A module can become a service later (first candidates: Messaging, Ingestion).

---

## ADR-002: Kotlin Multiplatform for mobile, Next.js for web

**Status:** Accepted

**Context.** The product needs Android and iOS apps. Native performance was a preference, but two native codebases double the work, and the app is mostly forms, lists, and charts.

**Decision.** Use Kotlin Multiplatform with Compose Multiplatform for shared logic and UI, a thin SwiftUI host for iOS, and platform code only where needed (Android notification capture, secure storage, push). Use Next.js for the web.

**Consequences.** One shared codebase for both platforms. Kotlin common code lacks a built-in decimal type, so a multiplatform decimal library is required. Clients are generated from the OpenAPI contract.

---

## ADR-003: ASP.NET Core and PostgreSQL

**Status:** Accepted

**Context.** The backend must be fast, reliable, and strongly typed, with first-class `decimal` support and good tooling for background jobs and testing.

**Decision.** Use ASP.NET Core (C#) with EF Core and Npgsql over PostgreSQL.

**Consequences.** `decimal` maps to `numeric` for exact money. A mature ecosystem for jobs, testing, and observability.

---

## ADR-004: Hangfire on PostgreSQL, no Redis

**Status:** Proposed

**Context.** The system needs queued and recurring jobs (parsing, rate refresh, reminders, purges). Redis would add another service to operate.

**Decision.** Use Hangfire with PostgreSQL storage. Use an in-process cache. Add a distributed cache only when running several API replicas.

**Consequences.** One fewer component. Jobs can be enqueued in the same database transaction as the data change. Queue throughput is limited by PostgreSQL, which is sufficient for the expected load. Revisit if job volume grows significantly.

---

## ADR-005: Immutable ledger with derived balances

**Status:** Proposed

**Context.** Financial data must be auditable and consistent. Editing amounts in place hides history and creates reconciliation problems.

**Decision.** Transactions are never updated or deleted. Corrections are reversal transactions. Balances are computed from the initial balance and transactions. Each transaction stores its exchange-rate snapshot.

**Consequences.** Full audit trail and simple reasoning. Balance reads aggregate transactions; add a materialized balance maintained by the application if volume requires it. The UI presents reversals as edit and delete.

---

## ADR-006: Money is decimal; the server owns loan calculations

**Status:** Proposed

**Context.** Rounding errors and divergent implementations in money logic erode trust.

**Decision.** Use `decimal` and `numeric(20,6)` everywhere. The server generates and stores loan schedules; clients preview through the API. A client-side engine is allowed only if it passes the shared golden vectors.

**Consequences.** One source of truth for interest, rounding, and allocation. Clients need a network call for previews, which is acceptable because simulation is interactive and cheap.

---

## ADR-007: Everything automatic is a draft

**Status:** Accepted

**Context.** Notifications, WhatsApp messages, statements, and Binance data are imperfect sources. Wrong automatic entries would damage the ledger.

**Decision.** All automatic capture creates a draft. Only user confirmation creates a transaction. All channels share one draft-creation flow with idempotency and deduplication.

**Consequences.** Slightly more user effort, much higher trust. One place to fix capture bugs. Requires an inbox with good ergonomics (bulk confirm, suggestions).

---

## ADR-008: On-device filtering of notifications, Android only

**Status:** Accepted, with refinement

**Context.** The product owner wants to read all notifications regardless of bank. Uploading every notification would collect private messages and codes, which is unacceptable for a public app and likely to be rejected by app stores. iOS does not allow reading other apps' notifications.

**Decision.** Read notifications on Android only. Classify them on the device with a generic financial detector. Discard non-financial notifications locally. Ask the user once per app whether it is a financial source. Upload only accepted financial notifications.

**Consequences.** Bank-agnostic capture without collecting unrelated data. Needs a prominent disclosure, a privacy policy, and guidance for battery optimization. iOS users depend on the bot, quick entry, and imports.

---

## ADR-009: Parallel-market rates from Binance P2P only

**Status:** Accepted

**Context.** The product owner wants only parallel-market rates, never official ones. Binance P2P has no official public API for ads, so the endpoint is unofficial. A buy and sell distinction depends on the currency the user holds.

**Decision.** Fetch rates through an `IRateSource` port with a Binance P2P adapter. Use the median of the first 10 to 20 filtered ads. Users holding local currency see buy; users holding US dollars see sell. Store history, show source and time, mark stale rates, and allow manual rates.

**Consequences.** Rates reflect the real market but depend on an unofficial source. The port, cache, history, and manual fallback limit the impact of changes or blocks. Only local currency and US dollars are converted at first.

---

## ADR-010: Messaging gateway port; WhatsApp unofficial API today

**Status:** Accepted

**Context.** The product owner has an unofficial API for sending text over WhatsApp and wants the code ready to migrate to the official API. Bans are possible with unofficial access.

**Decision.** Hide WhatsApp behind `IMessagingGateway` (send text, normalize inbound). The bot replies only to inbound messages from linked users, with plain text. The unofficial provider is an adapter; a Cloud API adapter can replace it.

**Consequences.** Migration is an adapter change. The bot's reply-only behavior matches the official API's customer-service window. The app must work fully without the bot.

---

## ADR-011: Google sign-in only (plus Apple on iOS)

**Status:** Accepted

**Context.** The first idea included WhatsApp login. That was dropped; WhatsApp is only for the bot. App stores usually require Sign in with Apple when other social sign-in is offered on iOS.

**Decision.** Authenticate with Google through OIDC, and add Sign in with Apple for iOS. Link identities in `external_identities`.

**Consequences.** Simple, secure authentication without managing passwords. A single provider outage blocks sign-in; sessions remain valid for signed-in users.

---

## ADR-012: No contact with counterparties

**Status:** Accepted

**Context.** Debtors and creditors who are not users would receive unsolicited messages. That raises privacy and consent issues.

**Decision.** The app never sends messages to counterparties. Reminders go to the account owner. The user can share an agreement summary through the operating system's share sheet, and records the counterparty's acceptance manually.

**Consequences.** No consent flows or unsubscribe handling for third parties. The user carries out any communication with the counterparty.

---

## ADR-013: LLM data minimization

**Status:** Accepted (delegated to architecture)

**Context.** The product owner asked for the best approach, preferring the lowest cost. LLM parsing and recommendations involve sensitive financial text.

**Decision.** Use rules first. Call the LLM only as a fallback, only for notifications already classified as financial, only with explicit and revocable consent, with account numbers and personal names masked, and with per-user daily caps. Recommendations receive only aggregated indicators. All calls go through `ILlmClient`.

**Consequences.** Most items cost nothing. Privacy risk is limited. Some unusual formats need manual completion if the user declines LLM use.

---

## ADR-014: Multi-user ready, single-user first

**Status:** Accepted

**Context.** Shared accounts are wanted later but not now.

**Decision.** Put `user_id` on every business table and filter all queries by it. Introduce a workspace concept when multi-user arrives.

**Consequences.** Cheap now, avoids painful migrations later. Per-user deletion is a simple cascade.

---

## ADR-015: Idempotency everywhere

**Status:** Proposed

**Context.** Mobile clients retry, webhooks are redelivered, and jobs can run twice. Duplicates in financial data are costly.

**Decision.** Use `Idempotency-Key` on creating endpoints with unique `(user_id, idempotency_key)` constraints. Use unique keys for raw events, WhatsApp message ids, import file hashes, and notification dedup keys. Serialize deduplication decisions per user with a PostgreSQL advisory lock and back them with a unique partial index.

**Consequences.** Safe retries across the system. Requires disciplined testing of replays and concurrency.

---

## ADR-016: Loan terms are the user's responsibility

**Status:** Accepted

**Context.** Users may set any interest. The product owner decided not to handle legal limits.

**Decision.** The app calculates and records the terms chosen by the user and a manual record of the counterparty's acceptance. It shows the effective annual rate for transparency and does not block or advise on rates. Terms of use state that the app only calculates and records.

**Consequences.** Simple product behavior. Terms of use and store listings must be clear about this scope.
