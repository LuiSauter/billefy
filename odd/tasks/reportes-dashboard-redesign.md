# Feature: Módulo de Reportes Financieros y Análisis de Salud

Implementación completa, funcional y desacoplada del módulo de Reportes según el diseño en `docs/redesign/reportes.png`.

## Scope & Core Principles
- **Síntesis analítica integral:**
  - Consume datos auténticos del Libro Mayor (`Ledger`), Presupuestos (`Planning`), Inversiones (`Investments`), Deudas (`Lending`) y Patrimonio (`Patrimonio`).
  - Cero datos ficticios; calcula ingresos, gastos, ahorro/inversión y balance neto con tipos monetarios exactos (`Decimal.js`).
- **Métricas y KPIs clave:**
  - Ingresos totales (con % de variación vs. período anterior).
  - Gastos totales (con % de variación).
  - Ahorro / Inversión (con % de variación).
  - Balance neto del período.
- **Visualizaciones de tendencias:**
  - Gráfico doble de barras "Ingresos vs. Gastos" por mes (últimos 6 meses).
  - Gráfico de donut "Gastos por categoría" con monto y porcentaje por categoría.
  - Gráfico de área "Evolución del patrimonio neto" con tendencia ascendente/descendente.
- **Métricas del período:**
  - Ratio de ahorro (`% de ingresos ahorrados`, objetivo >= 20%).
  - Crecimiento del patrimonio (`% vs período anterior`).
  - Ratio de endeudamiento (`DTI / Debt Ratio`, objetivo < 30%).
  - Cumplimiento del presupuesto (`% de ejecución sobre el gasto planificado`).
- **Generación y exportación de reportes:**
  - Formulario de generación de reportes (Tipo: Resumen financiero, Flujo de efectivo, Rendimiento de inversiones, Evolución del patrimonio; Período; Formato: CSV, JSON, PDF/Imprimible).
  - Exportación real de datos financieros estructurados para descarga del usuario.
- **Conclusión del período e Insights:**
  - Diagnóstico cualitativo automático generado en base a los ratios reales del usuario.
- **Design System y Componentes shadcn (Regla 18 de AGENTS.md):**
  - Componentes `@/shared/ui/*` (`Card`, `Button`, `Badge`, `SelectField`, `Progress`, `Skeleton`, `FormField`, etc.).
- **Navegación:**
  - Nueva pestaña `reportes` en `Sidebar.tsx`, `MobileBottomNav.tsx` y `page.tsx`.

## Tasks
- [x] Task 1: Domain Analytics & Reporting Engine - Implement `reports-analytics.ts` with unit tests (`reports-analytics.test.ts`): multi-month income/expense aggregation, category distribution, savings ratio, net worth evolution, budget compliance, and dynamic narrative conclusions.
- [x] Task 2: Top KPIs & Comparison Charts - Build `ReportsHeader.tsx`, `ReportsNavTabs.tsx`, `ReportsKpiCards.tsx`, `IncomeVsExpensesChartCard.tsx`, and `CategoryExpensesDonutCard.tsx`.
- [x] Task 3: Trend & Summary Cards - Build `NetWorthEvolutionChartCard.tsx`, `PeriodSummaryMetricsCard.tsx`, `PopularReportsCard.tsx`, and `PeriodConclusionBanner.tsx`.
- [x] Task 4: Report Generation & Export - Build `ReportGenerationCard.tsx` with export capabilities (CSV/JSON download and structured printable summary) and connect "Exportar reporte".
- [x] Task 5: View Integration, Navigation, Unit Tests & Full Suite Verification - Integrate into `ReportsView.tsx`, wire `reportes` in `Sidebar.tsx`, `MobileBottomNav.tsx`, and `page.tsx`, write comprehensive Vitest tests, run linter (`pnpm --dir web lint`), test suite (`pnpm --dir web test`), and Next.js build (`pnpm --dir web build`).
