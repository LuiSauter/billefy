# Feature: Rediseño Integral de Deudas y Dinero Prestado

Implementación completa, funcional y desacoplada de los dos flujos de crédito según los diseños aprobados:
1. **Mis Deudas (Pasivos / Lo que debo a bancos y terceros)**: `docs/redesign/deudas.png` y `docs/redesign/deuda.png`.
2. **Dinero Prestado (Activos / Lo que presté a otras personas)**: `docs/redesign/dinero-que-preste.png` y `docs/redesign/prestado.png`.

## Scope & Core Principles
- **Distinción contable estricta:**
  - `LoanType.Borrowed`: Pasivo. Usuario es deudor. Egresos mensuales por cuotas. Métricas: Deuda total, pago mensual, interés promedio ponderado, Ratio Deuda/Ingreso (DTI), Prioridad de pago (método avalancha) y Proyección de amortización descendente a 12 meses.
  - `LoanType.Lent`: Activo (Cuentas por cobrar). Usuario es acreedor. Ingresos periódicos por cobros. Métricas: Total prestado, total cobrado, saldo por cobrar, salud de préstamos (al día, atrasado, parcial), próximos cobros y seguimiento de deudores.
- **Acuerdos flexibles:**
  - Préstamos otorgados con opción `Sin interés (0%)` o `Con interés`.
  - Plan de pagos automático (amortización francesa/fija o alemana) o registro manual.
- **Simulación en tiempo real:**
  - En los formularios de creación, consultar `POST /v1/loans/simulate` para proyectar el calendario exacto de cuotas con tipos monetarios exactos (`decimal`).
- **Design System y Componentes shadcn (Regla 18 de AGENTS.md):**
  - Uso estricto de componentes `@/shared/ui/*` (`ResponsiveDrawer`, `FormField`, `MoneyInput`, `Input`, `Button`, `SegmentedControl`, `SelectField`, etc.).
- **Navegación clara:**
  - Dos accesos directos en el menú lateral: `Deudas y préstamos` (`deudas`) y `Dinero prestado` (`prestado`), eliminando cualquier ambigüedad para el usuario.
- **Registro y cobro de pagos:**
  - Modal para registrar pagos a deudas o cobros de dinero prestado consumiendo `POST /v1/loans/{id}/payments`.

## Tasks
- [x] Task 1: Domain Analytics & Calculation Engine - Implement `lending-analytics.ts` with pure unit tests: DTI calculation, weighted interest rate, debt avalanche priority ranking, 12-month amortization projection, collection analytics, and health status mapping.
- [x] Task 2: "Mis Deudas" View & Components (`docs/redesign/deudas.png`) - Build `DeudasView.tsx` with header, 4 KPI cards (Deuda total, Pago mensual, Interés promedio, Ratio DTI con badge), tabla "Mis deudas" con filtros y estados, "Distribución de deudas" (donut), "Proyección de pago" (área), "Próximos pagos", "Prioridad de pago" y banner de "Insights y recomendaciones".
- [x] Task 3: "Crear Deuda" Drawer/Modal (`docs/redesign/deuda.png`) - Build `CreateDebtModal.tsx` with debt category chips (Personal, Hipoteca, Vehicular, Tarjeta), creditor, associated account, currency, initial & current amount, annual rate, start/due dates, live simulation panel, impact on DTI, and quick templates.
- [x] Task 4: "Dinero Prestado" View & Components (`docs/redesign/dinero-que-preste.png`) - Build `DineroPrestadoView.tsx` with 5 top KPI cards (Total prestado, Total cobrado %, Por cobrar %, Préstamos activos, Finalizados), gráfico de evolución de cobros, donut de estado de salud, lista de próximos cobros, tabla "Mis préstamos" con barras de progreso y filtros (Todos, Activos, Finalizados, Con atraso).
- [x] Task 5: "Registrar Préstamo Otorgado" Modal (`docs/redesign/prestado.png`) & Payment Modal - Build `CreateLentLoanModal.tsx` supporting interest/no-interest agreements, contact person/relationship, auto-schedule vs manual, live payment calendar table, and `RegisterPaymentModal.tsx` for registering payments/collections.
- [x] Task 6: Navigation, Wiring, Unit Tests & Full Suite Verification - Integrate both views into `Sidebar.tsx`, `page.tsx`, `useLendingModule.ts`, write comprehensive Vitest tests, run linter (`pnpm --dir web lint`), test suite (`pnpm --dir web test`), and Next.js build (`pnpm --dir web build`).
