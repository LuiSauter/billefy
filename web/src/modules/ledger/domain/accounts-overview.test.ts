import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { AccountDto } from "./ledger.types";
import {
  classifyAccountCategory,
  getAccountSubtitle,
  calculateAccountsOverview,
  calculateBalanceEvolution,
  formatNativeBalance,
  getCurrencyConversionLabel,
} from "./accounts-overview";

function makeAccount(overrides: Partial<AccountDto>): AccountDto {
  return {
    id: "acc-1",
    name: overrides.name ?? "Cuenta Genérica",
    type: "Savings",
    currency: "USD",
    balance: new Decimal(1000),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("accounts-overview domain", () => {
  describe("classifyAccountCategory", () => {
    it("classifies bank accounts correctly", () => {
      expect(classifyAccountCategory(makeAccount({ type: "Savings" }))).toBe("bancos");
      expect(classifyAccountCategory(makeAccount({ type: "Checking" }))).toBe("bancos");
      expect(classifyAccountCategory(makeAccount({ type: "Bank" }))).toBe("bancos");
    });

    it("classifies crypto accounts correctly", () => {
      expect(classifyAccountCategory(makeAccount({ type: "CryptoWallet" }))).toBe("cripto");
      expect(classifyAccountCategory(makeAccount({ type: "Exchange" }))).toBe("cripto");
      expect(classifyAccountCategory(makeAccount({ name: "Binance USDT", type: "Wallet" }))).toBe("cripto");
      expect(classifyAccountCategory(makeAccount({ name: "Caja USDC", type: "Wallet", currency: "USDC" }))).toBe("cripto");
    });

    it("classifies cash accounts correctly", () => {
      expect(classifyAccountCategory(makeAccount({ type: "Cash" }))).toBe("efectivo");
      expect(classifyAccountCategory(makeAccount({ name: "Efectivo en mano", type: "Wallet" }))).toBe("efectivo");
    });

    it("classifies wallets correctly", () => {
      expect(classifyAccountCategory(makeAccount({ type: "Wallet" }))).toBe("wallets");
      expect(classifyAccountCategory(makeAccount({ name: "Mercado Pago", type: "Savings" }))).toBe("wallets");
    });

    it("classifies international and investments as otros", () => {
      expect(classifyAccountCategory(makeAccount({ type: "International" }))).toBe("otros");
      expect(classifyAccountCategory(makeAccount({ name: "Broker S&P500" }))).toBe("otros");
    });
  });

  describe("getAccountSubtitle", () => {
    it("returns expected subtitles according to type and name", () => {
      expect(getAccountSubtitle(makeAccount({ type: "Savings" }))).toBe("Cuenta de ahorros");
      expect(getAccountSubtitle(makeAccount({ type: "Checking" }))).toBe("Cuenta corriente");
      expect(getAccountSubtitle(makeAccount({ type: "CryptoWallet" }))).toBe("Wallet (Crypto)");
      expect(getAccountSubtitle(makeAccount({ type: "Cash" }))).toBe("Efectivo");
      expect(getAccountSubtitle(makeAccount({ type: "Wallet" }))).toBe("Wallet digital");
      expect(getAccountSubtitle(makeAccount({ type: "International" }))).toBe("Cuenta internacional");
    });
  });

  describe("calculateAccountsOverview", () => {
    it("calculates totals, category distribution and percentages accurately", () => {
      const accounts: AccountDto[] = [
        makeAccount({ id: "1", name: "BCP", type: "Bank", balance: new Decimal(1000), currency: "USD" }),
        makeAccount({ id: "2", name: "Mercado Pago", type: "Wallet", balance: new Decimal(500), currency: "USD" }),
        makeAccount({ id: "3", name: "Binance", type: "CryptoWallet", balance: new Decimal(500), currency: "USDT" }),
      ];

      const overview = calculateAccountsOverview(accounts, [], 10);
      expect(overview.totalUsd).toBe(2000);
      expect(overview.totalBob).toBe(20000);
      expect(overview.categoryTotals.bancos.amount).toBe(1000);
      expect(overview.categoryTotals.bancos.amountUsd).toBe(1000);
      expect(overview.categoryTotals.bancos.amountBob).toBe(10000);
      expect(overview.categoryTotals.bancos.percentage).toBe(50);
      expect(overview.categoryTotals.wallets.amount).toBe(500);
      expect(overview.categoryTotals.wallets.amountUsd).toBe(500);
      expect(overview.categoryTotals.wallets.amountBob).toBe(5000);
      expect(overview.categoryTotals.wallets.percentage).toBe(25);
      expect(overview.categoryTotals.cripto.amount).toBe(500);
      expect(overview.categoryTotals.cripto.amountUsd).toBe(500);
      expect(overview.categoryTotals.cripto.amountBob).toBe(5000);
      expect(overview.categoryTotals.cripto.percentage).toBe(25);
    });

    it("calculates exact converted amountBob and amountUsd for otros without ratio distortions", () => {
      const accounts: AccountDto[] = [
        makeAccount({ id: "1", name: "Broker ETF", type: "International", balance: new Decimal(124), currency: "USDC" }),
        makeAccount({ id: "2", name: "Banco Unión", type: "Bank", balance: new Decimal(100), currency: "BOB" }),
      ];

      const overview = calculateAccountsOverview(accounts, [], 9.85);
      // Broker ETF is in "otros" with 124 USDC
      // 124 * 9.85 = 1221.40 BOB exactly
      expect(overview.categoryTotals.otros.amountUsd).toBe(124);
      expect(overview.categoryTotals.otros.amountBob).toBe(1221.4);
    });
  });

  describe("calculateBalanceEvolution", () => {
    it("generates points for requested timeframe", () => {
      const accounts: AccountDto[] = [
        makeAccount({ id: "1", balance: new Decimal(24860), currency: "USD" }),
      ];
      const points = calculateBalanceEvolution(accounts, [], 10, 6);
      expect(points.length).toBe(6);
      expect(points[points.length - 1].balance).toBe(24860);
    });
  });

  describe("formatNativeBalance", () => {
    const dummyFormat = (n: number | Decimal) => n.toString();

    it("formats BOB with Bs.", () => {
      expect(formatNativeBalance(150, "BOB", dummyFormat)).toBe("Bs. 150");
    });

    it("formats USD with $", () => {
      expect(formatNativeBalance(150, "USD", dummyFormat)).toBe("$ 150");
    });

    it("formats USDT and USDC with their token symbol", () => {
      expect(formatNativeBalance(150, "USDT", dummyFormat)).toBe("150 USDT");
      expect(formatNativeBalance(150, "USDC", dummyFormat)).toBe("150 USDC");
    });
  });

  describe("getCurrencyConversionLabel", () => {
    const dummyFormat = (n: number | Decimal) => Number(n).toFixed(2);

    it("converts USD, USDT, and USDC accounts to BOB when user preferred currency is BOB", () => {
      expect(getCurrencyConversionLabel(100, "USD", "BOB", 10, dummyFormat)).toBe("≈ Bs. 1000.00");
      expect(getCurrencyConversionLabel(100, "USDT", "BOB", 10, dummyFormat)).toBe("≈ Bs. 1000.00");
      expect(getCurrencyConversionLabel(100, "USDC", "BOB", 10, dummyFormat)).toBe("≈ Bs. 1000.00");
      expect(getCurrencyConversionLabel(100, "BOB", "BOB", 10, dummyFormat)).toBeNull();
    });

    it("converts BOB accounts to USD when user preferred currency is USD", () => {
      expect(getCurrencyConversionLabel(1000, "BOB", "USD", 10, dummyFormat)).toBe("≈ $ 100.00 USD");
      expect(getCurrencyConversionLabel(100, "USD", "USD", 10, dummyFormat)).toBeNull();
      expect(getCurrencyConversionLabel(100, "USDT", "USD", 10, dummyFormat)).toBe("≈ $ 100.00 USD");
      expect(getCurrencyConversionLabel(100, "USDC", "USD", 10, dummyFormat)).toBe("≈ $ 100.00 USD");
    });
  });
});
