# Feature: Módulo de Calendario Financiero

Implementación completa, funcional y desacoplada del módulo de Calendario Financiero según el diseño en `docs/redesign/calendario.png`.

## Scope & Core Principles
- **Unificación de eventos y compromisos financieros:**
  - Consolida en un único calendario interactivo los pagos recurrentes (gastos/ingresos), cuotas de préstamos y deudas (`Lending.Borrowed`), cobros programados de dinero prestado (`Lending.Lent`), aportes a inversiones/metas y movimientos registrados.
  - Cero datos ficticios; calcula montos proyectados, ratios y saldos mediante aritmética decimal exacta (`Decimal.js`) y conversión multi-moneda (`BOB` / `USD` con tasa P2P).
- **Métricas y KPIs del mes (5 tarjetas superiores):**
  - **Ingresos previstos:** Monto total proyectado, conteo de eventos y variación porcentual vs. mes anterior.
  - **Gastos previstos:** Monto total proyectado, conteo de eventos y variación porcentual.
  - **Pagos recurrentes:** Monto total de pagos fijos/suscripciones, conteo de eventos y variación porcentual.
  - **Cobros previstos:** Monto total de amortizaciones y dinero prestado por cobrar, conteo de eventos y variación.
  - **Ahorro del mes:** Monto neto proyectado (`Ingresos - Gastos`), porcentaje respecto a ingresos totales (`X% de tus ingresos`) y barra de progreso.
- **Grilla del Calendario:**
  - Vistas conmutables: **Mes** (grilla mensual de 7 columnas con días Lun-Dom, días del mes anterior/siguiente tenues, resaltado del día seleccionado/actual con anillo y badge púrpura, y pills de eventos coloreadas por tipo), **Semana** y **Día**.
  - Eventos coloreados por categoría/flujo:
    - Verde: Ingresos y cobros previstos (`+ Bs 4,500.00 Salario`, `+ Bs 500.00 Cobro préstamo`).
    - Rojo/Rosa: Gastos y pagos de servicios/renta (`- Bs 350.00 Netflix`, `- Bs 1,690.00 Renta`).
    - Púrpura: Inversiones y aportes de capital (`+ Bs 2,000.00 Inversión`).
    - Ámbar/Amarillo: Deudas, cuotas de préstamos y tarjetas de crédito (`- Bs 1,200.00 Cuota préstamo`).
  - Navegación temporal: Botones anterior/siguiente, selector de mes, botón "Hoy" y selector de fecha.
- **Panel lateral derecho:**
  - **Filtros:** Dropdowns con iconos para Todas las cuentas (Landmark), Todos los tipos (ArrowLeftRight), Todas las categorías (Tag), indicador de rango de fechas y botón "Limpiar".
  - **Resumen del período:** Indicadores de Ingresos, Gastos y Ahorro con flechas direccionales y barra de progreso de tasa de ahorro.
  - **Próximos eventos:** Listado cronológico de eventos inmediatos ("Hoy, 15 oct", "Mañana, 16 oct", etc.) con montos netos y botón "Ver todos ->".
- **Acciones y Modales:**
  - Botón principal `+ Nuevo evento` que permite programar un nuevo movimiento o pago recurrente.
- **Design System y Regla 18 de AGENTS.md:**
  - Uso estricto de componentes `@/shared/ui/*` (`Card`, `Button`, `Badge`, `SelectField`, `Progress`, `Input`, `ResponsiveDrawer`, etc.).
- **Navegación:**
  - Pestaña `calendario` en `Sidebar.tsx`, `MobileBottomNav.tsx` y `page.tsx`.

## Tasks
- [x] Task 1: Domain Analytics & Calendar Events Engine - Implement `calendar-analytics.ts` with unit tests in `calendar-analytics.test.ts` (event aggregation, projection of recurring payments and loan installments, multi-currency conversion, KPI calculation, filtering, and monthly/weekly/daily slicing).
- [x] Task 2: Header, KPI Cards & Toolbar - Build `CalendarioHeader.tsx`, `CalendarioKpiCards.tsx`, and `CalendarioToolbar.tsx` matching pixel-perfect specifications from `docs/redesign/calendario.png`.
- [x] Task 3: Interactive Calendar Grid Views - Build `CalendarioMonthGrid.tsx`, `CalendarioWeekView.tsx`, and `CalendarioDayView.tsx` with color-coded event pills, active day selection, and responsive layout.
- [x] Task 4: Right Side Panel Components - Build `CalendarioSidePanel.tsx` with Filters Card (accounts, types, categories, date range), Period Summary Card, and Upcoming Events Card.
- [x] Task 5: Main View, Navigation Wiring, Modals, Tests & Full Build Verification - Integrate `CalendarioView.tsx`, wire `calendario` in `Sidebar.tsx`, `MobileBottomNav.tsx`, and `page.tsx`, write Vitest tests in `CalendarioView.test.tsx`, and verify `pnpm --dir web test` and `pnpm --dir web build`.
