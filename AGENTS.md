# AGENTS.md

Instructions for AI coding agents and contributors working on the Personal Finance Manager. Read this file completely before changing anything. When this file and another document disagree, stop and ask.

## 1. Project in one paragraph

A multi-currency personal finance app (Android, iOS, web) that consolidates balances, captures movements semi-automatically (always with user confirmation), manages loans with interest, and plans budgets and goals. Backend: ASP.NET Core modular monolith on PostgreSQL. Clients: Kotlin Multiplatform (Android and iOS) and Next.js (web). The app is public, so privacy and correctness are product features, not afterthoughts.

## 2. Read first

| Topic | Document |
|---|---|
| What to build | `docs/REQUIREMENTS.md` |
| Quality targets | `docs/NON_FUNCTIONAL_REQUIREMENTS.md` |
| How it is structured | `docs/ARCHITECTURE.md` |
| Why it is structured that way | `docs/DECISIONS.md` |
| Loan math and test vectors | `docs/LOAN_ENGINE.md` |
| Security and privacy rules | `docs/SECURITY_AND_PRIVACY.md` |
| Vocabulary and naming map | `docs/DOMAIN_GLOSSARY.md` |
| Testing rules | `docs/TESTING.md` |
| Delivery order | `docs/ROADMAP.md` |
| Diagrams | `docs/diagrams/` |

## 3. Repository layout (planned)

```text
backend/
  src/
    Api/                 ASP.NET Core host (endpoints, auth, OpenAPI)
    Worker/              Hangfire server host
    BuildingBlocks/      Money, Clock, Result, Idempotency, Auditing
    Modules/
      Identity/  Ledger/  Ingestion/  Lending/  Planning/
      Fx/  Analytics/  Messaging/  Notifications/
    Integrations/        Binance, WhatsApp, Email, Push, LLM adapters
  tests/
mobile/
  shared/                KMP: models, money, API client, offline queue
  composeApp/            Compose Multiplatform UI (androidMain, iosMain)
  iosApp/                Thin Xcode host
web/                     Next.js
infra/                   Docker, Coolify, deployment config
docs/
```

Each backend module has `Domain`, `Application`, `Infrastructure`, and `Contracts` projects. See `docs/ARCHITECTURE.md`.

## 4. Commands (standard names, created in Phase 0)

These are the intended commands. If one does not exist yet, create it as part of the scaffolding instead of inventing a different name.

```bash
# Backend
dotnet build backend/
dotnet test backend/
dotnet format backend/ --verify-no-changes

# Mobile
./gradlew :shared:allTests
./gradlew :composeApp:assembleDebug

# Web
pnpm --dir web install
pnpm --dir web lint
pnpm --dir web test
pnpm --dir web build

# API contract (regenerates the OpenAPI file and the Kotlin and TypeScript clients)
./tools/generate-clients.sh
```

## 5. Non-negotiable rules

These rules protect users' money and data. Never break them, even if a task seems to require it. If it does, stop and ask.

### Money

1. **Never use floating point for money.** Use `decimal` in C#, `numeric(20,6)` in PostgreSQL, and a decimal library in Kotlin and TypeScript. Never `float` or `double`.
2. The only exception is the informational APR (TEA) solver in the loan engine, which may use `double` internally and rounds its result. Its output never feeds a balance.
3. Always carry the **currency** with the amount. Use the `Money` type, never a bare number.
4. Rounding is half away from zero at the currency's scale. The last installment absorbs the difference. See `docs/LOAN_ENGINE.md`.
5. The **server is the source of truth** for loan schedules and balances. Clients may preview but never persist computed schedules on their own.

### Ledger

6. **Transactions are immutable.** Corrections are new reversal transactions (`reverses_id`), never `UPDATE` or `DELETE` on amounts.
7. **Balances are derived** from `initial_balance` plus transactions. Do not store a mutable balance column.
8. A transaction stores the **rate snapshot** used at creation (`applied_rate`, `rate_source`). Never recompute historical values with today's rate.

### Drafts and automation

9. **Nothing automatic becomes a transaction without user confirmation.** Notifications, WhatsApp messages, imports, and Binance sync create **drafts** only.
10. Every ingestion path goes through the shared `CreateDraft` flow (idempotency, fingerprint deduplication, suggestions). Do not write a second path.
11. Deduplication is two-level: technical (idempotency key) and logical (fingerprint or external reference). Keep the unique partial index as the last line of defense.

### Idempotency

12. Every endpoint that creates a resource accepts an `Idempotency-Key` header, stored as a unique `(user_id, idempotency_key)` column on the created resource. Webhooks deduplicate by the provider's message id.
13. Retries must be safe. Test them.

### Privacy

14. **Non-financial notifications never leave the device and are never stored.** Only notifications classified as financial by the on-device detector, from an app the user accepted as a financial source, may be uploaded.
15. **Never log** tokens, API keys, secrets, full notification text, message bodies, account numbers, or counterparty names. Log ids and error codes.
16. **LLM calls** go only through `ILlmClient`. It enforces the user's consent, masks account numbers and personal names, and limits usage per user per day. Never call an LLM provider directly.
17. Raw event text is purged after 30 days. Do not add new places that keep raw text.
18. Never request, store, or process **bank credentials**. Binance keys must be read-only; reject keys that allow trading or withdrawals.

### Product behavior

19. **Exchange rates come only from the parallel market** (Binance P2P). Never use or display an official rate. Rule: a user holding **local currency** sees the **buy** rate; a user holding **US dollars** sees the **sell** rate. Valuing local currency in dollars uses buy; valuing dollars in local currency uses sell.
20. **Never contact counterparties** (people who owe or are owed money and are not app users). No emails, WhatsApp messages, or SMS to them. Reminders go to the account owner only.
21. **The WhatsApp bot never starts a conversation.** It only replies to an incoming message from a linked number, with plain text.
22. The app **records** the interest terms chosen by the user and the counterparty's acceptance (manual record). It does not give legal advice or enforce limits.
23. WhatsApp access goes through `IMessagingGateway`. Never call a provider SDK from domain or application code.

## 6. Backend conventions

- **Language:** C#, nullable reference types enabled, warnings as errors.
- **Modular monolith:** modules talk only through their `Contracts` project. No module reads another module's tables directly. Architecture tests enforce this.
- **Layers inside a module:** `Domain` (entities, value objects, rules, no framework dependencies) → `Application` (use cases) → `Infrastructure` (EF Core, adapters). `Api` only maps HTTP to use cases.
- **Use cases:** one handler per use case, named by intent (`ConfirmDraft`, `RegisterLoanPayment`). Keep endpoints thin.
- **Errors:** return RFC 9457 problem details. Use stable machine-readable `code` values. No stack traces in responses.
- **Time:** store UTC (`timestamptz`). Use the injected `IClock`, never `DateTime.Now`. Convert to the user's time zone only at the edge.
- **Naming:** code, database, API, logs, and commit messages are in **English**. UI strings are localized (Spanish first, English second) through resource files.
- **Database:** EF Core migrations only. Never edit a migration that has been applied anywhere. Destructive migrations need explicit approval. Every business table has `user_id`.
- **API:** REST with OpenAPI. Any endpoint change must regenerate the OpenAPI file and the Kotlin and TypeScript clients in the same pull request.
- **Background jobs:** Hangfire jobs must be idempotent and safe to run twice.
- **Dependencies:** prefer the standard library and existing dependencies. Ask before adding a new package.

## 7. Mobile conventions (Kotlin Multiplatform)

- Shared code in `shared/` and `composeApp/commonMain`. Platform code only where the OS requires it.
- **Notification capture is Android only** (`androidMain`): `NotificationListenerService` → financial detector → local outbox → API. iOS cannot read other apps' notifications; do not try to work around it.
- Before requesting notification access, show the prominent disclosure screen. Never request it silently.
- Store tokens in Android Keystore and iOS Keychain. Never in plain preferences.
- All writes go through the **offline outbox** with an idempotency key.
- Do not duplicate loan calculations unless the shared golden test vectors pass on both sides.

## 8. Web conventions (Next.js)

- TypeScript strict mode. The API client is generated; do not hand-write fetch code for API endpoints.
- No money arithmetic with JavaScript numbers. Use the decimal helper.
- Accessibility target: WCAG 2.2 AA.

## 9. Testing requirements

Details in `docs/TESTING.md`. Minimum bar for every change:

- New behavior has tests. Bug fixes start with a failing test.
- **Money, loan, FX, and deduplication code requires** unit tests, the golden vectors from `docs/LOAN_ENGINE.md`, and property-based tests where applicable.
- Anything with retries, webhooks, or jobs needs a concurrency or replay test.
- The notification detector is tested against the masked sample corpus.
- Do not delete or loosen a failing test to make a change pass. Explain the failure instead.

## 10. Git and pull requests

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), scope optional.
- Small, focused pull requests. One concern per PR.
- A PR description states what changed, why, how it was tested, and which docs were updated.
- Update the docs and diagrams in the same PR when behavior or structure changes.

### Definition of done

- Builds and all tests pass locally and in CI.
- Lint and format checks pass.
- OpenAPI file and generated clients are up to date.
- No secrets, personal data, or real notification text in code, tests, fixtures, or logs.
- Relevant docs and diagrams updated.
- Rules in section 5 still hold.

## 11. Ask before you…

- Add or change authentication, authorization, or token handling.
- Write a destructive or data-rewriting migration.
- Add a dependency or a new external service.
- Change a rule in section 5 or an accepted decision in `docs/DECISIONS.md`.
- Touch the loan formulas, rounding, or allocation order.
- Send any data to a third party.
- Make an assumption about product behavior that `docs/REQUIREMENTS.md` does not cover.

## 12. Naming note about diagrams

The PlantUML diagrams under `docs/diagrams/` use Spanish labels and table names (for example `movimiento`, `borrador`). The code and database use English names. The mapping is in `docs/DOMAIN_GLOSSARY.md`. Treat the English names as authoritative in code.
