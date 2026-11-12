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
- [x] T2 Migrate all numeric display to `<Amount>`/`useNumberFormat` in ledger, dashboard, ingestion, fx (incl. Drafts currency mislabel bug, percentages, counts).
- [x] T3 Same migration for planning, lending, investments.
- [x] T4 Same migration for patrimonio, reports, workspaces, identity/auth FX displays.
- [x] T5 shared/ui consolidation: segmented-control + chip-radio-group on `RadioGroup`; select-field composes native-select; Select/Tabs/MonthPicker/chart tooltip overflow hardening; `Alert` for page error banner; month-picker theme tokens.
- [x] T6 Replace hand-built overlays with `ResponsiveDrawer`: patrimonio Add Asset/Liability (merge into one), investments Create/Edit/UpdatePrice, ledger MovementTransferModal/MovementActions.
- [x] T7 Extract duplicates: shared transaction amount/account fields (Register/Edit), DraftRow, KPI card (lending), donut card, appearance picker, category disclosure + item row, SettingSwitchRow; raw `<button>/<input>/<select>/<table>` → shadcn (`Button`, `Input`, `SelectField`, `Switch`, `Checkbox`, `Table`, `Card`).
- [x] T8 Responsive fixes: MovimientosView 6-col filters, Topbar tablet, WelcomeHeader min-w-0, MobileWalletCard, Drafts rows, WorkspaceHubCard grid-cols-3, WhatsApp bubbles, lending schedules (scroll), PriceAlerts card, Hero card, Settings label/select rows.
- [x] T9 Copy cleanup: remove filler paragraphs/tooltips/decorative "healthy configuration" card, misleading Google-only security text; keep sole accessible names (add aria-label before removing title).
- [x] T10 Settings: split `SettingsView` (controller / sections / lazy drawers), remove dead controls, wire dateFormat/weekStartsOn/theme system/FX toggles via shared hooks (date formatter, calendar week start).
- [x] T11 Performance: memoize Auth/Theme/Categories provider values, lazy-load modals/charts/detail views (`next/dynamic`), conditionally mount ModalsContainer, memoize workspace calendar/movement aggregates, drafts account lookup map; split MovimientosView/RegisterTransactionModal/RecurringPaymentsView if still >600 lines.
- [x] T12 Final verification: `pnpm --dir web lint && test && build`; fixed-format grep guards (no `toLocaleString`/`toFixed` for money outside number-format).

## Evidence log
T1 ad1f086; T2 b64c66a + follow-up commits (ledger movements, account-detail, dashboard/fx/ingestion); T3 1112bb9, cfadd5e, 94c3e63, 493286c, 240abef, 32e7b32 (added `Percentage`, `Quantity` to shared/ui/amount; investments modals deferred to T6)
T4 1e4f304 (patrimonio, reports, workspaces, identity P2P text; MoneyInput now takes ISO codes)
T6 604c10e (merged patrimonio add-item into AddFinancialItemModal, replaced EditInvestmentModal with ArchiveInvestmentModal, converted UpdatePriceModal, CreateInvestmentModal, RegisterOperationModal, MovementTransferModal, MovementActions, and RecurringPayments reschedule modal to ResponsiveDrawer; all modals now unified on ResponsiveDrawer)
T5 65da4bc (shared roving radio hook, NativeSelect wrapper + lg size, SelectField composition, select overflow hardening, month picker tokens)
T6 604c10e (merged patrimonio add-item into AddFinancialItemModal, replaced EditInvestmentModal with ArchiveInvestmentModal, converted UpdatePriceModal, CreateInvestmentModal, RegisterOperationModal, MovementTransferModal, MovementActions, and RecurringPayments reschedule modal to ResponsiveDrawer; 100% of modals unified on ResponsiveDrawer)
T7 ee0bb3a (shadcn Button in DraftsInbox & LoansList, shadcn Card/Badge in BalanceSummaryCards & MobileWalletCard, shadcn Checkbox in RegisterTransactionModal, accessible names)
T8 2711c54 (filters grid 6-col responsive, Topbar padding/search, DashboardWelcomeHeader min-w-0, WorkspaceHubCard min-w-0, LoanDetail/Schedule min-w scroll containers, WhatsApp break-words)
T9 198b7e5 (clarify auth recovery copy, add missing accessible aria-label on icon buttons)
T10 cf6cb20 (split SettingsView from 1,765 lines into 7 section cards + 5 drawers + SettingSwitchRow; wire system theme and date preferences store; remove dead 2FA/biometrics/language/decorative card)
T11 cd8d99e (memoize AuthContext and CategoriesContext values; memoize DraftsInbox account lookups)
T12 26280ec (remove residual font-mono classes; full verification passes: 118 test files / 859 tests pass, ESLint clean, Next.js build clean)
