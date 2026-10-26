# AGENTS.md

Instructions for AI coding agents and contributors working on Billefy (Personal Finance Manager).

> **EFFICIENCY RULE FOR AGENTS:**
> **DO NOT read all documents in `docs/` upfront.** Only consult a specific document **on demand** when your current task directly touches that subsystem. Never scan or load the entire `docs/` directory into context.

## 1. On-demand reference map

Consult only the file relevant to what you are doing right now:

| If your task touches... | Read only this document |
|---|---|
| Scope, requirements, acceptance criteria | `docs/REQUIREMENTS.md` |
| System layers, module contracts, core flows | `docs/ARCHITECTURE.md` |
| Loans, interest math, golden vectors | `docs/LOAN_ENGINE.md` |
| Auth, tokens, privacy, encryption, data leaks | `docs/SECURITY_AND_PRIVACY.md` |
| Tests, golden vector fixtures, architecture tests | `docs/TESTING.md` |
| Roadmap phase goals and exit criteria | `docs/ROADMAP.md` |
| Domain naming (English code vs Spanish diagrams) | `docs/DOMAIN_GLOSSARY.md` |
| Architectural rationale (ADRs) | `docs/DECISIONS.md` |

## 2. Standard commands (Phase 0+)

```bash
# Backend (.NET)
dotnet build backend/
dotnet test backend/
dotnet format backend/ --verify-no-changes

# Mobile (KMP)
./gradlew :shared:allTests
./gradlew :composeApp:assembleDebug

# Web (Next.js)
pnpm --dir web install && pnpm --dir web lint && pnpm --dir web test && pnpm --dir web build

# API contract (OpenAPI + client regeneration)
./tools/generate-clients.sh
```

## 3. Non-negotiable rules

### Money & Ledger
1. **Never use floating point for money.** Use `decimal` (C#), `numeric(20,6)` (Postgres), or a decimal library (KMP/TS). Always pair with currency (`Money`).
2. **Server is source of truth.** Clients preview, but the server calculates and persists loan schedules and balances.
3. **Transactions are immutable.** Corrections are reversal transactions (`reverses_id`), never `UPDATE` or `DELETE` on amounts.
4. **Balances are derived** (`initial_balance + sum(transactions)`). Never store a mutable balance column.
5. Every transaction stores its **exchange rate snapshot** (`applied_rate`, `rate_source`).

### Ingestion & Drafts
6. **Automation creates drafts only.** Notifications, WhatsApp, imports, and Binance create drafts; only user confirmation creates transactions.
7. Deduplication is two-level: technical (`Idempotency-Key` header) and logical (fingerprint/reference).

### Privacy & Security
8. **Android notifications filter on-device.** Non-financial notifications never leave the phone. Raw captured text purges after 30 days.
9. **Never log secrets or PII** (tokens, keys, message bodies, account numbers, names).
10. **LLM calls go only through `ILlmClient`** with user consent, masked data, and daily quotas.
11. **Never contact counterparties.** The WhatsApp bot is reply-only and never initiates chats.

### FX & Integrations
12. **Parallel rates only** (Binance P2P via DolarApi / adapter). User holding local currency sees **buy** rate; holding USD sees **sell** rate.
13. All external integrations (DolarApi, WhatsApp, Binance, LLM, Push, Email) must sit behind ports/interfaces.

## 4. Code & Git conventions
- **Language:** English for code, database, API, logs, and commit messages. Spanish/English for UI strings.
- **Backend:** C# modular monolith. Modules talk **only** through `<Module>.Contracts`. Dependencies point inward.
- **Git:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Small, focused PRs.
- **Definition of Done:** Builds cleanly, tests pass, warnings as errors, OpenAPI diff clean, no secrets committed.
