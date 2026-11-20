import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MovementQuery, parseMovementPage } from "../domain/movement";
import { TransactionDto } from "../domain/ledger.types";
import { IHttpClient } from "@/shared/application/http-client.contract";

const { getMovements } = vi.hoisted(() => ({ getMovements: vi.fn() }));
vi.mock("../infrastructure/ledger-api.repository", () => ({ LedgerApiRepository: class { getMovements = getMovements; } }));
let stateSlots: unknown[] = [];
let stateCursor = 0;
let effect: (() => void | (() => void)) | undefined;
let effectDependencies: unknown[] | undefined;
let cleanup: (() => void) | undefined;
let refs: Array<{ current: unknown }> = [];
let refCursor = 0;
vi.mock("react", () => ({
  useState: (initial: unknown) => { const index = stateCursor++; if (!(index in stateSlots)) stateSlots[index] = initial; return [stateSlots[index], (value: unknown) => { stateSlots[index] = typeof value === "function" ? (value as (old: unknown) => unknown)(stateSlots[index]) : value; }]; },
  useEffect: (callback: () => void | (() => void), dependencies: unknown[]) => {
    if (!effectDependencies || dependencies.some((value, index) => !Object.is(value, effectDependencies![index]))) effect = callback;
    effectDependencies = dependencies;
  },
  useRef: (initial: unknown) => { const index = refCursor++; refs[index] ||= { current: initial }; return refs[index]; },
  useCallback: (callback: unknown) => callback,
}));
import { useMovements } from "./useMovements";

const query: MovementQuery = { mode: "Active", page: 1, pageSize: 10 };
const http = {} as IHttpClient;
function useMovementsForTest(input = query, transactions?: TransactionDto[]) {
  stateCursor = 0; refCursor = 0; effect = undefined;
  const result = useMovements(http, input, transactions);
  commitEffect();
  return result;
}
function commitEffect() {
  if (effect) {
    cleanup?.();
    cleanup = effect() || undefined;
  }
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }

beforeEach(() => { vi.useFakeTimers(); getMovements.mockReset(); stateSlots = []; refs = []; cleanup = undefined; effect = undefined; effectDependencies = undefined; });
afterEach(() => { cleanup?.(); vi.useRealTimers(); });

describe("useMovements", () => {
  it("refetches rows and summary when the transactions reference changes, retaining the current query without looping", async () => {
    const currentQuery: MovementQuery = { ...query, page: 2, accountId: "a1", categoryId: "cat-1", type: "Expense", search: "Compra", mode: "Audit", startUtc: "2026-03-01T00:00:00Z", endUtcExclusive: "2026-04-01T00:00:00Z" };
    const transactions: TransactionDto[] = [];
    const updatedTransactions: TransactionDto[] = [];
    const initialPage = parseMovementPage({ page: 2, pageSize: 10, totalCount: 10, items: [], summary: [{ currency: "BOB", income: "0", expenses: "0" }] });
    const updatedPage = parseMovementPage({ page: 2, pageSize: 10, totalCount: 11, items: [{ id: "new-movement", kind: "Expense", amount: "8.25", currency: "BOB", direction: "Expense", occurredAt: "2026-03-04T10:00:00Z", accountId: "a1", accountName: "Banco", categoryId: "cat-1", description: "Compra", isReversal: false }], summary: [{ currency: "BOB", income: "0", expenses: "8.25" }] });
    getMovements.mockResolvedValueOnce(initialPage).mockResolvedValueOnce(updatedPage);

    useMovementsForTest(currentQuery, transactions);
    await vi.runOnlyPendingTimersAsync();
    expect(useMovementsForTest(currentQuery, transactions).data).toEqual(initialPage);
    await vi.runOnlyPendingTimersAsync();
    expect(getMovements).toHaveBeenCalledTimes(1);

    useMovementsForTest(currentQuery, updatedTransactions);
    await vi.runOnlyPendingTimersAsync();
    expect(getMovements).toHaveBeenCalledTimes(2);
    expect(getMovements.mock.calls.map(([input]) => input)).toEqual([currentQuery, currentQuery]);
    expect(getMovements.mock.calls[1][0]).toBe(currentQuery);
    const refreshed = useMovementsForTest(currentQuery, updatedTransactions);
    expect(refreshed.data).toEqual(updatedPage);
    expect(refreshed.loading).toBe(false);
    expect(refreshed.error).toBeNull();
    await vi.runOnlyPendingTimersAsync();
    expect(getMovements).toHaveBeenCalledTimes(2);
  });

  it("debounces search, aborts the old request, and never publishes stale data", async () => {
    const old = deferred<{ items: string[] }>(); const latest = deferred<{ items: string[] }>();
    getMovements.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    useMovementsForTest(); await vi.runOnlyPendingTimersAsync();
    const firstSignal = getMovements.mock.calls[0][1] as AbortSignal;
    const nextQuery = { ...query, search: "new" }; useMovementsForTest(nextQuery);
    await vi.advanceTimersByTimeAsync(299); expect(getMovements).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(getMovements).toHaveBeenCalledTimes(2);
    expect(firstSignal.aborted).toBe(true);
    old.resolve({ items: ["stale"] }); latest.resolve({ items: ["fresh"] }); await Promise.resolve(); await Promise.resolve();
    expect(useMovementsForTest(nextQuery).data).toEqual({ items: ["fresh"] });
  });

  it("exposes request errors and retries after reload", async () => {
    getMovements.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ items: [], summary: [] });
    const initial = useMovementsForTest(); expect(initial.error).toBeNull(); await vi.runOnlyPendingTimersAsync();
    const failed = useMovementsForTest(); expect(failed.error).toBe("offline");
    failed.reload(); useMovementsForTest(); await vi.runOnlyPendingTimersAsync();
    const recovered = useMovementsForTest();
    expect(getMovements).toHaveBeenCalledTimes(2);
    expect(recovered.error).toBeNull(); expect(recovered.data).toEqual({ items: [], summary: [] });
  });
});
