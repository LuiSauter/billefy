# Feature: Phase 5 Advanced Integrations (WhatsApp Bot, Binance Read-Only Sync & Income Distribution)

## Context & Objectives
Implement Phase 5 deliverables as defined in `docs/REQUIREMENTS.md` (BOT-01 to BOT-09, ING-14 to ING-15, BUD-05) and `docs/ARCHITECTURE.md`:
1. **WhatsApp Bot (BOT-01 to BOT-09):**
   - User links phone number with verification.
   - Bot NEVER initiates conversations; only replies to user-initiated incoming messages (Rule 21).
   - Natural language expense/income logging creating inbox drafts (Rule 9).
   - "1" / "Confirmar" confirms last draft into Ledger.
   - "2" / "Descartar" discards last draft.
   - "Saldo" / "Balance" replies with account balances.
   - "Cotización" / "Dólar" replies with Binance P2P parallel rate.
   - Decoupled behind `IMessagingGateway` (Rule 23).
   - Webhook idempotency via `provider_message_id`.
2. **Binance Read-Only Sync (ING-14, ING-15):**
   - Connect API key with strict read-only enforcement: rejects any keys with trade/withdrawal permissions (Rule 18).
   - Syncs P2P orders and deposits as drafts through `IDeduplicationService`.
3. **Income Distribution Assistant (BUD-05):**
   - Proposes 50/30/20 breakdown adjusted for active debt liabilities when income is registered.
4. **Web UI & REST Endpoints:**
   - WhatsApp webhook, linking, and simulator.
   - Binance connect & sync actions.
   - Income distribution calculator.

## Tasks

- [x] Task 1: Messaging Domain & Port — Implement `WhatsAppLink`, `WhatsAppMessage`, and `IMessagingGateway` in `Messaging.Domain`.
- [x] Task 2: WhatsApp Bot Application Service — Implement `IWhatsAppBotService` in `Messaging.Application` with commands (linking, parse movement, confirm/discard draft, balance, rate).
- [x] Task 3: Binance Read-Only Sync Service — Implement `IBinanceSyncService` with permission security guard (Rule 18) and draft synchronization.
- [x] Task 4: Income Distribution Assistant — Implement `IIncomeDistributionService` (BUD-05) in `Planning.Application`.
- [x] Task 5: Messaging Infrastructure & EF Core Migrations — Implement `MessagingDbContext`, configurations, repositories, and generate PostgreSQL migration `InitialMessaging`.
- [x] Task 6: REST Endpoints & OpenAPI Contract — Implement `MessagingEndpoints` and `BinanceEndpoints`, and refresh OpenAPI contract.
- [x] Task 7: Unit & Integration Tests — Tests for bot command dispatching, webhook idempotency, Binance key validation, and income distribution math.
- [x] Task 8: Web Advanced Integrations UI — Add WhatsApp Bot Simulator, Binance Sync, and Income Distribution Assistant to the dashboard.

## Acceptance Criteria & Checks
1. Webhook processing is idempotent on `provider_message_id` (verified in ApiIntegrationTests). (PASS)
2. Bot replies strictly to inbound messages (never initiates conversations, Rule 21) (PASS).
3. "Saldo" replies with real account balances, "Cotización" with P2P rate, and "1" confirms the last pending draft into the Ledger (verified in ApiIntegrationTests). (PASS)
4. Binance key validation rejects any key that permits trading or withdrawals (Rule 18, verified in ApiIntegrationTests). (PASS)
5. Clean Architecture rules hold: all endpoints ultra-thin, all tests pass (68 backend tests, 5 web tests, 13 mobile tests). (PASS)

## Progress & Evidence
- Branch `feat/phase-5-advanced-integrations` created.
- Tasks 1-8 completed in commit `549b48b`.

## Next Step
Merge `feat/phase-5-advanced-integrations` into `main`.
