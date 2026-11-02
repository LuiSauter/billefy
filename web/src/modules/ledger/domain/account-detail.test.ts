import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { AccountDto, TransactionDto } from "./ledger.types";
import {
  calculateRunningBalances,
  calculateAccountPeriodStats,
  calculateCashFlowComparison,
  calculateBalanceEvolutionPoints,
  filterTransactionsByPeriod,
  filterTransactionsByType,
} from "./account-detail";

function makeAccount(overrides: Partial<AccountDto> = {}): AccountDto {
  return {
    id: "acc-bcp-1",
    name: "Banco BCP",
    type: "Savings",
    currency: "BOB",
    balance: new Decimal("24580.00"),
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTxn(overrides: Partial<TransactionDto>): TransactionDto {
  return {
    id: "txn-1",
    accountId: "acc-bcp-1",
    amount: new Decimal("100"),
    currency: "BOB",
    direction: "Expense",
    occurredAt: "2026-10-01T10:00:00Z",
    createdAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

describe("account-detail domain", () => {
  describe("calculateRunningBalances", () => {
    it("computes accurate chronological running balances from initial balance to current balance", () => {
      const account = makeAccount({
        balance: new Decimal("24580.00"),
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      // 3 transactions:
      // Starting from 20000 (derived backwards from 24580 - 12000 + 350 + 2000 = 14930, or using transactions)
      const txns: TransactionDto[] = [
        makeTxn({
          id: "t1",
          amount: new Decimal("12000.00"),
          direction: "Income",
          occurredAt: "2026-10-01T00:00:00Z",
          description: "Salario",
        }),
        makeTxn({
          id: "t2",
          amount: new Decimal("350.00"),
          direction: "Expense",
          occurredAt: "2026-10-05T00:00:00Z",
          description: "Supermercado",
        }),
        makeTxn({
          id: "t3",
          amount: new Decimal("2000.00"),
          direction: "Expense",
          occurredAt: "2026-10-10T00:00:00Z",
          description: "Transferencia a Binance",
        }),
      ];

      const withBalances = calculateRunningBalances(account, txns);
      expect(withBalances).toHaveLength(3);

      // Latest transaction (t3) must equal account.balance (24580.00)
      const t3 = withBalances.find((t) => t.id === "t3");
      const t2 = withBalances.find((t) => t.id === "t2");
      const t1 = withBalances.find((t) => t.id === "t1");

      expect(t3?.runningBalance.toFixed(2)).toBe("24580.00");
      expect(t2?.runningBalance.toFixed(2)).toBe("26580.00"); // 26580 - 2000 = 24580
      expect(t1?.runningBalance.toFixed(2)).toBe("26930.00"); // 26930 - 350 = 26580
    });

    it("filters out reversed transactions and reversal records", () => {
      const account = makeAccount({ balance: new Decimal("1000") });
      const txns: TransactionDto[] = [
        makeTxn({ id: "t1", amount: new Decimal("200"), direction: "Income" }),
        makeTxn({ id: "t2", amount: new Decimal("50"), direction: "Expense" }),
        makeTxn({ id: "t2-rev", amount: new Decimal("50"), direction: "Income", reversesId: "t2" }),
      ];

      const withBalances = calculateRunningBalances(account, txns);
      expect(withBalances.map((t) => t.id)).toEqual(["t1"]);
      expect(withBalances[0].runningBalance.toFixed(2)).toBe("1000.00");
    });
  });

  describe("calculateCashFlowComparison", () => {
    it("calculates total income, total expenses and percentage split", () => {
      const txns: TransactionDto[] = [
        makeTxn({ id: "t1", amount: new Decimal("24000.00"), direction: "Income" }),
        makeTxn({ id: "t2", amount: new Decimal("11200.00"), direction: "Expense" }),
      ];

      const result = calculateCashFlowComparison(txns);

      expect(result.income.toFixed(2)).toBe("24000.00");
      expect(result.expenses.toFixed(2)).toBe("11200.00");
      expect(result.totalFlow.toFixed(2)).toBe("35200.00");
      // 24000 / 35200 = 68.18% ~ 68.2%
      expect(result.incomePercentage).toBeCloseTo(68.18, 1);
      // 11200 / 35200 = 31.81% ~ 31.8%
      expect(result.expensePercentage).toBeCloseTo(31.82, 1);
    });

    it("handles zero flow safely without NaN", () => {
      const result = calculateCashFlowComparison([]);
      expect(result.income.toNumber()).toBe(0);
      expect(result.expenses.toNumber()).toBe(0);
      expect(result.totalFlow.toNumber()).toBe(0);
      expect(result.incomePercentage).toBe(0);
      expect(result.expensePercentage).toBe(0);
    });
  });

  describe("calculateAccountPeriodStats", () => {
    it("calculates period KPIs including ticket promedio and variation", () => {
      const account = makeAccount({
        balance: new Decimal("24580.00"),
        createdAt: "2026-01-01T00:00:00Z",
      });

      const txns: TransactionDto[] = [
        makeTxn({ id: "t1", amount: new Decimal("24000.00"), direction: "Income" }),
        makeTxn({ id: "t2", amount: new Decimal("6000.00"), direction: "Expense" }),
        makeTxn({ id: "t3", amount: new Decimal("5200.00"), direction: "Expense" }),
      ];

      const stats = calculateAccountPeriodStats(account, txns);

      expect(stats.totalMovements).toBe(3);
      expect(stats.income.toFixed(2)).toBe("24000.00");
      expect(stats.expenses.toFixed(2)).toBe("11200.00");
      expect(stats.netVariation.toFixed(2)).toBe("12800.00");
      // Average ticket: 11200 / 2 expenses = 5600
      expect(stats.averageExpenseTicket.toFixed(2)).toBe("5600.00");
    });
  });

  describe("filterTransactionsByType and filterTransactionsByPeriod", () => {
    const txns: TransactionDto[] = [
      makeTxn({ id: "t1", direction: "Income", occurredAt: "2026-10-15T00:00:00Z" }),
      makeTxn({ id: "t2", direction: "Expense", occurredAt: "2026-10-10T00:00:00Z" }),
      makeTxn({ id: "t3", direction: "Expense", transferId: "tr-1", occurredAt: "2026-09-20T00:00:00Z" }),
    ];

    it("filters by type correctly", () => {
      expect(filterTransactionsByType(txns, "all")).toHaveLength(3);
      expect(filterTransactionsByType(txns, "Income")).toHaveLength(1);
      expect(filterTransactionsByType(txns, "Expense")).toHaveLength(1);
      expect(filterTransactionsByType(txns, "Transfer")).toHaveLength(1);
    });

    it("filters by period correctly", () => {
      const refDate = new Date("2026-10-20T00:00:00Z");
      const currentMonth = filterTransactionsByPeriod(txns, "current_month", refDate);
      expect(currentMonth).toHaveLength(2);
      expect(currentMonth.map((t) => t.id)).toEqual(["t1", "t2"]);

      const lastMonth = filterTransactionsByPeriod(txns, "last_month", refDate);
      expect(lastMonth).toHaveLength(1);
      expect(lastMonth[0].id).toBe("t3");
    });
  });

  describe("calculateBalanceEvolutionPoints", () => {
    it("returns formatted points for area chart with month labels", () => {
      const account = makeAccount({ balance: new Decimal("24580.00") });
      const txns: TransactionDto[] = [
        makeTxn({ id: "t1", amount: new Decimal("2000.00"), direction: "Income", occurredAt: "2026-05-15T00:00:00Z" }),
        makeTxn({ id: "t2", amount: new Decimal("500.00"), direction: "Expense", occurredAt: "2026-06-15T00:00:00Z" }),
        makeTxn({ id: "t3", amount: new Decimal("1000.00"), direction: "Income", occurredAt: "2026-08-10T00:00:00Z" }),
      ];

      const points = calculateBalanceEvolutionPoints(account, txns, "6m", new Date("2026-10-20T00:00:00Z"));
      expect(points.length).toBeGreaterThanOrEqual(6);
      const lastPoint = points[points.length - 1];
      expect(lastPoint.balance).toBeCloseTo(24580, 0);
    });
  });
});
