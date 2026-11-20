import { describe, expect, it, vi } from "vitest";
import { formatNumber, formatUserNumber, getNumberFormatPreferences, setNumberFormatPreferences, subscribeNumberFormatPreferences } from "./number-format";

vi.mock("@/shared/infrastructure/local-storage-token.adapter", () => ({
  defaultTokenStorage: { getUser: vi.fn(() => ({ numberGroupingConvention: "en-US", maximumDecimalPlaces: 4 })) },
}));

describe("number format preferences", () => {
  it("hydrates preferences once from the stored user", async () => {
    vi.stubGlobal("window", {});
    expect(getNumberFormatPreferences()).toEqual({ convention: "en-US", decimalPlaces: 4 });
    vi.unstubAllGlobals();
  });
  it("notifies subscribers when updated and formats without storage parsing", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNumberFormatPreferences(listener);
    setNumberFormatPreferences("en-US", 2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(formatUserNumber(1234.5)).toBe("1,234.50");
    unsubscribe();
  });
  it("supports conventions, fixed decimal counts, negatives and HALF_UP", () => {
    expect(formatNumber("-1234.565", "es-BO", 2)).toBe("-1.234,57");
    expect(formatNumber(1.2, "en-US", 0)).toBe("1");
    expect(formatNumber(1.2, "en-US", 2)).toBe("1.20");
    expect(formatNumber(1.2, "en-US", 4)).toBe("1.2000");
    expect(formatNumber(1.2, "en-US", 6)).toBe("1.200000");
  });
});
