# INCOMPLETE / NOT ACCEPTED — Personal finance accounting audit

**Boundary:** partial T6 report, covering S1–S9 as diagnosis and proposed policy, not application acceptance or release approval. T4 and T8 have source fixes and observed author/parent checks, but independent verification remains unresolved. T5 verification setup exhausted its correction budget; T7 accounting/schema decisions remain blocked. No further tests, builds, browser/API probes, migrations, or implementation were run for this report.

Evidence authority: `odd/tasks/personal-finance-accounting-audit.md`, including L1–L7; `prompt_maestro_auditoria_finanzas.md`; the unchanged `caso_prueba_contable_enero_2027.json`; `reference-evidence.json`; and current source reads. Paths below are repository-relative; line numbers refer to the current working tree. Design documents describe intended controls, not proof of deployed behavior. No legal or full IFRS compliance is asserted.

## 1. Decision summary and coverage

- **Reproduced and patched, not independently accepted:** browser-local financial disclosure across login (T8); current net-worth chart misclassification of Lent loans (T4).
- **Reference arithmetic PASS only:** opening, all 21 events, closing, and invariants. `reference_only: true`; `application_acceptance: "NOT_RUN"`.
- **Application accounting remains unproven:** no balanced journal-line equivalent established; separate cash, loan, investment, goal, and browser-local models do not demonstrate one replayable book.
- **Preservation:** no financial rows were created during the logged browser audit. Legacy browser bytes remain unread and retained. No verified backup or restore is evidenced; none was taken by this documentation task.
- **Delivery is unresolved:** authored audit/reference/fix/report scope exceeds the initial approximately 400-line forecast. No commit, push, or PR has occurred; do not equate a green suite with delivery authorization.

| Spec | Evidence delivered here | Still unsatisfied / acceptance limit |
|---|---|---|
| S1–S2 | Actual stack and A–K map with inspection boundaries | Not a comprehensive audit of every client/integration |
| S3–S4 | Target accounting contract, classified findings, source locations and flow | Implemented double-entry equivalence, historical reconciliation and drill-down not established |
| S5 | Authoritative fixture, 21-operation target matrix, reference evidence | Isolated 21-step application replay NOT_RUN |
| S6 | Recorded tests and explicit missing edge/security proof | Full unit/integration/API/E2E accounting battery NOT_RUN |
| S7 | Additive proposal, backup gates and scoped rollback plan | No schema change, backup, backfill or deployment authorized/performed |
| S8–S9 | Actual fix inventory, expected totals, limitations and bounded next decision | No final application PASS; accounting choices and independent proof unresolved |

## 2. Actual system map (A–K)

**Stack inspected:** ASP.NET Core / C# API targets .NET 10 (`backend/src/Api/Api.csproj:4`), EF Core with Npgsql/PostgreSQL infrastructure; module-specific DbContexts; Next.js 15 / React 19 / TypeScript with decimal.js, Vitest and shadcn UI (`web/package.json`). KMP/Compose Android/iOS targets exist (`mobile/composeApp/build.gradle.kts`); mobile accounting implementation was not audited. API and Worker hosts exist; Hangfire/S3/backup claims in architecture are design context, not operational verification.

Core persistence anchors: `backend/src/Modules/Ledger/Ledger.Infrastructure/LedgerDbContext.cs:14–17`, `backend/src/Modules/Lending/Lending.Infrastructure/LendingDbContext.cs:11–15`, and `backend/src/Modules/Planning/Planning.Infrastructure/PlanningDbContext.cs:15–21`. Existing EF migration families were located; selected Ledger configurations and `backend/src/Modules/Planning/Planning.Infrastructure/Migrations/20261109041319_AddInvestmentTransactionsAndTicker.cs:21` were inspected. Actual PostgreSQL schema/migration application status is unknown.

| Area | Actual domain / persistence | HTTP surface (representative, not exhaustive) | Web surface and boundary |
|---|---|---|---|
| A Accounts | Ledger `Account`, `AccountType`, `Money`; `accounts`; derived initial balance plus signed transactions | `/v1/accounts` CRUD; `POST /{id}/reconcile`; `/v1/rates/latest`, `/v1/currencies` | `AccountsMainView`, `AccountDetailView`, `FxTransferModal`; cards have no dedicated credit-card account type in inspected enum |
| B Movements | `Transaction`, category allocations; `transactions`, `transaction_category_allocations`; transfer/reversal/adjustment markers | `/v1/transactions`, `/movements`, `/transfers`, `/{id}/reverse`; update/delete routes exist | `MovimientosView`, transaction/transfer/reconcile dialogs; route existence alone does not imply destructive editing |
| C Investments | Planning `Investment`, `InvestmentTransaction`, `InvestmentCashLink`; `investments`, `investment_transactions`, cash links; quantity/current value/history | `/v1/planning/investments`, `/{id}/value`, `/{id}/operations`, `/{id}/transactions`, `/{id}/cash/{kind}`, `/investment-cash/{id}/reverse` | `InvestmentsView`, `InvestmentDetailView`, register-operation/cash/update-price dialogs; complete cost/realized-return book not established |
| D Patrimony | Browser `PatrimonialAsset` / `PatrimonialLiability`; identity-scoped localStorage; client `calculatePatrimonioOverview` combines accounts, investments, loans | No manual-patrimony server endpoint established in inspected map | `PatrimonioView`, `DashboardHomeView`; current overview includes active receivables; history remains approximate |
| E Own debts | Lending `Loan` Borrowed, installments, payments, allocations, counterparties; Lending DbContext | `/v1/loans`, `/simulate`, `/{id}`, `/{id}/quote`, `/{id}/payments`, `/{id}/cancel` | `DeudasView`, debt/payment/detail dialogs; separate card purchase/statement lifecycle not established |
| F Money lent | Same Lending entities, Lent direction; remaining principal, cash disbursement/payment links | Same loan routes, type-specific requests | `DineroPrestadoView`, lent-loan dialog; impairment/forgiveness acceptance not inspected |
| G Budgets | Planning `Budget`; `budgets`; category/currency spending from Ledger contracts | `/v1/planning/budgets` CRUD; distribution-plan and income-distribution routes | `MonthlyBudgetView`, `BudgetsTabView`, distribution views; service reads current UTC month |
| H Goals | Planning `Goal`; `goals`; optional account link and whole-account balance progress | `/v1/planning/goals` CRUD | `FinancialGoalsView`, goal dialogs; explicit fixture-style earmark reservation not established |
| I Recurring | Planning `RecurringPayment`; `recurring_payments`; due date/status/completed count; confirmation calls Ledger then advances schedule | `/v1/planning/recurring`, `/summary`, `/calendar`, `/{id}/confirm`, `/reschedule`, `/pause`, `/resume` | `RecurringPaymentsView`, calendar and confirmation dialogs; durable unique occurrence ledger not established |
| J Dashboards/reports | Web aggregation over DTOs; Analytics contract exists, not a demonstrated journal report service | Inspected personal reports use supplied client data, not an established trial-balance API | `DashboardHomeView`, `ReportsView`; reports helper accepts accounts/loans/transactions/budgets, not full manual assets/investments |
| K Security/export/reconciliation | Identity `User` / `RefreshToken`; fail-closed Ledger/Planning query filters; export/reset contracts; reconciliation adjustment marker | `/v1/auth/{register,login,google,refresh,logout,me,export}`; account/financial-data deletion routes exist | Auth context/settings, reconciliation dialog, CSV/JSON/print report exporter; cross-user export, restore, deployed auth/logging controls NOT_RUN |

Endpoint declarations: `backend/src/Api/Endpoints/{Account,Transaction,Loan,Planning,Auth,Ingestion,Draft}Endpoints.cs`. UI entries above were located; only the scoped financial helpers/hooks and logged browser behavior were substantively audited, not every dialog. Export source escapes CSV formula labels and printable HTML (`web/src/modules/reports/application/report-export.service.ts`); this is not end-to-end security proof.

Adjacent modules exist: Ingestion raw events/drafts/imports/Binance, Fx rates/catalog, Identity, Messaging, Notifications, Workspaces, and Worker. Automation endpoints include `/v1/ingestion/events`, statement import, and `/v1/drafts/{id}/confirm`. Their complete deduplication, consent, notifications, workspace-personal interactions, background jobs, logging and authorization remain **unknown/uninspected** here. Architecture/security/testing documents are targets, not substitutes for those checks.

### Observed data-flow diagram

```text
User movement/transfer/reversal -> API Transaction service -> Ledger UoW/DB
  -> immutable signed account transactions (not demonstrated balanced journal lines)
  -> derived account balances + category aggregates -> dashboard/budgets/reports
User loan/disbursement/payment -> Lending service + Ledger contract
  -> relational shared transaction helper -> loan/installments/payments + cash row
  -> no unified journal proven -> loan DTO + cash DTO -> patrimony/report projections
User investment operation -> Planning InvestmentService -> Planning SaveChanges
  -> operation row + mutable quantity/value/history; cash link is a separate API flow
  -> no unified journal proven -> investment DTO -> investment/patrimony UI
User recurring confirmation -> Ledger registration/save -> Planning advance/save
  -> no shared atomic occurrence journal established -> schedule + cash projections
User manual asset/liability -> usePatrimonio -> identity-scoped browser storage (no DB)
  -> no journal -> client net-worth aggregation -> dashboard/patrimony chart
TARGET ONLY: authenticated action -> validated accounting event -> one DB transaction
  -> balanced immutable journal -> versioned projections -> reconcilable drill-down reports
```

The existing loan and investment-cash helpers do provide shared relational transactions; do not describe all cross-module writes as non-atomic. See `backend/src/Api/Infrastructure/Transactions/RelationalLoanTransaction.cs:61` and `backend/src/Api/Infrastructure/Transactions/InvestmentCashTransaction.cs:98`. Loan PostgreSQL row locking exists in `backend/src/Modules/Lending/Lending.Infrastructure/Repositories/LoanRepository.cs:20`; SQLite tests do not validate that lock.

## 3. Prioritized findings: evidence classes must not be merged

### A. Reproduced bugs; fixes implemented, independent acceptance pending

| Priority / issue | Evidence and reproduction; expected vs actual BEFORE fix | Root cause, implemented correction and remaining limit |
|---|---|---|
| P0 / T8 browser cross-login disclosure | L4: authenticate an authorized fresh audit account in the same browser after another session; backend-backed accounts/investments empty. Expected no other user's manual finances; actual one vehicle and **Bs178500** net worth remained. Current code: `web/src/modules/patrimonio/application/usePatrimonio.ts:18–20,33–75,115–124` | Unsuffixed global browser keys and ownerless lifecycle. Fix uses stable authenticated identity namespaces, render-time owner tokens, hydration/write guards and stale-callback rejection. L5 reload: **0 vehicles, no foreign amount**. This proves a browser-local disclosure, not server API leakage. Legacy keys are retained unread, not copied, deleted, assigned or auto-migrated. Independent React/identity proof missing. |
| P1 / T4 current chart classifies Lent principal as debt | L6 public `calculatePatrimonioOverview` RED: Lent-only cash 2000 + receivable 3000 expected **5000**, chart actual **-1000**; January closing expected **16400**, chart actual **15400**. Current code: `web/src/modules/patrimonio/domain/net-worth-analytics.ts:204–205,244–245,538–566`; tests `web/src/modules/patrimonio/domain/net-worth-analytics.test.ts:353` | Historical helper independently subtracted loans irrespective of direction. Fix passes overview totals to the **current chart endpoint** and retains whole-unit rounding. Author checks now reconcile it with assets minus liabilities, including Borrowed regressions. Earlier points are still approximate; this is not a history-engine correction or a server HTTP endpoint change. |

T8 changed `usePatrimonio.ts`, added `usePatrimonio.test.tsx`, and adjusted consumer mocks in `web/src/modules/dashboard/presentation/DashboardHomeView.test.tsx` and `web/src/modules/patrimonio/presentation/PatrimonioView.test.tsx`. T4 changed `net-worth-analytics.ts` and its test. These are existing task changes, not new implementation by this report. T8 tests model hooks with mocked React (`web/src/modules/patrimonio/application/usePatrimonio.test.tsx:10`), so browser reload evidence and independent real-React checks have distinct value.

### B. Source-supported gaps; scenarios below were NOT newly executed

| Priority / gap | Exact source evidence; target vs source behavior | Cause / minimal proposal |
|---|---|---|
| P1 / balanced book and opening equity not demonstrated | `backend/src/Modules/Ledger/Ledger.Domain/Transactions/Transaction.cs:6–23`; `backend/src/Modules/Ledger/Ledger.Infrastructure/LedgerDbContext.cs:14–17,71`: single-account amount/direction and derived opening balance, not balanced debit/credit journal. Target every posted event balances, opening credits equity 12900. | Cash ledger is not yet proven equivalent to full accounting; add an accounting-event/journal layer without replacing valid immutable cash facts. |
| P1 / principal contaminates operating classification | `backend/src/Modules/Ledger/Ledger.Application/Services/LedgerModule.cs:114–142` posts the whole loan payment without a principal/interest accounting split; `backend/src/Modules/Ledger/Ledger.Infrastructure/Repositories/TransactionRepository.cs:10–24` excludes investment/settlement/adjustment markers, not loan cash. Target step 15 expense 30, not 530. | Lending allocations exist separately (`backend/src/Modules/Lending/Lending.Domain/Entities/LoanPayment.cs:68`). Link one event's principal/interest/charges to operating and financing projections; reproduce through public APIs before declaring a quantified runtime defect. |
| P1 / investment operation and cash are separate | `backend/src/Modules/Planning/Planning.Application/Services/InvestmentService.cs:116–192` updates position/operation, supplies null ledger link, and does nothing to cash for Dividend/Fee. Target step 13 exchanges assets; step 20 adds cash and dividend income once. | Separate operations/cash pathways do not establish atomic accounting or cost basis. Add one orchestrated event using existing transaction boundaries; retain operation/cash IDs. |
| P1 / full sale and cost accounting gap | `backend/src/Modules/Planning/Planning.Application/Services/InvestmentService.cs:154–163`: clamps quantity/value to zero but calls `UpdateValue` only if value remains positive. Target a full sale leaves zero units/value and records cost disposal and realized result; source branch can retain old position while adding a Sell row. Runtime reproduction NOT_RUN. | Conditional mutation plus valuation-based subtraction, no selected cost method. Pin full/partial/oversale behavior before implementing disposal with explicit cost and valuation reversal. |
| P1 / goal progress is not a reservation | `backend/src/Modules/Planning/Planning.Application/Services/GoalService.cs:94–120`; `backend/src/Modules/Planning/Planning.Domain/Goals/Goal.cs:82–89`: uses entire backing account balance. Target step 12 reserves 700/2000 = 35%; linked savings 4700 is not the reserved amount. | Account-tracking goal semantics differ from earmarking; add explicit reservation records and aggregate eligibility checks, not another asset balance. |
| P1 / historical book not reproducible from inspected projections | `web/src/modules/patrimonio/domain/net-worth-analytics.ts:538–616` uses current balances/principal, present conversion rate, midmonth samples and rounded outputs. `backend/src/Modules/Planning/Planning.Domain/Investments/Investment.cs:10,93–95` retains only 100 value points. Target as-of event replay with immutable cost/rate history. | Snapshots/estimates are not historical journal balances. Label estimates now; propose event replay and dated valuations. T4 fixes only today's endpoint. |
| P2 / monetary/FX projection policy gap | `web/src/modules/patrimonio/domain/net-worth-analytics.ts:104–122,166–168,541` uses JS number, fallback 9.85, generic unsupported-currency conversion, positive-only account inclusion and whole-unit chart rounding. Target exact money, sourced dated rates and explicit overdrafts. | Client projection bypasses stronger money/report helpers. Reuse decimal conventions and explicit unsupported/stale-rate states; add public precision/overdraft/FX cases before changing shared projections. No new loss-of-cent test was run. |
| P2 / period budget semantics | `backend/src/Modules/Planning/Planning.Application/Services/BudgetService.cs:67–96` always requests current UTC month, while returning stored `Period`. Target explicit selected-period accrued category consumption, including credit purchases. | Period metadata is not a demonstrated period query; specify period boundaries and card event mapping, then test selected months/refunds. |

Known strengths to preserve: `backend/src/Modules/Ledger/Ledger.Infrastructure/LedgerDbContext.cs:30–63` applies fail-closed ownership filters and rejects tracked transaction/allocation mutation; `backend/src/Modules/Ledger/Ledger.Infrastructure/Configurations/TransactionConfiguration.cs:62–64` enforces unique reversal linkage. Money/rate columns use precision (20,6); investment quantity uses (28,10). These controls do not alone prove every S3 invariant or database-side immutability.

### C. Hypothetical / unconfirmed risks, not reproduced defects

- **P1 recurring retry/partial-write risk:** `backend/src/Modules/Planning/Planning.Application/Services/RecurringPaymentService.cs:399–419` registers cash then advances/saves schedule; `backend/src/Modules/Ledger/Ledger.Application/Services/LedgerModule.cs:146–197` saves Ledger separately. A retry or failure between saves may duplicate cash or leave schedule inconsistent; no unique occurrence key/shared transaction established in this path. Proposal: durable occurrence identity plus idempotent atomic confirmation. Concurrency/failure injection NOT_RUN; the passing lifecycle test does not settle it.
- **P2 T4 excluded-only-history concern — UNCONFIRMED:** `web/src/modules/patrimonio/domain/net-worth-analytics.ts:543–555` now returns an all-zero series when current accepted totals are zero. Historical behavior differences for excluded-only inputs were noted by the verifier but not reproduced or baseline-compared. Do not present them as confirmed regression or silently broaden T4.
- **Security/operations unknown:** ownership of all resources/exports, live auth configuration, logs, backups, import races and PostgreSQL lock behavior need independent checks. Source filters are not evidence of universal isolation. No server cross-user leak is proven.

The current overview already includes active Lent receivables; an earlier omission claim is stale and is **not a finding**. The earlier alleged fixture contradiction was withdrawn; no fixture inconsistency is reported.

## 4. Requested accounting policy target — NOT the implemented book

All amounts are exact BOB. Simplified accrual P&L and separate cash classification follow the fixture: no extra accrued interest, fees, taxes, FX or laptop depreciation this month. Market valuation goes to a separate unrealized-result account. Dr = debit; Cr = credit. Cash columns show total-liquidity change, with O = operating, I = investing (including lending), F = financing. P&L and equity columns are changes; budget is positive consumption. A dash means **zero change**, including goal reservations unless explicitly shown.

**Opening journal:** Dr bank 6000, cash 300, wallet 700, savings 4000, investment 2000, laptop 3500; Cr bank loan 3000, card debt 600, opening equity 12900. Assets **16500**, liabilities **3600**, equity **12900**, liquidity **11000**; no monthly income. Investment opens at 20 units × 100. Budget plan 3100 and goal target 2000/reservation 0 produce no journal, cash, P&L or equity change. Creating a recurring template likewise posts nothing.

| # / operation | Debit | Credit | Δ liquidity / flow | Δ P&L | Budget | Goal | Liability / receivable / investment effect | Δ equity |
|---|---|---|---|---|---|---|---|---|
| 1 Salary | Bank 5000 | Salary income 5000 | +5000 O | +5000 | — | — | — | +5000 |
| 2 Extra work | Bank 1200 | Freelance income 1200 | +1200 O | +1200 | — | — | — | +1200 |
| 3 Bank → wallet | Wallet 250 | Bank 250 | 0 internal | — | — | — | — | — |
| 4 Cash withdrawal | Cash 200 | Bank 200 | 0 internal | — | — | — | — | — |
| 5 Rent occurrence | Housing expense 1400 | Bank 1400 | -1400 O | -1400 | Housing +1400 | — | — | -1400 |
| 6 Food, bank | Food expense 550 | Bank 550 | -550 O | -550 | Food +550 | — | — | -550 |
| 7 Food, card | Food expense 350 | Card liability 350 | 0 noncash | -350 | Food +350 | — | Card +350 → 950 | -350 |
| 8 Transport | Transport expense 150 | Wallet 150 | -150 O | -150 | Transport +150 | — | — | -150 |
| 9 Electricity | Utilities expense 220 | Bank 220 | -220 O | -220 | Utilities +220 | — | — | -220 |
| 10 Subscription occurrence | Subscription expense 80 | Bank 80 | -80 O | -80 | Subscriptions +80 | — | — | -80 |
| 11 Health | Health expense 130 | Cash 130 | -130 O | -130 | Health +130 | — | — | -130 |
| 12 Savings + earmark | Savings 700 | Bank 700 | 0 internal | — | — | Reserve +700 | Savings 4700; reservation is not another asset | — |
| 13 Buy 5 shares × 120 | Investment cost 600 | Bank 600 | -600 I | — | — | — | Units 25; cost 2600 | — |
| 14 Card principal payment | Card liability 700 | Bank 700 | -700 F | — | — | — | Card -700 → 250 | — |
| 15 Bank-loan installment | Bank-loan liability 500; interest expense 30 | Bank 530 | -530: O -30, F -500 | -30 | Debt interest +30 | — | Bank loan -500 → 2500 | -30 |
| 16 Loan granted | Loan receivable 800 | Bank 800 | -800 I | — | — | — | Receivable +800 | — |
| 17 Principal + interest collected | Bank 320 | Receivable 300; interest income 20 | +320: I +300, O +20 | +20 | — | — | Receivable -300 → 500 | +20 |
| 18 Family loan received | Bank 900 | Family-loan liability 900 | +900 F | — | — | — | Family liability +900 | — |
| 19 Family principal repaid | Family-loan liability 100 | Bank 100 | -100 F | — | — | — | Family liability -100 → 800 | — |
| 20 Dividend received | Bank 40 | Dividend income 40 | +40 O | +40 | — | — | No unit/cost change | +40 |
| 21 Mark 25 shares to 110 | Investment valuation adjustment 150 | Unrealized valuation income 150 | 0 noncash | +150 separate | — | — | Carrying value 2750; cost stays 2600 | +150 |

### Closing reference, not observed application balances

| Reconciliation | Exact target |
|---|---|
| Liquid accounts | Bank 7330 + cash 370 + wallet 800 + savings 4700 = **13200** |
| Assets | Liquidity 13200 + investment 2750 + laptop 3500 + receivable 500 = **19950** |
| Liabilities / equity | Bank loan 2500 + card 250 + family 800 = **3550**; 19950 − 3550 = **16400** |
| Result / equity bridge | Income excluding valuation 6260 − expenses 2910 = **3350**; + unrealized 150 = **3500**; 12900 + 3500 = 16400 |
| Budget | Housing 1400/1400; food 900/950; transport 150/200; utilities 220/250; subscriptions 80/100; health 130/150; interest 30/50. Total 2910/3100, available **190**, usage 93.8709677% |
| Goal | Reserved **700/2000 = 35%**, backed by savings, never added to assets again |
| Cash bridge | O **+3700**, I **-1100**, F **-400**; net **+2200**; 11000 + 2200 = 13200 |

Reference checks enforce debit=credit, assets−liabilities=equity, per-step expected bank/card/net-worth/liquidity, nonnegative balances, cost/units, backed reservation and cash bridge. See `reference-evidence.json` for opening + 21 steps + closing (23 stages). **The January CURRENT-PROJECTION web unit test supplies closing DTOs; it does not post or replay the 21 application events.**

## 5. Verification ledger — previously observed, not rerun here

| Recorded runner/command or check | Observed result | What it does NOT establish |
|---|---|---|
| Python reference unittest, worker T2 and parent spot-check (L3/L6) | **4/4 PASS** in each run; worker mutation-checks all 161 expected numeric leaves | Does not call Billefy or persist application events |
| T8 author isolation RED → GREEN (L5) | **8 failures** before fix; subsequent web run **870 PASS**, 119 files; intended filters unexpectedly ran full suite | Mock-hook tests do not prove full React lifecycle or independent isolation |
| T4 public projection RED → GREEN (L6) | **10 failed / 8 passed** before; focused **18/18 PASS** after | Does not prove earlier historical points or event accounting |
| Full web suite, web `test` script = `vitest run` (L6) | **880/880 PASS**, **119 files**, **exit 0** | Not lint/build/compiler/security/mobile acceptance |
| Selected SQLite API: `dotnet test Api.Tests --filter LoanTransactionTests\|RecurringPaymentIntegrationTests` (L7 shorthand; filter alternatives) | **10 passed, 0 failed/skipped, exit 0**; parent log job-1 | No real PostgreSQL/concurrency or full API security battery |
| `tsc --noEmit --incremental false` (parent L5) | **exit 2, 35 diagnostics** across test fixtures; no implementation-source diagnostic observed in that run | **Baseline NOT established**. Do not call these diagnostics preexisting or prove the fixes type-clean |
| Independent verifier oracle unittest (L7) | **4/4 PASS** | Only independent arithmetic evidence |
| Independent React/identity probes and compiler probes (L7) | **exit 1 before tests/compiler execution**: pnpm attempted install/module replacement in non-TTY scratch | No independent React GREEN, compiler result or baseline comparison |
| Baseline helper setup (L7) | Initial and corrected setups failed; **two setup failures, zero baseline probes** | Correction budget exhausted; not permission to change executor and retry |
| Parent browser reload (L5) | Empty audit account: no vehicle or foreign amount; legacy records not deleted | Not a 21-step replay or server/export isolation battery |

L3–L7 preserve results and runner summaries, not every complete shell wrapper/cwd/quoted filter; the table does not invent missing invocation details. The API row is the recorded shorthand, not an executable shell instruction (the filter must be one quoted argument). Factory source confirms SQLite `:memory:` (`backend/tests/Api.Tests/LoanTransactionTestFactory.cs:13`, `backend/tests/Api.Tests/ApiIntegrationTests.cs:47–102`).

Exact reference CLI for reproduction from repository root, **documented only, not executed for this report**:

```bash
python3 -B tools/financial_audit/reference_check.py --fixture docs/financial-audit/caso_prueba_contable_enero_2027.json --output docs/financial-audit/reference-evidence.json
```

It reads the authoritative fixture and writes reference-only evidence; valid output is `{"status": "PASS", "reference_only": true, "application_acceptance": "NOT_RUN"}`. Its CLI is covered by the four-test reference module, including exact exit/stdout/stderr and unchanged input on rejection. Future reference test invocation: `python3 -B -m unittest discover -s tools/financial_audit -p 'test_*.py'` (not a claim of a recovered historical shell line).

**NOT_RUN:** full mobile checks, lint, production builds, full backend/API/security suite, real PostgreSQL integration, concurrency/retry/failure-injection battery, backup restore, cross-user export isolation, and 21-step application replay. S6 reversals/closed periods/history, card statements/refunds, debt delinquency/early payment, write-offs, investment fees/sales/dividends, FX/rounding, date boundaries, imports and recurrence edge acceptance remain incomplete. No new execution verification was permitted; this report was self-reviewed against source and L1–L7 only.

## 6. Minimal additive remediation design — PROPOSAL ONLY

Keep existing module contracts and valid immutable facts; do not redesign the product or hand-write migrations. No schema edits, backfills, stored-data repairs or deployment are part of this report.

| Layer | Proposed smallest coherent extension | Required safeguards / proof before adoption |
|---|---|---|
| DB | Ledger-owned accounting events, journal headers/lines, opening-equity entries and source links; separate dated valuation/cost records, goal reservations and recurring occurrence identities | Stable tenant/event IDs; unique user+idempotency key and occurrence key; owner-consistent references; decimal scales; balanced posting enforced at transactional boundary; immutable posted facts and explicit reversals |
| API | Add compatible post/reverse/as-of/drill-down contracts; explicit card purchase/payment and principal/interest splits; opening vs earned-income intent | Validate owner, currency, effective/recorded dates, period state and idempotent request body; conflict without partial changes; disclose breaking changes before approval |
| Service | One orchestrator per event updates journal and source links in one relational transaction; projections derive from events rather than independent sums | Reuse existing Ledger factories/contracts/UoW and relational loan/investment-cash helpers, preserving their validation/rollback/locking invariants; do not clone posting logic inline |
| UI | Simple actions with explicit funding account and principal/interest/fee fields; reservation versus account balance; estimated versus book value/history; drill-down | Reuse existing shadcn/domain dialogs, not custom controls; no double cash entry for an investment/loan action; clear stale/missing FX and pending-posting states |
| Reporting | Separate accrual P&L, O/I/F cash flows, balance sheet and budget consumption; all reconcile to the same event IDs | Compare every fixture step and as-of snapshot, not just final totals; invalidate/rebuild versioned projections without rewriting history |

Accounting choices requiring explicit approval before T7 implementation:

- **Investment cost:** propose weighted-average cost for simplicity; FIFO remains an alternative. Keep immutable purchases, units and historical cost independent of market prices. Specify disposal of prior unrealized adjustments so sales never count the same gain twice.
- **Fees/dividends:** decide capitalized purchase fees versus expense, sale fees versus net proceeds, and dividend recognition/cash dates; fixture has no fees and a cash dividend of 40. Do not infer a policy from current field names.
- **FX/history:** define reporting currency, historical rate source/side/date, realized/unrealized FX accounts, precision and rounding boundaries, effective versus recorded time, timezone, closed periods and correction-by-reversal. Current quote must not rewrite historical cost.
- **Goals/cards/debt:** approve earmark eligibility/over-reservation behavior, accrual at card purchase versus principal settlement, pending transaction impact, late fees/impairment and allocation policy. Budget tracks recognized expenses, not principal or asset exchanges.
- **Legacy ownership:** propose retaining ambiguous bytes inaccessible until explicit owner-proven, opt-in recovery is approved; alternative is continued quarantine. Never guess the last login owns them, silently migrate, or delete them. Manual asset valuation also needs method/date and depreciation policy.

### Safe sequencing and rollback boundaries

1. Resolve independent verification first; keep T4/T8 pending until evidence is accepted. Parent confirms no children remain active. No verification process is running as part of this report.
2. Approve accounting/legacy policy and task-owned delivery boundaries. Separate reference/report, identity isolation, and chart correction into reviewable units **only after** resolving the >400-line delivery forecast and untracked fixture dependency. Commit selection remains parent-owned; no commit/push/PR is authorized here.
3. Before **any stored-data change**, obtain an access-controlled verified backup, inventory scope, and demonstrate restoration in isolation; record reconciliation and rollback checkpoints without credentials/PII. A design-document backup schedule is not evidence a backup was taken.
4. Only after separate authorization, generate **new forward EF Core migrations** through official tooling. Never edit historical migrations, run ad-hoc schema SQL, reset/truncate, or backfill now. Future backfills require attributable source IDs, dry-run reconciliation, checkpoints and owner-approved recovery; do not manufacture historical income.
5. Validate opening and all 21 events through public interfaces in isolated fixtures; real/local production DBs must receive **no synthetic insertions or seeders**. If a real authorized audit account is used later, enter only authentic client interactions; preserve all other users and data.
6. Switch reads/writes only after reconciled parallel evidence and compatibility review. Source rollback is limited to **task-owned hunks** in the six T4/T8 source/test files listed above, plus separately identified task artifacts if authorized; preserve unrelated dirty files and all legacy data. No blanket reset/checkout commands. Stored-data rollback requires its own restore/forward-correction plan, never source rollback alone.

## 7. Authorized verification recovery — historical scope

The user authorized **one new independent verification attempt for T4/T8**, using existing installed tool executables directly in isolated system scratch (no pnpm install/module replacement), with **at most one setup correction**. Scope: current/baseline TypeScript diagnostics, real-React identity/legacy-byte/stale-callback probes, public net-worth Lent/Borrowed/status/January-current-projection probes and excluded-only-history comparison, then the **880-test web suite**. Capture exact commands, stdout/stderr, exit codes and baseline differences; stop and return evidence if setup fails again. No migration, backfill, deployment, dependency mutation or real-DB insertion. The attempt's actual result is recorded below; authorization was not a verification PASS.

## 8. Authorized recovery result — prerequisite blocked, zero probes

The new T5/S10 attempt (`mwi4d43n-a-31ue`, continued as `mwi4gz4s-b-uhl6` within the same attempt) stopped at dependency prerequisite validation. **One preparation correction used; budget exhausted.** No helper invocation or guard denial occurred, no scratch was created, and zero independent projection, mounted-React, compiler or suite probes ran. Do not describe this as an application test failure or a successful review.

The required `prepare-verifier.mjs` accepts repository-relative regular inputs, rejects symlinked inputs/ancestors, caps its payload at **256 MiB**, and exposes no declared dependency-reuse option. The installed `web/node_modules` tree is **618 MB**, with pnpm links for TypeScript, Vitest, React, React DOM and esbuild. Direct executable entrypoints exist, but a complete helper-accepted dependency payload or permitted reuse mechanism was not established. This does **not** establish that every possible complete closure exceeds the cap. No install, dependency mutation, alternate-root evasion or guard modification was attempted.

Previous observed results (880 web tests, 4 reference tests and 10 selected SQLite API tests) remain historical evidence. The 35 compiler diagnostics still have no established baseline comparison. T4/T8 remain implemented but independently **UNVERIFIED**; the historical concern remains unconfirmed. No parent seam/build run or further source correction followed the terminal prerequisite result.

**Required prerequisite before continuation:** an already available complete regular-file dependency payload accepted by the verifier, or an officially supported dependency-reuse mechanism. Another identical retry authorization alone cannot supply that prerequisite. Do not switch reviewers/executors or bypass the guard. Resolving the verifier environment is separate from accounting-policy, legacy-ownership and delivery decisions. No migrations, real-data changes, commits, push or PR occurred. Overall audit status remains **INCOMPLETE / NOT ACCEPTED**.

## 9. Offline runtime repair measurement — performance fixed, provisioning still blocked

The user subsequently authorized an offline-runtime repair and a bounded performance correction plus one real inventory. The preparator's literal-reference scan had quadratic regex retries on long nonmatching path-like tokens. A token-start guard reproduced RED (13 passing / 1 failing) then GREEN (14/14); the parent spot-check also passed14/14. These are synthetic preparator tests, NOT accounting application tests.

The one authorized inventory finished in **14.075 seconds**, within its120-second deadline, with **exit1: payload budget rejection** (not timeout). It measured **34848 files /352179418 bytes**, against unchanged limits of **20000 files /268435456 bytes**. Selected installed input preservation completed successfully. Hypothetically omitting4840 candidate debug maps would yield30008files/261127417bytes: it still exceeds the file-count limit. No omission was enabled, no runtime generated, no helper preparation or independent app tests executed. Candidate accounting is not proof against dynamic resource usage.

Exact recorded evidence: `docs/financial-audit/verifier-runtime-inventory.json`; repair continuity: `odd/tasks/verifier-environment-repair.md`, L7. The timing defect is corrected, but R2 provisioning remains partial. Do not report the 14 utility tests as application verification or silently repeat the inventory. The next prerequisite is a supported provisioning design inside both caps; neither a larger timeout nor another identical retry resolves this measured blocker. No installed dependency, global helper/guard, real financial data, migration, commit, push or PR was changed.

## 10. Split test/type preparation — real environment still unavailable

The user accepted splitting the payload by purpose while retaining all web tests and unchanged TypeScript checks. The preparator gained19passing synthetic tests (14existing+5profiles); these are NOT accounting/app acceptance. The worker also reported a prior30-second unit-test timeout before its correction/re-execution; that failure remains part of the history.

The parent attempted each distinct profile once, with a120-second deadline. Tests profile exited1 after9.429s because the preparator could not establish omission safety for dynamic resources in `@base-ui/react/csp-provider/CSPProvider.js`. Types profile exited1 after12.613s because it could not establish omission safety for encoded/template references in `next/dist/compiled/busboy/index.js`. These are conservative preparator blockers, NOT demonstrated defects in either library or Billefy.

Neither profile created a runtime, reached the unchanged helper, or ran app tests/compiler/identity probes. No checks, caps or global guards were weakened, and neither failed preparation was retried. Exact output: `docs/financial-audit/verifier-profile-preparation.json`. The accepted bounded profile strategy stopped without a compatible environment; R2 is partial and R3/R4 remain unmet. The original app fixes remain independentlyUNVERIFIED; no final audit PASS or fresh application-test count is claimed.

## 11. Actual Chrome UI acceptance — January replay blocked at step 3

**Status: INCOMPLETE / NOT ACCEPTED.** This is actual client/API evidence, not a synthetic oracle run. The existing developer-run local app was used with the separately authorized, initially empty audit account. This is user-scoped test data in the existing local database, not a cloned database. No server, installation, raw database mutation, schema change or source-code fix was performed in this browser continuation. No other user's records were touched. Credentials, account identifiers and auth headers are excluded from persisted evidence.

### Observed results

| Checkpoint | Expected | Observed | Verdict |
|---|---|---|---|
| Cash opening | Bank6000; cash300; wallet700; savings4000; no monthly income/expense | Same; four UI-created accounts, POST201 | PASS numerical |
| Complete opening amounts | Assets16500; liabilities3600; net12900; liquidity11000 | Same, including20shares/cost2000, laptop3500, manualbank/cardliabilities3000+600 | PASS numerical; opening-journal/date equivalence NOT proved |
| Income events1–2, cumulative | Bank12200; Januaryincome6200; assets22700; liabilities3600; net19100; liquidity17200 | Same after correction and reload | PASS cumulative monetary/month totals; see calibration caveat |
| Reversal of a misdated test entry | Preserve original5000 and link an opposite5000 correction; no duplicate netincome | UI confirms no deletion; reverseHTTP200; freshpublicGET746 exposes original and linked reversal | PASS observed audit trail/amount preservation |
| Seven January budgets | Limits1400/950/200/250/100/150/50 =3100; no money movement | Seven created; consumption0; accounts/net worth unchanged after reload | PASS creation/nonmonetary effect; final2910consumption NOT_RUN |
| Emergency goal before step12 allocation | Assigned0/2000, backed by savings; no creation of money | Linked goal immediately reports4000/2000, Completed, summary200%, cardclamped100%; money unchanged | FAIL fixture earmarking requirement; not a newly introduced arithmetic defect |

Opening bank/card debts were entered through the exposed **manual patrimonial liability** UI only. They reconcile opening totals but are NOT operational loan/card records and cannot establish the later loan/card acceptance steps. Investment opening uses an explicitly synthetic test instrument,20shares inBOB, not a live market purchase; no ticker is prescribed by the fixture.

### Confirmed exposed-workflow gaps

1. **UI1 — January own-account transfer (step3; also4/12):** the actual transfer dialog offers source/destination/amount and FX snapshot, but no effective-date input. Advanced movement options expose no alternative dated transfer. Cancelled without submission. A November transfer is not substituted for January. Full ordered replay stops here.
2. **UI2 — Existing bank/card debt (opening; steps7/14/15):** operational debt creation requires an associated account, promises a new disbursement, and keeps current balance readonly. Selecting Tarjeta exposes the same structure. The manual patrimonial opening balances do not create an operational card ledger. This is an exposed-workflow gap, not a claim no backend capability can exist.
3. **UI3 — Earmarked goals (step12):** the form explicitly discloses full-account tracking and no money reservation. Linking the savings4000 to target2000 completes the goal before allocating any fixture funds. Current disclosed product behavior differs from the requested reserved700/2000 =35% model. No allocation or step12 transfer was fabricated.
4. **UI4 — Atomic share purchase (step13):** Aporte/retiro explicitly states it affects cash but NOT investment value or quantity; its form has amount/date/account but no bought-units/unit-price controls. Row menu offers detail, updateprice, contribution/withdrawal and archive, not a purchase. A mere600contribution is not substituted for5shares@120. No purchase submitted; no assertion of its unexecuted numerical effect.

### Exact scope and calibration caveat

The first salary attempt used a January date visible in the MCP-filled field, but the actualPOST600 sentNovember15. This is retained as an automation/input calibration warning, NOT attributed to an app accounting defect. Native ArrowUp/ArrowDown/Tab followed by an account-selection change committed a date that API608/625 confirmed inJanuary. The original misdated5000 was reversed through the app (617), not edited/deleted, then re-entered onJanuary1 (625). Freelance1200 isJanuary2 (608). The fixture supplies no individual dates: ordinal January dates are test sequencing choices. Step1's initial immediate numeric checkpoint was observed before step2; after the date correction, January totals were confirmed cumulatively afterstep2, not by pretending to have rerun an untouched sequential case.

Fresh publicGET746 after all planning changes/reload shows four technical rows: two intendedJanuaryincomes plus the originalNovemberincome and linkedNovemberreversal. Final observed snapshot: bank12200/cash300/wallet700/savings4000; assets22700; liabilities3600; net19100; Januaryincome6200/expense0. These are **after-event2 targets**, not the fixture closing values. Steps3–21 have NOT been posted; step3 is UI-blocked, later steps remain NOT_RUN with that prerequisite unmet. Finalassets19950/liabilities3550/net16400 remain UNPROVEN.

Exact structured results and tool warnings: `docs/financial-audit/browser-acceptance.json`. The goal/budget and exposed-form probes do not convert later events into PASS/FAIL execution results. Original T4/T8 independent code proof, full21-event acceptance, concurrency/security/atomic-failure checks and compiler baseline remain pending. No new web/.NET suite or build was run for this documentation/browser-only continuation. The next decision is the scope of product corrections, starting with dated transfers rather than more verifier-runtime tooling.
