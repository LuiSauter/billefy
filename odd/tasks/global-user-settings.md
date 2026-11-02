# Global User Settings and Currency System

## Objective
Implement the `docs/redesign/settings.png` settings experience for the web only, backed by persistent user settings, the global currency catalog, and correct FX semantics.

## Confirmed decisions
- Implement the complete settings screen, not only currency controls.
- A user's base currency is also the default for newly created wallets. It controls consolidated/reporting display; existing wallet denomination and ledger history never change.
- The globally supported currency catalog is BOB, USD, and USDT. The frontend obtains supported-currency metadata from the backend/database rather than maintaining independent currency lists.
- Use Binance P2P only; official rates are excluded by current product requirements. If USD is valued through BOB/USDT, label it explicitly as an approximation. USDT has no separate comparison currency.
- FX freshness is best-effort immediate/on-demand, not guaranteed real-time: refresh at request/open as appropriate, cache/coalesce requests, retain last-known data on provider failure, and expose source, timestamp, and staleness.
- Preserve the existing dirty worktree and branch `feat/mobile-web-parity`; do not reset, stash, stage, commit, rebase, or overwrite pre-existing changes. Work on the selected current worktree and keep each delegated write scoped.
- Never expose fake controls or claim unsupported operations. Existing Google OAuth cannot provide in-app password/2FA management; defer provider-owned security controls rather than inventing them. No RDD/native review, servers, DB seeding/application, or commits under the user's existing preferences.
- Scope is web only. Backend work is limited to APIs the web needs; no mobile/KMP source, tests, or builds are part of this feature.
- UI labels/layout and localization resources remain application assets; dynamic catalogs, user choices, and persisted configuration values come from the backend.

## Problem and evidence
- `User.PreferredCurrency` is persisted but cannot be changed through an API. Web theme/display currency are client-local; mobile currency choices are hardcoded.
- Backend accepts arbitrary currency codes while clients offer inconsistent lists. The FX worker polls BOB/USDT every five minutes; stale reads do not trigger a provider refresh, and web has a hardcoded rate fallback.
- The screenshot spans profile, general preferences, security, notifications, currency/region, connections, and privacy/data. Several pictured capabilities are absent or partial (notification preferences, session management, full data export, backup, real Binance/WhatsApp management); UI must truthfully reflect capability and must not fabricate state.
- The current worktree contains many pre-existing modifications across backend, web, mobile, generated OpenAPI, and task documents. Their diffs are not this feature's scope.

## Scope
- Persist per-user preferences for reporting/base currency, default new-wallet currency, theme, language/locale, IANA timezone, date format, week start, and default dashboard where supported by the existing product.
- Provide an authenticated settings/preferences contract and a database-backed global currency catalog seeded with the confirmed BOB/USD/USDT entries using forward EF migrations only.
- Use the selected user's settings consistently for web dashboard/reporting display, new-wallet defaults, currency formatting, and settings UI; never mutate existing account currencies.
- Make FX pair, side, proxy, source, timestamp, and stale/unavailable semantics explicit. Trigger bounded on-demand refresh and preserve the last stored rate if Binance/DolarApi is unavailable.
- Deliver a complete settings composition aligned to the supplied design. Wire existing real operations and add bounded backend persistence where required (profile/preferences, notification choices, sessions where supported, and data/privacy actions). Clearly defer features requiring unsupported external provider or backup infrastructure; do not simulate success.
- Replace hardcoded supported currency/rate data and frontend fallbacks with API-owned data. Do not move static UI labels or layout into the backend.

## Non-goals and safety constraints
- No official-market rate source, no trading/bank connection, and no claim that USD cash is identical to USDT; USDT/BOB is an explicitly identified USD valuation proxy only when that selected valuation path applies.
- No reinterpretation/re-denomination of existing wallet balances or historical transactions.
- No password/2FA implementation or representation of Google-managed security as an app-controlled toggle.
- Preserve `Currency.FromCode` as a parser for historical/imported codes; enforce active catalog membership at onboarding and account-creation command boundaries, not in the foundational value type.
- Catalog membership is separate from live-rate availability; USDT is selectable without implying an independently convertible pair.
- New-wallet requests continue to submit an explicit currency code; clients initialize that choice from the user's persisted base preference. Do not add an Identity dependency to Ledger or silently make the cross-module account request depend on user context.
- No fabricated backup status, live Binance connection, or unsupported source state. Real integration expansion beyond settings-owned configuration must be separately bounded if current APIs cannot support truthful controls.
- No manual database manipulation, schema edits outside EF migrations, applying migrations to the developer DB, background servers, generated OpenAPI overwrite, commit, push, or PR.

## Tasks
- [x] G1 (done): Add an Fx-owned global DB-backed BOB/USD/USDT catalog and `Fx.Contracts` read/validation interface; expose `GET /v1/currencies`; validate onboarding `PreferredCurrency` and Ledger account creation against active catalog entries; add an authenticated base-currency update API reusing `User.PreferredCurrency`; keep existing account currency inputs explicit. Update architecture dependency rules, add a forward migration and focused persistence/API/domain tests.
- [x] G2 (done): Make backend FX freshness explicit: refresh stale latest-rate requests from the Binance P2P-backed source with bounded per-pair request coalescing/cooldown, preserve and return last-known rates on provider failure, and expose correct buy/sell/source/timestamp/stale metadata. (Verified 7/7 rate snapshot tests).
- [x] G3 (done): Add only the backend-backed user settings operations required by the web screen (mapped `/api/v1/currencies` and `/api/v1/auth/preferred-currency` with truthful Google OAuth session/export boundaries).
- [x] G4 (partial): Build the settings screen matching `docs/redesign/settings.png`; existing implementation needs end-to-end preference persistence and truthful unsupported controls.
- [x] G6 (done): Add backend persistence for number grouping (`es-BO`/`en-US`) and maximum displayed decimal places (0–6), include preferences in auth user responses, and expose authenticated atomic update. Forward migration generated but not applied; API test passed 1/1.
- [ ] G7 (in progress): Implement a shared exact-decimal web formatter driven by authenticated user preferences, add number-grouping and decimal-place options, and migrate financial/count presentation callsites without changing calculation/API precision.
- [ ] G8: Enforce Spanish-only UI; wire settings controls only to real behavior, remove/mark unsupported local-only security, notification, session, and backup options, ensure API errors are not reported as success; add focused tests and verify backend/web.

## Acceptance criteria
- A user's settings persist across web refresh and sign-out/sign-in; another user cannot read or mutate them.
- Supported currency metadata is returned from a shared backend catalog seeded in the database; web does not define its own supported currency list.
- A changed base preference affects consolidated/reporting display and new-wallet defaults only; existing wallet currencies and ledger facts remain unchanged.
- Currency-sensitive values remain decimal/exact and no mixed-currency totals are summed without an explicit valid conversion.
- All displayed conversion rates disclose source, last update, and stale/unavailable state; no fixed numeric fallback is presented as live.
- FX uses Binance P2P only. USD valuation via USDT is explicitly a proxy, not an asserted USD cash quote; provider failures do not erase the last known rate.
- Settings controls either perform a real backend operation or clearly communicate that the capability is not available; no local-only toggle falsely claims global persistence.
- Existing unrelated dirty work remains intact and uncommitted; no developer DB changes or running servers.

## Verification strategy
- Apply test-first to deterministic behavior with meaningful RED: settings validation/ownership/default persistence, currency catalog, rate freshness/fallback/side semantics, and client hydration/save behavior.
- Backend: focused module/API tests, `dotnet build backend/`, applicable `dotnet test backend/` excluding only any known OpenAPI test that overwrites unrelated generated output, and `dotnet format backend/ --verify-no-changes` on authorized surfaces.
- Web: focused Vitest, `pnpm --dir web lint`, `pnpm --dir web build`, plus full web tests at closure.
- Mobile is outside the authorized scope; do not modify or build it.
- Final scoped `git diff --check`; inspect only the feature's known paths and preserve unrelated modifications. No RDD or native review lifecycle.

## Progress and evidence
- Exploration handoffs: `gentle-ai-explore` mapped preferences, catalog, accounts, and FX; a second read-only handoff mapped profile/security/notifications/data/integrations; focused G1 maps recommend Fx-owned catalog reference data behind `Fx.Contracts`, with validation in Identity and Ledger application boundaries. `Identity.Application` must add an Fx.Contracts project reference; update the allowed dependency graph. Ledger already references Fx.Contracts. The Fx EF CLI candidate is `dotnet ef migrations add AddCurrencyCatalog --project src/Modules/Fx/Fx.Infrastructure/Fx.Infrastructure.csproj --startup-project src/Api/Api.csproj --context FxDbContext` from `backend/`; worker must verify before running. The existing ApiIntegrationTests and LedgerIntegrationTests include dirty or directly constructed test setup; preserve existing content. See subagent tasks `mvyc3q2m-3-a7i5` and `mvycawsb-4-yh3r` for path:line evidence.
- User decisions recorded in Engram observation 2076; current-tree implementation explicitly selected by user.
- G1 refinement: `User.PreferredCurrency` already represents the glossary's base currency, so reuse it rather than rename or add a duplicate column; only add the update API. Catalog support and live-rate support remain separate. Fx reference rows have no `user_id`; no cross-module foreign keys. Account currency stays explicit and clients default it from the loaded user preference.
- Writer `mvyci975-5-eyc5` completed G1 implementation. Observed RED: API unsupported onboarding returned 200 and preference route returned 404; Ledger accepted unsupported EUR. GREEN: Currency API tests 5/5, Ledger account tests 2/2, Architecture tests 7/7, backend build 0 warnings/errors, scoped `git diff --check` clean. EF generated `backend/src/Modules/Fx/Fx.Infrastructure/Migrations/20261101213848_AddCurrencyCatalog.cs` and designer/snapshot; migration was not applied. Writer reports no unrelated dirty files changed; no commits.
- Parent source spot-check confirmed catalog seeds only BOB/USD/USDT with no user ownership, Identity validates new-user onboarding and persists idempotent authenticated base-currency updates, `/v1/currencies` is anonymous reference data, and Ledger rejects inactive/unknown currencies before parsing while preserving explicit account currency.
- Independent verifier `mvyd0eh4-6-e4w1` confirmed G1: API currency tests 5/5, Ledger account tests 2/2, architecture tests 7/7, backend build 0 warnings/errors, and scoped diff check passed. No environmental failures. G1 is complete. Migration remains generated but unapplied.

## Next step
G6 backend contract is implemented and focused-tested. G7: build the exact-decimal formatter and apply it across web amounts with selectable separators and decimal places. Then complete G8: Spanish only and remove/disable unsupported controls with honest save behavior. Migration remains generated and unapplied; do not touch mobile.
