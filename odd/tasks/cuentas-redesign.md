# Cuentas Module Redesign Implementation

Implementation of the Cuentas module based on `docs/redesign/cuentas.png`.

## Tasks

- [x] Task 1: Domain & Analytics Helpers - Account category mapping, visual subtitles, balance aggregators, and monthly trend calculator.
- [x] Task 2: Top Metrics Header & Stat Cards - Hero card ("Saldo total en cuentas" with % vs mes anterior and wave graphic) + 5 category summary cards (Bancos, Wallets digitales, Cripto, Efectivo, Otros) with amounts and percentages.
- [x] Task 3: Filter Tabs & View Switcher Toolbar - Interactive category filter pills with live counts (Todas, Bancos, Wallets, Cripto, Efectivo, Otros) and Grid/List view toggle.
- [x] Task 4: Accounts Grid & List Presentation - "Mis cuentas" section with redesigned account cards (left accent bar, icon/logo, name, subtitle, 3-dot menu with actions, bold balance with currency tag, category pill), dashed "Agregar cuenta" card, and table/list view mode.
- [x] Task 5: Side Analytics Panels - "Distribución del saldo" Donut chart (category breakdown, center total, legend) and "Evolución del saldo en cuentas" Area chart (timeframe selector, smooth area curve, gradient, glowing highlight).
- [x] Task 6: Integration & Verification - Wire into `AccountsTabView` and `page.tsx`, ensure modal triggers (Crear cuenta, Editar cuenta, Conciliar saldo) work seamlessly, run test suites and linting.
