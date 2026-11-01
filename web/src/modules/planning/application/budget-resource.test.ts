import { describe, expect, it, vi } from "vitest";
import { BudgetDto } from "../domain/planning.types";
import { createBudgetResource } from "./budget-resource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const budget = { id: "budget-a", limitAmount: 100 } as BudgetDto;
const request = { limitAmount: 200, alertThreshold: 0.8 };
function fixture() {
  const reads: ReturnType<typeof deferred<BudgetDto[]>>[] = [];
  const repo = {
    getBudgets: vi.fn(() => {
      const read = deferred<BudgetDto[]>();
      reads.push(read);
      return read.promise;
    }),
    createBudget: vi.fn(async () => ({ id: "created" })),
    updateBudget: vi.fn(async () => {}),
  };
  return { resource: createBudgetResource(repo), repo, reads };
}

describe("budget resource", () => {
  it("publishes initial, loading, populated and genuinely empty states", async () => {
    const { resource, reads } = fixture();
    const listener = vi.fn();
    const unsubscribe = resource.subscribe(listener);
    expect(resource.getSnapshot()).toEqual({ budgets: [], budgetsLoading: false, budgetsError: null });
    const first = resource.refreshBudgets();
    expect(resource.getSnapshot().budgetsLoading).toBe(true);
    reads[0].resolve([budget]);
    expect(await first).toEqual({ status: "refreshed" });
    expect(resource.getSnapshot()).toEqual({ budgets: [budget], budgetsLoading: false, budgetsError: null });
    const empty = resource.refreshBudgets();
    reads[1].resolve([]);
    await empty;
    expect(resource.getSnapshot().budgets).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it("preserves last-good budgets on failure and retries through the same repository read", async () => {
    const { resource, reads, repo } = fixture();
    const initial = resource.refreshBudgets();
    reads[0].resolve([budget]);
    await initial;
    const failed = resource.refreshBudgets();
    const error = new Error("read unavailable");
    reads[1].reject(error);
    expect(await failed).toEqual({ status: "failed", error });
    expect(resource.getSnapshot()).toEqual({ budgets: [budget], budgetsLoading: false, budgetsError: error });
    const retry = resource.refreshBudgets();
    expect(resource.getSnapshot()).toEqual({ budgets: [budget], budgetsLoading: true, budgetsError: null });
    reads[2].resolve([{ ...budget, limitAmount: 200 }]);
    await retry;
    expect(repo.getBudgets).toHaveBeenCalledTimes(3);
    expect(resource.getSnapshot().budgets[0].limitAmount).toBe(200);
  });

  it.each([false, true])("ignores older overlapping success/failure (failure=%s)", async (failure) => {
    const { resource, reads } = fixture();
    const old = resource.refreshBudgets();
    const latest = resource.refreshBudgets();
    reads[1].resolve([budget]);
    await latest;
    if (failure) reads[0].reject(new Error("obsolete"));
    else reads[0].resolve([]);
    expect(await old).toEqual({ status: "superseded" });
    expect(resource.getSnapshot()).toEqual({ budgets: [budget], budgetsLoading: false, budgetsError: null });
  });

  it("isolates a replacement client's state from previous reads and mutations", async () => {
    const old = fixture();
    const write = deferred<void>();
    old.repo.updateBudget.mockReturnValueOnce(write.promise);
    const mutation = old.resource.updateBudget(budget.id, request);
    const pending = old.resource.refreshBudgets();
    const current = fixture(); // The hook replaces the resource when its client changes.
    expect(current.resource.getSnapshot()).toEqual({ budgets: [], budgetsLoading: false, budgetsError: null });
    old.reads[0].resolve([budget]);
    await pending;
    write.resolve();
    await Promise.resolve();
    old.reads[1].reject(new Error("old client"));
    await mutation;
    expect(current.resource.getSnapshot()).toEqual({ budgets: [], budgetsLoading: false, budgetsError: null });
  });

  it("keeps an initial read error distinct from a successful empty response", async () => {
    const { resource, reads } = fixture();
    const pending = resource.refreshBudgets();
    reads[0].reject(new Error("initial failure"));
    await pending;
    expect(resource.getSnapshot().budgets).toEqual([]);
    expect(resource.getSnapshot().budgetsError?.message).toBe("initial failure");
    expect(resource.getSnapshot().budgetsLoading).toBe(false);
  });

  it("reports an applied update with a successful refresh, superseding a pre-write read", async () => {
    const { resource, repo, reads } = fixture();
    const older = resource.refreshBudgets();
    const mutation = resource.updateBudget(budget.id, request);
    await Promise.resolve();
    reads[0].resolve([]);
    expect(await older).toEqual({ status: "superseded" });
    expect(resource.getSnapshot().budgetsLoading).toBe(true);
    const updated = { ...budget, limitAmount: 200 };
    reads[1].resolve([updated]);
    expect(await mutation).toEqual({ applied: true, refresh: { status: "refreshed" } });
    expect(repo.updateBudget).toHaveBeenCalledWith(budget.id, request);
    expect(resource.getSnapshot()).toEqual({ budgets: [updated], budgetsLoading: false, budgetsError: null });
  });

  it("rejects both mutations without a client", async () => {
    const resource = createBudgetResource(null);
    await expect(resource.createBudget({ ...request, currency: "BOB" })).rejects.toThrow("Cliente no inicializado");
    await expect(resource.updateBudget(budget.id, request)).rejects.toThrow("Cliente no inicializado");
  });

  it.each(["createBudget", "updateBudget"] as const)("propagates %s write failures without wiping data or reloading", async (action) => {
    const { resource, reads, repo } = fixture();
    const initial = resource.refreshBudgets();
    reads[0].resolve([budget]);
    await initial;
    const error = new Error("write rejected");
    repo[action].mockRejectedValueOnce(error);
    const result = action === "updateBudget"
      ? resource.updateBudget(budget.id, request)
      : resource.createBudget({ ...request, currency: "BOB" });
    await expect(result).rejects.toBe(error);
    expect(resource.getSnapshot().budgets).toEqual([budget]);
    expect(repo.getBudgets).toHaveBeenCalledTimes(1);
  });

  it.each(["createBudget", "updateBudget"] as const)("recognizes applied %s even if its reload fails; retry does not repeat write", async (action) => {
    const { resource, reads, repo } = fixture();
    const mutation = action === "updateBudget"
      ? resource.updateBudget(budget.id, request)
      : resource.createBudget({ ...request, currency: "BOB" });
    await Promise.resolve();
    expect(resource.getSnapshot().budgetsLoading).toBe(true);
    const error = new Error("reload failed");
    reads[0].reject(error);
    expect(await mutation).toEqual({ applied: true, refresh: { status: "failed", error } });
    expect(resource.getSnapshot().budgetsError).toBe(error);
    const retry = resource.refreshBudgets();
    reads[1].resolve([budget]);
    await retry;
    expect(repo[action]).toHaveBeenCalledTimes(1);
    expect(resource.getSnapshot().budgetsError).toBeNull();
  });
});
