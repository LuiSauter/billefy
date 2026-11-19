# Soft goal reservations

Reserved goals earmark existing money; they neither freeze cash nor add assets. New assignments cannot exceed the account's currently unreserved balance. Later spending remains allowed and exposes an account-wide shortfall instead of silently releasing assignments.

## Create and read goals

`POST /v1/planning/goals` accepts optional `fundingMode`:

| Value | Meaning |
| --- | --- |
| `AccountTracking` (omitted-field default) | Existing behavior: progress follows the full linked account balance. |
| `ReservedFunds` | Progress follows net explicit assignments/releases, starting at zero. Requires an active, owned account in the same currency. |

Creating or editing a goal never moves cash. Invalid modes (including explicit null, numeric strings and empty strings) return 400 `Goal.InvalidFundingMode`. A missing reserved-mode account returns 400 `Goal.AccountRequired`; existing account ownership/currency validation remains in force.

`PUT /v1/planning/goals/{id}` preserves the mode. Reserved goals cannot be unlinked. After any funding history exists, changing accounts or deleting the goal returns 409 `Goal.FundingHistoryExists`, even if all assignments were later released. This preserves the trail; there is no implicit conversion, backfill or funding-history deletion endpoint.

## Assign or release

`POST /v1/planning/goals/{id}/funding/assign` or `.../release`

Required header: `Idempotency-Key: <nonempty UUID>`.

Example body:

```json
{
  "amount": 700,
  "currency": "BOB",
  "occurredAt": "2027-01-12T12:00:00Z"
}
```

Amounts must be positive and exactly representable at the currency's precision. A release cannot exceed that goal's net assignments. Assignments check the total earmarked across **all** reserved goals of the linked account, not just the current goal. An unavailable active account cannot receive new assignments; existing earmarks can still be explicitly released.

An omitted effective date uses server time. Idempotency is scoped to the authenticated user across all goals and both operations. The same key and payload returns the original entry (200 instead of the initial 201); changed payloads return 409 `GoalFunding.IdempotencyConflict`. Date omission is part of that payload identity. No automatic network retry is performed.

`GET /v1/planning/goals/{id}/funding` returns immutable assignments and releases with effective and recorded dates. Releases append a new entry; they do not update or erase the assignment. Dated entries preserve the trail, but this endpoint is not an as-of account-balance reconciliation.

| Rejection | HTTP / title |
| --- | --- |
| Invalid amount or currency precision | 400 `GoalFunding.InvalidAmount` |
| Missing/empty key | 400 `GoalFunding.IdempotencyKeyRequired` |
| Invalid operation / currency mismatch | 400 `GoalFunding.InvalidKind` / `GoalFunding.CurrencyMismatch` |
| AccountTracking goal | 409 `GoalFunding.InvalidMode` |
| Over-allocation / over-release | 409 `GoalFunding.InsufficientFunds` / `GoalFunding.ExcessiveRelease` |
| Proven competing reservation/lifecycle write | 409 `GoalFunding.ConcurrentChange` |
| Missing/foreign goal | 404 `Goal.NotFound` |

Rejected requests leave stored assignments, goals and cash unchanged. On a concurrency conflict, refresh before explicitly retrying with the same key.

## Spending and shortfall

Example: account 1000 BOB, assigned 700 BOB, later expense 500 BOB:

- Account cash becomes 500 BOB; the expense remains permitted.
- Goal stays assigned 700 BOB. Its target progress is not silently rewritten.
- Account funding shortfall becomes **200 BOB**.
- New assignments are rejected until enough unreserved funds exist or assignments are released.

Goal responses add `accountReservedAmount`, `accountFundingShortfall` and `reservationStatus` (`funded`, `underfunded`, `unavailable`) for reserved goals. These are **account-wide** totals repeated for goals sharing that account: never sum them across goals or assign the same deficit to every goal independently. Missing/incompatible accounts report unavailable backing rather than inventing a cash balance. Legacy account-tracking goals retain their previous progress behavior.

## Concurrency, export and rollout

A per-owner/account optimistic version token serializes successful assignment/release commits across goals. A goal version also guards competing relinks/deletions. Monetary totals are derived from append-only entries; the token row stores no balance. Token changes and the entry insert use one atomic EF SaveChanges transaction. First-row creation races are constrained by the composite primary key and reported as conflicts when a competing write is established.

This boundary deliberately does **not** freeze or serialize Ledger spending. A concurrent/later outflow can underfund an earmark; current goal reads expose that state. Availability is checked against the Ledger balance observed when assigning, not a promise that the bank balance is locked.

Financial export includes the funding trail and serialization rows. Authenticated financial reset removes only that owner's entries and tokens before goals, inside the existing reset transaction. Ordinary release/delete operations never erase the trail.

Official forward EF migrations add the mode, new funding tables and concurrency token. Existing migration files are not rewritten. Migration generation is not migration application: do not restart an auto-migrating API or apply migrations to populated data without a verified backup and authorized rollout.

## Web workflow

New goals default to **Reservas explícitas** and require a same-currency account. They start at zero; **Saldo completo** remains an explicit legacy alternative. Existing goals retain their funding mode. Editing a reserved goal retains its linked account; assignments/releases are separate actions.

Use **Administrar reserva** to assign or release a positive amount. An optional effective date/time uses the browser's local timezone; leaving the date empty uses server time. The drawer lists immutable entries with effective and recorded times. Requests carry decimal strings and a UUID idempotency key. Duplicate pending submissions are locked. Explicit retries reuse the key for the same canonical payload, even after changing input and returning to it; changed payloads use different keys. No automatic retry occurs. Closing an uncertain request and starting a new one loses that in-memory retry identity: verify history before doing so.

A funding mutation refreshes goals and health. Account/transaction/FX/reconciliation changes made through the dashboard also refresh planning so subsequent spending reveals a shortfall without a page reload. A planning-read failure after a committed write must not resend the financial operation. The shortfall banner is grouped once per account/currency, not multiplied by the number of goals. Unavailable backing is labelled without discarding assignments or inventing cash.

## Remaining proof

Full historical reconstruction, independent verification and the complete 21-event browser acceptance remain separate proof obligations. Browser reservation scenarios are recorded separately from that fixture; neither backend implementation nor UI tests alone establish audit approval. Runtime readiness must be observed through the public client/API, not inferred from generated migrations.
