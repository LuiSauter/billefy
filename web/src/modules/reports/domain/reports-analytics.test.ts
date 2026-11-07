import Decimal from "decimal.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import type { BudgetDto } from "@/modules/planning/domain/planning.types";
import { calculateFinancialReport } from "./reports-analytics";

const referenceDate = "2026-10-31T23:59:59.999Z";
function transaction(id: string, amount: string, changes: Partial<TransactionDto> = {}): TransactionDto {
  return { id, accountId: "cash", amount: new Decimal(amount), currency: "BOB", direction: "Expense",
    occurredAt: "2026-10-15T12:00:00Z", createdAt: "2026-10-15T12:00:00Z", ...changes };
}
function account(balance: string, changes: Partial<AccountDto> = {}): AccountDto {
  return { id: "cash", name: "Cash", type: "Savings", currency: "BOB", balance: new Decimal(balance),
    createdAt: "2020-01-01T00:00:00Z", ...changes };
}
function loan(remaining: string, changes: Partial<LoanSummaryDto> = {}): LoanSummaryDto {
  return { id: "loan", counterpartyId: "counterparty", counterpartyName: "Synthetic loan", type: "Borrowed",
    template: "NoInterest", status: "Active", principal: new Decimal(remaining), remainingPrincipal: new Decimal(remaining),
    currency: "BOB", interestRate: 0, annualEffectiveRate: 0, disbursementDate: "2026-01-01",
    firstDueDate: "2026-02-01", totalInstallments: 12, createdAt: "2026-01-01", ...changes };
}
function budget(limitAmount: number, changes: Partial<BudgetDto> = {}): BudgetDto {
  return { id: "budget", limitAmount, period: "monthly", currency: "BOB", alertThreshold: 0.8,
    spentAmount: 99999, remainingAmount: 0, percentageUsed: 100, isAlertTriggered: false,
    isExceeded: false, isActive: true, createdAt: "2026-01-01", ...changes };
}
function report(transactions: TransactionDto[] = [], changes: Partial<Parameters<typeof calculateFinancialReport>[0]> = {}) {
  return calculateFinancialReport({ transactions, accounts: [], referenceDate, ...changes });
}
afterEach(() => vi.useRealTimers());

describe("calculateFinancialReport", () => {
  it("returns zero metrics and six chronological, zero-filled Spanish months for empty inputs", () => {
    const result = report();
    expect(result.kpis).toEqual({ totalIncome: 0, incomeGrowthPct: 0, totalExpenses: 0, expensesGrowthPct: 0,
      savingsAndInvestments: 0, savingsGrowthPct: 0, netBalance: 0, netBalanceGrowthPct: 0 });
    expect(result.cashFlowEvolution.map((point) => point.month)).toEqual(["May", "Jun", "Jul", "Ago", "Sep", "Oct"]);
    expect(result.cashFlowEvolution.map((point) => point.monthKey)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(result.cashFlowEvolution.every((point) => point.income === 0 && point.expenses === 0 && point.net === 0)).toBe(true);
    expect(result.netWorthEvolution.every((point) => point.netWorth === 0)).toBe(true);
    expect(result.periodSummary).toEqual({ savingsRatio: 0, netWorthGrowthPct: 0, debtRatio: 0, budgetCompliance: 0 });
    expect(result.categoryExpenses).toEqual([]);
    expect(result.conclusion).toMatchObject({ title: "Conclusión del período", healthStatus: "warning" });
    expect(result.conclusion.narrative).toContain("No hay ingresos ni gastos");
    expect(result.conclusion.narrative).toContain("Sin presupuesto");
  });

  it("aggregates exact decimal flows without rounding individual transactions", () => {
    const result = report([
      transaction("salary", "1000.1", { direction: "Income" }),
      transaction("bonus", "0.2", { direction: "Income" }),
      transaction("food", "0.1"), transaction("rent", "0.2"),
      transaction("micro-a", "0.000001"), transaction("micro-b", "0.000002"),
    ], { periodMonths: 1 });
    expect(result.kpis.totalIncome).toBe(1000.3);
    expect(result.kpis.totalExpenses).toBe(0.300003);
    expect(result.kpis.netBalance).toBe(999.999997);
    expect(result.kpis.savingsAndInvestments).toBe(999.999997);
    expect(result.cashFlowEvolution).toEqual([{ month: "Oct", monthKey: "2026-10", income: 1000.3, expenses: 0.300003, net: 999.999997 }]);
  });

  it.each(["BOB", "USD"])("converts transactions, accounts, loans and budgets to %s", (selectedCurrency) => {
    const result = report([
      transaction("salary", "100", { direction: "Income", currency: "USD" }),
      transaction("bonus", "100", { direction: "Income" }),
      transaction("expense", "10", { currency: "USDT" }), transaction("expense-bob", "50"),
    ], { periodMonths: 1, selectedCurrency, p2pRate: 10,
      accounts: [account("1000"), account("100", { id: "usd", currency: "USD" })],
      loans: [loan("20", { currency: "USD" })], budgets: [budget(20, { currency: "USD" })] });
    const inBob = selectedCurrency === "BOB";
    expect(result.kpis.totalIncome).toBe(inBob ? 1100 : 110);
    expect(result.kpis.totalExpenses).toBe(inBob ? 150 : 15);
    expect(result.kpis.netBalance).toBe(inBob ? 950 : 95);
    expect(result.netWorthEvolution[0].netWorth).toBe(inBob ? 1800 : 180);
    expect(result.periodSummary.debtRatio).toBe(10);
    expect(result.periodSummary.budgetCompliance).toBe(75);
  });

  it("compares equal calendar-month windows, including year rollover and negative net baselines", () => {
    const result = report([
      transaction("old-income", "100", { direction: "Income", occurredAt: "2025-10-01T00:00:00Z" }),
      transaction("old-expense", "200", { occurredAt: "2025-12-31T23:59:59Z" }),
      transaction("income", "200", { direction: "Income", occurredAt: "2026-01-01T00:00:00Z" }),
      transaction("expense", "100", { occurredAt: "2026-03-01T00:00:00Z" }),
      transaction("too-old", "999", { occurredAt: "2025-09-30T23:59:59Z" }),
      transaction("future", "999", { occurredAt: "2026-03-16T00:00:00Z" }),
    ], { periodMonths: 3, referenceDate: "2026-03-15T12:00:00Z" });
    expect(result.kpis).toEqual({ totalIncome: 200, incomeGrowthPct: 100, totalExpenses: 100, expensesGrowthPct: -50,
      savingsAndInvestments: 100, savingsGrowthPct: 0, netBalance: 100, netBalanceGrowthPct: 200 });
    expect(result.cashFlowEvolution.map((point) => point.monthKey)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(result.cashFlowEvolution[1]).toMatchObject({ income: 0, expenses: 0, net: 0 });
  });

  it("computes savings growth separately from net balance growth in a positive prior window", () => {
    const result = report([
      transaction("prior-income", "100", { direction: "Income", occurredAt: "2026-09-10" }),
      transaction("prior-expense", "80", { occurredAt: "2026-09-10" }),
      transaction("income", "200", { direction: "Income" }), transaction("expense", "100"),
    ], { periodMonths: 1 });
    expect(result.kpis.savingsGrowthPct).toBe(400);
    expect(result.kpis.netBalanceGrowthPct).toBe(400);
    expect(result.periodSummary.savingsRatio).toBe(50);
  });

  it("groups split allocations by category name, falls back to IDs, and retains uncategorized spending", () => {
    const result = report([
      transaction("split", "100", { currency: "USD", categoryId: "unused", allocations: [
        { categoryId: "food", categoryName: "Alimentación", amount: new Decimal(60) },
        { categoryId: "home", categoryName: "Vivienda", amount: new Decimal(40) },
      ] }),
      transaction("food", "100", { categoryId: "food" }),
      transaction("other", "200"), transaction("transport", "50", { categoryId: "transport" }),
    ], { p2pRate: 10 });
    expect(result.kpis.totalExpenses).toBe(1350);
    expect(result.categoryExpenses).toEqual([
      { category: "Alimentación", amount: 700, percentage: 51.85 },
      { category: "Vivienda", amount: 400, percentage: 29.63 },
      { category: "Sin categoría", amount: 200, percentage: 14.81 },
      { category: "transport", amount: 50, percentage: 3.7 },
    ]);
  });

  it("excludes internal transfers, investment cash, reconciliations and reversals from operating KPIs", () => {
    const result = report([
      transaction("income", "100", { direction: "Income" }), transaction("expense", "20"),
      transaction("out", "30", { transferId: "transfer" }),
      transaction("in", "30", { direction: "Income", accountId: "other", transferId: "transfer" }),
      transaction("contribution", "10", { investmentId: "inv", investmentCashKind: "Contribution" }),
      transaction("disposal", "5", { investmentId: "inv", investmentCashKind: "Disposal", direction: "Income" }),
      transaction("adjustment", "5", { isReconciliationAdjustment: true, direction: "Income" }),
      transaction("reversed", "999"), transaction("reversal", "999", { direction: "Income", reversesId: "reversed" }),
    ], { periodMonths: 1, accounts: [account("100"), account("100", { id: "other" })] });
    expect(result.kpis).toMatchObject({ totalIncome: 100, totalExpenses: 20, savingsAndInvestments: 80, netBalance: 80 });
    expect(result.categoryExpenses).toEqual([{ category: "Sin categoría", amount: 20, percentage: 100 }]);
    expect(result.netWorthEvolution[0].netWorth).toBe(200);
    // Raw ledger movements (including investment cash and adjustments) total 80.
    expect(result.periodSummary.netWorthGrowthPct).toBe(66.67);
  });

  it("reconstructs monthly account balances, retaining dated reversals and not clamping negative balances", () => {
    const result = report([
      transaction("income", "100", { direction: "Income", occurredAt: "2026-09-15" }),
      transaction("spend", "20"),
      transaction("reversed", "30", { occurredAt: "2026-09-10" }),
      transaction("undo", "30", { direction: "Income", reversesId: "reversed" }),
      transaction("unowned", "999", { accountId: "unknown" }),
    ], { periodMonths: 3, accounts: [account("180"), account("-20", { id: "overdraft" })],
      loans: [loan("40"), loan("20", { id: "receivable", type: "Lent" }),
        loan("999", { id: "paid", status: "Paid" }), loan("999", { id: "cancelled", status: "Cancelled" })] });
    expect(result.netWorthEvolution.map((point) => point.netWorth)).toEqual([60, 130, 140]);
    expect(result.periodSummary.netWorthGrowthPct).toBe(133.33);
    expect(result.periodSummary.debtRatio).toBe(30);
    expect(result.conclusion.narrative).toContain("estimación");
  });

  it("does not invent historical balances before an account or loan existed", () => {
    const result = report([], { periodMonths: 3,
      accounts: [account("100", { createdAt: "2026-10-10" })],
      loans: [loan("20", { createdAt: "2026-10-10", disbursementDate: "2026-10-10" })] });
    expect(result.netWorthEvolution.map((point) => point.netWorth)).toEqual([0, 0, 80]);
    expect(result.periodSummary.netWorthGrowthPct).toBe(0);
  });

  it("scales active monthly and yearly budget limits by eligible months, ignoring stale spentAmount", () => {
    const result = report([transaction("expense", "180")], { periodMonths: 3, budgets: [
      budget(100), budget(1200, { id: "annual", period: "yearly" }),
      budget(100, { id: "recent", createdAt: "2026-10-10" }),
      budget(999, { id: "inactive", isActive: false }),
      budget(999, { id: "future", createdAt: "2026-11-01" }),
    ] });
    expect(result.periodSummary.budgetCompliance).toBe(25.71); // 180 / (300 + 300 + 100).
  });

  it("handles no income, no assets and outstanding debt without NaN or false healthy ratios", () => {
    const result = report([transaction("expense", "100")], { periodMonths: 1, loans: [loan("100")] });
    expect(result.kpis).toMatchObject({ totalIncome: 0, totalExpenses: 100, netBalance: -100, savingsAndInvestments: 0 });
    expect(result.periodSummary.savingsRatio).toBe(0);
    expect(result.periodSummary.debtRatio).toBe(100);
    expect(result.conclusion.healthStatus).toBe("critical");
    expect(result.conclusion.narrative).toContain("sin ingresos");
    expect(result.conclusion.narrative).toContain("sin activos");
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity|null/);
  });

  it.each([
    ["excellent", "50", "10", "100"],
    ["good", "85", "10", "100"],
    ["warning", "95", "35", "90"],
    ["critical", "120", "60", "100"],
  ])("generates a %s diagnosis from actual savings, debt and budget execution", (status, expenses, debt, limit) => {
    const result = report([transaction("income", "100", { direction: "Income" }), transaction("expense", expenses)], {
      periodMonths: 1, accounts: [account("100")], loans: [loan(debt)], budgets: [budget(Number(limit))],
    });
    expect(result.conclusion.healthStatus).toBe(status);
    expect(result.conclusion.narrative).toContain(`${result.periodSummary.savingsRatio.toFixed(1)}%`);
    expect(result.conclusion.narrative).toContain(`${result.periodSummary.debtRatio.toFixed(1)}%`);
    expect(result.conclusion.narrative).toContain(`${result.periodSummary.budgetCompliance.toFixed(1)}%`);
    expect(result.conclusion.narrative).not.toMatch(/NaN|Infinity/);
    if (status === "critical") expect(result.conclusion.narrative).toContain("superan tus ingresos");
  });

  it("uses the reference instant and UTC month boundaries, supporting Date objects and defaults", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    const transactions = [
      transaction("utc-september", "20", { direction: "Income", occurredAt: "2026-10-01T00:30:00+02:00" }),
      transaction("utc-october", "30", { direction: "Income", occurredAt: "2026-10-01T00:00:00Z" }),
      transaction("future", "999", { occurredAt: "2026-10-15T12:00:00.001Z" }),
      transaction("invalid", "999", { occurredAt: "invalid" }),
    ];
    const result = calculateFinancialReport({ transactions, accounts: [], periodMonths: 1 });
    expect(result.kpis.totalIncome).toBe(30);
    expect(result.kpis.incomeGrowthPct).toBe(50);
    expect(result.kpis.totalExpenses).toBe(0);
    expect(calculateFinancialReport({ transactions, accounts: [], periodMonths: 1, referenceDate: new Date() })).toEqual(result);
  });

  it.each([1, 3, 6, 12])("supports a %i-month period", (periodMonths) => {
    const result = report([], { periodMonths });
    expect(result.cashFlowEvolution).toHaveLength(periodMonths);
    expect(result.netWorthEvolution).toHaveLength(periodMonths);
  });

  it("requires real FX for nonzero cross-currency values instead of inventing a rate", () => {
    expect(() => report([transaction("usd", "10", { currency: "USD" })])).toThrow(/P2P/);
    for (const p2pRate of [0, -1, NaN, Infinity]) {
      expect(() => report([], { accounts: [account("10", { currency: "USD" })], p2pRate })).toThrow(/P2P/);
    }
    expect(() => report([transaction("eur", "10", { currency: "EUR" })], { p2pRate: 10 })).toThrow(/currency/i);
    expect(() => report([transaction("usd-zero", "0", { currency: "USD" })])).not.toThrow();
    expect(() => report([], { accounts: [account("10")], p2pRate: 0 })).not.toThrow();
  });

  it("rejects invalid period, reference date and non-finite monetary input", () => {
    for (const periodMonths of [0, -1, 1.5, NaN, Infinity]) expect(() => report([], { periodMonths })).toThrow(RangeError);
    expect(() => report([], { referenceDate: "invalid" })).toThrow(RangeError);
    expect(() => report([transaction("bad", "NaN")])).toThrow(RangeError);
    expect(() => report([], { accounts: [account("Infinity")] })).toThrow(RangeError);
  });

  it("only applies reversals known at the reference instant, even across window boundaries", () => {
    const transactions = [
      transaction("prior", "40", { occurredAt: "2026-09-10T00:00:00Z" }),
      transaction("undo", "40", { direction: "Income", reversesId: "prior", occurredAt: "2026-10-10T00:00:00Z" }),
      transaction("current", "20", { occurredAt: "2026-10-10T00:00:00Z" }),
      transaction("future-undo", "20", { direction: "Income", reversesId: "current", occurredAt: "2026-11-01T00:00:00Z" }),
    ];
    const result = report(transactions, { periodMonths: 1, accounts: [account("80")] });
    expect(result.kpis.totalExpenses).toBe(20);
    expect(result.kpis.totalIncome).toBe(0);
    expect(result.kpis.expensesGrowthPct).toBe(0); // Reversed prior spending has no usable baseline.
    expect(result.periodSummary.netWorthGrowthPct).toBe(33.33); // Raw October ledger net is +20.
  });

  it("retains partial allocation remainders and rejects allocations exceeding the expense", () => {
    const split = transaction("partial", "100", { allocations: [{ categoryId: "home", amount: new Decimal(60) }] });
    expect(report([split]).categoryExpenses).toEqual([
      { category: "home", amount: 60, percentage: 60 },
      { category: "Sin categoría", amount: 40, percentage: 40 },
    ]);
    expect(() => report([{ ...split, amount: new Decimal(50) }])).toThrow(/allocations/);
    expect(() => report([{ ...split, allocations: [{ categoryId: "home", amount: new Decimal(-1) }] }])).toThrow(/allocations/);
  });

  it("aggregates fractional FX and rounds only at the output boundary", () => {
    const transactions = [transaction("a", "0.1", { currency: "USD" }), transaction("b", "0.2", { currency: "USD" })];
    const result = report(transactions, { periodMonths: 1, p2pRate: 7.13 });
    expect(result.kpis.totalExpenses).toBe(2.139);
    expect(result.cashFlowEvolution[0].expenses).toBe(2.139);
    expect(result.categoryExpenses).toEqual([{ category: "Sin categoría", amount: 2.139, percentage: 100 }]);
    expect(report([transaction("bob", "1")], { selectedCurrency: "USD", p2pRate: 3 }).kpis.totalExpenses).toBe(0.333333);
  });

  it("treats zero budgets as unavailable and does not cap genuine over-budget execution", () => {
    const transactions = [transaction("salary", "200", { direction: "Income" }), transaction("expense", "100")];
    const unavailable = report(transactions, { periodMonths: 1, budgets: [budget(0)] });
    expect(unavailable.periodSummary.budgetCompliance).toBe(0);
    expect(unavailable.conclusion.narrative).toContain("Sin presupuesto");
    const exceeded = report(transactions, { periodMonths: 1, budgets: [budget(50)] });
    expect(exceeded.periodSummary.budgetCompliance).toBe(200);
    expect(exceeded.conclusion.healthStatus).toBe("warning");
    expect(exceeded.conclusion.narrative).toContain("revisa los excesos");
  });

  it("does not mutate the provided DTOs or depend on global Decimal precision", () => {
    const transactions = [transaction("a", "0.1"), transaction("b", "0.2")];
    const accounts = [account("1.5")];
    const before = JSON.stringify({ transactions, accounts });
    const precision = Decimal.precision;
    try {
      Decimal.set({ precision: 2 });
      expect(report(transactions, { accounts }).kpis.totalExpenses).toBe(0.3);
      expect(report(transactions, { accounts }).netWorthEvolution.at(-1)?.netWorth).toBe(1.5);
      expect(JSON.stringify({ transactions, accounts })).toBe(before);
    } finally {
      Decimal.set({ precision });
    }
  });
});
