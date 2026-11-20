# Task: Web UI Redesign — Readable Design System, Responsive Drawers & Data Charts

## Description
Redesign the Next.js web client (`web/`) for mobile and desktop, following the OpenPencil document `billefy_wallet.op` (palette: slate + blue #2563EB, emerald income, white rounded cards). Goals: readable typography (no 11px body text), consistent inputs/selects/buttons/forms, every modal replaced by a single responsive overlay (bottom drawer on mobile, centered modal on >= md), and data shown with shadcn charts (recharts) instead of plain numbers.

## Decisions (user-confirmed)
- Migrate Tailwind v3 -> v4 so existing shadcn `base-nova` components (drawer, chart, select) actually work.
- Deliver by phases, one work-unit commit per task.
- Desktop: same drawer component rendered as a centered modal.

## Constraints
- No dev servers (AGENTS.md rule 15); verify with `pnpm lint`, `pnpm test`, `pnpm build`.
- New env vars: none expected.
- Commits stage only `web/` and `odd/` paths (unrelated backend changes exist in the working tree).

## Tasks
- [x] Task 1: Foundation — Tailwind v4 migration, OpenPencil design tokens, font, readable type scale (build green)
- [x] Task 2: Overlay + form primitives — ResponsiveDrawer (bottom drawer / centered modal), Field, Input, Select, MoneyInput, SegmentedControl, Button variants
- [x] Task 3: Convert transaction/account modals (1-Tap, Register, CreateAccount, Reconcile, FxTransfer) to ResponsiveDrawer
- [x] Task 4: Convert ingestion modals (Drafts, CSV, WhatsApp, Binance, SimulateNotification, IncomeDistribution) to ResponsiveDrawer
- [x] Task 5: Convert lending/planning/recurring modals (CreateLoan, LoanDetail, LoanPayment, CreateBudget, CreateGoal, Reschedule) to ResponsiveDrawer
- [x] Task 6: Dashboard redesign + charts (cash-flow area chart, balance by currency donut, spending trend, KPI cards)
- [x] Task 7: Budgets & Goals redesign + charts (50/30/20 radial/bar, budget usage bars, goal progress radials)
- [x] Task 8: Loans, Recurring & Auth polish + charts (amortization stacked area, principal vs interest)
- [x] Task 9: Final verification (lint, tests, build) and docs/README update

## Evidence
- Baseline checkpoint: 72b6409 (user's pre-existing web changes)
- Task 1: 628269c (lint, 10 tests, build green; Tailwind 4.x; hex->tokens; Inter font)
- Task 2: 3542853 (lint clean, 21 tests, build green; verifier subagent errored, run inline)
- Task 3: 7905402 (lint clean, 35 tests, build green). Known pre-existing bug kept: 1-Tap equivalence pill treats every non-USDT account as BOB.
- Task 4: b18152c (lint clean, 41 tests, build green)
- Task 5: db707ee (lint clean, 44 tests, build green; alert() completely eliminated; Toaster mounted)
- Task 6: ebd5a95 (lint clean, 44 tests, build green; CashFlowAreaChart + CurrencyDonutChart responsive in DashboardHomeView)
- Task 7: 05b652e (lint clean, 44 tests, build green; Split503020Chart + BudgetsComparisonChart in BudgetsTabView)
- Task 8: a553966 (lint clean, 44 tests, build green; LendingOverviewChart added to LoansList)
- Task 9: eddcf0d (README updated, final verification passed: 44 tests, clean lint, production build)
