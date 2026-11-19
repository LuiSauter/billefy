import { describe, expect, it } from "vitest";
import { computeResizedWidth } from "./use-resizable-columns";

describe("computeResizedWidth", () => {
  it("grows the width by the drag delta", () => {
    expect(computeResizedWidth(160, 40)).toBe(200);
  });

  it("shrinks the width by a negative delta", () => {
    expect(computeResizedWidth(160, -40)).toBe(120);
  });

  it("clamps to the minimum width instead of going smaller or negative", () => {
    expect(computeResizedWidth(80, -500)).toBe(60);
    expect(computeResizedWidth(60, -1)).toBe(60);
  });

  it("rounds fractional deltas to a whole pixel", () => {
    expect(computeResizedWidth(160, 10.6)).toBe(171);
  });
});
