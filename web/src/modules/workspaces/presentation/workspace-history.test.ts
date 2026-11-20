import { describe, expect, it, vi } from "vitest";
import { readWorkspaceExpenseHistory } from "./useWorkspaceExpenseHistory";
import { expensesFixture } from "./workspace-view.fixtures";

describe("workspace expense history", () => {
  it("loads every API page so old months and totals are not silently truncated", async () => {
    const first = Array.from({ length: 500 }, (_, index) => ({ ...expensesFixture[0], id: String(index) }));
    const getExpenses = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce([{ ...expensesFixture[0], id: "old", date: "2025-01-01" }]);
    const result = await readWorkspaceExpenseHistory({ getExpenses }, "home");
    expect(result).toHaveLength(501);
    expect(getExpenses.mock.calls).toEqual([["home", { limit: 500, offset: 0 }], ["home", { limit: 500, offset: 500 }]]);
    expect(result.at(-1)?.id).toBe("old");
  });
  it("does not present a failed later page as a complete history", async () => {
    const getExpenses = vi.fn().mockResolvedValueOnce(Array.from({ length: 500 }, () => expensesFixture[0])).mockRejectedValueOnce(new Error("unavailable"));
    await expect(readWorkspaceExpenseHistory({ getExpenses }, "home")).rejects.toThrow("unavailable");
  });
});
