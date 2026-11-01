import { beforeEach, describe, expect, it, vi } from "vitest";
import { MovementQuery } from "../domain/movement";
import { IHttpClient } from "@/shared/application/http-client.contract";

const { getMovements } = vi.hoisted(() => ({ getMovements: vi.fn() }));
vi.mock("../infrastructure/ledger-api.repository", () => ({ LedgerApiRepository: class { getMovements = getMovements; } }));
let stateSlots: unknown[] = [];
let stateCursor = 0;
let effect: (() => void | (() => void)) | undefined;
let cleanups: Array<() => void> = [];
let refs: Array<{ current: unknown }> = [];
let refCursor = 0;
vi.mock("react", () => ({
  useState: (initial: unknown) => { const index = stateCursor++; if (!(index in stateSlots)) stateSlots[index] = initial; return [stateSlots[index], (value: unknown) => { stateSlots[index] = typeof value === "function" ? (value as (old: unknown) => unknown)(stateSlots[index]) : value; }]; },
  useEffect: (callback: () => void | (() => void)) => { effect = callback; },
  useRef: (initial: unknown) => { const index = refCursor++; refs[index] ||= { current: initial }; return refs[index]; },
  useCallback: (callback: unknown) => callback,
}));
import { useMovements } from "./useMovements";

const query: MovementQuery = { mode: "Active", page: 1, pageSize: 10 };
const http = {} as IHttpClient;
function useMovementsForTest(input = query) { stateCursor = 0; refCursor = 0; const result = useMovements(http, input); return result; }
function useMountMovementsForTest() { useMovementsForTest(); const cleanup = effect?.(); if (typeof cleanup === "function") cleanups.push(cleanup); }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }

beforeEach(() => { vi.useFakeTimers(); getMovements.mockReset(); stateSlots = []; refs = []; cleanups = []; effect = undefined; });

describe("useMovements", () => {
  it("debounces search, aborts the old request, and never publishes stale data", async () => {
    const old = deferred<{ items: string[] }>(); const latest = deferred<{ items: string[] }>();
    getMovements.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    useMountMovementsForTest(); await vi.runOnlyPendingTimersAsync();
    const firstSignal = getMovements.mock.calls[0][1] as AbortSignal;
    cleanups.forEach((cleanup) => cleanup()); cleanups = [];
    const nextQuery = { ...query, search: "new" }; const next = useMovementsForTest(nextQuery); void next; const cleanup = effect?.();
    await vi.advanceTimersByTimeAsync(299); expect(getMovements).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(getMovements).toHaveBeenCalledTimes(2);
    expect(firstSignal.aborted).toBe(true);
    old.resolve({ items: ["stale"] }); latest.resolve({ items: ["fresh"] }); await Promise.resolve(); await Promise.resolve();
    expect(stateSlots[0]).toEqual({ items: ["fresh"] });
    if (typeof cleanup === "function") cleanup();
  });

  it("exposes request errors and retries after reload", async () => {
    getMovements.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ items: [], summary: [] });
    const initial = useMovementsForTest(); expect(initial.error).toBeNull(); useMountMovementsForTest(); await vi.runOnlyPendingTimersAsync(); await Promise.resolve(); await Promise.resolve();
    expect(stateSlots[2]).toBe("offline");
    stateSlots[3] = 1; useMountMovementsForTest(); await vi.runOnlyPendingTimersAsync(); await Promise.resolve(); await Promise.resolve();
    expect(stateSlots[2]).toBeNull(); expect(stateSlots[0]).toEqual({ items: [], summary: [] });
  });
});
