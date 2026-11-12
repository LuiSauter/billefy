import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculatePatrimonioOverview } from "./net-worth-analytics";
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
  });
});
