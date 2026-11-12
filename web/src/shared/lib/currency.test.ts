import { describe, expect, it } from "vitest";
import { formatCurrencyLabel, getCurrencyMeta } from "./currency";

describe("currency metadata", () => {
  it("provides known symbols and suffix fallback", () => {
    expect(getCurrencyMeta("BOB")).toEqual({ code: "BOB", symbol: "Bs", position: "prefix" });
    expect(getCurrencyMeta("USD").symbol).toBe("$");
    expect(getCurrencyMeta("USDT").position).toBe("suffix");
    expect(getCurrencyMeta("EUR").symbol).toBe("€");
    expect(getCurrencyMeta("ARS").symbol).toBe("$");
    expect(getCurrencyMeta("BRL").symbol).toBe("R$");
    expect(formatCurrencyLabel("XYZ")).toBe("XYZ");
  });
});
