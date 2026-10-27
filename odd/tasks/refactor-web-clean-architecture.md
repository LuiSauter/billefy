# Task: Refactor Web Frontend Clean Architecture (Separate UI from Logic)

## Description
Refactor the Next.js web frontend to strictly separate presentation components from business and view logic:
1. Extract modal state and handlers from `page.tsx` into a dedicated application hook `useDashboardModals.ts`.
2. Extract financial metrics calculations (bank liquidity, crypto totals, net loans, daily safe rhythm, goal progress) into dedicated application view model selectors (`useBalanceMetrics.ts`, `useBudgetMetrics.ts`).
3. Decompose `page.tsx` tab bodies into dedicated view containers (`DashboardHomeView.tsx`, `AccountsTabContent.tsx`, `LoansTabContent.tsx`, `BudgetsTabContent.tsx`, `RecurringTabContent.tsx`).
4. Centralize all 15 modals into a clean `ModalsContainer.tsx` component.
5. Reduce `page.tsx` to an ultra-thin (<80 lines) declarative orchestrator.

## Tasks
- [ ] Task 1: Create application hooks for modal management and view model calculations
- [ ] Task 2: Refactor presentation cards to accept pure view model props (dumb UI)
- [ ] Task 3: Create dedicated tab view containers under `presentation/views/`
- [ ] Task 4: Create `ModalsContainer.tsx` to encapsulate all modal wiring
- [ ] Task 5: Streamline `web/src/app/page.tsx` into an ultra-clean orchestrator
- [ ] Task 6: Verification (vitest, ESLint, production build)
