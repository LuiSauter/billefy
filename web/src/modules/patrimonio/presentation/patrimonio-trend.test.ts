import { describe, expect, it } from "vitest";
import { resolveTrend } from "./patrimonio-trend";

describe("resolveTrend", () => {
  it.each([
    { pct: 4.2, current: 110, previous: 100, goodWhen: "up" as const, direction: "up", tone: "good" },
    { pct: -4.2, current: 90, previous: 100, goodWhen: "up" as const, direction: "down", tone: "bad" },
    { pct: 12, current: 112, previous: 100, goodWhen: "down" as const, direction: "up", tone: "bad" },
    { pct: -12, current: 88, previous: 100, goodWhen: "down" as const, direction: "down", tone: "good" },
    { pct: 0, current: 100, previous: 100, goodWhen: "down" as const, direction: "flat", tone: "neutral" },
  ])("reads the real sign of $pct% (good when $goodWhen) -> $direction/$tone", ({ pct, current, previous, goodWhen, direction, tone }) => {
    expect(resolveTrend({ pct, current, previous, goodWhen })).toEqual({ direction, tone });
  });

  it("falls back to the absolute change when there is no percentage base (new liability)", () => {
    expect(resolveTrend({ pct: null, current: 1000, previous: 0, goodWhen: "down" })).toEqual({ direction: "up", tone: "bad" });
    expect(resolveTrend({ pct: null, current: 0, previous: 500, goodWhen: "down" })).toEqual({ direction: "down", tone: "good" });
  });

  it("is flat and neutral when nothing changed and there is no percentage", () => {
    expect(resolveTrend({ pct: null, current: 0, previous: 0, goodWhen: "up" })).toEqual({ direction: "flat", tone: "neutral" });
  });
});
