import { describe, expect, it } from "vitest";
import { parseMovementPage } from "./movement";

describe("investment movement parsing", () => {
  it("keeps investment identity and exact cash summaries separate by currency, defaulting only absent fields", () => {
    const page = parseMovementPage({
      page: 1, pageSize: 10, totalCount: 1,
      items: [{ id: "cash-1", kind: "Investment", amount: "12.340001", currency: "USD", direction: "Expense", occurredAt: "2026-01-01", accountId: "a", accountName: "Broker", investmentId: "inv-1", investmentCashKind: "Contribution", isReversal: false }],
      summary: [
        { currency: "USD", income: "2", expenses: "3", transferOut: "4.10", transferIn: "5.20", contributions: "6.30", disposals: "7.40" },
        { currency: "BOB", income: "0", expenses: "0" },
      ],
    });
    expect(page.items[0]).toMatchObject({ kind: "Investment", investmentId: "inv-1", investmentCashKind: "Contribution" });
    expect(page.items[0].amount.toString()).toBe("12.340001");
    expect(page.summary.map(s => [s.currency, s.transferOut.toString(), s.transferIn.toString(), s.contributions.toString(), s.disposals.toString()])).toEqual([
      ["USD", "4.1", "5.2", "6.3", "7.4"], ["BOB", "0", "0", "0", "0"],
    ]);
  });
});
