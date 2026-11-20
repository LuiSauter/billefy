import { describe, expect, it, vi } from "vitest";
import { budgetEditFields, buildBudgetEditRequest, createBudgetEditSubmitter } from "./budget-edit";
import { BudgetDto } from "./planning.types";

const budget: BudgetDto = {
  id: "budget", categoryId: "category", currency: "USD", period: "monthly",
  limitAmount: 123.45, alertThreshold: 0.805, spentAmount: 0, remainingAmount: 123.45,
  percentageUsed: 0, isAlertTriggered: false, isExceeded: false, isActive: true, createdAt: "",
};

describe("budget edit", () => {
  it("opens with the original amount and precise percentage, never silently rounding a threshold", () => {
    expect(budgetEditFields(budget)).toEqual({ limit: "123.45", alertPercent: "80.5" });
    expect(() => buildBudgetEditRequest(budget, budgetEditFields(budget))).toThrow(/entero/);
  });

  it.each([1, 80, 100])("sends only the two editable fields at %s percent without mutating identity", (percent) => {
    const original = structuredClone(budget);
    expect(buildBudgetEditRequest(budget, { limit: "200.125", alertPercent: String(percent) }))
      .toEqual({ limitAmount: 200.13, alertThreshold: percent / 100 });
    expect(budget).toEqual(original);
  });

  it.each(["", "0", "-1", "101", "80.5", "NaN", "Infinity"])("rejects invalid percentage %s", (alertPercent) => {
    expect(() => buildBudgetEditRequest(budget, { limit: "20", alertPercent })).toThrow(/entero/);
  });

  it.each(["", "0", "-1", "0.004", "NaN", "Infinity"])("rejects nonpositive amounts after rounding: %s", (limit) => {
    expect(() => buildBudgetEditRequest(budget, { limit, alertPercent: "80" })).toThrow(/positivo/);
  });

  it("keeps small original crypto amounts editable without exponential notation", () => {
    expect(budgetEditFields({ ...budget, currency: "BTC", limitAmount: 0.00000001 }).limit).toBe("0.00000001");
  });

  it("does not call the mutation for invalid inputs and allows correction", async () => {
    const update = vi.fn().mockResolvedValue({ applied: true });
    const submit = createBudgetEditSubmitter(update);
    await expect(submit(budget, budgetEditFields(budget))).rejects.toThrow(/entero/);
    expect(update).not.toHaveBeenCalled();
    await expect(submit(budget, { limit: "100", alertPercent: "80" })).resolves.toEqual({ applied: true });
  });

  it("uses currency scale with decimal half-up rounding, including BTC", () => {
    expect(buildBudgetEditRequest(budget, { limit: "0.005", alertPercent: "80" }).limitAmount).toBe(0.01);
    expect(buildBudgetEditRequest({ ...budget, currency: "BTC" }, { limit: "0.000000015", alertPercent: "80" }).limitAmount).toBe(0.00000002);
  });

  it("retains input on rejected writes and permits a corrected retry", async () => {
    const fields = { limit: "200.12", alertPercent: "90" };
    const update = vi.fn().mockRejectedValueOnce(new Error("Sin conexión"))
      .mockResolvedValueOnce({ applied: true, refresh: { status: "refreshed" } });
    const submit = createBudgetEditSubmitter(update);
    await expect(submit(budget, fields)).rejects.toThrow("Sin conexión");
    expect(fields).toEqual({ limit: "200.12", alertPercent: "90" });
    await expect(submit(budget, fields)).resolves.toMatchObject({ applied: true });
    expect(update).toHaveBeenLastCalledWith("budget", { limitAmount: 200.12, alertThreshold: 0.9 });
  });

  it("blocks concurrent submits and never retries an applied write when refresh fails", async () => {
    const result = { applied: true as const, refresh: { status: "failed", error: new Error("Reload") } };
    let resolve!: (value: typeof result) => void;
    const update = vi.fn(() => new Promise<typeof result>((done) => { resolve = done; }));
    const submit = createBudgetEditSubmitter(update);
    const fields = { limit: "200", alertPercent: "80" };
    const first = submit(budget, fields);
    await expect(submit(budget, fields)).resolves.toBeUndefined();
    resolve(result);
    await expect(first).resolves.toBe(result);
    await expect(submit(budget, fields)).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
