import React from "react";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecurringPaymentsView } from "./RecurringPaymentsView";
import { IPlanningRepository, RecurringPaymentDto, RecurringSummaryDto } from "../domain/planning.types";

const mockPayments: RecurringPaymentDto[] = [
  {
    id: "rec-1",
    name: "Netflix",
    description: "Suscripción entretenimiento",
    flowType: "Expense",
    amount: 69.0,
    currency: "BOB",
    frequency: "Monthly",
    startDate: "2026-10-15",
    nextDueDate: "2026-10-15",
    status: "Active",
    endType: "Never",
    completedOccurrences: 0,
    autoCreateDraft: false,
    categoryId: "cat-ent",
    defaultAccountId: "acc-1",
    daysUntilDue: 0,
    isOverdue: false,
    isDueSoon: true,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "rec-2",
    name: "Salario",
    description: "Ingreso mensual",
    flowType: "Income",
    amount: 12000.0,
    currency: "BOB",
    frequency: "Monthly",
    startDate: "2026-10-31",
    nextDueDate: "2026-10-31",
    status: "Active",
    endType: "Never",
    completedOccurrences: 0,
    autoCreateDraft: false,
    categoryId: "cat-sal",
    defaultAccountId: "acc-1",
    daysUntilDue: 16,
    isOverdue: false,
    isDueSoon: false,
    createdAt: "2026-10-01T00:00:00Z",
  },
];

const mockSummary: RecurringSummaryDto = {
  activeCount: 12,
  monthlyExpenses: 5240.0,
  monthlyIncome: 12000.0,
  currency: "BOB",
  upcoming7DaysCount: 3,
  upcoming7DaysTotal: 1690.0,
  overdueCount: 1,
  overdueTotal: 350.0,
};

const mockRepo: IPlanningRepository = {
  getRecurringPayments: async () => mockPayments,
  getRecurringSummary: async () => mockSummary,
  getRecurringCalendarOccurrences: async () => [],
  getRecurringPaymentById: async () => mockPayments[0],
  createRecurringPayment: async () => ({ id: "created" }),
  updateRecurringPayment: async () => ({ message: "updated" }),
  deleteRecurringPayment: async () => ({ message: "deleted" }),
  rescheduleRecurringPayment: async () => ({ message: "rescheduled" }),
  pauseRecurringPayment: async () => ({ message: "paused" }),
  resumeRecurringPayment: async () => ({ message: "resumed" }),
  confirmRecurringPayment: async () => ({ transactionId: "txn-1" }),
  createBudget: async () => ({ id: "" }),
  getBudgets: async () => [],
  updateBudget: async () => {},
  deleteBudget: async () => ({ message: "" }),
  createGoal: async () => ({ id: "" }),
  updateGoal: async () => ({ message: "" }),
  getGoals: async () => [],
  getGoalFunding: async () => [],
  recordGoalFunding: async () => { throw new Error("Not exercised by recurring payment tests"); },
  deleteGoal: async () => ({ message: "" }),
  getFinancialHealth: async () => ({ monthStartUtc: "", monthEndUtcExclusive: "", currencies: [] }),
  proposeIncomeDistribution: async () => ({
    totalIncome: 0,
    currency: "BOB",
    needsAmount: 0,
    wantsAmount: 0,
    debtPaymentAmount: 0,
    savingsAmount: 0,
    needsPercentage: 50,
    wantsPercentage: 30,
    debtPercentage: 0,
    savingsPercentage: 20,
    rationale: "",
  }),
};

describe("RecurringPaymentsView redesign", () => {
  it("renders header, KPI cards, table structure, and sidebar widgets matching design", () => {
    const html = renderToStaticMarkup(
      <RecurringPaymentsView
        repository={mockRepo}
        selectedCurrency="BOB"
        accounts={[{ id: "acc-1", name: "Banco BCP", type: "Bank", currency: "BOB", balance: new Decimal(5000), createdAt: "" }]}
      />
    );

    // Header
    expect(html).toContain("Pagos y movimientos recurrentes");
    expect(html).toContain("Nuevo recurrente");

    // 5 KPI Cards
    expect(html).toContain("Recurrentes activos");
    expect(html).toContain("Gastos mensuales");
    expect(html).toContain("Ingresos mensuales");
    expect(html).toContain("Próximos 7 días");
    expect(html).toContain("Vencidos");

    // Tabs
    expect(html).toContain("Lista de recurrentes");
    expect(html).toContain("Calendario");

    // Sidebar widgets
    expect(html).toContain("Próximos movimientos");
    expect(html).toContain("Próximos pagos (7 días)");
  });

  it("renders empty state notice when no payments are registered", () => {
    const emptyRepo: IPlanningRepository = {
      ...mockRepo,
      getRecurringPayments: async () => [],
      getRecurringSummary: async () => ({
        activeCount: 0,
        monthlyExpenses: 0,
        monthlyIncome: 0,
        currency: "BOB",
        upcoming7DaysCount: 0,
        upcoming7DaysTotal: 0,
        overdueCount: 0,
        overdueTotal: 0,
      }),
    };

    const html = renderToStaticMarkup(
      <RecurringPaymentsView repository={emptyRepo} selectedCurrency="BOB" />
    );

    expect(html).toContain("No se encontraron movimientos recurrentes");
    expect(html).toContain("Registrar primer recurrente");
  });
});
