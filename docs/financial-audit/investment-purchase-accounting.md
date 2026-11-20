# Purchase investments without creating consumer expenses

Funded purchases now use one database transaction for cash, position units, historical acquisition cost and an immutable operation. Valuation is a separate dated operation. This is the bounded T16/T17 implementation, not acceptance of the entire financial audit. Parent compilation and full automated checks now pass; the additive migration and client refresh integration are implemented. The exact 21-event public-HTTP replay now passes in isolated SQLite; its captured checkpoints and closing values are in [http-acceptance-evidence.json](http-acceptance-evidence.json). The current parent suites pass 687 backend and 968 web tests, TypeScript and lint (three pre-existing warnings), and offline model consistency passes for Ledger, Lending and Planning. Independent verification, the current production build, complete browser acceptance and production-provider proof remain incomplete. The replay uses the laptop as an explicit client-owned fixture input, not persisted server data, and does not certify every S5/S6 invariant.

## Accounting policy and quick check

| Action | Cash | Units | Historical cost | Current value | Consumer expense |
| --- | --- | --- | --- | --- | --- |
| Register opening position | No movement | Opening units | Registration amount for newly registered positions | Registration amount | None |
| Funded purchase | Debit gross plus fees | Add purchased units | Add gross plus fees when prior cost is known | Add gross plus fees; do not reprice old units | None |
| Funded dividend/rent | Credit received amount as recognized income | Unchanged | Unchanged | Unchanged | None |
| Dated valuation | None | Unchanged | Unchanged | Explicit total/reference price | None |
| Existing cash-only contribution/disposal | Debit/credit | Unchanged | Unchanged | Unchanged | None |

The simplified acquisition policy capitalizes purchase fees. Average acquisition cost displayed is accumulated known acquisition cost divided by current units. This does not implement FIFO, tax lots, realized sale gains or a complete sales-cost method. Legacy sale/quantity corrections that change units without a supported cost allocation make cost unknown instead of silently retaining a fabricated basis. T21 adds funded dividend/rent recognition below. Unlinked legacy dividend and standalone fee operations retain their pre-existing cash-neutral behavior; this does not implement a sales-cost method.

1. Register 20 BOB-denominated shares with value 2000. The newly registered position establishes cost 2000 without debiting cash.
2. Buy 5 at 120 from a BOB account: gross 600, fees 0. Cash decreases 600; quantity becomes 25, cost 2600 and value 2600, not 3000.
3. Record the January 21 reference price 110 and total 2750: units remain 25, cost remains 2600 and unrealized gain becomes 150. Cash and its movement counters remain unchanged.
4. Read the original opening and purchase operations again: their quantities, prices, fees, amounts and identities remain unchanged.

## HTTP contracts

### Funded purchase

`POST /v1/planning/investments/{id}/operations`, with a nonempty UUID `Idempotency-Key` header:

```json
{
  "type": "Buy",
  "quantity": "5",
  "unitPrice": "120",
  "totalAmount": "600",
  "fees": "0",
  "linkedAccountId": "<owned BOB account UUID>",
  "occurredAt": "2027-01-13T00:00:00.000Z"
}
```

`totalAmount` is gross acquisition amount, excluding the separate `fees` field. It must equal quantity × unit price rounded to currency precision using midpoint-away-from-zero. Amounts must fit existing `numeric(20,6)` storage and the account's currency precision; values requiring more than six stored fractional digits are rejected, never truncated. Quantities use up to ten fractional digits and unit prices up to six. No implicit FX conversion occurs.

- First success: **201**, existing `InvestmentTransactionDto` shape, with a non-null linked Ledger transaction ID.
- Same owner/key/economic payload: **200**, the identical operation response, without another write. Decimal scale differences such as 600 versus 600.00 are equivalent. Omitted effective date remains part of the retry identity; retries do not substitute a new clock value.
- Same owner/key with changed type, position, quantity, price, total, fee, account (including omission), effective date or notes: **409 Investment.IdempotencyConflict**. The operations endpoint reserves this header for funded purchases and dividends; changing the route's payload shape cannot bypass the persisted identity.
- Competing position/key writes: **409 Investment.ConcurrentChange**. Reload and explicitly retry the same payload/key; there is no hidden financial retry.
- Invalid quantity/price/amount/fees/notes/currency or absent key: **400** with the corresponding `Investment.*` problem title.
- Missing/foreign position or account: **404**, without exposing another owner's data.
- Archived records: rejected. No purchase cash can be reversed independently through the existing cash-only reversal route (**409 InvestmentCash.PositionOperation**).

Purchase timestamps are normalized to UTC at PostgreSQL microsecond storage precision; timestamp values lacking a zone are treated as UTC. Creation and replay responses normalize decimal scale and database timestamps consistently, including SQLite's unspecified DateTime materialization.

### Funded dividend or rent

Use `POST /v1/planning/investments/{id}/operations` with a nonempty UUID `Idempotency-Key` and:

```json
{
  "type": "Dividend",
  "quantity": "0",
  "unitPrice": "0",
  "totalAmount": "40",
  "fees": "0",
  "linkedAccountId": "<owned same-currency cash account UUID>",
  "occurredAt": "2027-01-20T12:00:00.000Z"
}
```

One transaction credits cash and recognized income and appends a Dividend operation linked to its immutable Ledger transaction. Units, current value and acquisition cost remain unchanged. The cash marker is `Dividend`, not `Disposal`; income queries and client projections include it, while contributions and disposals remain excluded from ordinary result. The legacy `/transactions` DTO now exposes the existing investment markers as additive optional fields; without them, clients could misclassify capital cash flows.

Use the same 201/200 exact-replay and 409 changed-payload rules as a funded purchase. The existing nullable `purchase_key` / `purchase_payload_hash` columns identify both kinds of funded operation; no extra schema column or migration is needed. Quantity, price and fees must be zero; `totalAmount` is the positive cash received at account currency precision. This bounded path does not silently net withholding or separate fees. Invalid or failed writes leave cash, position and history unchanged; an explicit same-key retry is safe. Do not reverse or edit the linked cash independently. The generic reversal is rejected with 409 `InvestmentCash.RequiresCoordinatedReverse`. A coordinated dividend-correction workflow is not implemented by this bounded path; the cash-only contribution/disposal reversal is not a substitute.

The existing dividend/rent form now requires a same-currency receiving account and submits one keyed operation, never operation plus a second Disposal. An uncertain transport failure keeps the form open with an inline alert; it does not silently close or automatically retry. Payload-keyed in-memory retry identity survives uncertain responses and changed-back inputs while mounted; it is not persistent across navigation/remount. Post-save refresh failures do not resend the committed write.

### Dated valuation

Use the existing operations route, without a cash account:

```json
{
  "type": "Revaluation",
  "quantity": "0",
  "unitPrice": "110",
  "totalAmount": "2750",
  "occurredAt": "2027-01-21T00:00:00.000Z"
}
```

Quantity zero preserves the current position quantity. The operation retains the reference price and date; the position's value history receives the dated total. This does not post cash or change acquisition cost. The older `/value` endpoint retains its omitted/explicit quantity options and legacy `variationPct` field semantics. New views use cost-based calculations rather than that initial-snapshot percentage.

### Compatibility boundaries

- Buy **without** `linkedAccountId` remains the pre-existing cash-neutral operation. It is not the new funded-purchase workflow.
- `/cash/Contribution`, `/cash/Disposal` and their reversals remain explicitly cash-only. They do not purchase or dispose of position units.
- Existing public operation fields and opening `initialValue` remain unchanged.
- Investment DTO adds nullable `costBasis` and `unrealizedGain`. New records establish known registration cost; historical rows remain null, with no guessed backfill from current value or incomplete operation history.
- On older servers, absent cost fields retain the client's initial-value fallback. Explicit null is never treated as a fallback: UI cost/performance remains unavailable.

## Atomicity and concurrency

Flow: purchase/dividend form → operations endpoint → existing `RelationalInvestmentCashTransaction` shared-connection boundary → existing `ILedgerModule.RegisterInvestmentCashAsync` primitive with Contribution for Buy or Dividend for recognized income → position mutation for Buy only + immutable operation insertion → one commit.

For a purchase, the same transaction persists the cash debit, updated units/value/known cost, immutable operation, key/hash and existing cash link. For a dividend, it persists the cash income and linked immutable operation/key/hash without mutating units/value/cost or creating a cash-only Contribution/Disposal link. Failure clears tracked state and rolls both contexts back. A weak connection-keyed semaphore serializes the shared SQLite connection's transaction lifetime. Across PostgreSQL connections/processes, the unique owner/key index and optimistic position token prevent duplicate/lost writes; failed competitors roll back their cash legs.

The public HTTP rollback test injects failure after the Planning save, observes that a Ledger save preceded it, then checks every financial projection through public APIs. It also retries the same key after rollback. No manual rows, real database or raw SQL are used by the new tests.

## Parent integration and schema checklist

### Additive EF migration — generation only by parent

| Table | Addition | Existing rows |
| --- | --- | --- |
| `investments` | nullable `cost_basis numeric(20,6)` | Remain null; do not copy `initial_value` or `current_value` |
| `investments` | non-null `concurrency_stamp uuid`, Guid.Empty default, concurrency token | Mechanical token only, no financial backfill |
| `investment_transactions` | nullable `purchase_key uuid` | Null |
| `investment_transactions` | nullable `purchase_payload_hash varchar(64)` | Null |
| `investment_transactions` | unique `(user_id, purchase_key)` filtered by `purchase_key IS NOT NULL` | Legacy null keys do not conflict |

No migration or snapshot was edited/generated/applied by this worker. Parent subsequently generated `20261116091611_AddInvestmentPurchaseAccounting` with official EF tooling, preserving existing goal migrations; no database migration was executed by this work. Do not run this schema-dependent API against a database lacking the additions. Backup and live application remain separate authorization steps. Rollback policy is to stop affected writes and preserve additive columns/history, not drop or rewrite financial records.

No new DI registration is required: the existing coordinator additionally consumes the already registered `IInvestmentRepository`. Program remains parent-owned. No new environment variable, dependency or Ledger contract is required.

### Web seams

- `useInvestments.purchaseInvestment(id, input, key)` accepts decimal strings and propagates failures. Keep the caller's key and payload stable on uncertain responses.
- `useInvestments.recordValuation(id, input)` sends Revaluation with quantity zero and no linked cash account.
- `InvestmentsView` now connects the dedicated `PurchaseInvestmentModal` from table/detail buy actions and the existing price modal's new dated callback. It refreshes account/movement consumers through its existing `onCashComplete` seam. It no longer follows a purchase with a second cash-only call.
- Parent-owned `page`, `useDashboardData` and `ModalsContainer` must route any remaining global buy action through `PurchaseInvestmentModal`/`purchaseInvestment`, not the legacy operation-plus-cash sequence. Pass `onRecordValuation` to global price dialogs while preserving the existing legacy callback. Refresh cash/movements and selected operation history after a funded purchase.
- The purchase form retains the retry payload/key in mounted component state after failure and disables economic-input edits until the attempt succeeds. It also retains the original asset name/currency when selection changes during an uncertain attempt. It does not persist financial payloads to browser storage. Closing/reopening or global navigation must not deliberately replace an uncertain attempt with a new key.
- Purchase and valuation forms use native asset currency, existing drawers, labels, MoneyInput/Input/SelectField/Button controls and decimal.js. Numeric conversions are presentation only for new purchase writes.

### Follow-up outside this writer's edit surface

Parent subsequently added owner-scoped `investmentTransactions` to `PlanningFinancialDataExport.cs`. The two-owner public export/reset tests pass and preserve the other owner's financial export. No export code was changed by this writer; this is later parent evidence, not independent proof. Existing historical charts interpolate/cap value snapshots, and legacy sale behavior remains outside this bounded correction. The parent 21-event numeric HTTP replay now passes; this is not historical full-ledger, sale-cost, complete browser or independent acceptance.

## Verification and review path

Parent L31 records genuine combined backend RED: 44 cases, 15 passed/29 failed, exit 1. The investment test file originally contributed 22 cases; two additional fee/unknown-cost cases and decimal-scale/type/account-omission replay assertions were added during implementation. Backend compilation and all 24 investment cases must be run by parent after both writers finish; this worker is explicitly prohibited from .NET/EF/restore execution.

Focused web tests cover accumulated/unknown/absent cost, exact purchase inputs/retry keys, dated valuation, form validation, native currency routing, absence of a second purchase cash post, and detail/summary performance. Existing investment module tests preserve cash-only and legacy controls/market behavior. A saved valuation followed by a failed refresh does not invite another post. An explicit empty server history does not fabricate opening purchases from current units. Global TypeScript/full-suite/build and browser acceptance remain parent-owned.

### Observed writer check history — retained across the quota interruption

| Check | Observed result |
| --- | --- |
| Hook + purchase-cost domain RED | Exit 1: 5 failed / 4 passed |
| Purchase/valuation form RED | Exit 1: missing purchase module; 1 valuation test failed / 1 legacy test passed |
| Four focused hook/domain/form files GREEN | Exit 0: 14 passed |
| Investment-only 16-file check before interruption | Exit 1: 68 passed / 1 new assertion failed; it matched `750,00` inside legitimate `2.750,00` |
| Focused cost/gain views after anchoring the full incorrect-gain amount | Exit 0: 2 passed; one correction, no weakened financial expectation |
| Original-asset retry context RED on resumption | Exit 1: 1 failed / 3 skipped; the pending form displayed a newly selected asset/currency |
| Remaining 16-file check after the bounded correction and final in-scope changes | Exit 0: 72 passed / 16 files, 5.60 seconds |

The final check emitted chart width/height warnings during server-side rendering; no test failed or assertion was suppressed. Passed suites were not restarted as new baselines. The interrupted failed check received its outstanding rerun; no correction or independent-proof budget was reset. Backend checks remain NOT_RUN by this writer.

Parent differential probes, using its authorized mechanism only: compare status/body and public state for cash-only Contribution/Disposal/reversal; `/value` with omitted and explicit quantity; unlinked legacy Buy with/without fees; Sell, Dividend and Fee operation behavior; omitted/explicit effective dates. Compare legacy fields separately from the intentional additive cost fields. No source copy, preparator or differential runner was created by this worker.

Review Risk item 4 first (cash/position atomicity, rollback, replay, uniqueness, concurrency), then item 3 (cost/gain projections, unknown legacy state and remaining dashboard/global-modal seams).
