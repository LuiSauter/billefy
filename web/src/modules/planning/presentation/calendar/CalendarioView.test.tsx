import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarioView } from "./CalendarioView";
import { RecurringPaymentDto } from "../../domain/planning.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";

const mockRecurringPayments: RecurringPaymentDto[] = [
  {
    id: "rec-1",
    name: "Salario Principal",
    description: "Nómina de empresa",
    flowType: "Income",
    amount: 12400,
    currency: "BOB",
    frequency: "Monthly",
    startDate: "2026-01-01",
    nextDueDate: "2026-10-01",
    status: "Active",
    endType: "Never",
    endDate: null,
    totalOccurrences: null,
    completedOccurrences: 9,
    autoCreateDraft: false,
    categoryId: "cat-salario",
    defaultAccountId: "acc-1",
    daysUntilDue: 0,
    isOverdue: false,
    isDueSoon: false,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "rec-2",
    name: "Netflix",
    description: "Suscripción streaming",
    flowType: "Expense",
    amount: 69,
    currency: "BOB",
    frequency: "Monthly",
    startDate: "2026-01-15",
    nextDueDate: "2026-10-15",
    status: "Active",
    endType: "Never",
    endDate: null,
    totalOccurrences: null,
    completedOccurrences: 9,
    autoCreateDraft: false,
    categoryId: "cat-suscripciones",
    defaultAccountId: "acc-2",
    daysUntilDue: 0,
    isOverdue: false,
    isDueSoon: true,
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "rec-3",
    name: "Spotify",
    description: "Streaming música",
    flowType: "Expense",
    amount: 35,
    currency: "BOB",
    frequency: "Monthly",
    startDate: "2026-01-20",
    nextDueDate: "2026-10-20",
    status: "Active",
    endType: "Never",
    endDate: null,
    totalOccurrences: null,
    completedOccurrences: 9,
    autoCreateDraft: false,
    categoryId: "cat-suscripciones",
    defaultAccountId: "acc-2",
    daysUntilDue: 5,
    isOverdue: false,
    isDueSoon: true,
    createdAt: "2026-01-20T00:00:00Z",
  },
];

const mockAccounts: AccountDto[] = [
  {
    id: "acc-1",
    userId: "usr-1",
    name: "Banco BISA Principal",
    accountType: "Bank",
    currency: "BOB",
    initialBalance: new Decimal(5000),
    currentBalance: new Decimal(10000),
    color: "#6366f1",
    icon: "bank",
    isIncludedInTotal: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-2",
    userId: "usr-1",
    name: "Tarjeta Visa",
    accountType: "CreditCard",
    currency: "BOB",
    initialBalance: new Decimal(0),
    currentBalance: new Decimal(-500),
    color: "#ec4899",
    icon: "card",
    isIncludedInTotal: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockLoans: LoanSummaryDto[] = [
  {
    id: "loan-1",
    counterpartyId: "cp-1",
    counterpartyName: "Banco Fassil",
    type: "Borrowed",
    template: "FixedInstallment",
    status: "Active",
    principal: new Decimal(14400),
    currency: "BOB",
    interestRate: 10,
    annualEffectiveRate: 10.47,
    remainingPrincipal: new Decimal(12000),
    disbursementDate: "2026-01-04",
    firstDueDate: "2026-02-04",
    totalInstallments: 12,
    createdAt: "2026-01-04T00:00:00Z",
  },
  {
    id: "loan-2",
    counterpartyId: "cp-2",
    counterpartyName: "Préstamo Juan",
    type: "Lent",
    template: "NoInterest",
    status: "Active",
    principal: new Decimal(2000),
    currency: "BOB",
    interestRate: 0,
    annualEffectiveRate: 0,
    remainingPrincipal: new Decimal(1500),
    disbursementDate: "2026-05-14",
    firstDueDate: "2026-06-14",
    totalInstallments: 4,
    createdAt: "2026-05-14T00:00:00Z",
  },
];

const mockTransactions: TransactionDto[] = [
  {
    id: "tx-1",
    accountId: "acc-1",
    direction: "Income",
    amount: new Decimal(2000),
    currency: "BOB",
    occurredAt: "2026-10-23T10:00:00Z",
    description: "Ingreso extra",
    createdAt: "2026-10-23T10:00:00Z",
  },
];

const createMockRepo = () => ({
  createBudget: vi.fn(),
  getBudgets: vi.fn().mockResolvedValue([]),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  getGoals: vi.fn().mockResolvedValue([]),
  deleteGoal: vi.fn(),
  getFinancialHealth: vi.fn().mockResolvedValue({ score: 83, level: "Good", description: "Buena", metrics: {} }),
  proposeIncomeDistribution: vi.fn(),
  getRecurringPayments: vi.fn().mockResolvedValue(mockRecurringPayments),
  getRecurringSummary: vi.fn().mockResolvedValue({
    ActiveCount: 3,
    MonthlyExpenses: 104,
    MonthlyIncome: 12400,
    Currency: "BOB",
    Upcoming7DaysCount: 2,
    Upcoming7DaysTotal: 104,
    OverdueCount: 0,
    OverdueTotal: 0,
  }),
  getRecurringCalendarOccurrences: vi.fn().mockResolvedValue([]),
  createRecurringPayment: vi.fn(),
  updateRecurringPayment: vi.fn(),
  rescheduleRecurringPayment: vi.fn(),
  confirmRecurringPayment: vi.fn(),
  pauseRecurringPayment: vi.fn(),
  resumeRecurringPayment: vi.fn(),
  deleteRecurringPayment: vi.fn(),
});

beforeEach(() => {
  vi.stubGlobal("React", React);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CalendarioView Integration", () => {
  it("renders the complete Calendario financiero redesign layout", () => {
    const html = renderToStaticMarkup(
      <CalendarioView
        repository={createMockRepo()}
        accounts={mockAccounts}
        loans={mockLoans}
        transactions={mockTransactions}
        selectedCurrency="BOB"
        p2pRate={10}
      />
    );

    // 1. Header
    expect(html).toContain("Calendario financiero");
    expect(html).toContain("Visualiza tus próximos pagos, ingresos y eventos financieros en un solo lugar.");
    expect(html).toContain("Nuevo evento");

    // 2. Five KPI Cards
    expect(html).toContain("Ingresos previstos");
    expect(html).toContain("Gastos previstos");
    expect(html).toContain("Pagos recurrentes");
    expect(html).toContain("Cobros previstos");
    expect(html).toContain("Ahorro del mes");

    // 3. Toolbar controls
    expect(html).toContain("Mes");
    expect(html).toContain("Semana");
    expect(html).toContain("Día");
    expect(html).toContain("Hoy");

    // 4. Weekday Headers in Month Grid
    expect(html).toContain("Lun");
    expect(html).toContain("Mar");
    expect(html).toContain("Mié");
    expect(html).toContain("Jue");
    expect(html).toContain("Vie");
    expect(html).toContain("Sáb");
    expect(html).toContain("Dom");

    // 5. Right Side Panel sections
    expect(html).toContain("Filtros");
    expect(html).toContain("Limpiar");
    expect(html).toContain("Resumen del período");
    expect(html).toContain("Próximos eventos");
  });

  it("converts currency properly when USD is selected", () => {
    const html = renderToStaticMarkup(
      <CalendarioView
        repository={createMockRepo()}
        accounts={mockAccounts}
        loans={mockLoans}
        transactions={[]}
        selectedCurrency="USD"
        p2pRate={10}
      />
    );

    // Should display USD symbol '$'
    expect(html).toContain("$");
    expect(html).toContain("Ingresos previstos");
    expect(html).toContain("Ahorro del mes");
  });
});
