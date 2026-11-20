# Feature: Recurring Payments & Flows (Pagos y Movimientos Recurrentes)

Implementation of scheduled recurring payments and income flows based on the UI design in `docs/redesign/pagos-recurrentes.png`.

## Scope & Core Principles
- **No automatic balance deductions:** Recurring flows do not debit accounts automatically. On or after the scheduled date, payments appear in the upcoming list with the option for the user to confirm/accept them ("Aceptar pago").
- **Immutable Ledger integration:** Confirming a recurring payment registers an immutable transaction in the Ledger (`ILedgerModule`) with the chosen/default account, category, and exchange rate snapshot, advancing the recurring flow's `NextDueDate` to the next period.
- **Recurrence Lifecycle & End Conditions:**
  - `Never`: Indefinite recurring flow (e.g. Netflix, Spotify).
  - `OnDate`: Terminates when `nextDueDate > endDate` (e.g. rental contract with fixed term).
  - `AfterOccurrences`: Terminates when `completedOccurrences >= totalOccurrences` (e.g. 12 installments, fixed quota plan).
  - When completed, state transitions automatically to `Completed`.
- **Calendar Occurrences Projection:**
  - Full interactive calendar and sidebar mini-calendar project all scheduled occurrences for the active month according to their frequency and end conditions.
  - Interactive day selection shows scheduled payments with immediate "Pagar / Aceptar" actions.
- **Design alignment & shadcn standardization:**
  - Rule 18 in `AGENTS.md` enforcing shadcn component standard.
  - Exclusively shadcn components used (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `Input`, `ResponsiveDrawer`, `FormField`, `MoneyInput`, `Button`, `SegmentedControl`).
  - Dynamic category creation using `CategoryPickerField` and `CategoryCreatorView` inline.

## Tasks
- [x] Task 1: Backend Domain & Recurring Logic - Entity `RecurringPayment`, `RecurringEndType` (Never, OnDate, AfterOccurrences), `RecurringStatus` (Active, Paused, Completed), due date advancement with auto-completion, occurrence projection logic, and unit tests (`RecurringPaymentDomainTests.cs` with 19 passing tests).
- [x] Task 2: Backend Persistence & Migration - Update `RecurringPaymentConfiguration` and apply forward migration `20261103032401_AddRecurringEndConditions`.
- [x] Task 3: Backend Application Service, Ledger Linkage & Endpoints - Implement CRUD, calendar projection endpoint `GET /v1/planning/recurring/calendar`, and `ConfirmPaymentAsync` linking to `ILedgerModule`.
- [x] Task 4: Frontend CreateRecurringModal End Conditions - Integrate start date, end conditions (Nunca, Por fecha, Por cuotas) with `SegmentedControl` and shadcn `Select` & `Input`.
- [x] Task 5: Frontend Calendar Projection & Table Progress - Full calendar & mini-calendar projection for viewed month, day selection preview panel, and progress indicators in table (e.g. `Cuota 1/12` / `Hasta 15 dic 2027`).
- [x] Task 6: Full Verification & Quality Assurance - Execute backend tests (`dotnet test backend/`), frontend tests (`pnpm --dir web test`), linting (`pnpm --dir web lint`), format checks (`dotnet format backend/ --verify-no-changes`), and production build (`pnpm --dir web build`).
