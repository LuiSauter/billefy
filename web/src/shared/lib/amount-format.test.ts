import { describe, expect, it } from "vitest";
import { formatAmountText, formatPercent } from "./amount-format";
import type { NumberFormatPreferences } from "./number-format";

const prefs: NumberFormatPreferences = { convention: "es-BO", decimalPlaces: 2 };
describe("amount formatting", () => {
  it("formats signs and currency placement", () => {
    expect(formatAmountText(-1234.5, "BOB", prefs)).toBe("-Bs 1.234,50");
    expect(formatAmountText(10, "MYSTERY", prefs, { sign: "always", currencyDisplay: "code" })).toBe("+10,00 MYSTERY");
    expect(formatAmountText(-10, "USD", prefs, { sign: "never", currencyDisplay: "none" })).toBe("10,00");
  });
  it("compacts with preference separators and formats percentage magnitudes", () => {
    expect(formatAmountText(1234567, "USD", prefs, { compact: true })).toBe("$ 1,23 M");
    expect(formatPercent(12.345, prefs)).toBe("12,35%");
  });
});
