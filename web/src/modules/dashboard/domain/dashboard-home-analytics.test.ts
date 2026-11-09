import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculateDashboardHomeAnalytics } from "./dashboard-home-analytics";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { Investment } from "@/modules/investments/domain/investment.types";
import { PatrimonialAsset } from "@/modules/patrimonio/domain/patrimonio.types";

describe("Dashboard Home Analytics Engine (100% Authentic Data)", () => {
  const mockAccounts: AccountDto[] = [
    {
      id: "acc-bcp",
      name: "Banco BCP",
      type: "Bank",
      currency: "USD",
      balance: new Decimal(7500),
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "acc-mp",
      name: "Mercado Pago",
      type: "Wallet",
      currency: "USD",
      balance: new Decimal(1240),
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "acc-binance",
      name: "Binance (Crypto)",
      type: "Crypto",
      currency: "USD",
      balance: new Decimal(4320),
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const mockTransactions: TransactionDto[] = [
    {
      id: "tx-inc-1",
      accountId: "acc-bcp",
      direction: "Income",
      amount: new Decimal(6800),
      currency: "USD",
      occurredAt: "2026-10-01T10:00:00Z",
      description: "Salario mensual",
      categoryId: "cat-salario",
      createdAt: "2026-10-01T10:00:00Z",
    },
    {
      id: "tx-exp-1",
      accountId: "acc-bcp",
      direction: "Expense",
      amount: new Decimal(1318),
      currency: "USD",
      occurredAt: "2026-10-02T10:00:00Z",
      description: "Alquiler vivienda",
      categoryId: "cat-vivienda",
      createdAt: "2026-10-02T10:00:00Z",
    },
    {
      id: "tx-exp-2",
      accountId: "acc-mp",
      direction: "Expense",
      amount: new Decimal(741),
      currency: "USD",
      occurredAt: "2026-10-05T10:00:00Z",
      description: "Supermercado comida",
      categoryId: "cat-alimentacion",
      createdAt: "2026-10-05T10:00:00Z",
    },
  ];

  const mockLoans: LoanSummaryDto[] = [
    {
      id: "loan-debt-1",
      counterpartyId: "cp-1",
      counterpartyName: "Banco",
      type: "Borrowed",
      template: "FixedInstallment",
      status: "Active",
      principal: new Decimal(35000),
      currency: "USD",
      interestRate: 8,
      annualEffectiveRate: 8.3,
      remainingPrincipal: new Decimal(31660),
      disbursementDate: "2026-01-01",
      firstDueDate: "2026-02-01",
      totalInstallments: 36,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const mockInvestments: Investment[] = [
    {
      id: "inv-btc",
      name: "Bitcoin (BTC)",
      kind: "crypto",
      currency: "USD",
      currentValue: 6200,
      initialValue: 5500,
      quantity: 0.1,
      iconKey: "crypto",
      colorKey: "amber",
      history: [],
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "inv-sp500",
      name: "S&P 500 (ETF)",
      kind: "stocks",
      currency: "USD",
      currentValue: 18000,
      initialValue: 16800,
      quantity: 35,
      iconKey: "bank",
      colorKey: "purple",
      history: [],
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const mockManualAssets: PatrimonialAsset[] = [
    {
      id: "ast-1",
      name: "Departamento",
      category: "realestate",
      value: 85000,
      currency: "USD",
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "ast-2",
      name: "Vehículo",
      category: "vehicles",
      value: 15000,
      currency: "USD",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const mockCategoryNames = new Map<string, string>([
    ["cat-salario", "Salario"],
    ["cat-vivienda", "Vivienda"],
    ["cat-alimentacion", "Alimentación"],
  ]);

  it("calculates 4 Hero KPIs purely from real accounts, loans, investments, and manual assets", () => {
    const result = calculateDashboardHomeAnalytics({
      accounts: mockAccounts,
      transactions: mockTransactions,
      loans: mockLoans,
      investments: mockInvestments,
      manualAssets: mockManualAssets,
      categoryNamesMap: mockCategoryNames,
      selectedCurrency: "USD",
      p2pRate: 10,
      year: 2026,
      month: 9,
    });

    // Liquid total = 7500 + 1240 + 4320 = 13060
    expect(result.kpis.totalLiquidBalance).toBe(13060);
    // Liabilities = 31660
    expect(result.kpis.totalLiabilities).toBe(31660);
    // Total Assets = 13060 (liquid) + 24200 (investments: 6200+18000) + 100000 (manual: 85000+15000) = 137260
    expect(result.kpis.totalAssets).toBe(137260);
    // Net Worth = 137260 - 31660 = 105600
    expect(result.kpis.netWorth).toBe(105600);
  });

  it("computes authentic monthly cash flow and recommended 50/30/20 distribution without fake fallbacks", () => {
    const result = calculateDashboardHomeAnalytics({
      accounts: mockAccounts,
      transactions: mockTransactions,
      loans: mockLoans,
      investments: mockInvestments,
      manualAssets: mockManualAssets,
      categoryNamesMap: mockCategoryNames,
      selectedCurrency: "USD",
      p2pRate: 10,
      year: 2026,
      month: 9,
    });

    expect(result.monthlyCashFlow.income).toBe(6800);
    expect(result.monthlyCashFlow.expenses).toBe(2059); // 1318 + 741
    expect(result.monthlyCashFlow.savings).toBe(4741); // 6800 - 2059

    // 50/30/20 based on authentic 6800 income
    expect(result.recommendedDistribution.ruleLabel).toBe("50/30/20");
    expect(result.recommendedDistribution.isCustom).toBe(false);
    expect(result.recommendedDistribution.necesidades).toBe(3400); // 50%
    expect(result.recommendedDistribution.estiloDeVida).toBe(2040); // 30%
    expect(result.recommendedDistribution.ahorroEInversion).toBe(1360); // 20%
    expect(result.recommendedDistribution.buckets).toHaveLength(3);

    // Category breakdown should contain Vivienda and Alimentación
    expect(result.categoryExpenses).toHaveLength(2);
    expect(result.categoryExpenses[0].name).toBe("Vivienda");
    expect(result.categoryExpenses[0].amount).toBe(1318);
    expect(result.categoryExpenses[1].name).toBe("Alimentación");
    expect(result.categoryExpenses[1].amount).toBe(741);
  });

  it("handles empty financial state authentically without injecting dummy data", () => {
    const result = calculateDashboardHomeAnalytics({
      accounts: [],
      transactions: [],
      loans: [],
      investments: [],
      manualAssets: [],
      selectedCurrency: "USD",
      p2pRate: 10,
    });

    expect(result.kpis.netWorth).toBe(0);
    expect(result.kpis.totalAssets).toBe(0);
    expect(result.kpis.totalLiabilities).toBe(0);
    expect(result.kpis.totalLiquidBalance).toBe(0);
    expect(result.monthlyCashFlow.income).toBe(0);
    expect(result.monthlyCashFlow.expenses).toBe(0);
    expect(result.monthlyCashFlow.savings).toBe(0);
    expect(result.categoryExpenses).toHaveLength(0);
    expect(result.topInvestments).toHaveLength(0);
  });

  it("calculates custom user-configured distribution plan when enabled", () => {
    const customPlan = {
      enabled: true,
      buckets: [
        { id: "b1", name: "Gastos fijos", percent: 40, colorKey: "blue" as const, categoryIds: [] },
        { id: "b2", name: "Estilo de vida", percent: 30, colorKey: "pink" as const, categoryIds: [] },
        { id: "b3", name: "Ahorro", percent: 20, colorKey: "emerald" as const, categoryIds: [] },
        { id: "b4", name: "Inversión", percent: 10, colorKey: "amber" as const, categoryIds: [] },
      ],
    };

    const result = calculateDashboardHomeAnalytics({
      accounts: mockAccounts,
      transactions: mockTransactions,
      loans: mockLoans,
      investments: mockInvestments,
      manualAssets: mockManualAssets,
      categoryNamesMap: mockCategoryNames,
      selectedCurrency: "USD",
      p2pRate: 10,
      year: 2026,
      month: 9,
      distributionPlan: customPlan,
    });

    expect(result.recommendedDistribution.isCustom).toBe(true);
    expect(result.recommendedDistribution.ruleLabel).toBe("40/30/20/10");
    expect(result.recommendedDistribution.buckets).toHaveLength(4);
    expect(result.recommendedDistribution.buckets[0]).toEqual({
      id: "b1",
      name: "Gastos fijos",
      percent: 40,
      amount: 2720, // 6800 * 0.40
      colorKey: "blue",
    });
    expect(result.recommendedDistribution.buckets[1]).toEqual({
      id: "b2",
      name: "Estilo de vida",
      percent: 30,
      amount: 2040, // 6800 * 0.30
      colorKey: "pink",
    });
    expect(result.recommendedDistribution.buckets[2]).toEqual({
      id: "b3",
      name: "Ahorro",
      percent: 20,
      amount: 1360, // 6800 * 0.20
      colorKey: "emerald",
    });
    expect(result.recommendedDistribution.buckets[3]).toEqual({
      id: "b4",
      name: "Inversión",
      percent: 10,
      amount: 680, // 6800 * 0.10
      colorKey: "amber",
    });
  });
});
