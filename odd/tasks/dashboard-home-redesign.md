# Feature: Rediseño Integral de la Pantalla Principal (Dashboard Home)

Implementación completa, funcional y desacoplada del Dashboard Principal según el diseño en `docs/redesign/dashboard.png`.

## Scope & Core Principles
- **Síntesis integral de salud financiera:**
  - Consume datos auténticos del Libro Mayor (`Ledger`), Préstamos y Deudas (`Lending`), Inversiones (`Investments`), Patrimonio (`Patrimonio`) y Presupuestos (`Planning`).
  - Cero datos ficticios; calcula montos con aritmética exacta (`Decimal.js`) y conversión multi-moneda (`BOB` / `USD` con tasa P2P).
- **Cabecera de bienvenida:**
  - Saludo dinámico al usuario ("Hola, {nombre} 👋"), subtítulo de salud financiera, selector de mes, indicador de notificaciones y acceso a configuración.
- **Tarjetas KPI Superiores (4 tarjetas):**
  - **Patrimonio Neto (Hero Card):** Fondo degradado púrpura, badge de variación porcentual vs. mes anterior (`+8.4%`), onda SVG decorativa y tooltip informativo.
  - **Activos:** Total de activos con badge de crecimiento (`+9.7%`).
  - **Pasivos:** Total de deudas y compromisos con badge de variación (`-1.9%`).
  - **Saldo total en cuentas:** Monto líquido consolidado disponible en bancos y wallets.
- **Grilla Central (3 columnas):**
  - **Mis cuentas:** Listado de cuentas con saldo, iconos y accesos a vincular cuenta y ver todas.
  - **Flujo del mes:** Resumen de Ingresos, Gastos y Ahorro/Inversión con gráfico de barras vertical comparativo.
  - **Gastos por categoría:** Gráfico de donut con total en el centro y desglose de categorías con montos y porcentajes.
  - **Distribución recomendada (50/30/20):** Barra segmentada tricolor y desglose de Necesidades (50%), Estilo de vida (30%) y Ahorro e inversión (20%).
  - **Mis activos (patrimonio):** Resumen de inmuebles, activos digitales, inversiones y vehículos con botón para agregar.
- **Grilla Inferior (3 columnas):**
  - **Evolución del patrimonio neto:** Gráfico de área/línea de los últimos 6 meses con selector temporal y tooltip interactivo.
  - **Principales inversiones:** Tarjeta de rendimiento de activos de inversión (Crypto, ETFs, Fondos) con badges de retorno.
  - **Insights y recomendaciones:** Diagnósticos automáticos basados en ratios financieros reales del usuario y botón "Ver plan de acción ->".
- **Design System y Regla 18 de AGENTS.md:**
  - Componentes `@/shared/ui/*` (`Card`, `Button`, `Badge`, `Progress`, `Select`, `DropdownMenu`, etc.).

## Tasks
- [x] Task 1: Domain Analytics & Dashboard Engine - Implement `dashboard-home-analytics.ts` with unit tests in `dashboard-home-analytics.test.ts` (aggregating net worth, assets, liabilities, liquid accounts, 50/30/20 distribution, monthly cash flow, category expenses, 6-month net worth evolution, and dynamic insights).
- [x] Task 2: Welcome Header & 4 Hero KPI Cards - Build `DashboardWelcomeHeader.tsx` and `DashboardHeroKpiCards.tsx`.
- [x] Task 3: Middle Grid Cards - Build `DashboardAccountsCard.tsx`, `DashboardCashFlowCard.tsx`, `DashboardCategoryExpensesCard.tsx`, `DashboardDistributionCard.tsx`, and `DashboardAssetsCard.tsx`.
- [x] Task 4: Bottom Grid Cards - Build `DashboardNetWorthEvolutionCard.tsx`, `DashboardTopInvestmentsCard.tsx`, and `DashboardInsightsCard.tsx`.
- [x] Task 5: View Integration, Navigation Wiring, Modals, Tests & Full Build Verification - Integrate into `DashboardHomeView.tsx`, connect props in `page.tsx`, write comprehensive Vitest tests in `DashboardHomeView.test.tsx`, move `dashboard.png` to `done/`, and verify `pnpm --dir web test` and `pnpm --dir web build`.
