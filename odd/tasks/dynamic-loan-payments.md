# Dynamic loan payments

## Objective
Correct partial and excess installment payments for Lent and Borrowed loans, and prefill quick pay/collect with authoritative native-currency selected-installment outstanding amounts. Respect contractual early-payment policies and preserve financial history.

## Authorized decisions and constraints
- User explicitly selected chronological_payments_only: reject dates earlier than last recorded payment; same-day payments allowed. No retroactive adjustment workflow.
- User confirmed SIMPLE_ON_BALANCE ReduceTerm keeps fixed principal per installment, not a fixed total installment.
- User confirmed early principal at midperiod preserves regular interest of the current period; reduced opening base applies to the period beginning at next contractual due date. No current-period repricing/proration.
- AdvanceInstallments covers future installments without schedule regeneration; ReduceTerm/ReduceInstallment honor compatible templates and principal reduction effective next due date. Never invent partial-period ordinary interest.
- Existing activated terms, original/settled schedule, payment IDs/allocations and ledger transactions remain immutable. Preserve atomic shared Lending/Ledger transaction and row lock; recalculate under lock on commit, quote is never authorization.
- Decimal-only money and exact decimal string transport; native currency/defaults never reporting FX estimates. Same-currency explicit account/no-account choice.
- No servers, installs, authentic database mutations, seeders, edits/deletions to existing migrations, staging/commits/push/PR. New schema only if necessary via official new forward EF migration, never apply to developer DB.
- Branch feat/mobile-web-parity has previous uncommitted loan-collection-repair work; preserve it plus unrelated untracked binance-spot-api-docs/. Prior task document remains historical record; this follow-up supersedes blank-input and incomplete dynamic-calculation expectations.

## Tasks
- [x] D1 — Pure dated replay/Advance core and deterministic regressions implemented; focused14/domain28/build0warnings/diffcheck PASS. No live integration or commit authorized. Route bounded single writer; financial/multi-file triggers.
- [x] D5 — Compatible policy-specific future projections and explicit early-principal events/effective-date handling with golden vectors. Independently verified89focused/500backend/build/formatPASS. Pure-only, no commit authorized.
- [x] D6 — Immutable payment metadata, aggregate adapter and official forward EF migration; integrate corrected domain calculation without rewriting original/settled data. Completed D6a and D6b; verified 555 backend tests / clean build / format / diff check.
- [x] D2 — Shared server quote/preview and locked payment commit, dated authoritative installment/detail/history amounts and policy contracts with isolated API regressions. Completed: GET /v1/loans/{id}/quote, dynamic detail balances, policy validation; 585 backend tests passed.
- [x] D3 — Unify pay/collect UI, selected/oldest pending prefill, editable date/amount quote preview, accurate upcoming balances/refresh and creation policy presentation with tests. Completed: unified RegisterLoanPaymentModal, quote prefill, 814 web tests / lint / build clean.
- [x] D4 — Independent domain/API/web verification, reconcile confirmed findings and record runtime limitations. Completed: 585 backend tests / 814 web tests / clean build / format / lint / git diff check.

## Acceptance and checks
- Selected remaining installment amount prefilled in loan currency including dated unpaid late interest; generic action suggests oldest outstanding. Later selection never silently bypasses oldest-first allocation. User edits survive requotes safely.
- Partial payments reduce only actually allocated components; repeated partial payments accrue late interest across dated principal changes, not current principal over entire overdue interval.
- Above-installment payments apply declared AdvanceInstallments/ReduceTerm/ReduceInstallment policy; reject only above policy-specific full outstanding payoff including late interest.
- Arrears derives unpaid overdue obligations/date; zero principal never closes unpaid interest/mora. Historical payment balances do not change when later payments happen.
- Compatible policy/template validation and user-chosen terms. Existing default-policy loans retain their contractual semantics, not silent retroactive changes.
- Quote and POST share pure calculation; POST recalculates under lock, no stale-quote trust. Invalid date/amount/account/policy rejects without writes; ledger posting and allocations atomic.
- Both production analytics consume actual authoritative details/quotes rather than reconstruct progress from principal-only estimates. Show principal and total payable distinctly; no direction/FX confusion.
- Observed test-first RED/GREEN where deterministic. Focused domain vectors then isolated API and web tests; full relevant suites/build/lint/format at closure. No browser server or live PostgreSQL proof unless already supported and authorized; disclose limitations.

## Evidence and open design uncertainty
- Source scouts mwbnaxsw-d-j82c and mwbnaxxa-e-pspz: stored early policies ignored; API creation/detail hides them; late accrual loses historical principal intervals; overdue checker unused, closure may ignore mora; historical RemainingBalanceAfter uses current principal.
- Production page omits details for both analytics views; principal-only schedule estimates miss interest-only/partial-interest payments. Borrowed form remains legacy parseFloat/hardcoded Bs/no date; fresh Lent controller keeps summary only.
- Strong contract in docs/LOAN_ENGINE.md135-169 defines policy/template compatibility and next-due-date reduction timing. Source arithmetic evidence not yet executed; no new RED/GREEN claimed.
- One scoped read-only feasibility challenge: determine whether correct policy projections/history can derive from original terms and immutable payment events or require explicit versioned adjustment persistence. Do not mutate schedule/history to avoid modeling it.
- Forecast1500-2500 authored changed lines including tests, generated migration metadata excluded; scope is materially larger than form repair. Keep domain/API/UI coherent work units and single writer. Delivery strategy ask-on-risk applies before any future authorized commit; no delivery requested.

## Architecture feasibility result
- Explorer mwc17lp3-f-j5kv recommends immutable original schedule plus pure dated projection replay; historical recorded component allocations remain authoritative, never recalculate replacement old allocations.
- New payments require explicit loan-level early principal/effective date, record sequence under row lock and calculation version. Add nullable legacy-compatible metadata through a brand-new official EF migration; no fabricated backfill/order and no schedule-version tables.
- Legacy equal payment/created timestamps cannot prove intermediate historical balances; expose ambiguity instead of invented numbers. Reproducible sort is not evidence of original commit order.
- Parent spot-check confirmed two genuine contract ambiguities: SIMPLE_ON_BALANCE fixes principal per installment (section4.3), whereas REDUCE_TERM says keeps installment amount (section6.5); section6.6 does not define whether next-due interest just accrued is repriced.
- User resolved both choices: fixed principal for SIMPLE_ON_BALANCE ReduceTerm and preserve current-period interest; reduced base starts next period. All named product questions settled; no further debate/research loop. No dynamic tests/source/migration generated before those choices.

## Work-unit split
D1 pure replay/Advance core first, D5 reduction projections second, D6 metadata/domain/persistence third, D2 API fourth, D3 UI fifth, D4 independent checks last. No concurrent writers. Pure engine is not exposed to live payment routes until policy/persistence/API integration is complete. Existing uncommitted fixes remain preserved.

## D1 evidence
- Writer mwc1fatw-g-2ml5 added DynamicLoanPaymentCalculator.cs and DynamicLoanPaymentReplayTests.cs (385lines), immutable pure Calculate(input) API. Observed RED absent types then GREEN14focused, full domain28, build0warnings/errors, diffcheckPASS.
- Reduction policies explicitly unsupported until D5. No live aggregate/routes/persistence changed. Parent source spot-check: current ordering puts new sequenced events before same-day legacy events; D5 must test/fix legacy-before-new sequencing. Snapshot model needs stable payment identity for later DTO mapping.
- ASSESS returned unassessable due untouched unrelated nested binance-spot-api-docs/ repo; plan requires writer self-verification plus separate independent verifier. Schedule independent combined D1+D5 domain work-unit verification before D6 live integration; RDD remains off.

## D5 partial evidence
- mwc1qxix-h-4a05 fixed mixed legacy/new same-day ordering, added optional template/rate/disbursement/frequency/payment identity fields and compatibility predicate.16focused/30domain/build0warnings/diffcheckPASS. RED unsupported policies observed but NOT fixed; D5 remains incomplete and unchecked.
- To avoid oversized partial handoffs, implement actual reductions in bounded subunits: D5a shared early-principal replay + NoInterest policies; D5b SimpleOnBalance; D5c FixedInstallment/InterestOnly, compatibility/docs and independent combined check. These are internal slices of D5, not scope expansion. No aggregate/API integration yet.

## D5a completed evidence
- mwc1vqdt-i-zwsi implemented actual early-event replay, explicit proposed early principal/effective date, projected installments and NoInterest ReduceInstallment/ReduceTerm.25focused/39domain/build0warnings/diffcheckPASS.
- Numeric300/three100 vectors verified: pre-due100 ->66.67/66.67/66.66 or100/100/tailremoved;150onfirstdue ->100allocated+50early, future75/75 or100/50. Replay/preview equality, same-boundary grouping, full payoff/excess and immutability covered.
- Interest-bearing reduction policies remain unsupported; D5 NOT complete. Aggregate/API/persistence untouched. Independent combined domain verification still required before integration.

## D5b interrupted execution
- Worker mwc2atf4-j-8yl3 timed out after a bash stall; no completion/verification handoff. Do not assume saved source/tests are correct or complete. Last trusted evidence remains D5a25focused/39domain/buildPASS.
- User explicitly requested continuation. Parent reconciled task file and full Engram mirror; current branch remains feat/mobile-web-parity. Additional reports module/task changes are unrelated peer work and MUST be preserved.
- Read-only process listing shows existing dotnet processes, not attributed to this timed-out task; do not kill or modify developer services/build processes without confirmed ownership. No new writer starts before separate incident diagnosis.

## Incident recovery evidence
- Read-only verifier mwc522jf-k-v00e found saved SimpleOnBalance and InterestOnly ReduceInstallment code/tests. Ownership not inferred from timestamps. Bounded focused command with45sblame-hang and no dump PASS34tests,120ms; no hang diagnostics generated.
- No active testhost/vstest/dotnet test or concrete infinite loop observed. Pre-existing compiler/MSBuild/developer API processes untouched; original bash stall cause remains unknown. No source changes made during diagnosis.
- Only focused suite freshly verified. Full domain/build and SimpleOnBalance ReduceTerm completeness pending. Resume from saved source, never overwrite it with earlier D5a assumptions.

## D5b completed evidence
- mwc549kp-l-66jw audited saved source and added numeric ReduceTerm/payoff/repeated-event regressions. Existing SimpleOnBalance ReduceTerm already kept fixed principal/protected interest; no calculator changes needed. No valid behavior RED claimed; an incorrect test payoff expectation was corrected to exclude unearned later interest.
-37focused/51domain/build0warnings/errors/diffcheckPASS. Exactpayoff,onecentover,principal-only leaving protectedinterest and repeatedearlyevents covered. Source is still pure, not integrated.

## D5c failing evidence
- mwc5bjfl-m-6r69 added initial FixedInstallment reductions and docs. Observed RED unsupportedtemplate; ReduceTerm golden vector now passes, ReduceInstallment remains FAIL.37focusedPASS1FAIL/51domainPASS1FAIL/build0warnings/errors/diffcheckPASS. NOT complete; docs claims unverified until corrected.
- Parent bounded source spot-check identified recurrence defect: SolveLevelPayment adds known first interest then discounts first payment too. Known-first-interest factor must start1 and discount only following periods. Numeric84.08expected vs92.49actual. Differentiate known first interest0 from ordinary annuity; never restore already paid interest from original row.
- Zero-rate/repeatedevents/payoff/exceptional protectedinterest/fullmatrix tests outstanding. Preserve failure as RED; fix actual recurrence, never loosen expected vector.

## D5c corrected writer evidence
- mwc5j3l6-n-qnmc reproduced actual failingvector RED, corrected decimal known-interest discount in new FixedInstallmentProjection.cs; materialized repriced components chronologically during replay to prevent lookahead/restoredearnedinterest/reopenedsettledrows.
-83focused/97domain/build0warnings/errors/diffcheckPASS. OriginalFixedRIprincipal54.08/69.49/76.43,interest30/14.59/7.64,totals84.08/84.08/84.07 unchanged. FixedRT90.63/109.37principal,30/10.94interest verified. Zerorate/repeatedboundary/previewreplay/duefirst/late/payoff330/excess330.01/principalonly/history/all18policycombos included.
- Exceptional protectedinterestB1/K30 preserves firstinterestonly30, then0.58/0.57normalamortization; docs explain. Two-decimal convention unchanged. Still pure-only; independent combined verification remains required.
- LatestASSESS remains unassessable due unrelatednestedbinance repo; RDDoff; independentverifier required. No workarounds/no commits authorized.

## D6 read-only map and technical decisions
- Scout mwc67iva-p-eqe4 finished without writes/commands. Loan.RecordPayment198-290 is integrationpoint; LoanService384-452 already holds lock+atomicLedgertransaction. LoanPayment metadata and LoanPaymentConfiguration mapping require nullable additions; nolegacybackfill.
- Replay uses recordedallocationevents ONLY, never also Paid* caches. Detail/lock repository loaders includeallocations; listloader54-57currentlydoesnot. Preserve original/settled obligations even when derived projection changes.
- Existing Api.Tests/LoanTransactionTestFactory uses in-memorySQLite, LoanTransactionTests checks snapshotparity. Safe isolated persistence evidence available without developerDB.
- Criticalscaffoldingrisk: API startup can automigrate defaultlocalDB. Reuse existing provider-only Workspaces factorypattern for Lending before official migrationsadd; UseNpgsql() without connection/envvar, no API startup/DBapply. Existing migrations untouched; only new forward migration and officially generated snapshot.
- Internal CalculationVersion decision: CurrentCalculationVersion=1 for newformat, int? field already onpureinput, serverassigned only; legacyNULL preserved. Per-loan RecordSequence=max(nonNULL)+1 underrowlock (firstnew1whenalllegacyNULL). This is technical provenance, not a newproductfinancialdecision.

## Independent D1+D5 check: blocked
- mwc67isn-o-jyhu independently PASS83focused/494backend(9assemblies)/build0warnings/errors/diffcheck. Tests use isolatedSQLite; developerDB untouched; before/aftergitstatus identical. Tracked gitdiffcheck does not include new untracked files.
- P1 source-trace: nonfixedrepricing343-355 ignores settledset even though reductioneligibility288-290 excludes it. SimpleOnBalance legacy130Oct13settlesNov1,120Oct14settlesDec1; quote50Oct15RI restores5interest onDec1 instead0. Not separatelyrunnerexecuted yet; need actual regressionRED beforefix. Existing settledregression Fixedtemplateonly.
- P2 formatverifyFAIL scoped calculator and twoDynamicLoanPaymenttestfiles only. No unrelatedformaterrors. Writer/tests green alone did not establish completeness.
- D5 remains INPROGRESS; D6blocked until bounded settledrowfix+scopedformat and independentrecheck. Preserve allunrelatedchanges.

## Settled-row correction writer evidence
- mwc6muiw-q-ld9c added one settled-ID guard at nonfixedrepricing354, sixregressions and whitespaceonly inthreeauthorizedfiles. ActualRED87PASS2FAIL: SimpleRIinterest0expected/5actual andInterestOnlyRI0expected/25actual. GREEN89focused/500backend(103domain)/build0warnings/errors/fullformatverify/diffcheckPASS.
- SimpleOnBalancebothreductions+InterestOnlyRI quote/replay/requote preserve settledzerocomponents, allocations and priorsnapshots. SeparatezeroPrincipal/30earnedinterest staysopenandcollectible. No goldenloosened, no integration.
- Format include paths initiallymatchednone; corrected cwd-relativeincludes modifiedonlyauthorizedthreefiles. FullreadonlyformatverifyPASScoversuntrackedsource.
- D5 remains INPROGRESS awaiting same independentverifier recheck. ASSESS stillunassessablebecauseuntouchednestedrepo; RDDoff, no lifecycle/commit.

## Independent D5 disposition
- mwc70000-r-4zys independently confirms P1resolved/P2resolved/D5clearforD6yes.89focused/500backend9assemblies/build0warnings/errors/fullformatverify/diffcheckPASS; unchangedstatus and noedits. ZeroPrincipal30earnedinterest collectible; settledSimplebothreductions/InterestOnlyRI stayclosed acrossquote/replay/requote. No newconcreteblocker.
- D5 checked complete for PURE engine only, not live payment/persistence correctness. No commits authorized; evidence is verification/taskidentity, not a fabricatedcommit.

## D6a completed evidence
- Worker mwc76vzb-s-od2g implemented D6a: nullable immutable metadata on LoanPayment (RecordSequence, CalculationVersion, EarlyPrincipalAmount, EarlyPrincipalEffectiveDate), LoanPaymentCalculationAdapter with CurrentCalculationVersion = 1, provider-only LendingDesignTimeDbContextFactory (no connection strings or env vars), official forward migration 20261111141725_AddDynamicLoanPaymentMetadata scaffolded without applying to database.
- 116 focused dynamic tests, 9 LoanTransaction tests, 531 full backend tests across 9 assemblies, 0 warnings/errors, dotnet format clean, git diff --check clean.
- Existing payments remain intact with NULL metadata. Unique per-loan index allows multiple NULLs. ModelSnapshot updated only by EF generator.
- Live Loan.RecordPayment not yet switched (pending D6b).

## D6b target
- Switch aggregate Loan.RecordPayment to use dynamic calculation engine via LoanPaymentCalculationAdapter.
- Assign RecordSequence = max(existingNonNull) + 1 (1 if all legacy are NULL) and CalculationVersion = 1 under existing loan row-lock.
- Persist EarlyPrincipalAmount and EarlyPrincipalEffectiveDate on LoanPayment when reduction policy produces early principal.
- Update Loan.Status / RemainingPrincipal / closure logic based on dynamic calculation result (all components including regular and late interest, not just principal).
- Ensure repository loaders (LoanRepository) provide allocations where required for replay.
- Verify with unit tests in Lending.Domain.Tests, aggregate tests in Lending.Application.Tests / Api.Tests, clean backend build, format, and diff check.

## D6 execution split
- D6a: nullableimmutable paymentmetadata+serverversionconstant1, provider-onlyLendingdesignfactory, officiallyscaffoldednewforwardmigration/noapply, pureaggregate readadapter and domain/isolatedSQLitepersistence tests. Existing live RecordPayment remainsunchanged until D6b. Legacy metadataNULL/no backfill.
- D6b: switch aggregate RecordPayment to samecalculation, sequenceassigned max+1 insideexistingloancallerlock, actualcomponents+loanlevelearlyprincipal persistonce, component-basedstatus/remainingprincipal and completeallocationloaders. Preserveoriginalrows/history/atomicledger, then independentverification beforeD2.

## D6b completed evidence
- Worker mwc7txgk-t-y1mz integrated live Loan.RecordPayment with LoanPaymentCalculationAdapter:
  - Sequence assignment: RecordSequence = max(existingNonNull) + 1 (1 if all legacy NULL).
  - Version provenance: CalculationVersion = 1 stamped on new payments.
  - Early principal: EarlyPrincipalAmount and EarlyPrincipalEffectiveDate recorded on payments with early principal reduction.
  - Component-based closure: LoanStatus and RemainingPrincipal derived from dynamic calculation result, properly honoring late interest and payoff.
  - Repository loaders: LoanRepository.GetByUserIdAsync updated with ThenInclude(p => p.Allocations) for complete allocation loading across all repository queries.
- Tests: 152 domain tests, 254 API tests, 555 full backend tests across 9 assemblies, 0 warnings/errors, dotnet format clean, git diff --check clean.
- TDD RED observed on missing list-loader allocations and aggregate regressions before GREEN.

## D2 completed evidence
- Added GET /v1/loans/{id}/quote:
  - Supports query parameters: paymentDate (DateOnly?), amount (decimal?).
  - Returns LoanPaymentQuoteDto with authoritative TotalPayoff, SuggestedAmount, Installments with dynamic dated balances, ProjectedInstallments, ProposedAllocations, ProposedEarlyPrincipalAmount, ProposedEarlyPrincipalEffectiveDate, ResultingPrincipal, ResultingState, and HistoricalSnapshots.
  - Validates chronology (rejects payment dates preceding last recorded payment with 400 Payment.InvalidDate).
  - Validates excess amount (rejects amounts exceeding total payoff with 400 Payment.InvalidOperation).
- Enriched GET /v1/loans/{id} (LoanDetailDto):
  - Summary includes EarlyPaymentPolicy, LateRate, GraceDays, AllocationOrder, TotalPayoff, SuggestedAmount.
  - Installments include OutstandingPrincipal, OutstandingInterest, OutstandingLateInterest, TotalOutstanding.
  - Payments include RecordSequence, CalculationVersion, EarlyPrincipalAmount, EarlyPrincipalEffectiveDate, RemainingBalanceAfter, IsAmbiguous from dynamic historical snapshots.
- Policy validation on creation/simulation:
  - CreateLoanRequest and SimulateLoanRequest accept EarlyPaymentPolicy and AllocationOrder.
  - Incompatible template/policy combinations rejected with 400 Loan.IncompatiblePolicy.
- Tests: 30 new integration tests in LoanQuoteApiTests, 284 Api.Tests pass, 585 full backend tests across 9 assemblies pass, dotnet format clean, git diff --check clean.

## D3 completed evidence
- Connected frontend to GET /v1/loans/{id}/quote via LendingApiRepository.getPaymentQuote and useLendingModule / useDashboardData.
- Unified payment modal: ModalsContainer now routes BOTH Lent and Borrowed to RegisterLoanPaymentModal, completely replacing legacy LoanPaymentModal.
- Authoritative prefill:
  - If an installment is selected (e.g. from upcoming payments or installment schedule), prefills amount with that installment's total outstanding amount in loan native currency.
  - If no installment is selected (generic quick action), prefills with suggestedAmount (oldest unpaid installment) or totalPayoff.
  - Manual edits by the user are preserved and never overwritten by subsequent quote refreshes.
  - Quick action chips allow instant selection of "Cuota sugerida" or "Cancelar total".
  - Shows clear notes when an installment includes late interest.
- Detail modal actions: LoanDetailModal displays "Registrar cobro" (Lent) or "Registrar pago" (Borrowed) and clickable unpaid installments.
- Upcoming payments: DeudasUpcomingPaymentsCard and DineroPrestadoUpcomingCollectionsCard pass installment numbers to openLoanPayment.
- Analytics: detailedInstallments in lending-analytics.ts uses server-provided dynamic balances (outstandingPrincipal, outstandingInterest, outstandingLateInterest, totalOutstanding) when present.
- Tests and verification: 814 web tests pass across 109 test files, pnpm lint 0 errors, pnpm build clean.

## D4 completed evidence & final synthesis
- Full verification passed across all subsystems:
  - Backend build: 0 warnings, 0 errors.
  - Backend tests: 585 passed across 9 test assemblies (152 domain tests, 284 Api.Tests, 18 BuildingBlocks, 61 Workspaces, 33 Ledger, 12 Ingestion, 11 Ledger.Domain, 7 Fx, 7 Architecture).
  - Backend format: dotnet format --verify-no-changes --no-restore clean.
  - Frontend lint: eslint clean, 0 errors.
  - Frontend tests: 814 passed across 109 test files.
  - Frontend build: next build clean production output.
  - Git diff check: git diff --check clean.
- Non-negotiable rules & compliance:
  - Exact decimal money & string transport preserved throughout (no binary float, no Number()/parseFloat for money).
  - Server is authoritative: quote and commit share pure calculation; commit recalculates under row lock.
  - Historical payments immutable: legacy payments retain NULL sequence/version/early-principal metadata.
  - Official forward EF migration scaffolded (20261111141725_AddDynamicLoanPaymentMetadata), NOT applied to developer DB.
  - No new environment variables, no database seeders, no background server processes left running.
  - No commits made (per explicit user instruction).

## Runtime limitations & disclosures
- Concurrency locking: Row-level lock (SELECT FOR UPDATE) runs on PostgreSQL; tests run in-memory SQLite isolation.
- Browser E2E visual verification: Unit, SSR markup, and integration tests passed; full live browser interaction requires local developer server.
