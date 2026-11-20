# Feature: Phase 1 Client Integration (Web & Mobile)

## Objective
Connect Web (Next.js 15) and Mobile (Kotlin Multiplatform) clients to the Core Ledger API, allowing users to view accounts with real-time derived balances and register income/expense movements.

## Problem
A backend API without functional client interfaces leaves the product inaccessible to end users.

## Why
Phase 1 exit criteria mandate that users can consolidate balances and register movements manually in both BOB and USD on Web and Android.

## Scope
- Web typed API client in `web/src/api/client.ts` consuming the `/v1/` endpoints.
- Web UI: Dashboard showing accounts list, balance cards by currency, and forms to create accounts and register transactions.
- Web unit tests with Vitest verifying client requests and error handling.
- Mobile shared models in `mobile/shared` matching `docs/openapi.json`.
- Mobile Compose UI in `mobile/composeApp` presenting accounts and transaction entry.
- Build and test verification across `web` and `mobile`.

## Constraints
- No float arithmetic for money: use `Decimal.js` on Web, `bignum` on Mobile.
- Language: English code/identifiers, Spanish UI strings as default.
- Respect linting, warnings as errors, and format checks.

## Tasks

- [x] Task 1: Web Typed API Client — `web/src/api/client.ts` with error handling and Decimal conversion.
- [x] Task 2: Web Dashboard & Transaction Entry UI — `web/src/app/page.tsx` with accounts summary, create account form, and movement registration.
- [x] Task 3: Web Tests & Quality Checks — Vitest tests for API client and helpers (`pnpm --dir web test && lint && build`).
- [x] Task 4: Mobile Shared API Models & Client Abstractions — `AccountDto`, `CreateAccountRequest`, `RegisterTransactionRequest` in `mobile/shared`.
- [x] Task 5: Mobile Compose UI & Verification — Accounts screen and debug assembly verification (`./gradlew :shared:allTests && :composeApp:assembleDebug`).

## Acceptance Criteria & Checks
1. `pnpm --dir web test`, `lint`, and `build` succeed with 0 errors. (PASS)
2. Web client correctly maps API responses and serializes requests with exact decimals. (PASS)
3. `./gradlew :shared:allTests` passes cleanly. (PASS)
4. `./gradlew :composeApp:assembleDebug` builds the Android APK without error. (PASS)

## Progress & Evidence
- Branch `feat/phase-1-client-integration` created.
- Tasks 1-3 completed: `web/src/api/client.ts`, dashboard page with live P2P valuation and modals, and passing Vitest tests (commit `06e602e`).
- Tasks 4-5 completed: KMP models in `mobile/shared`, Compose UI in `mobile/composeApp`, and passing `./gradlew` tests and debug APK compilation (commit `06e602e`).

## Next Step
Phase 1 Core Ledger client integration completed. Ready to merge into `main` and conclude Phase 1 milestone.
