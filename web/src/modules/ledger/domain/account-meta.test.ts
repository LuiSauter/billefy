import { describe, it, expect } from "vitest";
import {
  ACCOUNT_TYPE_OPTIONS,
  getAccountTypeLabel,
  getDefaultAccountVisualMeta,
  resolveAccountVisualMeta,
} from "./account-meta";

describe("account-meta", () => {
  it("includes Cash (Efectivo) in ACCOUNT_TYPE_OPTIONS", () => {
    const cashOption = ACCOUNT_TYPE_OPTIONS.find((opt) => opt.value === "Cash");
    expect(cashOption).toBeDefined();
    expect(cashOption?.label).toBe("Efectivo");
    expect(cashOption?.defaultIcon).toBe("banknote");
    expect(cashOption?.defaultColor).toBe("emerald");
  });

  it("returns correct labels for account types including Cash and Wallet", () => {
    expect(getAccountTypeLabel("Cash")).toBe("Efectivo");
    expect(getAccountTypeLabel("Wallet")).toBe("Billetera digital");
    expect(getAccountTypeLabel("Savings")).toBe("Ahorros");
    expect(getAccountTypeLabel("Checking")).toBe("Cuenta corriente");
    expect(getAccountTypeLabel("CryptoWallet")).toBe("Wallet Crypto");
    expect(getAccountTypeLabel("International")).toBe("Cuenta internacional");
  });

  it("resolves default visuals for Cash", () => {
    const cashMeta = getDefaultAccountVisualMeta("Cash");
    expect(cashMeta).toEqual({ iconKey: "banknote", colorKey: "emerald" });
  });

  it("resolves account visual meta preserving custom icons and colors", () => {
    const meta = resolveAccountVisualMeta({
      type: "Cash",
      iconKey: "coins",
      colorKey: "amber",
    });
    expect(meta).toEqual({ iconKey: "coins", colorKey: "amber" });

    const fallbackMeta = resolveAccountVisualMeta({
      type: "Cash",
      iconKey: null,
      colorKey: null,
    });
    expect(fallbackMeta).toEqual({ iconKey: "banknote", colorKey: "emerald" });
  });
});
