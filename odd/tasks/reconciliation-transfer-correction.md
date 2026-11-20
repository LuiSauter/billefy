# Reconciliation adjustment and transfer access

## Objective
Represent account reconciliation as a distinct balance adjustment—not income or expense—and make inter-account transfers readily discoverable in the web transaction screen.

## Acceptance criteria
- Reconciliation deltas continue to affect the account balance, but are exposed as an `Adjustment` movement rather than `Income`/`Expense`.
- Adjustments are excluded from income/expense analytics and dependent planning totals.
- The web transactions screen presents the existing transfer action prominently, without requiring the user to discover it inside a generic options menu.
- Focused regression tests cover classification, totals, and transfer entry.

## Scope / constraints
- Platform selected by user: web.
- Preserve all pre-existing dirty changes and untracked files. Do not overwrite or stage unrelated work.
- Keep transfer API semantics unchanged; transfers remain two linked account entries.
- Preserve signed balance effects for reconciliation; no floating-point money.
- No schema changes unless the existing domain cannot model a distinct adjustment without one; if schema change is required, use a new forward EF migration only.
- No push, PR, or merge. Do not commit without explicit authorization.

## Tasks
- [x] T1 — Trace adjustment persistence, API projection, web movement type, analytics, and add regression coverage.
- [x] T2 — Implement distinct adjustment classification end-to-end and exclude it from income/expense totals (including the repository movement projection contract at `backend/src/Modules/Ledger/Ledger.Application/Abstractions/ITransactionRepository.cs`).
- [x] T3 — Promote the existing transfer action in the web transaction screen and test access/behavior.
- [x] T4 — Run focused checks and report any remaining functional verification gaps.

## Evidence / decisions
- Read-only scout found `AccountService.cs` creates a signed ordinary transaction and encodes reconciliation identity only in the description; `TransactionService.cs` projects it as `Income`/`Expense`; repository and web analytics currently count it in ordinary totals.
- Existing transfer flow is still present at `web/src/modules/ledger/presentation/MovimientosView.tsx` inside the “Opciones” disclosure and opens `MovementTransferModal`; make it more visible rather than duplicate its backend flow.
- Test-first RED: new web regression assertions currently fail because reconciliation appears in expense/category totals and renders as “Retiro de inversión.” The repository movement projection also needs an explicit classification field; description-based inference is not acceptable.
- Relevant requirement: `docs/REQUIREMENTS.md` ACC-06 requires a reconciliation adjustment transaction; TXN-03 requires transfers between own accounts.
- Existing working tree contains unrelated user/peer modifications. Only modify a separately confirmed narrow surface and preserve all existing changes.

## Verification
- Writer RED: new adjustment regression assertions failed before implementation; implementation then passed focused web and backend tests.
- Independent verifier: web test invocation passed 239 tests across 46 files (the package script ran the full web suite); backend reconciliation integration filter passed 1/1; `git diff --check` clean.
- Source review verified signed balance effects, explicit persisted marker/projections, summary/category exclusions, edit rejection, reversal marker preservation, distinct UI labeling/filter, and visible transfer action.
- Remaining targeted coverage gap: backend positive-difference reconciliation and adjustment reversal are source-reviewed but lack direct executed regression assertions; migration shape reviewed but not applied against a database.
- No application servers, staging, commit, or real database mutations.

## Final status
- Implemented and independently verified within the existing dirty working tree; unrelated changes preserved.
- Native `gentle_review inspect` reported `rdd_disabled`; no review lineage was started. `gentle_review assess` returned `unassessable` because untracked files were undeclared and therefore requires the RDD-off independent-verifier path, which passed the targeted checks (and ran the full web suite).
- Positive-difference and reversal behavior were source-reviewed but not independently exercised by targeted tests; migration was not applied to a database.

## Commit evidence
- Pending explicit user authorization; no commit created.
