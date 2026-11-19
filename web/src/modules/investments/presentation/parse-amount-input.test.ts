import { describe, expect, it } from "vitest";
import { toNumber } from "./parse-amount-input";

describe("toNumber (shared amount-input parser)", () => {
  it("parses plain, trailing-separator and padded decimal input", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber("5.")).toBe(5);
    expect(toNumber("  42 ")).toBe(42);
  });
  it("falls back to 0 for empty or non-numeric input", () => {
    expect(toNumber("")).toBe(0);
    expect(toNumber("abc")).toBe(0);
  });
});
