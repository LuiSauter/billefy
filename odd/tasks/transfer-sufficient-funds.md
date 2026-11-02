# Enforce sufficient funds for account transfers

## Objective
Prevent an account transfer from debiting more than the source account's available balance, both with immediate UI feedback and authoritative server-side validation.

## User-authorized policy
- Applies to inter-account transfers only, including FX transfers and replacement transfers/corrections.
- Exact-balance transfer is allowed; any amount greater than available balance is rejected.
- This does not impose a new no-overdraft policy on ordinary expenses, reconciliation adjustments, or historical balances.
- Source-of-truth balance is initial balance plus persisted signed transaction entries; no floating-point money.

## Acceptance criteria
- FxTransferModal shows a real-time insufficient-balance error using exact decimal arithmetic, disables confirmation, and guards submit.
- The amount sent to the application/API remains an exact decimal string.
- The backend rejects unfunded transfer creation before persisting either leg, based on a balance read protected against concurrent overspending.
- Transfer corrections/replacements cannot bypass the source-funds rule.
- Existing transfer validations (distinct accounts, FX rate, atomic linked legs) remain intact.
- Tests cover zero/negative/insufficient source, exact balance, FX source currency, correction effects, and competing transfers; failures leave no partial transfer.

## Scope / constraints
- Preserve all existing dirty edits and untracked work.
- Use PostgreSQL-compatible serializable transaction semantics for read/check/write; verify provider conflict handling and SQLite test behavior.
- No direct DB operations or migrations; balance remains derived.
- No staging/commit/push/PR; no servers or real-user database access.

## Tasks
- [x] T1 — Map and implement serialized authoritative funds validation for registration and transfer correction.
- [x] T2 — Add exact-decimal real-time source-balance validation in the shared FX modal.
- [x] T3 — Assess deterministic competing-transfer regression feasibility; do not introduce a flaky test when the existing isolated provider cannot support reliable orchestration.
- [x] T4 — Complete final independent verification and report provider and residual-risk limits.

## Evidence and design
- Read-only scout found neither FxTransferModal nor backend RegisterTransfer validates source funds. Backend transfer rows are inserted atomically as a pair, but no balance check or concurrent read/write boundary exists.
- Account balance is derived in `TransactionRepository.CalculateBalanceAsync`; use this exact decimal balance rather than a client-provided amount/balance as authority.
- The old `LedgerIntegrationTests` contain unfunded transfer fixtures, so they must be funded consistently when updating expected behavior.
- A bounded read-only assumption challenge found ordinary transactions do not protect against write skew; use a serializable transaction spanning the balance read, validation, and both-leg save. Handle serialization/busy conflicts without partial writes or blind write retries.
- Transfer correction is a separate path from registration and must validate the projected replacement source balance in the same atomic boundary. Do not change expense or reconciliation policy.

## Verification
- Writer and independent verifier passed `LedgerIntegrationTests` (30/30), focused API transfer-correction test (1/1), and targeted web tests (13/13); `git diff --check` passed.
- Regression tests cover insufficient zero/negative balance, exact-balance acceptance, smallest-unit excess, an unfunded correction, exact source amount string, modal balance validation, and refresh failure after successful persistence.
- Independent review confirms serializable transactions wrap balance read/check/write, but **no concurrent competing-transfer test was run**. A follow-up assessed the existing SQLite fixture and did not add a test because shared-cache SQLite lock failures would not reliably prove the funds guard won; PostgreSQL provider behavior remains unproven.
- Existing integration fixtures use isolated SQLite; production concurrency handling is implemented as serializable with provider conflicts aborting and no blind retry. No real DB, staging, or commit.
- Native ASSESS returned unassessable because untracked files were undeclared; RDD is off. The separate independent verification passed all runnable focused suites.

## Commit evidence
- No commit created; user did not request delivery.