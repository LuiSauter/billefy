import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHomeView, type DashboardHomeViewProps } from "./DashboardHomeView";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { Investment } from "@/modules/investments/domain/investment.types";
import { UserDto } from "@/modules/identity/domain/identity.types";

const mockUser: UserDto = {
  id: "usr-1",
  fullName: "Luis Gabriel",
  email: "luis@example.com",
  preferredCurrency: "USD",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockAccounts: AccountDto[] = [
  {
    id: "acc-1",
    name: "Banco BCP",
    type: "Bank",
    currency: "USD",
    balance: new Decimal(7500),
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-2",
    name: "Mercado Pago",
    type: "Wallet",
    currency: "USD",
    balance: new Decimal(1240),
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-3",
    name: "Binance (Crypto)",
    type: "Crypto",
    currency: "USD",
    balance: new Decimal(4320),
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockTransactions: TransactionDto[] = [
  {
    id: "tx-1",
    accountId: "acc-1",
    direction: "Income",
    amount: new Decimal(6800),
    currency: "USD",
    occurredAt: "2026-10-01T10:00:00Z",
    description: "Salario mensual",
    createdAt: "2026-10-01T10:00:00Z",
  },
  {
    id: "tx-2",
    accountId: "acc-1",
    direction: "Expense",
    amount: new Decimal(1318),
    currency: "USD",
    occurredAt: "2026-10-05T10:00:00Z",
    description: "Vivienda",
    createdAt: "2026-10-05T10:00:00Z",
  },
  {
    id: "tx-3",
    accountId: "acc-2",
    direction: "Expense",
    amount: new Decimal(741),
    currency: "USD",
    occurredAt: "2026-10-08T10:00:00Z",
    description: "Alimentación",
    createdAt: "2026-10-08T10:00:00Z",
  },
  {
    id: "tx-4",
    accountId: "acc-2",
    direction: "Expense",
    amount: new Decimal(494),
    currency: "USD",
    occurredAt: "2026-10-10T10:00:00Z",
    description: "Transporte",
    createdAt: "2026-10-10T10:00:00Z",
  },
];

const mockLoans: LoanSummaryDto[] = [
  {
    id: "loan-1",
    counterpartyId: "cp-1",
    counterpartyName: "Banco",
    type: "Borrowed",
    template: "FixedInstallment",
    status: "Active",
    principal: new Decimal(35000),
    currency: "USD",
    interestRate: 8,
    annualEffectiveRate: 8.3,
    remainingPrincipal: new Decimal(31660),
    disbursementDate: "2026-01-01",
    firstDueDate: "2026-02-01",
    totalInstallments: 36,
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockInvestments: Investment[] = [
  {
    id: "inv-1",
    name: "Bitcoin (BTC)",
    kind: "crypto",
    currency: "USD",
    currentValue: 6200,
    initialValue: 5500,
    quantity: 0.1,
    iconKey: "crypto",
    colorKey: "amber",
    history: [],
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "inv-2",
    name: "S&P 500 (ETF)",
    kind: "stocks",
    currency: "USD",
    currentValue: 18000,
    initialValue: 16800,
    quantity: 35,
    iconKey: "bank",
    colorKey: "purple",
    history: [],
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockProps: DashboardHomeViewProps = {
  user: mockUser,
  metrics: {
    totalBalance: 24860,
    monthlyIncome: 6800,
    monthlyExpenses: 4120,
    savingsRate: 20,
    bobTotal: 0,
    usdTotal: 24860,
    consolidatedUsd: 24860,
    totalDebt: 31660,
  },
  accounts: mockAccounts,
  accountsMap: new Map(),
  drafts: [],
  transactions: mockTransactions,
  loans: mockLoans,
  loading: false,
  p2pRate: 10,
  selectedCurrency: "USD",
  onOpenCreateAccountModal: vi.fn(),
  onOpenReconcileModal: vi.fn(),
  onConfirmDraft: vi.fn(),
  onDiscardDraft: vi.fn(),
  onConfirmAllDrafts: vi.fn(),
  onReverseTxn: vi.fn(),
  investments: mockInvestments,
};

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("DashboardHomeView Redesign Integration", () => {
  it("renders the redesigned header and 4 Hero KPI Cards", () => {
    const html = renderToStaticMarkup(<DashboardHomeView {...mockProps} />);

    // 1. Welcome Header
    expect(html).toContain("Hola, Luis Gabriel");
    expect(html).toContain("Así va tu salud financiera este mes");

    // 2. 4 Hero KPI Cards
    expect(html).toContain("Patrimonio Neto");
    expect(html).toContain("Activos");
    expect(html).toContain("Pasivos");
    expect(html).toContain("Saldo total en cuentas");
    expect(html).toContain("Disponible en bancos y wallets");
  });

  it("renders Middle Grid cards: accounts, cash flow, category expenses, 50/30/20 distribution, and assets", () => {
    const html = renderToStaticMarkup(<DashboardHomeView {...mockProps} />);

    // Mis cuentas
    expect(html).toContain("Mis cuentas");
    expect(html).toContain("Banco BCP");
    expect(html).toContain("Mercado Pago");
    expect(html).toContain("Binance (Crypto)");

    // Flujo del mes
    expect(html).toContain("Flujo del mes");
    expect(html).toContain("Ingresos");
    expect(html).toContain("Gastos");
    expect(html).toContain("Ahorro / Inversión");

    // Gastos por categoría
    expect(html).toContain("Gastos por categoría");
    expect(html).toContain("Vivienda");
    expect(html).toContain("Alimentación");
    expect(html).toContain("Transporte");

    // Distribución recomendada (50/30/20)
    expect(html).toContain("Distribución recomendada (50/30/20)");
    expect(html).toContain("50%");
    expect(html).toContain("Necesidades");
    expect(html).toContain("30%");
    expect(html).toContain("Estilo de vida");
    expect(html).toContain("20%");
    expect(html).toContain("Ahorro e inversión");

    // Mis activos (patrimonio)
    expect(html).toContain("Mis activos (patrimonio)");
    expect(html).toContain("Inmuebles");
    expect(html).toContain("Activos digitales");
    expect(html).toContain("Vehículos");
  });

  it("renders Bottom Grid cards: net worth evolution, top investments, and insights", () => {
    const html = renderToStaticMarkup(<DashboardHomeView {...mockProps} />);

    // Evolución del patrimonio neto
    expect(html).toContain("Evolución del patrimonio neto");
    expect(html).toContain("Últimos 6 meses");

    // Principales inversiones
    expect(html).toContain("Principales inversiones");
    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain("S&amp;P 500");

    // Insights y recomendaciones
    expect(html).toContain("Insights y recomendaciones");
    expect(html).toContain("patrimonio");
    expect(html).toContain("Ver plan de acción");
  });

  it("renders custom user-configured distribution plan rule and buckets when enabled", () => {
    const customPlan = {
      enabled: true,
      buckets: [
        { id: "b1", name: "Gastos fijos", percent: 40, colorKey: "blue" as const, categoryIds: [] },
        { id: "b2", name: "Estilo de vida", percent: 30, colorKey: "pink" as const, categoryIds: [] },
        { id: "b3", name: "Ahorro", percent: 20, colorKey: "emerald" as const, categoryIds: [] },
        { id: "b4", name: "Inversión", percent: 10, colorKey: "amber" as const, categoryIds: [] },
      ],
    };

    const html = renderToStaticMarkup(
      <DashboardHomeView
        {...mockProps}
        onOpenPlanTab={vi.fn()}
        distributionPlan={customPlan}
      />
    );

    expect(html).toContain("Regla de distribución (40/30/20/10)");
    expect(html).toContain("40%");
    expect(html).toContain("Gastos fijos");
    expect(html).toContain("30%");
    expect(html).toContain("Estilo de vida");
    expect(html).toContain("20%");
    expect(html).toContain("Ahorro");
    expect(html).toContain("10%");
    expect(html).toContain("Inversión");
    expect(html).toContain("Ajustar regla");
  });
});
