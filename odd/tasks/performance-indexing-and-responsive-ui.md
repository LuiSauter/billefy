# Feature: Auditoría de Rendimiento, Indexación de Base de Datos y UI Responsive

Auditoría integral y optimización para alta concurrencia, grandes volúmenes de datos y experiencia responsive móvil/escritorio.

## Scope & Core Principles
- **Indexación y rendimiento de Base de Datos:**
  - Agregar índices de alto rendimiento en PostgreSQL mediante migraciones oficiales de EF Core (`dotnet ef migrations add`).
  - Índices compuestos estratégicos en `transactions`:
    - `(user_id, occurred_at)`: Acelera drásticamente consultas de rango temporal (flujo mensual, reportes, calendario, extractos).
    - `(user_id, category_id)`: Acelera agregación por categorías en cuentas y analíticas.
    - `(user_id, transfer_id)`: Optimiza la búsqueda de piernas de transferencias entre cuentas.
  - Verificación de consultas con `AsNoTracking()` para lecturas de alto volumen sin tracking de memoria innecesario.
- **Optimización y Algoritmia Frontend:**
  - Procesamiento O(N) en una sola pasada para analíticas de Dashboard y Calendario (`dashboard-home-analytics.ts`, `calendar-analytics.ts`).
  - Memoización estricta (`useMemo`, `useCallback`) para evitar re-renderizados costosos al interactuar con filtros o selector de meses.
  - Manejo eficiente de gráficos con `initialDimension` y `minWidth={0}` para evitar reflows y advertencias de ResizeObserver.
- **UI Responsive y Mobile-First:**
  - Adaptabilidad fluida desde móviles pequeños (320px, 375px) hasta pantallas ultrawide (1440px+).
  - Breakpoints consistentes (`sm:`, `md:`, `lg:`, `xl:`), tipografía tabular con truncamiento (`truncate`, `tabular-nums`), y contención flexbox (`min-w-0`) en todos los contenedores de gráficos.
  - Targets táctiles adecuados para controles móviles y barras de navegación.
- **Verificación:**
  - `dotnet test backend/` al 100%.
  - `pnpm --dir web test`, `pnpm --dir web lint`, `pnpm --dir web build` limpios.

## Tasks
- [x] Task 1: Backend Database Indexing - Add composite performance indexes to `TransactionConfiguration.cs` and generate forward migration `AddTransactionPerformanceIndexes`.
- [x] Task 2: Backend Query Hardening - Review and verify `AsNoTracking()` usage and query efficiency in repositories.
- [x] Task 3: Frontend Performance & Data Algorithms - Audit and harden single-pass data aggregation, memoization, and empty-state resilience in domain analytics.
- [x] Task 4: Responsive UI Hardening - Audit and enhance mobile breakpoints, touch targets, container boundaries (`min-w-0`), and typography across all dashboard and calendar cards.
- [x] Task 5: Full Regression Testing & Verification - Run all backend and frontend suites to confirm 0 regressions, clean build, and verified speed.
