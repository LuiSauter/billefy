import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateCalendarAnalytics,
  generateMonthGrid,
  generateWeekDays,
  getRelativeEventDateLabel,
  filterCalendarEvents,
  CalendarEvent,
} from "./calendar-analytics";
import { RecurringPaymentDto } from "./planning.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";

describe("Calendar Analytics & Event Engine", () => {
  const mockRecurringPayments: RecurringPaymentDto[] = [
    {
      id: "rec-1",
      name: "Salario",
      description: "Nómina mensual",
      flowType: "Income",
      amount: 4500,
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
      defaultAccountId: "acc-bank",
      daysUntilDue: 0,
      isOverdue: false,
      isDueSoon: false,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "rec-2",
      name: "Netflix",
      description: "Suscripción",
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
      categoryId: "cat-servicios",
      defaultAccountId: "acc-card",
      daysUntilDue: 0,
      isOverdue: false,
      isDueSoon: true,
      createdAt: "2026-01-15T00:00:00Z",
    },
    {
      id: "rec-3",
      name: "Spotify",
      description: "Música streaming",
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
      categoryId: "cat-servicios",
      defaultAccountId: "acc-card",
      daysUntilDue: 5,
      isOverdue: false,
      isDueSoon: true,
      createdAt: "2026-01-20T00:00:00Z",
    },
  ];

  const mockLoans: LoanSummaryDto[] = [
    {
      id: "loan-borrowed-1",
      counterpartyId: "bank-1",
      counterpartyName: "Banco BISA",
      type: "Borrowed",
      template: "FixedInstallment",
      status: "Active",
      principal: new Decimal(12000),
      currency: "BOB",
      interestRate: 12,
      annualEffectiveRate: 12.68,
      remainingPrincipal: new Decimal(9600),
      disbursementDate: "2026-01-04",
      firstDueDate: "2026-02-04",
      totalInstallments: 12,
      createdAt: "2026-01-04T00:00:00Z",
    },
    {
      id: "loan-lent-1",
      counterpartyId: "person-1",
      counterpartyName: "Carlos Gómez",
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
      accountId: "acc-bank",
      direction: "Income",
      amount: new Decimal(2000),
      currency: "BOB",
      occurredAt: "2026-10-23T10:00:00Z",
      description: "Ingreso extra consultoría",
      createdAt: "2026-10-23T10:00:00Z",
    },
    {
      id: "tx-2",
      accountId: "acc-bank",
      direction: "Expense",
      amount: new Decimal(120),
      currency: "BOB",
      occurredAt: "2026-10-27T20:00:00Z",
      description: "Restaurante cena",
      createdAt: "2026-10-27T20:00:00Z",
    },
  ];

  it("calculates monthly financial KPIs accurately in BOB", () => {
    const result = calculateCalendarAnalytics({
      recurringPayments: mockRecurringPayments,
      loans: mockLoans,
      transactions: mockTransactions,
      year: 2026,
      month: 9, // October (0-indexed: 9 = October)
      selectedCurrency: "BOB",
      p2pRate: 10,
    });

    expect(result.kpis.ingresosPrevistos.amount).toBeGreaterThan(0);
    expect(result.kpis.gastosPrevistos.amount).toBeGreaterThan(0);
    expect(result.kpis.pagosRecurrentes.amount).toBe(104); // Netflix 69 + Spotify 35
    expect(result.kpis.pagosRecurrentes.count).toBe(2);
    expect(result.kpis.cobrosPrevistos.amount).toBe(500); // 2000 / 4 = 500
    expect(result.kpis.ahorroMes.amount).toBe(
      result.kpis.ingresosPrevistos.amount - result.kpis.gastosPrevistos.amount
    );
    expect(result.kpis.ahorroMes.percentage).toBeGreaterThan(0);
  });

  it("handles multi-currency conversion to USD using p2pRate", () => {
    const result = calculateCalendarAnalytics({
      recurringPayments: mockRecurringPayments,
      loans: mockLoans,
      transactions: [],
      year: 2026,
      month: 9,
      selectedCurrency: "USD",
      p2pRate: 10,
    });

    // 104 BOB / 10 = 10.4 USD
    expect(result.kpis.pagosRecurrentes.amount).toBeCloseTo(10.4, 2);
    // 500 BOB / 10 = 50 USD
    expect(result.kpis.cobrosPrevistos.amount).toBeCloseTo(50, 2);
  });

  it("generates a complete 42-cell month grid for October 2026", () => {
    const grid = generateMonthGrid(2026, 9, []);
    expect(grid).toHaveLength(42);

    // October 1st 2026 is a Thursday (Jueves). Lun, Mar, Mié should be from Sept
    expect(grid[0].dateString).toBe("2026-09-28");
    expect(grid[0].isCurrentMonth).toBe(false);
    expect(grid[3].dateString).toBe("2026-10-01");
    expect(grid[3].isCurrentMonth).toBe(true);
    expect(grid[33].dateString).toBe("2026-10-31");
    expect(grid[33].isCurrentMonth).toBe(true);
    expect(grid[34].dateString).toBe("2026-11-01");
    expect(grid[34].isCurrentMonth).toBe(false);
  });

  it("generates 7 days for a week view containing a specific date", () => {
    const week = generateWeekDays("2026-10-15");
    expect(week).toHaveLength(7);
    expect(week[0].dateString).toBe("2026-10-12"); // Monday
    expect(week[3].dateString).toBe("2026-10-15"); // Thursday
    expect(week[6].dateString).toBe("2026-10-18"); // Sunday
  });

  it("formats relative event date labels correctly", () => {
    const reference = "2026-10-15";
    expect(getRelativeEventDateLabel("2026-10-15", reference)).toBe("Hoy, 15 oct");
    expect(getRelativeEventDateLabel("2026-10-16", reference)).toBe("Mañana, 16 oct");
    expect(getRelativeEventDateLabel("2026-10-17", reference)).toBe("Sáb, 17 oct");
  });

  it("filters events by account, type, and search keyword", () => {
    const events: CalendarEvent[] = [
      {
        id: "ev-1",
        title: "Netflix",
        date: "2026-10-15",
        amount: 69,
        currency: "BOB",
        amountInSelectedCurrency: 69,
        type: "expense",
        categoryName: "Entretenimiento",
        accountId: "acc-card",
        source: "recurring",
        sourceId: "rec-2",
        status: "scheduled",
        isExpense: true,
      },
      {
        id: "ev-2",
        title: "Salario",
        date: "2026-10-01",
        amount: 4500,
        currency: "BOB",
        amountInSelectedCurrency: 4500,
        type: "income",
        categoryName: "Nómina",
        accountId: "acc-bank",
        source: "recurring",
        sourceId: "rec-1",
        status: "scheduled",
        isExpense: false,
      },
    ];

    expect(filterCalendarEvents(events, { accountId: "acc-card" })).toHaveLength(1);
    expect(filterCalendarEvents(events, { type: "income" })).toHaveLength(1);
    expect(filterCalendarEvents(events, { search: "net" })).toHaveLength(1);
    expect(filterCalendarEvents(events, { search: "non-existent" })).toHaveLength(0);
  });

  it("normalizes USDT and USDC recurring occurrences using p2pRate when viewing in BOB", () => {
    const result = calculateCalendarAnalytics({
      recurringOccurrences: [
        {
          recurringId: "rec-usdt",
          frequency: "Monthly",
          name: "Servidor Cloud",
          flowType: "Expense",
          amount: 50,
          currency: "USDT",
          date: "2026-10-10",
          isOverdue: false,
          isDueSoon: false,
        },
      ],
      year: 2026,
      month: 9, // Oct
      selectedCurrency: "BOB",
      p2pRate: 10,
    });

    // 50 USDT * 10 P2P rate = 500 BOB
    expect(result.events).toHaveLength(1);
    expect(result.events[0].amountInSelectedCurrency).toBe(500);
    expect(result.events[0].currency).toBe("USDT");
  });
});
