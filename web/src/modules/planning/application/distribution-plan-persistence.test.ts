import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bucketFromPreset, DistributionPlan, PLAN_PRESETS } from "../domain/distribution-plan";
import { createPlanPersistence } from "./distribution-plan-persistence";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function plan(enabled = false, name = "Gastos"): DistributionPlan {
  const buckets = bucketFromPreset(PLAN_PRESETS[0]);
  buckets[0].name = name;
  return { enabled, buckets };
}
function fixture() {
  const requests: { payload: DistributionPlan; gate: ReturnType<typeof deferred> }[] = [];
  let server: DistributionPlan | undefined;
  const onError = vi.fn();
  const save = vi.fn(async (payload: DistributionPlan) => {
    const gate = deferred();
    requests.push({ payload, gate });
    await gate.promise;
    server = payload;
    return { ...payload, buckets: [] }; // A stale response must never become the next desired payload.
  });
  const persistence = createPlanPersistence({ save, onError });
  return { persistence, requests, save, onError, server: () => server };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("distribution plan persistence ordering", () => {
  it("waits for an in-flight disabled PUT before sending activation; latest server intent wins", async () => {
    const f = fixture();
    const disabled = plan();
    const enabled = { ...disabled, enabled: true };
    f.persistence.schedule(disabled);
    await vi.advanceTimersByTimeAsync(500);
    f.persistence.schedule(enabled, true);
    expect(f.requests.map((r) => r.payload)).toEqual([disabled]);
    f.requests[0].gate.resolve();
    await settle();
    expect(f.requests.map((r) => r.payload)).toEqual([disabled, enabled]);
    f.requests[1].gate.resolve();
    await settle();
    expect(f.server()).toEqual(enabled);
    expect(f.onError).not.toHaveBeenCalled();
  });

  it("activation cancels debounce and coalesces queued edits into the latest enabled payload", async () => {
    const f = fixture();
    f.persistence.schedule(plan());
    await vi.advanceTimersByTimeAsync(500);
    f.persistence.schedule(plan(false, "Intermedio"));
    await vi.advanceTimersByTimeAsync(500); // Already ready, but must still wait for the first PUT.
    const latest = plan(true, "Último");
    f.persistence.schedule(latest, true);
    expect(f.requests).toHaveLength(1);
    f.requests[0].gate.resolve();
    await settle();
    expect(f.requests[1].payload).toBe(latest);
    f.requests[1].gate.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.requests).toHaveLength(2);
    expect(f.server()).toEqual(latest);
  });

  it("newer edits supersede queued activation and retain their debounce after the older PUT completes", async () => {
    const f = fixture();
    f.persistence.schedule(plan(), true);
    f.persistence.schedule(plan(true), true);
    const edited = plan(true, "Edición después de activar");
    f.persistence.schedule(edited);
    f.requests[0].gate.resolve();
    await settle();
    expect(f.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(f.requests[1].payload).toBe(edited);
    f.requests[1].gate.resolve();
    await settle();
    expect(f.server()).toEqual(edited);
  });

  it("activation before debounce sends only the enabled plan", async () => {
    const f = fixture();
    f.persistence.schedule(plan());
    const latest = plan(true);
    f.persistence.schedule(latest, true);
    expect(f.requests.map((r) => r.payload)).toEqual([latest]);
    f.requests[0].gate.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.save).toHaveBeenCalledTimes(1);
    expect(f.server()).toEqual(latest);
  });

  it("earlier failure reports the failed snapshot, preserves newer edits and does not poison the queue", async () => {
    const f = fixture();
    const first = plan();
    f.persistence.schedule(first, true);
    const latest = plan(true, "Edición conservada");
    const unchanged = JSON.stringify(latest);
    f.persistence.schedule(latest, true);
    expect(f.requests).toHaveLength(1);
    const error = new Error("synthetic failure");
    f.requests[0].gate.reject(error);
    await settle();
    expect(f.onError).toHaveBeenCalledWith(error, first);
    expect(f.requests[1].payload).toBe(latest);
    expect(JSON.stringify(latest)).toBe(unchanged);
    f.requests[1].gate.resolve();
    await settle();
    expect(f.server()).toEqual(latest);
    expect(f.requests).toHaveLength(2);
  });

  it("keeps edits after an activation failure and allows a successful retry", async () => {
    const f = fixture();
    const latest = plan(true, "Reintentar");
    f.persistence.schedule(latest, true);
    f.requests[0].gate.reject(new Error("activation failed"));
    await settle();
    expect(f.onError.mock.calls[0][1]).toBe(latest);
    expect(latest.buckets[0].name).toBe("Reintentar");
    f.persistence.schedule(latest, true);
    f.requests[1].gate.resolve();
    await settle();
    expect(f.server()).toEqual(latest);
  });

  it("cancels queued invalid/unmounted work without aborting the in-flight request", async () => {
    const f = fixture();
    f.persistence.schedule(plan(), true);
    f.persistence.schedule(plan(true), true);
    f.persistence.cancelPending();
    f.requests[0].gate.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.requests).toHaveLength(1);
    f.persistence.schedule(plan());
    f.persistence.cancelPending();
    await vi.advanceTimersByTimeAsync(500);
    expect(f.requests).toHaveLength(1);
  });
});
