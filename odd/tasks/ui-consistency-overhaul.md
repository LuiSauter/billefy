# Task: Web UI Consistency Overhaul (design system, numbers, responsive, performance)

## Context & Motivation
Audit of `web/src` (4 read-only explorers: shared/app, ledger+dashboard+ingestion+fx, planning+lending+investments, identity+patrimonio+reports+workspaces+messaging) found AI-duplicated UI, hand-built overlays/controls that bypass `shared/ui`, overflow/responsive defects, filler copy, heavy client components, four conflicting number-formatting paths, and Settings controls that are saved but never consumed.

## Decisions (user, this session)
- `maximumDecimalPlaces` = **fixed** decimals (rename label to "Decimales"; no semantic change in engine).
- Settings: **wire what is viable** (dateFormat, weekStartsOn, theme "Sistema", FX toggles); **remove** language selector (app is Spanish-only), 2FA and biometrics (local-only, no backend).
- Delivery: **on current branch** `feat/mobile-web-parity`; one Conventional Commit per phase. Do NOT commit the pre-existing unrelated change `docs/openapi.json`.

## Non-goals
No backend changes, no i18n layer, no visual rebrand, no business-logic/financial calculation changes (display only; API payloads keep canonical decimal strings).

## Phases / Tasks
- [x] T1 Number foundation: reactive preferences store (`useSyncExternalStore`), single engine in `shared/lib/number-format.ts`, currency metadata, `<Amount>/<Money>` (Inter, tabular-nums, semibold, sign/tone, compact), retire `format.ts` money paths, `formatMoney` en-US, chart tooltip, `workspaceMoney`; tests.
- [ ] T2 Migrate all numeric display to `<Amount>`/`useNumberFormat` in ledger, dashboard, ingestion, fx (incl. Drafts currency mislabel bug, percentages, counts).
- [ ] T3 Same migration for planning, lending, investments.
- [ ] T4 Same migration for patrimonio, reports, workspaces, identity/auth FX displays.
- [ ] T5 shared/ui consolidation: segmented-control + chip-radio-group on `RadioGroup`; select-field composes native-select; Select/Tabs/MonthPicker/chart tooltip overflow hardening; `Alert` for page error banner; month-picker theme tokens.
- [ ] T6 Replace hand-built overlays with `ResponsiveDrawer`: patrimonio Add Asset/Liability (merge into one), investments Create/Edit/UpdatePrice, ledger MovementTransferModal/MovementActions.
- [ ] T7 Extract duplicates: shared transaction amount/account fields (Register/Edit), DraftRow, KPI card (lending), donut card, appearance picker, category disclosure + item row, SettingSwitchRow; raw `<button>/<input>/<select>/<table>` → shadcn (`Button`, `Input`, `SelectField`, `Switch`, `Checkbox`, `Table`, `Card`).
- [ ] T8 Responsive fixes: MovimientosView 6-col filters, Topbar tablet, WelcomeHeader min-w-0, MobileWalletCard, Drafts rows, WorkspaceHubCard grid-cols-3, WhatsApp bubbles, lending schedules (scroll), PriceAlerts card, Hero card, Settings label/select rows.
- [ ] T9 Copy cleanup: remove filler paragraphs/tooltips/decorative "healthy configuration" card, misleading Google-only security text; keep sole accessible names (add aria-label before removing title).
- [ ] T10 Settings: split `SettingsView` (controller / sections / lazy drawers), remove dead controls, wire dateFormat/weekStartsOn/theme system/FX toggles via shared hooks (date formatter, calendar week start).
- [ ] T11 Performance: memoize Auth/Theme/Categories provider values, lazy-load modals/charts/detail views (`next/dynamic`), conditionally mount ModalsContainer, memoize workspace calendar/movement aggregates, drafts account lookup map; split MovimientosView/RegisterTransactionModal/RecurringPaymentsView if still >600 lines.
- [ ] T12 Final verification: `pnpm --dir web lint && test && build`; fixed-format grep guards (no `toLocaleString`/`toFixed` for money outside number-format).

## Evidence log
(commit hashes recorded per task)
