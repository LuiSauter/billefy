import Decimal from "decimal.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDto, TransactionDto } from "./ledger.types";
import {
  computeAccountMonthlyChanges,
  getActiveTransactions,
  getActiveFlowTransactions,
  monthKey,
  sumByMonth,
  sumMonthlyFlow,
  sumMonthlySpendingByCategory,
} from "./monthly-analytics";

const month = "2026-05";
const rate = 7.13;
function txn(id: string, changes: Partial<TransactionDto> = {}): TransactionDto {
  return {
    id, accountId: "source", amount: new Decimal("10"), currency: "BOB",
    direction: "Expense", categoryId: "food", occurredAt: "2026-05-15T12:00:00",
    createdAt: "2026-05-15T12:00:00", ...changes,
  };
}
function transfer(currency = "BOB"): TransactionDto[] {
  return [
    txn("out", { amount: new Decimal("71.30"), transferId: "transfer" }),
    txn("in", {
      accountId: "destination", direction: "Income", currency,
      amount: new Decimal(currency === "BOB" ? "71.30" : "10"), transferId: "transfer",
    }),
  ];
}
function categoryTotal(transactions: TransactionDto[], category = "food"): string | undefined {
  return sumMonthlySpendingByCategory(transactions, month, rate).get(category)?.toString();
}

afterEach(() => vi.useRealTimers());

describe("monthly non-transfer flows", () => {
  it.each(["BOB", "USD", "USDT"])("excludes both %s transfer legs, even with categories", (currency) => {
    const legs = transfer(currency);
    expect(sumByMonth(legs, month, "Income", rate)).toBe(0);
    expect(sumByMonth(legs, month, "Expense", rate)).toBe(0);
    expect(sumMonthlySpendingByCategory(legs, month, rate).size).toBe(0);
    expect(getActiveFlowTransactions(legs)).toEqual([]);
    expect(getActiveTransactions(legs)).toEqual(legs);
  });

  it("excludes reconciliation adjustments from income, spending, and category analytics while retaining balance changes", () => {
    const adjustment = Object.assign(txn("reconcile-expense", { amount: new Decimal("2.125") }), { isReconciliationAdjustment: true });
    const regular = txn("regular-expense", { amount: new Decimal("3.25") });
    const transactions = [adjustment, regular];
    expect(sumByMonth(transactions, month, "Expense", rate)).toBe(3.25);
    expect(categoryTotal(transactions)).toBe("3.25");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T12:00:00"));
    const account: AccountDto = { id: "source", name: "Source", type: "Bank", currency: "BOB", balance: new Decimal("97.875"), createdAt: "2026-01-01" };
    expect(computeAccountMonthlyChanges([account], [adjustment]).get("source")?.previousBalance).toBe(100);
  });

  it("excludes investment cash entries and their reversals from legacy income and spending analytics", () => {
    const investment = txn("investment", { investmentId: "inv-1", investmentCashKind: "Contribution", amount: new Decimal("90") });
    const disposal = txn("disposal", { direction: "Income", investmentId: "inv-1", investmentCashKind: "Disposal", amount: new Decimal("30") });
    const regular = txn("regular", { amount: new Decimal("5") });
    expect(sumByMonth([investment, disposal, regular], month, "Expense", rate)).toBe(5);
    expect(sumByMonth([investment, disposal, regular], month, "Income", rate)).toBe(0);
    expect(categoryTotal([investment, disposal, regular])).toBe("5");
  });

  it("keeps ordinary flows and aggregates decimal amounts and FX without float drift", () => {
    const transactions = [
      ...transfer("USD"),
      txn("salary", { direction: "Income", amount: new Decimal("100.1") }),
      txn("bonus", { direction: "Income", amount: new Decimal("0.2") }),
      txn("food-1", { amount: new Decimal("0.1") }),
      txn("food-2", { amount: new Decimal("0.2") }),
      txn("fx", { currency: "USD", amount: new Decimal("0.1"), categoryId: "travel" }),
      txn("uncategorized", { amount: new Decimal("0.2"), categoryId: undefined }),
    ];
    expect(sumMonthlyFlow(transactions, month, "Income", rate).toString()).toBe("100.3");
    expect(sumMonthlyFlow(transactions, month, "Expense", rate).toString()).toBe("1.213");
    expect(sumByMonth(transactions, month, "Expense", rate)).toBe(1.213);
    expect(categoryTotal(transactions)).toBe("0.3");
    expect(categoryTotal(transactions, "travel")).toBe("0.713");
    expect(sumMonthlySpendingByCategory(transactions, month, rate).size).toBe(2);
  });

  it("uses active allocation amounts per category without duplicating parent flow totals", () => {
    const split = txn("split", { amount: new Decimal("100"), categoryId: "legacy", allocations: [
      { categoryId: "food", amount: new Decimal("60") },
      { categoryId: "home", amount: new Decimal("40") },
    ] });
    const reversal = txn("split-reversal", { id: "split-reversal", amount: new Decimal("100"), direction: "Income", reversesId: "split", allocations: split.allocations });
    expect(sumByMonth([split, reversal], month, "Expense", rate)).toBe(0);
    expect(categoryTotal([split, reversal], "food")).toBeUndefined();
    expect(categoryTotal([split, reversal], "home")).toBeUndefined();
    expect(categoryTotal([split], "food")).toBe("60");
    expect(categoryTotal([split], "home")).toBe("40");
    expect(categoryTotal([split], "legacy")).toBeUndefined();
    expect(sumMonthlyFlow([split], month, "Expense", rate).toString()).toBe("100");
    expect(categoryTotal([...transfer(), split], "food")).toBe("60");
  });

  it("removes reversed income/expenses and their counterparts, retaining replacements", () => {
    const transactions = [
      txn("old-expense"),
      txn("reverse-expense", { direction: "Income", reversesId: "old-expense" }),
      txn("old-income", { direction: "Income" }),
      txn("reverse-income", { reversesId: "old-income" }),
      txn("replacement", { amount: new Decimal("3.25") }),
    ];
    expect(getActiveFlowTransactions(transactions).map((t) => t.id)).toEqual(["replacement"]);
    expect(sumByMonth(transactions, month, "Income", rate)).toBe(0);
    expect(sumByMonth(transactions, month, "Expense", rate)).toBe(3.25);
    expect(categoryTotal(transactions)).toBe("3.25");
  });

  it("finds reversal links before filtering month or transfer metadata", () => {
    const transactions = [
      txn("original"),
      txn("later-reversal", {
        direction: "Income", reversesId: "original", transferId: "link",
        occurredAt: "2026-06-01T12:00:00",
      }),
    ];
    expect(sumByMonth(transactions, month, "Expense", rate)).toBe(0);
    expect(categoryTotal(transactions)).toBeUndefined();
  });

  it("preserves local month boundaries, ignores invalid dates, and uses the supplied rate", () => {
    const transactions = [
      txn("before", { occurredAt: "2026-04-30T23:59:59.999" }),
      txn("start", { occurredAt: "2026-05-01T00:00:00", amount: new Decimal("0.1") }),
      txn("end", { occurredAt: "2026-05-31T23:59:59.999", amount: new Decimal("0.2") }),
      txn("after", { occurredAt: "2026-06-01T00:00:00" }),
      txn("invalid", { occurredAt: "not-a-date" }),
    ];
    expect(sumByMonth(transactions, month, "Expense", rate)).toBe(0.3);
    expect(categoryTotal(transactions)).toBe("0.3");
    const offset = txn("offset", { occurredAt: "2026-06-01T00:30:00+02:00", currency: "USD" });
    expect(sumByMonth([offset], monthKey(new Date(offset.occurredAt)), "Expense", 2)).toBe(20);
    expect(sumByMonth([], month, "Income", rate)).toBe(0);
  });
});

describe("account monthly changes retain ledger movements", () => {
  it.each(["BOB", "USD"])("keeps %s transfer debits/credits in individual accounts", (currency) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T12:00:00"));
    const destinationBalance = currency === "BOB" ? "121.30" : "60";
    const accounts: AccountDto[] = [
      { id: "source", name: "Source", type: "Bank", currency: "BOB", balance: new Decimal("128.70"), createdAt: "2026-01-01" },
      { id: "destination", name: "Destination", type: "Bank", currency, balance: new Decimal(destinationBalance), createdAt: "2026-01-01" },
    ];
    const changes = computeAccountMonthlyChanges(accounts, transfer(currency));
    expect(changes.get("source")?.balance).toBe(128.7);
    expect(changes.get("source")?.previousBalance).toBe(200);
    expect(changes.get("source")?.changePct).toBeCloseTo(-35.65);
    expect(changes.get("destination")?.balance).toBe(Number(destinationBalance));
    expect(changes.get("destination")?.previousBalance).toBeCloseTo(50);
    expect(changes.get("destination")?.changePct).toBeCloseTo(currency === "BOB" ? 142.6 : 20);
  });

  it("includes reversal counterparts so a reversed transfer restores the account baseline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T12:00:00"));
    const [out, incoming] = transfer("USD");
    const transactions = [out, incoming,
      txn("undo-out", { ...out, id: "undo-out", direction: "Income", reversesId: out.id }),
      txn("undo-in", { ...incoming, id: "undo-in", direction: "Expense", reversesId: incoming.id }),
    ];
    const account: AccountDto = {
      id: "source", name: "Source", type: "Bank", currency: "BOB",
      balance: new Decimal(200), createdAt: "2026-01-01",
    };
    expect(computeAccountMonthlyChanges([account], transactions).get("source")).toEqual({
      accountId: "source", balance: 200, previousBalance: 200, changePct: 0,
    });
    expect(getActiveTransactions(transactions)).toEqual([]);
    expect(sumByMonth(transactions, month, "Expense", rate)).toBe(0);
  });
});
