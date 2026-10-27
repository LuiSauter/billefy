# Feature: WhatsApp Adapters (Devhooh & Meta) and Frontend Clean Architecture Refactor

## Context & Objectives
1. **WhatsApp Messaging Gateway Adapters (Backend):**
   - Implement `DevhoohWhatsAppGateway` using `https://api-whp.devhooh.com/api/v1/messages/send-text` with `Authorization: Bearer <token>` and payload `{"to": "<phone>", "message": "<text>"}`.
   - Implement `MetaOfficialWhatsAppGateway` for the official WhatsApp Business Cloud API (`https://graph.facebook.com/v21.0/{phone_number_id}/messages`).
   - Configure gateway selection via environment variables (`WHATSAPP_PROVIDER`: `Devhooh`, `Meta`, or `Simulated`).
   - Create root `.env.example` and `web/.env.example` with all configuration keys.
   - Update `README.md` with bash environment variable setup block and documentation.
2. **Frontend Web Clean Architecture Refactor:**
   - Decompose monolithic `web/src/app/page.tsx` (~1500 lines) into strict Clean Architecture:
     - `domain/`: Business types, entities, and domain calculation helpers.
     - `application/`: React query/state hooks and feature-specific use-case facades (`useAccounts`, `useTransactions`, `useDrafts`, `useLoans`, `usePlanning`, `useIntegrations`).
     - `infrastructure/`: API client and configuration (`web/src/infrastructure/api/client.ts`).
     - `presentation/components/`: Modular feature components (accounts, transactions, drafts inbox, loans, budgets, goals, financial health, WhatsApp simulator, Binance sync, CSV import).
     - `page.tsx`: Clean orchestrating view (< 100 lines).

## Tasks

- [ ] Task 1: WhatsApp Gateway Adapters (Devhooh & Meta Official) — Implement `DevhoohWhatsAppGateway` and `MetaOfficialWhatsAppGateway` behind `IMessagingGateway` with configuration-driven factory registration.
- [ ] Task 2: Root & Web Environment Configuration — Create `.env.example` and `web/.env.example` documenting all backend/frontend variables.
- [ ] Task 3: Documentation in README.md — Add detailed `bash` configuration block and integration instructions in `README.md`.
- [ ] Task 4: Frontend Clean Architecture: Domain & Infrastructure Layers — Reorganize `web/src/domain/` models and `web/src/infrastructure/` client.
- [ ] Task 5: Frontend Clean Architecture: Feature Components Refactor — Decompose dashboard into feature components (`accounts`, `transactions`, `drafts`, `lending`, `planning`, `integrations`).
- [ ] Task 6: Frontend Clean Architecture: Orchestrating Page & Verification — Refactor `web/src/app/page.tsx` into a clean composite view and verify with Vitest, ESLint, and Next.js build.
- [ ] Task 7: Full Test Suite Verification — Verify backend (68+ tests), mobile, and web suites.

## Acceptance Criteria & Checks
1. Devhooh WhatsApp adapter sends text via `POST https://api-whp.devhooh.com/api/v1/messages/send-text` with Bearer authentication.
2. Meta official adapter formats payload and headers for WhatsApp Cloud API.
3. Provider is selectable via environment variable / appsettings.
4. Web frontend adheres strictly to Clean Architecture, with `page.tsx` under 150 lines and zero lint/type errors.
5. All test suites pass (backend, mobile, web).

## Progress & Evidence
- Branch `feat/whatsapp-adapters-and-web-clean-architecture` created.

## Next Step
Implement Task 1: WhatsApp Gateway Adapters (Devhooh & Meta Official).
