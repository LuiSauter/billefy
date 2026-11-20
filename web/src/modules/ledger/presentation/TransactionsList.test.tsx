import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { getDisplayedTransactions } from "./TransactionsList";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";

function txn(id: string, changes: Partial<TransactionDto> = {}): TransactionDto {
  return {
    id,
    accountId: "account",
    amount: new Decimal("10"),
    currency: "BOB",
    direction: "Expense",
    occurredAt: "2026-05-15T12:00:00",
    createdAt: "2026-05-15T12:00:00",
    ...changes,
  };
}

describe("TransactionsList reconciliation adjustments", () => {
  const adjustment = txn("adjustment", { isReconciliationAdjustment: true });
  const expense = txn("expense");
  const income = txn("income", { direction: "Income" });
  const transactions = [adjustment, expense, income];

  it("only includes regular transactions in income and expense filters", () => {
    expect(getDisplayedTransactions(transactions, "Expense")).toEqual([expense]);
    expect(getDisplayedTransactions(transactions, "Income")).toEqual([income]);
  });

  it("keeps marked adjustments visible in the unfiltered activity list", () => {
    expect(getDisplayedTransactions(transactions, "ALL")).toEqual(transactions);
  });
});
