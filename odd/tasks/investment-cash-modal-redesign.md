# Investment Cash Modal Redesign

## Objective
Refactor `InvestmentCashModal` in the investments module to align with the Billefy design system (`ResponsiveDrawer`, `Button`, `FormField`, `SegmentedControl`, etc.), providing a responsive drawer on mobile and an accessible dialog on desktop, while preserving all financial safeguards, locking, and exact backend contracts.

## Acceptance criteria
- Replace the raw `<div role="dialog">` with `ResponsiveDrawer`.
- Use `SegmentedControl` for Aporte (Contribution / Expense) vs Retiro (Disposal / Income) with semantically colored direction options.
- Use `Button` from `@/shared/ui/button` for actions with standard loading states.
- Style inputs and selects with the shared design system tokens and components (`FormField`, `Input`, `SelectField`).
- Maintain all accessibility attributes (`aria-label`, `role="alert"`, form ids) so tests and screen readers work seamlessly.
- Preserve double-submit prevention, locking, financial validation, and error feedback.
- All tests pass cleanly (`pnpm --dir web test`).

## Tasks
- [x] T1 — Refactor InvestmentCashModal with ResponsiveDrawer, SegmentedControl, FormField, and Button.
- [x] T2 — Adapt and verify InvestmentCashModal unit tests and views (MovimientosView and InvestmentsView).
- [x] T3 — Run verification suite (test, lint, typecheck) and commit work unit.

## Evidence
- Modal previously used raw HTML elements (`<select>`, `<input>`, `<button>`) and a fixed custom backdrop instead of `ResponsiveDrawer`.
- Reused across both `InvestmentsView` and `MovimientosView`.
- Refactored `InvestmentCashModal.tsx` to use `ResponsiveDrawer`, `Button`, `FormField`, `Input`, `SelectField`, and `SegmentedControl`.
- Added test coverage in `InvestmentCashModal.test.tsx` verifying disposal (retiro) behavior when kind is changed via `SegmentedControl`.
- Full vitest suite: 273 tests passed across 55 test files. ESLint passed with 0 errors.

## Commit evidence
- Work unit ready on feature branch `feat/mobile-web-parity`; pending user commit confirmation.
