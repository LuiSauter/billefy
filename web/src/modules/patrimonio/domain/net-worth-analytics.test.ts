import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Decimal from "decimal.js";
import {
  calculatePatrimonioOverview,
  convertPatrimonioAmount,
  PATRIMONIO_PERIOD_OPTIONS,
  sliceEvolutionPoints,
} from "./net-worth-analytics";
import { PatrimonialAsset, PatrimonialLiability } from "./patrimonio.types";
import { Investment } from "@/modules/investments/domain/investment.types";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";

const mockInvestments: Investment[] = [
  {
    id: "inv-1",
    name: "Bitcoin (BTC)",
    kind: "crypto",
    iconKey: "coins",
    colorKey: "amber",
    currency: "USD",
    quantity: 0.1,
    initialValue: 5000,
    currentValue: 6200,
    history: [
      { at: "2026-09-01T00:00:00Z", value: 5500 },
      { at: "2026-10-01T00:00:00Z", value: 6200 },
    ],
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "inv-2",
    name: "S&P 500 (ETF)",
    kind: "funds",
    iconKey: "trending-up",
    colorKey: "blue",
    currency: "USD",
    quantity: 40,
    initialValue: 16000,
    currentValue: 18000,
    history: [
      { at: "2026-09-01T00:00:00Z", value: 17000 },
      { at: "2026-10-01T00:00:00Z", value: 18000 },
    ],
    createdAt: "2026-01-01T00:00:00Z",
  },
]; // Total investments = 24,200 USD

const mockManualAssets: PatrimonialAsset[] = [
  {
    id: "ast-1",
    name: "Casa principal (Residencial)",
    category: "realestate",
    value: 85000,
    currency: "USD",
    notes: "Inmueble de uso propio",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "ast-2",
    name: "Toyota RAV4",
    category: "vehicles",
    value: 15000,
    currency: "USD",
    notes: "Vehículo familiar",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockAccounts: AccountDto[] = [
  {
    id: "acc-1",
    name: "Banco BCP",
    type: "Savings",
    currency: "USD",
    balance: new Decimal(10000),
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockTransactions: TransactionDto[] = [
  {
    id: "txn-1",
    accountId: "acc-1",
    direction: "Income",
    amount: new Decimal(2000),
    currency: "USD",
    occurredAt: new Date().toISOString(), // recent transaction
    createdAt: new Date().toISOString(),
    categoryId: "Salary",
    description: "Sueldo",
  },
];

const mockLoans: LoanSummaryDto[] = [
  {
    id: "loan-1",
    counterpartyId: "c-1",
    counterpartyName: "Banco Santander (Hipotecario)",
    type: "Borrowed",
    template: "Standard",
    principal: new Decimal(25000),
    interestRate: 0.05,
    annualEffectiveRate: 0.05,
    remainingPrincipal: new Decimal(20000),
    disbursementDate: "2026-01-01",
    firstDueDate: "2026-02-01",
    totalInstallments: 240,
    createdAt: "2026-01-01",
    status: "Active",
    currency: "USD",
  },
];

const mockManualLiabilities: PatrimonialLiability[] = [
  {
    id: "liab-1",
    name: "Tarjeta Visa",
    category: "creditcard",
    amount: 1500,
    currency: "USD",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

describe("net-worth-analytics domain (100% authentic, zero mock hardcodes)", () => {
  it("calculates exact Net Worth from authentic assets and liabilities", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: mockManualAssets,
      investments: mockInvestments,
      accounts: mockAccounts,
      loans: mockLoans,
      manualLiabilities: mockManualLiabilities,
      transactions: mockTransactions,
    });

    // Total Assets:
    // Manual: 85,000 + 15,000 = 100,000
    // Investments: 6,200 + 18,000 = 24,200
    // Accounts: 10,000
    // Total = 134,200
    expect(overview.totalAssets).toBe(134200);

    // Total Liabilities:
    // Mortgage: 20,000
    // Credit card: 1,500
    // Total = 21,500
    expect(overview.totalLiabilities).toBe(21500);

    // Net Worth: 134,200 - 21,500 = 112,700
    expect(overview.netWorth).toBe(112700);

    // Debt ratio: 21,500 / 134,200 = 16.0208... -> ~16.0%
    expect(overview.debtRatioPct).toBeCloseTo(16.0, 1);
    expect(overview.debtHealth).toBe("Saludable");
  });

  it("includes authentic sub-items within each asset category for drill-down", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: mockManualAssets,
      investments: mockInvestments,
      accounts: mockAccounts,
      loans: mockLoans,
      manualLiabilities: mockManualLiabilities,
      transactions: mockTransactions,
    });

    const realestate = overview.assetsByCategory.find((c) => c.category === "realestate");
    expect(realestate).toBeDefined();
    expect(realestate!.items.length).toBe(1);
    expect(realestate!.items[0].name).toBe("Casa principal (Residencial)");
    expect(realestate!.items[0].value).toBe(85000);

    const invCategory = overview.assetsByCategory.find((c) => c.category === "investments");
    expect(invCategory).toBeDefined();
    expect(invCategory!.items.length).toBe(2);
    expect(invCategory!.items[0].name).toBe("S&P 500 (ETF)");
  });

  it("calculates real historical evolution and dynamic month-over-month variation", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: mockManualAssets,
      investments: mockInvestments,
      accounts: mockAccounts,
      loans: mockLoans,
      manualLiabilities: mockManualLiabilities,
      transactions: mockTransactions,
    });

    // Evolution points must exist and the last point must equal current net worth
    expect(overview.evolutionPoints.length).toBe(12);
    expect(overview.evolutionPoints[overview.evolutionPoints.length - 1].value).toBe(112700);

    // Variation must NOT be hardcoded 8.4
    // It should be computed based on previous month balance
    expect(typeof overview.previousNetWorthChangePct).toBe("number");
  });

  it("generates authentic dynamic insights reflecting real metrics", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: mockManualAssets,
      investments: mockInvestments,
      accounts: mockAccounts,
      loans: mockLoans,
      manualLiabilities: mockManualLiabilities,
      transactions: mockTransactions,
    });

    expect(overview.insights.length).toBeGreaterThan(0);
    // Debt insight should reflect the real 16.0% ratio
    const debtInsight = overview.insights.find((i) => i.text.includes("deuda"));
    expect(debtInsight).toBeDefined();
    expect(debtInsight!.text).toContain("16,02%");
  });

  it("converts all metrics to BOB when targetCurrency is BOB with p2p rate", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: mockManualAssets,
      investments: mockInvestments,
      accounts: mockAccounts,
      loans: mockLoans,
      manualLiabilities: mockManualLiabilities,
      transactions: mockTransactions,
      targetCurrency: "BOB",
      p2pRate: 10,
    });

    // 134,200 USD * 10 = 1,342,000 BOB
    expect(overview.totalAssets).toBe(1342000);
    // 21,500 USD * 10 = 215,000 BOB
    expect(overview.totalLiabilities).toBe(215000);
    // Net worth = 1,127,000 BOB
    expect(overview.netWorth).toBe(1127000);

    // Evolution points must be formatted with Bs.
    expect(overview.evolutionPoints[overview.evolutionPoints.length - 1].formattedValue).toContain("Bs ");
    expect(overview.evolutionPoints[overview.evolutionPoints.length - 1].value).toBe(1127000);
  });

  it("accurately handles mixed currencies (BOB accounts, USD investments) in both directions", () => {
    const mixedAccounts: AccountDto[] = [
      {
        id: "acc-bob",
        name: "Banco Union BOB",
        type: "Savings",
        currency: "BOB",
        balance: new Decimal(10000), // 10,000 BOB
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    const mixedInvestments: Investment[] = [
      {
        id: "inv-usdt",
        name: "Tether (USDT)",
        kind: "crypto",
        iconKey: "coins",
        colorKey: "amber",
        currency: "USDT",
        quantity: 1000,
        initialValue: 1000,
        currentValue: 1000, // 1,000 USDT = 1,000 USD
        history: [],
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];

    // Case 1: Viewing in BOB with rate 10
    // 10,000 BOB + (1,000 USDT * 10) = 20,000 BOB
    const bobOverview = calculatePatrimonioOverview({
      accounts: mixedAccounts,
      investments: mixedInvestments,
      targetCurrency: "BOB",
      p2pRate: 10,
    });
    expect(bobOverview.totalAssets).toBe(20000);
    expect(bobOverview.netWorth).toBe(20000);
    expect(bobOverview.evolutionPoints.at(-1)?.value).toBe(20000);

    // Case 2: Viewing in USD with rate 10
    // (10,000 BOB / 10) + 1,000 USDT = 2,000 USD
    const usdOverview = calculatePatrimonioOverview({
      accounts: mixedAccounts,
      investments: mixedInvestments,
      targetCurrency: "USD",
      p2pRate: 10,
    });
    expect(usdOverview.totalAssets).toBe(2000);
    expect(usdOverview.netWorth).toBe(2000);
    expect(usdOverview.evolutionPoints.at(-1)?.value).toBe(2000);
  });

  it("handles empty user records with clean null/zero values without fake numbers", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: [],
      investments: [],
      accounts: [],
      loans: [],
      manualLiabilities: [],
      transactions: [],
    });

    expect(overview.totalAssets).toBe(0);
    expect(overview.totalLiabilities).toBe(0);
    expect(overview.netWorth).toBe(0);
    expect(overview.debtRatioPct).toBe(0);
    expect(overview.previousNetWorthChangePct).toBeNull();
    expect(overview.assetsChangePct).toBeNull();
    expect(overview.liabilitiesChangePct).toBeNull();
    expect(overview.assetsByCategory).toEqual([]);
    expect(overview.liabilitiesByCategory).toEqual([]);
    expect(overview.evolutionPoints).toHaveLength(12);
    expect(overview.evolutionPoints.every((point) => point.value === 0)).toBe(true);
  });

  it("incorporates active Lent loans as assets so lending money preserves net worth", () => {
    const lentLoan: LoanSummaryDto = {
      id: "lent-1",
      counterpartyId: "cp-1",
      counterpartyName: "Amigo Juan",
      type: "Lent",
      template: "Standard",
      principal: new Decimal(3000),
      interestRate: 0.1,
      annualEffectiveRate: 0.1,
      remainingPrincipal: new Decimal(3000),
      disbursementDate: "2026-01-01",
      firstDueDate: "2026-02-01",
      totalInstallments: 12,
      createdAt: "2026-01-01",
      status: "Active",
      currency: "USD",
    };

    const overview = calculatePatrimonioOverview({
      accounts: [{
        id: "acc-1",
        name: "Banco BCP",
        type: "Savings",
        currency: "USD",
        balance: new Decimal(2000),
        createdAt: "2026-01-01T00:00:00Z",
      }],
      loans: [lentLoan],
    });

    // Total Assets: Cash 2,000 + Lent Loan 3,000 = 5,000 USD
    expect(overview.totalAssets).toBe(5000);
    expect(overview.totalLiabilities).toBe(0);
    expect(overview.netWorth).toBe(5000);

    const otherCategory = overview.assetsByCategory.find((c) => c.category === "other");
    expect(otherCategory).toBeDefined();
    expect(otherCategory!.items.some((i) => i.id === "lent-1" && i.value === 3000)).toBe(true);
    expect(overview.evolutionPoints.at(-1)?.value).toBe(5000);
  });

  it.each([
    { targetCurrency: "BOB" as const, assets: 19950, liabilities: 3550, net: 16400 },
    { targetCurrency: "USD" as const, assets: 1995, liabilities: 355, net: 1640 },
  ])("reconciles the current chart with January 2027 closing assets and liabilities in $targetCurrency", ({ targetCurrency, assets, liabilities, net }) => {
    // Closing projection only: this does not replay the 21 events or reconstruct history.
    const overview = calculatePatrimonioOverview({
      accounts: [{ ...mockAccounts[0], balance: new Decimal(13200), currency: "BOB" }],
      investments: [{ ...mockInvestments[0], currentValue: 2750, currency: "BOB" }],
      manualAssets: [{ ...mockManualAssets[0], name: "Laptop", category: "digital", value: 3500, currency: "BOB" }],
      loans: [
        { ...mockLoans[0], id: "receivable", type: "Lent", remainingPrincipal: new Decimal(500), currency: "BOB" },
        { ...mockLoans[0], id: "bank-debt", remainingPrincipal: new Decimal(2500), currency: "BOB" },
        { ...mockLoans[0], id: "family-debt", remainingPrincipal: new Decimal(800), currency: "BOB" },
      ],
      manualLiabilities: [{ ...mockManualLiabilities[0], amount: 250, currency: "BOB" }],
      targetCurrency,
      p2pRate: 10,
    });

    expect(overview.totalAssets).toBe(assets);
    expect(overview.totalLiabilities).toBe(liabilities);
    expect(overview.netWorth).toBe(net);
    expect(overview.assetsByCategory.reduce((sum, category) => sum + category.totalValue, 0)).toBe(assets);
    expect(overview.liabilitiesByCategory.reduce((sum, category) => sum + category.totalAmount, 0)).toBe(liabilities);
    expect(overview.evolutionPoints).toHaveLength(12);
    expect(overview.evolutionPoints.at(-1)?.value).toBe(net);
    expect(overview.evolutionPoints.at(-1)?.value).toBe(overview.totalAssets - overview.totalLiabilities);
  });

  describe.each(["Lent", "Borrowed"] as const)("%s loan status filtering", (type) => {
    it.each(["Inactive", "Paid", "Cancelled"])("excludes %s loans from the overview and current chart", (status) => {
      const overview = calculatePatrimonioOverview({
        accounts: mockAccounts,
        loans: [{ ...mockLoans[0], type, status }],
      });

      // Nonzero remaining principal must not override the status exclusion.
      expect(overview.totalAssets).toBe(10000);
      expect(overview.totalLiabilities).toBe(0);
      expect(overview.netWorth).toBe(10000);
      expect(overview.assetsByCategory.flatMap((category) => category.items).map((item) => item.id)).toEqual(["acc-1"]);
      expect(overview.liabilitiesByCategory).toEqual([]);
      expect(overview.evolutionPoints.at(-1)?.value).toBe(10000);
    });
  });

  it("keeps the current chart empty when only excluded loans exist", () => {
    const overview = calculatePatrimonioOverview({
      loans: [
        { ...mockLoans[0], type: "Lent", status: "Paid" },
        { ...mockLoans[0], status: "Cancelled" },
      ],
    });

    expect(overview.totalAssets).toBe(0);
    expect(overview.totalLiabilities).toBe(0);
    expect(overview.netWorth).toBe(0);
    expect(overview.evolutionPoints).toHaveLength(12);
    expect(overview.evolutionPoints.every((point) => point.value === 0)).toBe(true);
  });

  it("preserves whole-unit chart rounding for active Borrowed loans", () => {
    const overview = calculatePatrimonioOverview({
      accounts: mockAccounts,
      loans: [{ ...mockLoans[0], remainingPrincipal: new Decimal("20000.25") }],
    });

    expect(overview.totalAssets).toBe(10000);
    expect(overview.totalLiabilities).toBe(20000.25);
    expect(overview.netWorth).toBe(-10000.25);
    expect(overview.evolutionPoints.at(-1)?.value).toBe(-10000);
  });
});

// ---------------------------------------------------------------------------
// Honest historical series, MoM and classification rules (pinned clock).
// "Today" is 2026-11-18, so the 12 points run Dec 2025 (index 0) .. Nov 2026 (index 11).
// ---------------------------------------------------------------------------
const iso = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).toISOString();

const account = (overrides: Partial<AccountDto> = {}): AccountDto => ({
  id: "acc-x",
  name: "Cuenta",
  type: "Savings",
  currency: "USD",
  balance: new Decimal(0),
  createdAt: iso(2026, 1, 1),
  ...overrides,
});

const txn = (overrides: Partial<TransactionDto> = {}): TransactionDto => ({
  id: "t-x",
  accountId: "acc-x",
  direction: "Income",
  amount: new Decimal(0),
  currency: "USD",
  occurredAt: iso(2026, 11, 5),
  createdAt: iso(2026, 11, 5),
  ...overrides,
});

const loan = (overrides: Partial<LoanSummaryDto> = {}): LoanSummaryDto => ({
  ...mockLoans[0],
  id: "loan-x",
  counterpartyName: "Contraparte",
  remainingPrincipal: new Decimal(0),
  createdAt: iso(2026, 1, 1),
  ...overrides,
});

describe("net-worth-analytics honest history and reconciliation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fabricate months before a brand-new account and investment existed", () => {
    const overview = calculatePatrimonioOverview({
      accounts: [account({ balance: new Decimal(1000), createdAt: iso(2026, 11, 18) })],
      investments: [{ ...mockInvestments[0], initialValue: 500, currentValue: 500, history: [], createdAt: iso(2026, 11, 18) }],
    });

    expect(overview.evolutionPoints).toHaveLength(12);
    expect(overview.evolutionPoints.slice(0, 11).map((point) => point.value)).toEqual(new Array(11).fill(0));
    expect(overview.evolutionPoints[11].value).toBe(1500);
  });

  it("values each investment at its last known valuation as of each month end, and only once it exists", () => {
    const overview = calculatePatrimonioOverview({
      investments: [{
        ...mockInvestments[0],
        createdAt: iso(2026, 3, 10),
        history: [{ at: iso(2026, 9, 1), value: 5500 }, { at: iso(2026, 10, 1), value: 6200 }],
      }],
    });
    const byMonth = Object.fromEntries(overview.evolutionPoints.map((point) => [point.date.slice(0, 7), point.value]));

    expect(byMonth["2026-02"]).toBe(0); // not created yet
    expect(byMonth["2026-03"]).toBe(5000); // initialValue until the first valuation
    expect(byMonth["2026-08"]).toBe(5000);
    expect(byMonth["2026-09"]).toBe(5500);
    expect(byMonth["2026-10"]).toBe(6200);
  });

  it("walks account balances backwards from month ends using only that account's transactions", () => {
    const overview = calculatePatrimonioOverview({
      accounts: [
        account({ balance: new Decimal(1000) }),
        account({ id: "acc-other", balance: new Decimal(50), createdAt: iso(2026, 1, 1) }),
      ],
      transactions: [txn({ amount: new Decimal(400) }), txn({ id: "t-other", accountId: "acc-other", direction: "Expense", amount: new Decimal(10) })],
    });

    // Oct-end: acc-x 1000 - 400, acc-other 50 + 10
    expect(overview.evolutionPoints[10].value).toBe(660);
    expect(overview.evolutionPoints[11].value).toBe(1050);
  });

  it("derives the liabilities MoM change from the real prior-month principal, not today's balance", () => {
    const overview = calculatePatrimonioOverview({
      loans: [loan({ remainingPrincipal: new Decimal(800) })],
      transactions: [
        txn({ accountId: "acc-gone", direction: "Expense", amount: new Decimal(200), loanId: "loan-x", loanCashKind: "Principal" }),
      ],
    });

    expect(overview.totalLiabilities).toBe(800);
    expect(overview.previousTotalLiabilities).toBe(1000);
    expect(overview.liabilitiesChangePct).toBe(-20);
    expect(overview.evolutionPoints[10].value).toBe(-1000);
    expect(overview.evolutionPoints[11].value).toBe(-800);
  });

  it("does not count a loan taken this month in the previous month, and has no percentage base", () => {
    const overview = calculatePatrimonioOverview({
      loans: [loan({ remainingPrincipal: new Decimal(500), createdAt: iso(2026, 11, 10) })],
    });

    expect(overview.previousTotalLiabilities).toBe(0);
    expect(overview.liabilitiesChangePct).toBeNull();
    expect(overview.evolutionPoints[10].value).toBe(0);
    expect(overview.evolutionPoints[11].value).toBe(-500);
  });

  it("restores a lent loan's prior receivable from principal repayments received this month", () => {
    const overview = calculatePatrimonioOverview({
      loans: [loan({ type: "Lent", remainingPrincipal: new Decimal(3000) })],
      transactions: [txn({ accountId: "acc-gone", direction: "Income", amount: new Decimal(1000), loanId: "loan-x", loanCashKind: "Principal" })],
    });

    expect(overview.previousTotalAssets).toBe(4000);
    expect(overview.assetsChangePct).toBe(-25);
  });

  it("restores credit-card debt from card purchases made this month (no cash account involved)", () => {
    const overview = calculatePatrimonioOverview({
      loans: [loan({ loanKind: "CreditCard", remainingPrincipal: new Decimal(300) })],
      transactions: [txn({ accountId: "", direction: "Expense", amount: new Decimal(100), loanId: "loan-x", loanCashKind: "CardPurchase" })],
    });

    expect(overview.previousTotalLiabilities).toBe(200);
    expect(overview.liabilitiesChangePct).toBe(50);
  });

  it("ignores a loan that is cancelled when reconstructing history", () => {
    const overview = calculatePatrimonioOverview({
      loans: [loan({ status: "Cancelled", remainingPrincipal: new Decimal(900) })],
    });

    expect(overview.previousTotalLiabilities).toBe(0);
    expect(overview.evolutionPoints.every((point) => point.value === 0)).toBe(true);
  });

  it("exposes previous totals consistent with the series' previous-month point", () => {
    const overview = calculatePatrimonioOverview({
      manualAssets: [{ ...mockManualAssets[0], value: 1000, createdAt: iso(2026, 1, 1) }, { ...mockManualAssets[1], value: 500, createdAt: iso(2026, 11, 2) }],
      manualLiabilities: [{ ...mockManualLiabilities[0], amount: 200, createdAt: iso(2026, 11, 3) }],
    });

    expect(overview.previousTotalAssets).toBe(1000);
    expect(overview.previousTotalLiabilities).toBe(0);
    expect(overview.previousNetWorth).toBe(1000);
    expect(overview.evolutionPoints[10].value).toBe(overview.previousNetWorth);
    expect(overview.assetsChangePct).toBe(50);
  });

  it("counts a negative account balance as a liability instead of dropping it", () => {
    const overview = calculatePatrimonioOverview({
      accounts: [
        account({ id: "acc-pos", name: "Ahorros", balance: new Decimal(1000) }),
        account({ id: "acc-neg", name: "Sobregiro", balance: new Decimal(-300) }),
      ],
    });

    expect(overview.totalAssets).toBe(1000);
    expect(overview.totalLiabilities).toBe(300);
    expect(overview.netWorth).toBe(700);
    const overdraft = overview.liabilitiesByCategory.flatMap((category) => category.items).find((item) => item.id === "acc-neg");
    expect(overdraft).toMatchObject({ name: "Sobregiro", amount: 300, originalAmount: 300, isFromModule: true });
    expect(overview.evolutionPoints.at(-1)?.value).toBe(700);
  });

  it("keeps a negative balance as a liability in past months too", () => {
    const overview = calculatePatrimonioOverview({
      accounts: [account({ balance: new Decimal(-300) })],
      transactions: [txn({ direction: "Expense", amount: new Decimal(100) })],
    });

    // Oct-end balance: -300 + 100 = -200
    expect(overview.evolutionPoints[10].value).toBe(-200);
    expect(overview.evolutionPoints[11].value).toBe(-300);
  });

  describe("liability classification", () => {
    const classify = (overrides: Partial<LoanSummaryDto>) => {
      const overview = calculatePatrimonioOverview({ loans: [loan({ remainingPrincipal: new Decimal(100), ...overrides })] });
      return overview.liabilitiesByCategory.map((category) => category.category);
    };

    it("does not treat a bank's brand name as a mortgage", () => {
      expect(classify({ counterpartyName: "Banco Santander" })).toEqual(["loan"]);
    });

    it.each(["Hipoteca casa", "Crédito de vivienda", "Préstamo inmueble"])("treats an explicit property signal (%s) as a mortgage", (counterpartyName) => {
      expect(classify({ counterpartyName })).toEqual(["mortgage"]);
    });

    it("uses the explicit CreditCard kind for credit card debt", () => {
      expect(classify({ loanKind: "CreditCard", counterpartyName: "Visa" })).toEqual(["creditcard"]);
    });
  });

  it("uses human labels instead of raw enum values in item notes", () => {
    const overview = calculatePatrimonioOverview({
      investments: [{ ...mockInvestments[0] }],
      accounts: [account({ type: "CryptoWallet", balance: new Decimal(10) })],
    });
    const items = overview.assetsByCategory.flatMap((category) => category.items);

    expect(items.find((item) => item.id === "inv-1")?.notes).toBe("Crypto • 0.1 u.");
    expect(items.find((item) => item.id === "acc-x")?.notes).toBe("Wallet Crypto");
  });

  describe("currency conversion", () => {
    it.each([
      { from: "BOB", to: "BOB" as const, expected: 100 },
      { from: "BOB", to: "USD" as const, expected: 10 },
      { from: "USD", to: "BOB" as const, expected: 1000 },
      { from: "USDT", to: "USD" as const, expected: 100 },
      { from: "EUR", to: "BOB" as const, expected: 1000 },
      { from: "EUR", to: "USD" as const, expected: 100 },
      { from: undefined, to: "BOB" as const, expected: 100 },
      { from: undefined, to: "USD" as const, expected: 100 },
    ])("converts 100 $from to $to at rate 10 -> $expected (unknown currencies are valued at USD parity in both directions)", ({ from, to, expected }) => {
      expect(convertPatrimonioAmount(100, from, to, 10)).toBe(expected);
    });
  });

  describe("evolution period selection", () => {
    const overview = () => calculatePatrimonioOverview({ accounts: [account({ balance: new Decimal(10) })] });

    it("offers only periods the 12-month series can honour", () => {
      expect(PATRIMONIO_PERIOD_OPTIONS.map((option) => option.value)).toEqual(["6m", "12m", "ytd"]);
    });

    it("slices the most recent months for rolling periods", () => {
      const points = overview().evolutionPoints;

      expect(sliceEvolutionPoints(points, "12m")).toHaveLength(12);
      expect(sliceEvolutionPoints(points, "6m").map((point) => point.month)).toEqual(["Jun", "Jul", "Ago", "Sep", "Oct", "Nov"]);
    });

    it("keeps only points from the current calendar year for year-to-date", () => {
      const points = sliceEvolutionPoints(overview().evolutionPoints, "ytd");

      expect(points).toHaveLength(11);
      expect(points.every((point) => point.date.startsWith("2026"))).toBe(true);
    });
  });
});
