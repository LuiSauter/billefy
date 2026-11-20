import { describe, expect, it } from "vitest";
import { createPlanLoadGuard, nextPlanLoadStatus } from "./distribution-plan-load";

describe("createPlanLoadGuard", () => {
  it("accepts the result of the latest load", () => {
    const guard = createPlanLoadGuard();
    const token = guard.begin();
    expect(guard.isCurrent(token)).toBe(true);
  });

  it("rejects a late result superseded by a newer load or client", () => {
    const guard = createPlanLoadGuard();
    const first = guard.begin();
    const second = guard.begin();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("rejects a late result when the user edited the plan locally meanwhile", () => {
    const guard = createPlanLoadGuard();
    const token = guard.begin();
    guard.markLocalEdit();
    expect(guard.isCurrent(token)).toBe(false);
  });

  it("rejects pending results after invalidation", () => {
    const guard = createPlanLoadGuard();
    const token = guard.begin();
    guard.invalidate();
    expect(guard.isCurrent(token)).toBe(false);
  });
});

describe("nextPlanLoadStatus", () => {
  it("is loaded after a successful read", () => {
    expect(nextPlanLoadStatus("loading", true)).toBe("loaded");
    expect(nextPlanLoadStatus("stale", true)).toBe("loaded");
    expect(nextPlanLoadStatus("error", true)).toBe("loaded");
  });

  it("is an error when no plan was ever loaded", () => {
    expect(nextPlanLoadStatus("loading", false)).toBe("error");
    expect(nextPlanLoadStatus("error", false)).toBe("error");
  });

  it("keeps the last good plan as stale when a refresh fails", () => {
    expect(nextPlanLoadStatus("loaded", false)).toBe("stale");
    expect(nextPlanLoadStatus("stale", false)).toBe("stale");
  });
});
