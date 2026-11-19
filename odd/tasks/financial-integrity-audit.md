# Financial integrity audit (Ledger + Investments + Lending)

Read-only audit for missing validations and data-consistency gaps across the core
money-moving backend modules, following the same pattern that found and fixed the
account-type overdraft gap. Read-only phase first; fixes only after user review of
findings (no blind fix-everything).

## Specs

- S1: Scope is backend business rules for Ledger (accounts/transactions/transfers/
  reconciliations/reversals), Planning.Investments (purchases/valuations/dividends/
  cash operations), and Lending (loans, card purchases/payments, debts/receivables).
  Explicitly excludes: UI/UX/shadcn/performance work (that is the separate, paused
  module-by-module sweep), Workspaces/shared-budget module, Notifications/Ingestion.
- S2: User decision (ask_user_question): priority is (a) missing validations — actions
  that should be blocked/warned and are not (the same class of bug as the account-type
  overdraft gap just fixed), and (b) data consistency — calculations that can drift
  or desync between modules (the same class of bug as Patrimonio's fabricated flat
  historical chart found and fixed in the UI sweep).
- S3: This is read-only investigation first. Do NOT fix anything found without
  explicit user review and prioritization — this audit can surface many findings of
  varying real-world severity; silently "fixing everything" risks introducing new
  unreviewed business-rule changes the user never asked for.
- S4: Precedent bugs already found+fixed this session, used as the audit's own
  checklist of "bug classes to specifically look for elsewhere":
  - Missing account-type-aware balance validation (fixed: Ledger expense guard).
  - Fabricated/flat historical data instead of honest "did not exist yet" (fixed:
    Patrimonio historical net-worth series).
  - MoM/period comparison computed from current state instead of actual historical
    state (fixed: Patrimonio liabilities MoM change).
  - Silent error swallowing with no user-facing feedback on a failed mutation (fixed:
    RegisterTransactionModal/EditTransactionModal missing catch block).
  - Negative/zero-denominator ratios rendered as a fake "0%" instead of "no data"
    (fixed: Reports KPI cards null-baseline handling).

- S5: Three explorer audits ran (Ledger, Investments, Lending). Combined: ~34
  findings. User reviewed the top findings and made explicit per-item decisions
  (see S6-S8); the remaining ~30 lower-severity findings will be reviewed one by one
  in a follow-up pass per the user's explicit choice (not silently fixed, not
  silently dropped).
- S6: APPROVED NOW — Ledger finding #1 (Lending audit): `RegisterLoanPostingAsync`
  (`LedgerModule.cs:114-152`) writes transactions directly via
  `_transactionRepository.AddAsync`/`SaveChangesAsync`, never calling
  `CheckOverdraftGuardAsync`. This means loan payments, card payments/purchases, and
  lent-cash disbursements posted as `Expense` can drive a restricted-type account
  (Cash/Savings/Wallet/CryptoWallet/Exchange/International) negative with no guard —
  the exact same bug class the user originally reported, through a different code
  path this session's first fix did not cover. `LoanService.cs:638-640` is the
  concrete caller that posts loan/card payments as Expense through this gap.
- S7: APPROVED NOW — Investments finding #1 (Investments audit): legacy Sell
  (`InvestmentService.cs:155-167`) does not actually liquidate a position. When
  `newQuantity == 0` (full sale), `UpdateValue` is skipped entirely (`:161`), so
  `Quantity` and `CurrentValue` remain at their pre-sale values even though a Sell
  transaction row was written claiming the position was liquidated. Overselling
  beyond current holdings is silently clamped via `Math.Max(0, ...)` (`:158`) with no
  rejection, so the transaction log and the actual position can permanently disagree.
  This can inflate displayed net worth with a position the user believes (and the
  transaction history says) no longer exists.
- S8: User explicit choice: review the remaining ~30 findings one by one in a
  follow-up pass (not fix-all, not document-only-and-ignore).

## Tasks

- T1: Delegate a read-only explorer audit scoped to Ledger (accounts, transactions,
  transfers, reconciliations, reversals) for missing validations and consistency
  gaps, using S4's bug classes as a checklist. Spec: S1, S2, S4. DONE.
- T2: Delegate a read-only explorer audit scoped to Planning.Investments (purchases,
  valuations, dividends, cash operations, cost-basis tracking) for the same bug
  classes. Spec: S1, S2, S4. DONE.
- T3: Delegate a read-only explorer audit scoped to Lending (loans, card purchases/
  payments, debts/receivables, accounting postings) for the same bug classes.
  Spec: S1, S2, S4. DONE.
- T4: Orchestrator consolidates all three reports, confirms the highest-severity
  findings live (backend tests and/or browser) before trusting them, and presents a
  prioritized findings list to the user for explicit go/no-go per item or group,
  per S3 (no blind fix-all). DONE — user approved S6 and S7 now, chose one-by-one
  review for the rest (S8).
- T5: Fix S6 (loan/card postings bypass overdraft guard) with TDD RED-then-GREEN,
  mirroring the original expense guard's pattern. Spec: S6.
- T6: Fix S7 (legacy Sell doesn't liquidate / silently clamps oversell) with TDD
  RED-then-GREEN. Spec: S7.
- T7: Independent verification of T5+T6 (dotnet test full suite, live confirmation
  where practical).
- T8 (follow-up, not yet started): review remaining ~30 lower-severity findings one
  by one with the user per S8.

## Additional finding discovered during live verification (not in original 34, flag for T8)

- During live verification of T5's fix, a payment against a loan with real interest/installments
  (18% rate, 24 installments) and a payment date BEFORE the first installment's due date returned
  `Payment.InvalidOperation` from `LoanService.cs`'s generic `InvalidOperationException` catch
  (`"Payment date cannot precede opening or the last payment."` thrown internally, then re-labeled
  generically). Confirmed via a separate clean repro (NoInterest/1-installment loan + API call) that
  this was NOT the overdraft guard firing — it's a distinct, likely pre-existing date-validation
  message-clarity issue: the user sees a vague "Payment.InvalidOperation" with no indication the
  real cause is the payment date predating the first due date. Not fixed now (out of this task's
  approved scope); flagged for T8 review.

## Audit findings reference (all 34, for T8 follow-up)

### Ledger (15 findings, ranked)
1. [FIXING NOW, S6-adjacent] Overdraft guard covers only `RegisterTransactionCommand`
   and the expense-edit path — misses income reversal, reconciliation, draft
   confirmation, recurring payments, investment contributions, workspace shared
   expenses/settlements, and transfer inflow reversal.
2. Guard checks all-time balance, not balance as of the transaction's `OccurredAt`
   (same bug class as the Patrimonio historical-series fix, unaddressed in Ledger).
3. TOCTOU race: no serializable transaction around the balance-check-then-insert in
   `RegisterTransactionCommand`/`UpdateTransaction`/`ReconcileAccountAsync` (transfers
   already use `BeginSerializableTransactionAsync`; expenses don't).
4. Archived accounts accept writes in most paths (register/transfer/correct/update/
   reconcile/draft-confirm) even though they're hidden from balance totals.
5. Unparseable `Direction` silently defaults to Expense in draft ingestion.
6. Cross-module links (Ingestion drafts, recurring payments, workspace shared
   expenses) aren't marked as immutable the way Loan/Investment/Transfer/Reconciliation
   links are, so Ledger can reverse/replace rows another module still points to.
7. No `Idempotency-Key` anywhere in Ledger mutation endpoints (register, transfer,
   correct, reverse, update, delete, reconcile) — network retries can duplicate money
   movement on `POST /transfers` specifically (reverse/correct are already safe via a
   unique index).
8. Reconcile can crash (500) on rounding: unrounded `RealBalance` difference vs.
   `Money.Of`'s rounding can produce a zero-amount transaction that throws.
9. No precision/direction validation on ordinary register/update/draft-confirm —
   relies on silent `Money` rounding (`10.555` BOB silently becomes `10.56`).
10. No upper bound on transaction amount (hits a DB exception, not a 400) or on
    `OccurredAt` (no bound vs. account creation date or "now").
11. Transfer reversal by the id the UI actually shows (`TransferId`) returns 404;
    `GetByIdAsync` doesn't resolve it. Needs live confirmation of which id the
    frontend actually sends.
12. `CreateAccountCommand` allows a negative opening balance for ANY account type,
    bypassing the newly-added restricted-type rule at creation time.
13. Checking accounts can overdraft via expenses but transfers from Checking are
    still blocked by the transfer guard — possible inconsistency, needs a product
    decision on whether that's intentional.
14. Hard account delete has no transaction around the check-then-delete, and no FK
    from `transactions` to `accounts`, so a concurrent insert during delete can leave
    orphan rows (needs-live).
15. `LedgerModule.GetMonthlyMetricsAsync` has a silent 100-row clamp and uses current
    balance instead of historical; appears unused/dead currently.

### Investments (9 findings, ranked)
1. [FIXING NOW, S7] Legacy Sell doesn't liquidate on full sale, and silently clamps
   oversell instead of rejecting it.
2. Cost basis fabricated as `CurrentValue` on creation — `UnrealizedGain` always
   starts at 0 even when the real historical cost differs, contradicting the
   domain's own comment that "current valuation is not evidence of cost".
3. `VariationPct` is computed from `InitialValue`, which includes later funded
   purchases added as cost — so depositing more capital shows up as positive
   "variation"/return with no real market movement.
4. No time bounds on funded buys, dividends, revaluations — can be backdated before
   `CreatedAt` or dated in the future; `UpdateValue` overwrites `CurrentValue`
   unconditionally regardless of the `at` date, so a backdated revaluation can
   overwrite a more recent one. History is also truncated to the last 100 points,
   dropping the creation point first.
5. No magnitude/sanity-check guard on legacy create/update-value/revaluation paths
   (only the funded path has bounds) — a typo'd value 1000x too large is accepted
   silently (or 500s above ~1e14, needs live confirmation).
6. Legacy Buy's cost basis calculation ignores `Fees` (the funded path correctly
   capitalizes fees into acquisition cost; legacy doesn't), and doesn't require
   `TotalAmount == Quantity × UnitPrice`.
7. Manual Contribution/Disposal cash operations move ledger cash but never touch
   the investment's CostBasis/Quantity/CurrentValue — a manual contribution later
   inflates apparent gain once the position is revalued. Also: only the funded path
   checks account currency against investment currency; manual contributions skip
   that check entirely.
8. Quantity edits via `UpdateValueAsync` correctly null the cost basis (honest
   behavior) but write no `InvestmentTransaction` audit row for the change.
9. Field-length validation (name, kind, ticker, legacy notes) only exists at the DB
   layer — likely surfaces as an unhandled 500 rather than a 400 (needs live
   confirmation).

### Lending (10 findings, ranked)
1. [FIXING NOW, S6] Loan/card postings bypass the Ledger overdraft guard entirely
   (see S6 above for detail) — this also applies to `ReverseLoanDisbursementAsync`
   (loan cancellation), which has no guard either.
2. Historical payment figures (`RemainingBalanceAfter` per installment) read from
   CURRENT installment state (`RemainingPrincipal`) instead of the actual balance
   right after that specific historical payment — same bug class as the Patrimonio
   MoM fix, unaddressed here. Also: `EarlyPrincipalAmount` payments never update
   installment-level `RemainingPrincipal` for ReduceTerm/ReduceInstallment loans,
   so two different "remaining" figures can appear for the same installment in the
   same response. Stored `Status` (e.g. overdue) is also never recalculated/persisted.
3. `Idempotency-Key` is optional (not required) on loan creation, payments, and card
   purchases — a null key skips dedupe entirely, so retries from non-web API clients
   or genuine network retries can double-post; the web client always sends a key
   today, so live UI exposure is currently low, but the API itself doesn't enforce it.
4. Several catch-all exception handlers mislabel real failures: loan cancellation
   failures are swallowed into a generic unlogged error, card purchase failures are
   all labeled as a "concurrency conflict" (wrong retry advice to the user) even when
   the real cause is unrelated, and some payment failures only log the exception
   type with no detail.
5. Stored `Loan.Status`/`RemainingPrincipal` only update when a payment is recorded
   — a loan that becomes overdue purely by elapsed time stays `Active` in list views
   while the detail view correctly computes `InArrears`, so list filters and detail
   can disagree for the same loan.
6. The loan simulator endpoint (`POST /v1/loans/simulate`) is anonymous with no
   upper bound on installment count/grace days/compounding periods — a crafted
   request could allocate a large schedule with no rate limit (needs live load test
   to confirm real impact; the authenticated create path has the same gap and
   additionally persists one row per installment).
7. A single-payment loan with a maturity date on or before the disbursement date
   produces a fake 0% TEA while still charging real principal+interest — the
   displayed rate misrepresents the actual cost.
8. Missing counterparty names fall back to a hardcoded "Desconocido" placeholder
   rather than an explicit unknown state (likely low-impact/rarely reachable).
9. A month-scoped financial health report reads debt from a method with no as-of
   parameter (always current), which may misrepresent historical months if the UI
   presents it as that month's figure (frontend not checked, needs confirmation).
10. Minor: cancellation reversal can post into an archived account (missing the
    same `IsArchived` check `RegisterLoanPostingAsync` has), unguarded
    `Currency.FromCode` can 500 on a bad currency code instead of returning a
    validation error, no upper bound on payment/disbursement/purchase dates, and an
    unreachable `Loan.Forgive` method that would write off debt with no ledger entry
    if it were ever wired up.


## Log

- L1: User (verbatim): "Todo bien ahora?" — orchestrator answered honestly: the
  specific reported bug is fixed and verified, but this session's broader sweep was
  UI/UX-focused, not a business-rule audit, so other similar gaps may exist unaudited.
- L2: User: "que prosigue ahora?" — orchestrator offered to resume the paused UI sweep
  (next: Borradores) or do a financial-integrity audit first; user chose the audit.
- L3: User decisions via ask_user_question: scope = Ledger + Investments + Lending
  (not Ledger-only); focus = missing validations AND data consistency (not
  validations-only).
