# Income distribution and spending budgets

## Outcome
Implemented complementary backend/web features: optional income allocation plans and independent category spending caps. User approved keeping both and showing savings/investment targets without contribution tracking. Implementation and automated verification completed; browser acceptance remains pending.

## Decisions and acceptance
- Enabled plans require 2–8 named groups, positive decimal percentages totaling exactly 100. Disabled drafts remain editable.
- Assigned expense categories must exist, belong to the current user, and be unique across groups (including alternate GUID formats).
- Explicit trackingMode is Expenses or TargetOnly. Omitted legacy mode defaults Expenses; names never infer purpose. TargetOnly cannot have expense categories and shows an allocation only, never spending/progress/completion.
- Settings activation validates and routes incomplete plans to editable configuration without silently creating a preset.
- Transfers do not count as plan income/spending or backend budget spending; individual account balance movements remain intact.
- Budgets show category names or a clear unavailable fallback, not UUIDs. UI explains allocation versus spending caps.
- Serialized/coalescing saves prevent earlier PUTs from overwriting later activation; failed saves preserve local edits and do not poison the queue. Scope is one live hook instance, not multiple tabs.
- Existing plans/budgets preserved, including unchanged disabled legacy JSON. No schema changes or migrations.

## Tasks
- [x] T1: Backend plan invariants/category ownership and direction checks, with regression tests.
- [x] T2: Align web plan/budget behavior and focused tests.
  - [x] T2a: Transfer-safe decimal flow/category helpers; keep account movement semantics.
  - [x] T2b: Additive JSON/API trackingMode support and generated OpenAPI documentation.
  - [x] T2c: Explicit mode selectors/presets, target-only rendering, enabled-plan validation and safe persistence.
  - [x] T2d: Budget category labels, explanatory copy and transfer-safe backend expense totals.
- [x] T3: Independent automated verification and documented limitations; correct API test isolation without weakening production limits.

## Verification evidence
- T1 test-first: RED21 failures then GREEN36; category metadata correction RED7 then GREEN46. Independent acceptance after direction fix.
- T2a test-first RED7 then GREEN55 total web tests; independent acceptance.
- T2b test-first RED15 then GREEN61 focused backend tests; exporter1/1 passed and regenerated docs/openapi.json. Independent acceptance.
- T2c test-first RED20 then GREEN76 web tests; independent review found overlapping-save race. Persistence correction observed RED4 concurrency failures then final GREEN88, including7 deferred-promise tests.
- T2d RED6 backend and4 web failures, then GREEN57 focused backend and81 web; independent budget acceptance.
- Final web independently verified: pnpm --dir web test (88/88 across11 files), lint and build pass.
- Final backend independently verified: dotnet test backend/ --filter 'FullyQualifiedName!~Api.Tests.ApiIntegrationTests.OpenApi_ShouldExposeValidSpecification' passes145/145 (API86, other projects59); dotnet build backend/ passes with0warnings/0errors.
- Initial full backend run had141pass/4fail429; exact four tests passed isolated. ApiIntegrationTests.cs now owns factory/client per xUnit instance and disposes client before factory (14 incremental lines). Full145-test pass reproduced independently. Production Program.cs limiter unchanged.
- Parent structural spot checks read validation service and persistence coordinator; git diff --check rerun clean. Independent diff checks also clean.
- Native ASSESS unavailable because untracked paths require declaration; conservative independent verification performed. RDD mode confirmed off; no native review started.

## Delivery and preserved work
Baseline d230891/1256748 on feat/web-ui-redesign-drawers-charts. No commits, staging, push or PR: user has not requested commits. Work units remain uncommitted; no commit identity claimed. Scope was split into reviewable units (T1~343lines, T2a247, T2b155+5generated, T2c294 plus persistence correction<300, T2d194, fixture14), not treated as one small PR. Final feature approximately19paths/~1485changed lines; slice before delivery.
Unrelated external edits to Topbar.tsx and the page.tsx width hunk were preserved. No mobile work, installs, servers, real database changes or migration edits.

## Remaining checks and known limitations
- Browser interactions and mounted-hook integration not exercised; UI verified through static rendering/source structure, domain tests and controlled async coordinator tests. Human should test Settings → configure → activate → reload.
- OpenAPI exporter excluded from final full suite because it writes tracked output; it passed during T2b generation.
- Backend monthly metrics still cap repository reads at100rows, mix currencies without conversion, and have pre-existing reversed-transfer identity limitations. Follow-up work required; no claim of globally correct financial analytics.
- No database migration application/state check performed; this change requires no new migration.

## Next step
Human browser acceptance, then review/slice uncommitted work if delivery is requested. Treat metrics pagination/currency/reversal issues as separate follow-ups.
