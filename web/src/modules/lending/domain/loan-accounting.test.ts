import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { calculateDashboardHomeAnalytics } from "@/modules/dashboard/domain/dashboard-home-analytics";
import { calculateFinancialReport } from "@/modules/reports/domain/reports-analytics";
import { calculateCalendarAnalytics } from "@/modules/planning/domain/calendar-analytics";

const transaction = (id: string, amount: number, direction: "Income" | "Expense", loanCashKind?: "Principal" | "Interest" | "CardPurchase") => ({
  id, accountId: loanCashKind === "CardPurchase" ? "card" : "bank", currency: "BOB", amount: new Decimal(amount),
  direction, categoryId: direction === "Expense" ? "food" : undefined,
  occurredAt: "2027-01-15T00:00:00Z", createdAt: "2027-01-15T00:00:00Z",
  ...(loanCashKind ? { loanId: "loan", loanCashKind } : {}),
}) satisfies TransactionDto & { loanId?: string; loanCashKind?: "Principal" | "Interest" | "CardPurchase" };
const postings = [transaction("received", 900, "Income", "Principal"), transaction("payment", 700, "Expense", "Principal"),
  transaction("interestPaid", 30, "Expense", "Interest"), transaction("interestReceived", 20, "Income", "Interest"),
  transaction("purchase", 350, "Expense", "CardPurchase")];

describe("loan accounting projections", () => {
  it("dashboard recognizes card purchases and interest but never principal as result", () => {
    const result = calculateDashboardHomeAnalytics({ transactions: postings, year: 2027, month: 0 });
    expect(result.monthlyCashFlow.income).toBe(20);
    expect(result.monthlyCashFlow.expenses).toBe(380);
    expect(result.categoryExpenses).toEqual([expect.objectContaining({ id: "food", amount: 380 })]);
  });
  it("reports recognize the same expense and income without counting repayment twice", () => {
    const result = calculateFinancialReport({ transactions: postings, accounts: [], periodMonths: 1,
      referenceDate: "2027-01-31T23:59:59Z" });
    expect(result.kpis.totalIncome).toBe(20);
    expect(result.kpis.totalExpenses).toBe(380);
    expect(result.categoryExpenses).toEqual([expect.objectContaining({ category: "food", amount: 380 })]);
  });
  it("calendar result totals exclude posted principal and include the card expense", () => {
    const result = calculateCalendarAnalytics({ transactions: postings, year: 2027, month: 0 });
    expect(result.periodSummary.ingresos).toBe(20);
    expect(result.periodSummary.gastos).toBe(380);
    expect(result.events.filter(event => event.source === "transaction")).toHaveLength(3);
  });
  it("preserves ordinary salary, cash expense and expense categories", () => {
    const result = calculateDashboardHomeAnalytics({ transactions: [transaction("salary", 5000, "Income"),
      transaction("food", 550, "Expense")], year: 2027, month: 0 });
    expect(result.monthlyCashFlow.income).toBe(5000);
    expect(result.monthlyCashFlow.expenses).toBe(550);
    expect(result.categoryExpenses).toEqual([expect.objectContaining({ id: "food", amount: 550 })]);
  });
});
