# Safe cancellation of unpaid loans and debts

## Objective and authorization
Implement user-approved cancellation of active loans/debts without payments, retaining history and reversing only an exactly linked disbursement. User explicitly accepted that legacy linked loans without an authoritative transaction link remain blocked. No physical deletion, condonation, payment reversal, publishing, or commits are authorized.

## Constraints and decisions
- Preserve all pre-existing working-tree changes, including Ledger contracts/implementation, shared API tests, OpenAPI and web page/dashboard wiring.
- No servers, local database mutations, manual schema changes, seeds, or edits to existing migrations. Generate new forward EF migrations only; do not apply to the developer database.
- New disbursements must persist their exact transaction ID. Loans without a disbursement account need no reversal. Never infer legacy linkage from a truncated reference.
- Cancellation plus reversal must commit atomically. Serialize payment and cancellation on the same loan; retries must not produce duplicate reversals.
- Modules communicate through contracts. Put cross-module infrastructure composition in API, not BuildingBlocks.
- UI follows existing Spanish copy and confirmation conventions. Explain paid/legacy/state restrictions clearly.
- RDD is off by global setting. Run native read-only ASSESS after each writer return; obey its verification plan.
- Shared-worktree branch is now feat/mobile-web-parity (mobile peer switched it). Verified HEAD and both feature refs equal d230891973ec2a954b03251a443616f25d68240d; index empty. No base drift. Do not switch branches, stage, commit, reset, or discard changes. Commit evidence remains not authorized.

## Tasks and routing
- [ ] T1 — Persist authoritative disbursement linkage and establish an atomic Lending/Ledger transaction boundary, with forward migration and focused tests. **Implementation and SQLite verification complete; remains unchecked pending T4 PostgreSQL proof.** Route: gentle-ai-worker; multi-file and financial-concurrency triggers.
- [ ] T2 — Implement owner-scoped, retry-safe cancellation API and ledger reversal, no-payment/state/legacy guards, payment serialization and regression tests. **Implemented; independent backend verification in progress.** Route: gentle-ai-worker; multi-module financial behavior.
- [ ] T3 — Add confirmation/action and refresh wiring in web; cover error/success behavior, document limitations, and complete proportionate independent checks. **In progress.** Route: gentle-ai-worker, then assessment-directed gentle-ai-verify.

- [ ] T4 — Final independent verification including isolated PostgreSQL enlistment, restoration and concurrency checks. Docker unavailable in last check; do not claim production readiness without provider evidence. Route: gentle-ai-worker for test fixture, gentle-ai-verify for independent checks.

- [x] B1 — Independently verify T1 and diagnose current compile/test blockers without changing unrelated work. **Completed:** independent build and SQLite/API recheck pass; Docker daemon availability checked and unavailable. Route: gentle-ai-verify; native ASSESS unassessable defaults to high risk.

## Acceptance criteria
- Active unpaid loans with no linked account cancel without creating money movements.
- Exactly linked unpaid disbursements reverse once, restoring the derived account balance and preserving original transactions/installments.
- Payments, unsupported states, ambiguous legacy linkage, and other users' loans cannot be cancelled.
- Repeated requests are stable; concurrent payments/cancellations cannot leave inconsistent money or loan state.
- Failed reversal/cancellation rolls back both modules; production-provider transaction behavior is checked in an isolated disposable database if available, never the local developer DB.
- UI confirms consequences, blocks duplicate submissions and refreshes loans/accounts/ledger/planning after success.

## Verification plan
Test-first where deterministic: observe RED then GREEN for domain/API/UI behavior. Use new lending-specific test files rather than editing dirty shared tests when possible. Run focused tests per task; backend build/test and web test/lint/build at closure. Report unavailable PostgreSQL/container/browser checks honestly. Existing baseline failures must be established, not assumed.

## Evidence and progress
- Read-only exploration confirmed separate EF contexts, discarded disbursement transaction ID, ignored DraftId, non-idempotent ledger reversal, and no observed loan row locking.
- T1 worker added exact disbursement/reversal IDs, atomic creation transaction port/composition, and forward EF migration 20261031213217_AddLoanDisbursementTransactionLink (generated with dotnet ef migrations add --no-build; not applied).
- Observed worker RED: linkage tests failed to compile before method existed. GREEN: Lending.Domain.Tests passed 10/10.
- API transaction tests authored but compilation failed in changing unrelated Ledger/Planning/LendingModule surfaces; current errors require independent reproduction. Backend build did not pass.
- PostgreSQL atomicity is unverified. Coordinator rejects separate SQLite connections; independent verifier must check compatibility with existing API test factory and original loan creation tests.
- ASSESS returned risk unassessable because intended untracked scope is undeclared; plan requires separate independent verifier. No native review started (RDD off).
- Approximate T1 diff 1,000 lines including generated EF metadata: larger than heuristic; retained complete tests and migration metadata rather than trimming.
- Goals/health peer RELEASED overlapping backend Ledger surfaces after its writer returned; preserve new additive currency-health methods when implementing T2. Peer next writer is web-only. This feature reserves CustomWebApplicationFactory setup/disposal during T1 correction; preserve peer's updated Planning fixtures. This feature owns docs/openapi.json regeneration after T2 endpoint stabilizes; peer will hold writing OpenAPI tests. Generated output must retain all current API changes.
- No commit authorized or created.

## Latest independent evidence
- Domain 10/10 PASS; backend build PASS, zero warnings/errors; filtered LoanTransaction SQLite tests 2/2 PASS.
- Full API suite FAIL: 110/112 pass. Loan lifecycle expected 201 but got 500 (ApiIntegrationTests.cs:618); Planning monthly-contribution assertion fails at :713, not diagnosed and not assumed pre-existing.
- Current CustomWebApplicationFactory uses separate in-memory Ledger and Lending connections. Raw marker-row tests use a shared SQLite connection and do not cover tracked entities, original API creation, restored connections, or Npgsql.
- T1 remains incomplete. Scope of immediate repair: reproduce exact loan endpoint error, preserve atomicity, make test infrastructure reflect one physical database, add real EF/API rollback coverage, and verify migration/model consistency. Do not fix unrelated Planning behavior.

- Branch incident diagnosed read-only; mobile peer owns only mobile paths, not backend. Writer paused safely after reproducing loan-create 500 and changing test factory connection setup, before testing. Temporary diagnostics removed. Resume same correction with no scope expansion.

- Peer independently isolated LoanLifecycle failure to coordinator precondition: 'requires closed connections without active transactions' on creation. Exact trace forwarded to current T1 correction writer. Peer requests stable-loan notice before its final backend checks.

## T1 repair evidence (supersedes prior failing runs)
- Worker observed original loan-create 500 due to coordinator rejecting separate open SQLite in-memory connections, which represented separate databases. Factory now shares Ledger connection with Lending; EF creates both model tables in isolated test DB only. No atomicity bypass added.
- Domain 10/10, backend build 0 warnings/errors, loan/transaction 5/5, full API suite 114/114 PASS. Prior Planning assertion no longer fails.
- Real EF tracked entity commit/rollback, exact HTTP-created disbursement linkage, connection usability after success/failure and migration-model equivalence now covered.
- Official EF pending-model command with blank connection setting could not construct context; test-level model differ passed instead. Migration remains unchanged/unapplied.
- ASSESS again unassessable due untracked declaration; separate independent verification required.
- Parent notified goals/health peer: factory released, all API tests passing, no OpenAPI regeneration yet. Docker and local PostgreSQL binaries are installed; no service started and no developer DB accessed.

## Latest independent recheck and blocker
- Independent verifier confirmed backend build PASS 0 warnings/errors, Loan* 5/5 PASS, full API 114/114 PASS. A transient MSB3026 manifest-lock retry during test build completed successfully.
- Docker binary exists but daemon is not running. No services started. No Testcontainers package/harness currently exists. Npgsql separate-connection enlistment, ownership restoration and same-context retry after rollback remain unproven.
- Goals/health peer verifier finished and explicitly released Ledger writes. Its full backend check excluding writing OpenAPI test passed 174 total tests; its 113 API count excludes OpenAPI versus this feature's 114.
- Peer now has commit request for its goals/health/planning scope; this feature has NO separate commit authorization, no active source writer, no staging/commits, and no OpenAPI regeneration yet. Peer must not include cancellation-specific hunks.
- Cross-orchestrator send was denied by user; do not retry or bypass that channel. Report necessary coordination state in ordinary conversation only.

## Continuation decision
User explicitly requested finishing the debts feature. Docker was rechecked and is still unavailable. Proceed with T2 and T3 implementation plus deterministic SQLite/UI checks; move provider-specific proof to final T4 rather than blocking all remaining coding. This does not waive PostgreSQL validation or assert production readiness; T1 remains unchecked until that proof. Do not start services or access developer database.

## T2 backend implementation evidence
- POST /v1/loans/{id}/cancel implemented, owner-scoped, Active/no-payments only. Atomic validated inverse and cancellation with stored reversal ID; repeated cancellation stable. Domain/schedule/history preserved.
- Summary/detail summary now includes cancellationEligibility {canCancel, reasonCode}; result {status, reversalTransactionId}. Conflicts: Loan.HasPayments, Loan.LegacyDisbursementUnlinked, Loan.InvalidStatus, Loan.InvalidDisbursementLink, Loan.DisbursementMismatch, Loan.DisbursementAlreadyReversed. Missing linked transaction: Loan.DisbursementNotFound.
- Both payment and cancellation acquire PostgreSQL loan row lock before authoritative state load. Ledger original validates owner/account/currency/principal/direction. Generic duplicate reversals rejected; unique filtered reverses_id index new forward migration20261031223943_AddUniqueTransactionReversalPerOriginal, generated officially and NOT applied.
- Worker RED missing Cancel overload -> GREEN domain13/13; focusedAPI17/17; build0 warnings/errors; API125/125 excluding OpenAPI-writing test. Tests cover no-account, Lent/Borrowed, retry, payments/legacy, owner, mismatch, duplicate inverse, rollback/retry and debt aggregation.
- Migration fails closed if historical duplicate reverses_id exists; no old rows modified. Approx1.5k additions/180deletions including generated metadata, tests and existing shared changes, larger than heuristic without code-golf.
- Backend README updated. OpenAPI deliberately NOT regenerated. ASSESS unassessable again; separate backend verifier launched. Provider-specific concurrency/enlistment/restoration still pending T4.

## Next step
Run backend independent verifier while one T3 writer implements web-only action/confirmation/refresh and UI tests. Hold OpenAPI-writing test until backend verifier settles, then one coordinated regeneration. Final T4 provider checks remain honest/unwaived.
