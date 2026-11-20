# Tasks: Loan Recalculation, Early Payment Policies & Live Visibility

Feature: `loan-recalculation-and-payments`
Target: Lending Module (Backend and Web)
Objective: Allow users to configure early payment policies (`AdvanceInstallments`, `ReduceInstallment`, `ReduceTerm`), preview real-time payment allocations and recalculations when entering payments (e.g. paying 100 Bs on an 89.12 Bs installment), and display live outstanding installment amounts in the loan detail schedule.

## Tasks

- [x] 1. Fix backend test clock isolation in `LoanCancellationIntegrationTests.cs` (use QuoteClock for payment date default test).
- [x] 2. Update TypeScript types in `web/src/modules/lending/domain/lending.types.ts` to include `EarlyPaymentPolicy` enum, options, and support in `CreateLoanRequest`.
- [x] 3. Add `EarlyPaymentPolicy` selector in creation modals (`CreateLoanModal.tsx`, `CreateLentLoanModal.tsx`, and `CreateDebtModal.tsx`) with professional user-friendly descriptions.
- [x] 4. Enhance `RegisterLoanPaymentModal.tsx` to fetch quotes with the entered amount, displaying real-time allocation previews (interest, principal, late fees, early principal reduction / next installment advance).
- [x] 5. Enhance `LoanDetailModal.tsx` to display the loan's early payment policy, payoff KPI, and the authoritative `TotalOutstanding` for each installment in the schedule.
- [x] 6. Run full verification suites (`dotnet test backend/`, `pnpm --dir web test`, `pnpm --dir web lint`, `pnpm --dir web build`).

## Evidence & Verification
- Backend tests: 284 Api.Tests passed (including LoanCancellationIntegrationTests), 152 Lending.Domain.Tests passed, total 0 errors.
- Dotnet format: clean, no formatting changes needed.
- Web tests: 109 test files passed, 819 unit and component tests passed (vitest).
- Web lint: clean, 0 errors.
- Web build: Next.js 15.5 production build compiled and generated all 7 static pages successfully.
