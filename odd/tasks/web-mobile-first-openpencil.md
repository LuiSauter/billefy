# Task: Responsive Mobile-First Web Redesign & Shadcn UI Alignment from OpenPencil

## Description
Redesign the Next.js web application (`web/`) to be fully responsive with a mobile-first architecture matching the OpenPencil document `billefy_wallet.op`. The application aligns with Page 0 ("Mobile - Billefy Wallet (BOB & USD)") on mobile viewports (< 768px / 390px) and Page 1 ("Web - Billefy Dashboard (BOB & USD)") on desktop viewports (>= 768px). All shadcn UI components under `web/src/components/ui/` are restyled to pixel-perfect design tokens, and all modules (Auth, Wallet, FX Transfer, Smart Drafts, Budgets, Financial Goals, Recurring Payments, and Lending) are fully functional.

## Tasks
- [x] Task 1: Redesign core Shadcn UI components to OpenPencil design tokens (Button, Card, Dialog, Badge, Input, Tabs, Table, Progress, Drawer, Sheet, Select, Switch, Tooltip)
- [x] Task 2: Build Responsive Shell & Mobile Navigation (Mobile Header with P2P ticker & avatar, Fixed Bottom Navigation Dock, Desktop 240px Sidebar + Topbar)
- [x] Task 3: Implement Mobile Wallet View matching OpenPencil screen n2160 (Hero dark balance card with gradient, 4-button quick action dock, horizontal accounts carousel, recent transactions list)
- [x] Task 4: Implement Mobile 1-Tap Numeric Pad Movement Modal matching OpenPencil screen n2237 (Segmented Gasto/Ingreso/Transferir, fast numeric keypad, account chips, P2P equiv pill)
- [x] Task 5: Enhance Responsive Modules for Budgets, Goals, Recurring & Lending (Mobile cards & desktop views for 50/30/20 budgets, health analytics banner, scheduled payments 1-click & loan installments)
- [x] Task 6: Full Auth Screen Responsiveness & Module State Integration (Mobile hero vs Desktop split hero, currency selector, login/logout flow, error handling)
- [x] Task 7: End-to-End Build, Lint & Tests Verification (Next.js build, Vitest suite, ESLint validation)
