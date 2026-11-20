# Operational debt and card accounting

**Scope:** T14–T15; S3.3, S3.5, S5–S7, S9, S12 and S18 of the financial accounting audit.

This unit separates cash, principal and recognized result. It extends the existing loan allocator and immutable transaction model; it does not introduce a general-purpose journal or a second manual liability. Combined backend/full-suite verification, additive migrations and shared dashboard wiring remain parent-owned integration work; the separately authorized bounded backend correction check is recorded below.

## Accounting rules

Amounts below are in one currency. A single operation never silently converts an account or obligation currency.

| Event | Cash | Principal position | Recognized result |
|---|---:|---|---|
| Open existing bank debt of 3,000 | 0 | Liability +3,000 | 0 |
| Receive borrowed cash of 900 | +900 | Liability +900 | 0 |
| Repay borrowed principal of 100 | −100 | Liability −100 | 0 |
| Lend 800 from an account | −800 | Receivable +800 | 0 |
| Recover 320: principal 300, interest 20 | +320 | Receivable −300 | Income +20 |
| Pay 530: principal 500, interest 30 | −530 | Liability −500 | Expense +30 |
| Open existing card debt of 600 | 0 | Liability +600 | 0 |
| Purchase food by card for 350 | 0 | Card liability +350 | Expense +350 |
| Pay the card 700 | −700 | Card liability −700 | 0 |

Starting from cash of 6,000, the last three events leave cash of 5,300, card debt of 250 and expense of 350. A cash food expense of 550 plus a card food expense of 350 consumes the same food budget by 900; paying the card consumes no additional budget.

Opening balances establish pre-existing principal, not period income or expense. Principal cash movements and their cancellation reversals affect actual account balances but are excluded from result and category-budget calculations. Recognized regular and late interest remain result transactions.

## API contract

All routes require the authenticated owner. Unknown or foreign loan/account/category references must not create postings or alter an obligation.

### Create a loan or opening obligation

`POST /v1/loans`

Additive request fields:

- `originationKind`: `CashDisbursement` (default) or `OpeningBalance`.
- `loanKind`: `Loan` (default) or `CreditCard`.
- Optional UUID `Idempotency-Key` header. The body also accepts `idempotencyKey`; the header takes precedence.

`OpeningBalance` creates the principal obligation without a disbursement transaction. If a legacy caller supplies an account, ownership/currency are still validated, but the opening does not retain it as a disbursement link or move its cash. `CashDisbursement` with an account creates one typed principal movement, never ordinary income or expense. Existing accountless API creation remains available for compatibility and creates no synthetic cash movement; new forms explicitly choose opening balance or require a real disbursement account.

Operational cards are borrowed, monthly, `NoInterest`, zero regular/late interest, one opening installment and `AdvanceInstallments`. Creation rejects unsupported card terms instead of quietly applying an unrelated loan template. The forms select these terms and explain that an opening balance does not move cash.

A supplied UUID replays creation with the original ID and HTTP 201. Reusing it for a different request returns HTTP 409. Header syntax failures are rejected by HTTP binding before application writes.

### Register a repayment or recovery

`POST /v1/loans/{id}/payments`

Existing amount, date, account and note fields retain their defaults. New optional fields are `interestCategoryId` and `idempotencyKey`; the UUID header is also supported.

The existing `Loan.RecordPayment` allocator determines regular interest, late interest and principal. Cash principal and interest are posted separately inside the same loan transaction. Borrowed-loan interest requires an owned expense category when supplied; lent-loan interest requires an owned income category. A category is rejected when the payment recognizes no interest. Cards require an actual account. Accountless payments for ordinary legacy loans remain compatible, without fabricating a cash leg.

A replay returns the original HTTP 200 payment result, including its original remaining principal and status, even after later payments. Changed payload under the same key returns 409. The stored immutable replay result is separate from current recalculated loan details.

### Register a card purchase

`POST /v1/loans/{id}/purchases`

```json
{
  "amount": 350.00,
  "currency": "USD",
  "categoryId": "11111111-1111-1111-1111-111111111111",
  "occurredAt": "2027-01-07T00:00:00Z",
  "description": "Food purchase"
}
```

- The target must be the owner's non-cancelled operational card.
- The amount is positive, within `numeric(20,6)`, and exact for the currency precision; no rounding of submitted monetary values is used to accept invalid input.
- Currency must exactly match the card. The category, when supplied, must be an owned expense category.
- `occurredAt` is UTC and cannot predate opening. A date whose following-month due date cannot be represented is rejected.
- Description is at most 500 trimmed characters.
- A purchase after a recorded payment must fall on a later calendar date. A payment cannot precede an existing purchase. These restrictions prevent invented intra-day ordering in the date-based allocator; unsupported backdating is rejected atomically.
- The optional UUID header/body key replays HTTP 201 with the same purchase ID. Changed payload returns 409.

A purchase appends an immutable purchase record and a zero-interest principal installment due one month later. It increases remaining principal and can reopen a paid card. It does not rewrite opening principal, previous payments, previous payment allocations or existing purchase amounts.

Loan details add `purchases`, containing purchase amount, currency, date, category, description and linked ledger transaction ID. Loan summaries expose nullable `originationKind` and `loanKind`; absence on legacy rows is not evidence for reconstructing an unknown opening event.

Application failures use the existing problem-details convention: a stable error identifier is in `title`, not a separate `code` field. Validation is 400, missing/foreign resources are 404, and idempotency or posting conflicts are 409.

## Storage and projection boundary

- `transactions.loan_id` and `transactions.loan_cash_kind` link principal, interest and `CardPurchase` postings to Lending.
- Principal movements have ordinary cash directions, but movement history labels them `Loan`. `type=Loan` filters principal movements; category result summaries exclude them.
- Card purchases have no cash-account leg. The required transaction account/source ID contains the loan ID, marked `CardPurchase`; no account entity is created. Account balances and report balance reconstruction explicitly exclude that marker. Movement history describes the source as a card without cash.
- Card purchases still participate in expense totals and category budgets. Interest remains normal categorized income/expense. Dashboard, reports and calendar result projections exclude principal, not card purchases or interest.
- Independent editing, duplication or reversal of loan-linked transactions is unavailable. Supported pre-payment loan cancellation uses the existing exact disbursement-link reversal; a card with purchases cannot use that cancellation path. A future purchase refund/correction must append a coordinated liability/expense correction, not independently reverse its expense.
- Payment history before later purchases uses only the obligations present on the relevant calendar date. Card summaries without detailed schedules are not used to invent purchase due dates or monthly commitments.

Ordinary income/expense, transfers, reconciliation adjustments, workspace settlements and investment postings retain their existing markers and paths. The investment cash port and its default behavior are unchanged.

## Atomicity and retries

Creation, payment and purchase reuse `ILoanTransaction` and the shared Lending/Ledger connection. Relational adapters serialize changes to an existing loan and commit its allocation, linked postings, snapshots and replay metadata together. Validation or a posting failure rolls back both financial modules and clears abandoned tracking state. Unique owner-scoped keys protect committed retries; application-level preflight lookup alone is not the concurrency safeguard.

Creation and simulation forms submit principal as a canonical Decimal string; the contract still accepts legacy numeric callers. Payment and purchase amounts also cross the HTTP boundary as Decimal strings, preserving high-value cents instead of converting financial input through JavaScript numbers. A public API case pins decimal-string opening creation.

The web hook retains the operation key for an identical request after an uncertain POST failure, releases it after a successful write, and prevents refresh failure from masquerading as a failed write. The purchase form keeps input on failure, locks submission and ignores responses belonging to a closed session.

SQLite public API tests can prove observable rollback and replay behavior, not concurrent PostgreSQL locking/isolation. Production-dialect concurrency proof is still required for Risk item 4.

## Parent integration checklist

1. Parent generated **new forward EF migrations** offline in job30: `20261116091607_AddLoanAccountingPostings` (Ledger) and `20261116091609_AddLoanAndCardAccounting` (Lending). Historical migrations were not edited and no migration was applied by this work. Review backup/runtime readiness before application; do not generate duplicate additions. Included changes:
   - Ledger: nullable loan ID/kind columns and loan-ID index on transactions.
   - Lending loans: nullable origin/kind/creation key/fingerprint and unique `(user_id, creation_key)` index.
   - Lending payments: nullable interest transaction ID, key, fingerprint and serialized original replay result; unique owner/loan/key index.
   - Lending purchases: new `loan_purchases` table, amount precision, owner/loan/key and ledger-transaction indexes, and loan relationship. Existing installment schema is reused; opening principal is not rewritten.
2. Parent mounted the shared card-purchase UI in `page.tsx`, connected `useDashboardData.registerCardPurchase`, and forwarded the detail callback through `ModalsContainer`. The three shared regression rules went RED then passed with 45 related tests. `useLendingModule` exposes `registerCardPurchase`; `DeudasView` and `LoanDetailModal` accept `onOpenCardPurchase(loanId)`. Mount `RegisterCardPurchaseModal` from shared modal state, pass the selected authoritative card summary and category/currency dependencies, and refresh accounts, transactions, budgets and loan details after success. No manual Patrimonio liability is created.
3. Confirm the existing shared transaction adapter and DI registration supply the production `ILoanTransaction`. `ILoanPurchaseService` is registered by Lending infrastructure; the default typed Ledger port intentionally rejects unsupported adapters instead of silently writing ordinary income/expense.
4. Parent extended owner-scoped financial export with `purchases` and explicitly removes owned purchase children before authenticated reset. `AccountingHistoryExportTests` reproduced both missing history arrays (2 failures) then passed both two-owner export/reset cases. Other-owner financial exports remain byte-identical; no live reset was run. Production-provider execution remains unproved.
5. Run combined backend compilation/public API checks, preservation cases, full-web type checking and official OpenAPI export/diff. New DTOs, the purchase route and the `Loan` movement enum must appear in generated documentation.
6. Preserve L33, which already records the approved domain paths, and append implementation/verification evidence against the delegated tasks/specs in the parent-owned ODD log. The implementation worker did not alter that log or earlier history.

## Verification evidence and limits

Public API tests cover openings, cash borrowing/lending, principal/interest allocation, card purchase/payment, category budgets, immutable prior events, invalid owner/account/currency/precision/date/category rejection, rollback, replay/conflicts and legacy ordinary transactions/loans. The parent observed the pre-implementation combined API baseline: 44 executed, 15 passed, 29 failed. The first compiled implementation candidate (parent job24) ran 51 combined cases: 40 passed, 11 failed; all 11 failures were debt/card cases.

The bounded correction batch following L34 fixed EF enrollment, not accounting expectations. New installments, payments, purchases and payment allocations already receive UUIDs in the domain, but their generated-key convention caused relationship discovery to mark new rows Modified. Parent SQL evidence showed a newly appended card installment UPDATE and payment-allocation UPDATEs against nonexistent rows. Mapping those four IDs with `ValueGeneratedNever()` keeps append-only children Added. The failed candidate already serialized `accounting_result`, including for non-key payments; no replay DTO or status workaround was needed.

Authorized foreground correction check, attempt 1:

```bash
dotnet test backend/tests/Api.Tests/Api.Tests.csproj --no-restore --filter 'FullyQualifiedName~Api.Tests.LoanAccountingTests|FullyQualifiedName~Api.Tests.CardAccountingTests' --logger 'console;verbosity=minimal'
```

Observed exit 0: **27 passed, 0 failed, 0 skipped**, test duration 13 seconds, completed within the 30-second foreground limit. Full combined stdout/stderr is retained in `odd/evidence/t14-correction-1.log`. Existing assertions were unchanged; successful normal payments, card purchases and both replay cases now pass. One correction and one focused check were used; no timeout, retry, migration or full-suite execution occurred. This is focused backend GREEN, not full accounting acceptance.

Focused web checks exercise principal exclusions, card/interest results, exact Decimal payloads, form modes, purchase validation, uncertain-write retries and previous creation/payment/detail/debt/movement behavior. See the implementation handoff for exact observed commands, counts and exit codes; no full suite or type-check result is implied.

Risk item 3 requires review of the new shared financial markers and projections, including unrelated transfer, investment, reconciliation and workspace behavior. Risk item 4 requires review of the shared connection transaction, uniqueness, immutable replay response, concurrent retries and PostgreSQL locking. The scoped implementation is not a claim that every linked audit spec or the unsupported card statement/fees/refunds lifecycle is complete.
