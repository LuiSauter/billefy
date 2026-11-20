# Loan collection repair

## Current outcome
Implementation and automated/structural verification completed. All four tasks complete within their stated scope; runtime PostgreSQL/Npgsql and browser visual validation remain explicitly unverified. No commits, staging, push, PR, migrations, servers or authentic database mutations performed.

- Backend independent suite407tests PASS, build0warnings/errors, touched-file formatverify PASS.
- Web final writer suite109files788tests PASS, lint/build PASS; independent full785tests/lint/build before final decimal fix and targeted26tests recheck after it PASS. Parent updated form25tests PASS.
- Exact-decimal transport finding independently resolved. Final git diff check PASS. Source+tests authored scope705diff lines (526tracked +179new test lines), excluding this progress document/generated files. Delivery remains uncommitted; backend and web are coherent future work units.

## Objective
Restore safe, understandable collections in Dinero prestado, from loan detail, list and upcoming collections, and correct POST /v1/loans/{id}/payments failures without changing authentic financial data.

## Scope and constraints
- Backend lending payment processing and web lending collection flow only; preserve debt/cancellation behavior and unrelated work.
- Immutable ledger, decimal money, native loan currency, owner checks, atomic loan/ledger persistence, no implicit FX.
- No application servers, developer database access/inserts, schema manipulation, existing migration edits, installs, push or PR.
- User authorized corrections, not commits; no staging or commits without explicit request (delivery pending).
- Existing branch feat/mobile-web-parity; initial tracked tree clean; unrelated untracked binance-spot-api-docs/ excluded.
- Related completed redesign and unfinished safe-loan-cancellation task documents remain untouched.

## Tasks
- [x] T1 — Backend payment date/validation repair and regression coverage implemented; writer checks PASS. Route: delegated worker plus focused continuation, financial/multi-file triggers. Commit pending explicit authorization; production PostgreSQL proof not claimed.
- [x] T2 — Collection form stabilized with explicit destination, received amount/date, Decimal validation and 23 passing regression tests. No commit authorized. Route: same delegated writer in smaller bounded follow-up; multi-file trigger.
- [x] T4 — Unified entry points, fresh detail/context/loading/retry, deliberate summary loan choice, guarded detail/history refresh and saved-versus-refresh distinction implemented and tested. No commit authorized. Route: sequential delegated writer; multi-file trigger. Split from T2 after partial handoff, no scope expansion.
- [x] T3 — Independent automated/structural backend/web verification completed, exact-decimal finding corrected and rechecked, limitations recorded. No commit authorized. Route: gentle-ai-verify after native read-only ASSESS; verification trigger.

## Acceptance and checks
- Valid account-linked collections persist atomically and allocate oldest installments according to existing engine; no account movement without a deliberate choice.
- Invalid amount, excess payment, invalid account/currency/ownership return actionable client errors, not Payment.Failed 500; rollback leaves ledger and allocations unchanged.
- Detail and upcoming collections use one form with fresh native-currency context; displayed estimated/converted upcoming money never silently becomes payment input.
- Explain oldest-first allocation, allow partial collections, never claim remaining principal is payoff or predict principal by subtracting full payment.
- Local calendar date, accessible validation, submit lock, no legacy form fallback for lent collections.
- Successful POST remains successful even if subsequent read refresh fails; refresh loan detail, summaries, ledger/planning with truthful warning.
- Test-first where deterministic runnable tests apply: observed RED then GREEN. Focused backend/API and web tests, builds, lint; no browser server started. Full applicable suites at closure where feasible; report unavailable checks.

## Evidence and decisions
- UI scout mwbkfc6j-2-pqun: RegisterLoanPaymentModal defaults full remaining principal; upcoming passes only loan ID; detail has no collection CTA; summary refresh rejection can disguise committed payment as failure. Upcoming amounts can be estimated and converted reporting currency; never reuse as authoritative received amount.
- Allocation is oldest-first, mora then interest then principal; payment API has no installment-target field. Preserve allocation policy and treat selected installment only as context.
- GOV.UK check-answers and W3C form validation guidance support reviewable amount/date/account and accessible actionable errors; apply inside existing shadcn/domain drawer, not a new wizard.
- Backend scout mwbkfbyu-1-84c5: date-only JSON becomes unspecified DateTime, passed to PostgreSQL timestamptz in Ledger and Lending; strongest inferred 500 cause, no production exception chain available. Coordinator already atomically enlists contexts. Generic Ledger posting ignores loan currency/archived accounts and domain accepts unallocated overpayment; fix before writes.
- Forecast: two coherent backend/web work units, approximately 600–1000 authored changed lines including regression tests; generated files excluded. Keep fixes scoped; delivery strategy ask-on-risk applies before a future authorized commit, not a current push/PR. No delivery operation requested.

## Verification
- T1 writer mwbkkn7o-3-chef returned PARTIAL: UTC normalization, typed validated Ledger posting, overpayment guard and one new domain test implemented. Observed overpayment RED then GREEN; API Loan tests 17/17, Lending domain 14/14, backend build zero warnings/errors, diff check passed.
- T1 completion mwbkrc3e-4-a42o: isolated raw date-only/account HTTP and omitted/UTC/offset tests, precision/note/account rejections, account-linked overpayment rollback and valid retry now covered. Unexpected traces log type/category/trace only. Backend README documents dates. Loan API25/25, domain14/14, build0 warnings/errors, diffcheck PASS. This supersedes partial missing-coverage entry above.
- Native ASSESS returned unassessable: unrelated pre-existing binance-spot-api-docs/ is a nested Git repository and cannot enter candidate. Do not move/ignore/alter it just to assess. Plan explicitly requires writer self-verification plus independent verifier (treat high risk).
- RDD rendered off; no native review started. No production PostgreSQL reproduction or browser validation claimed.

## T2 partial evidence
- mwbkznmz-5-pi3b removed principal amount prefill/false estimate, local-date default and implicit destination, and added an UNWIRED detail CTA.
- Observed RED2 tests against old defaults; current suite FAILS5 payment-modal tests (761 pass); lint/build/diffcheck PASS. This is not complete or deliverable.
- Missing context/fresh-detail/entry-point/refresh behavior split into T4 to keep writer bounded; fix form tests in T2 first, then T4 wiring. ASSESS remains unassessable and requires independent verifier. No server/browser checks performed.

## T2 completed evidence
- Follow-up mwbl7cg1-6-3a9r supersedes prior FAIL5: form23/23, full web104files769tests, lint and diffcheck PASS. Tests cover deliberate account/amount, no-account6/account currency decimals, bounds, invalid date/note, local-date boundary, lock/error/reset/races.
- AccountDto has no archive flag; server typed posting remains authoritative on archive validation. No browser checks performed.
- T4 still pending implementation: CTA exists but is not yet wired; do not report module complete.

## T4 partial evidence
- mwbld5pn-7-l11p wired detail/list/upcoming/summary and fetched authoritative summaries; passing focused191/full769/lint/build/diffcheck. Missing dedicated integration tests and selected detail/history refresh, so T4 remains unchecked.
- TDD deviation: writer did not add new integration/hook tests before source implementation; only existing summary assertions failed afterward. Do not describe this as test-first. Follow-up must add real regression coverage; prove new uncovered bugs with RED where applicable.
- Parent spot check found loading/error uses ad-hoc fixed div/native button instead of existing ResponsiveDrawer/Button and lacks close. Potential stale response when opening empty selection, and post-save refresh swallowing/synchronous-throw cases need tests. Same writer will finish bounded corrections/tests before independent verification.

## T4 completion evidence
- Follow-up mwbln3lv-8-y8ry supersedes missing tests/refresh: real RED for synchronous post-save refresh throw and empty-target stale result, then GREEN. Added hook/CTA/container/view regressions for retry, close/switch races, saved refresh failure vs POST failure, borrowed ID route, installment/native-currency context and explicit selection.
- Dismissible loading/error now ResponsiveDrawer/Button; matching detail/history refreshed without reopening, replay or stale overwrite. Focused15files207tests, full108files785tests, lint/build/diffcheck PASS.
- Native ASSESS still unassessable because unrelated nested untracked repo; follow exact high-risk verification plan. RDD off, no native lifecycle started.

## T3 in-progress evidence
- Parent independently reran pnpm --dir web exec vitest run src/modules/lending/presentation/modals/RegisterLoanPaymentModal.test.tsx: PASS23/23 (2026-11-11 local run).
- Independent backend verifier mwbm2r0o-9-tekp and web verifier mwbm2r4w-a-g1pu running read-only. No source writer active; no staging/commit.
- Git status confirms only scoped changes plus original unrelated binance-spot-api-docs/; task file and new tests are untracked and intentionally preserved.

## T3 independent web evidence
- Verifier mwbm2r4w-a-g1pu independently PASS:785tests, lint, production build, diffcheck. No browser validation.
- Medium finding: collection still calls Decimal.toNumber before transport; project prohibits binary-floating money and supported numeric20,6 bounds exceed safe JS precision. No persisted corruption reproduced; conversion was inherited from prior implementation, but normalize this scoped collection transport rather than broaden other modules.
- T3 includes bounded decimal-transport correction + tests and independent recheck. Backend verifier still running; backend source/tests stay stable until its completion.

## T3 independent backend evidence
- mwbm2r0o-9-tekp independently PASS407tests across9reported assemblies with filter FullyQualifiedName!~OpenApi&FullyQualifiedName!~OpenAPI, backend build0warnings/errors, touched-file dotnet format verify and diffcheck.
- Quoted decimal compatibility confirmed by existing Api/Program.cs48-56 AllowReadingFromString and LendingDtos decimal Amount. No backend contract change needed for exact string transport; existing numeric requests remain compatible.
- PostgreSQL/Npgsql runtime remains unverified. OpenAPI-writing test intentionally excluded; endpoint schema unchanged, no generated file updated.

## Exact-decimal correction evidence
- Writer mwbm73lu-b-06kz completed: normalized Decimal strings preserve exact amount through repository JSON, string|number request union keeps old numeric callers valid. Observed RED:99999999999999.999999 arrived as100000000000000; then GREEN. New amount/repository normalization/serialization regressions.
- Form25/25, full109files788tests, lint/build/diffcheck PASS. Backend unchanged and existing explicit quoted-decimal config verified. Native ASSESS remains unavailable; independent correction recheck required.

## Final verification and limits
- mwbmczm8-c-ki2x independently rechecked exact amount input→onSubmit→repository→JSON and legacy numeric compatibility:26tests across2files PASS, diffcheck PASS, original transport finding RESOLVED.
- Parent reran updated form25tests PASS and final git diffcheck PASS. No pending automated failures. Earlier partial/failing runs are superseded by green completion evidence; initial T4 integration was not test-first and remains recorded honestly above.
- Not run: browser visual/live interactions and PostgreSQL/Npgsql persistence. The supplied production500 cause remains inferred from non-UTC date handling, not correlated to actual server exception logs. Isolated raw JSON tests and normalization support the correction but are not live-provider proof.
- OpenAPI-writing test deliberately excluded (no endpoint/schema change); native assessment unavailable due untouched unrelated nested Git repository, so independent high-risk verification performed. RDD switch off; no native review invoked or approval claimed.
- All edits remain in current worktree, including new tests/task document as untracked files. Original binance-spot-api-docs/ unchanged. No commit because explicit user authorization was absent.

## Next step
Developer reloads web/restarts backend to use changes and performs authentic runtime/browser validation. Check loan history before retrying any previously attempted collection. Commit/publish only on explicit request.
