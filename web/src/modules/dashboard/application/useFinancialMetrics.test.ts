import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateBalanceMetrics,
  calculateBudgetMetrics,
  calculateTotalSavedBob,
} from "./useFinancialMetrics";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { BudgetDto, GoalDto } from "@/modules/planning/domain/planning.types";

describe("Financial Metrics Calculations", () => {
  const mockAccounts: AccountDto[] = [
    {
      id: "acc-1",
      name: "Banco Unión",
      type: "Bank",
      currency: "BOB",
      balance: new Decimal(18400),
      createdAt: "2025-01-01",
    },
    {
      id: "acc-2",
      name: "Banco BCP",
      type: "Bank",
      currency: "BOB",
      balance: new Decimal(6850),
      createdAt: "2025-01-01",
    },
    {
      id: "acc-3",
      name: "Binance Wallet",
      type: "Exchange",
      currency: "USDT",
      balance: new Decimal(4250),
      createdAt: "2025-01-01",
    },
  ];

  const mockLoans: LoanSummaryDto[] = [
    {
      id: "loan-1",
      counterpartyId: "c-1",
      counterpartyName: "Juan Pérez",
      type: "Lent",
      template: "French",
      status: "Active",
      principal: new Decimal(1000),
      currency: "BOB",
      interestRate: 0.1,
      annualEffectiveRate: 0.1,
      remainingPrincipal: new Decimal(700),
      disbursementDate: "2025-01-01",
      firstDueDate: "2025-02-01",
      totalInstallments: 3,
      createdAt: "2025-01-01",
    },
    {
      id: "loan-2",
      counterpartyId: "c-2",
      counterpartyName: "Banco",
      type: "Borrowed",
      template: "French",
      status: "Active",
      principal: new Decimal(500),
      currency: "BOB",
      interestRate: 0.05,
      annualEffectiveRate: 0.05,
      remainingPrincipal: new Decimal(300),
      disbursementDate: "2025-01-01",
      firstDueDate: "2025-02-01",
      totalInstallments: 2,
      createdAt: "2025-01-01",
    },
  ];

  const mockBudgets: BudgetDto[] = [
    {
      id: "b-1",
      categoryId: "Alimentos",
      period: "2025-05",
      limitAmount: 4000,
      currency: "BOB",
      alertThreshold: 0.8,
      spentAmount: 3200,
      remainingAmount: 800,
      percentageUsed: 80,
      isAlertTriggered: true,
      isExceeded: false,
      isActive: true,
      createdAt: "2025-05-01",
    },
    {
      id: "b-2",
      categoryId: "Transporte",
      period: "2025-05",
      limitAmount: 2000,
      currency: "BOB",
      alertThreshold: 0.8,
      spentAmount: 1800,
      remainingAmount: 200,
      percentageUsed: 90,
      isAlertTriggered: true,
      isExceeded: false,
      isActive: true,
      createdAt: "2025-05-01",
    },
  ];

  const mockGoals: GoalDto[] = [
    {
      id: "g-1",
      trackingStatus: "tracked",
      sharedGoalCount: 1,
      name: "Fondo Emergencia",
      targetAmount: 30000,
      currency: "BOB",
      currentAmount: 21500,
      remainingAmount: 8500,
      percentageAchieved: 71.6,
      createdAt: "2025-01-01",
    },
    {
      id: "g-2",
      trackingStatus: "tracked",
      sharedGoalCount: 1,
      name: "Entrada Vehículo",
      targetAmount: 5000,
      currency: "USDT",
      currentAmount: 3250,
      remainingAmount: 1750,
      percentageAchieved: 65,
      createdAt: "2025-01-01",
    },
  ];

  it("calculates balance metrics accurately", () => {
    const balanceMetrics = calculateBalanceMetrics({
      accounts: mockAccounts,
      loans: mockLoans,
      bobTotal: new Decimal(25250),
      usdTotal: new Decimal(4250),
      consolidatedUsd: new Decimal(6813.7),
      p2pRate: 9.85,
    });

    // Bank liquidity = 18400 + 6850 = 25250.00
    expect(balanceMetrics.bankLiquidityBob).toBe("25250.00");

    // Crypto = 4250.00 USDT, Equivalent in BOB = 4250 * 9.85 = 41862.5 -> 41863
    expect(balanceMetrics.cryptoUsdt).toBe("4250.00");
    expect(balanceMetrics.cryptoEquivalentBob).toBe("41863");

    // Net loans = 700 (Lent) - 300 (Borrowed) = +400.00
    expect(balanceMetrics.netLoansBob).toBe("+Bs. 400.00");
    expect(balanceMetrics.isNetLoansPositive).toBe(true);
    expect(balanceMetrics.activeLoansCount).toBe(2);
  });

  it("calculates budget metrics accurately", () => {
    const budgetMetrics = calculateBudgetMetrics(mockBudgets, 19);

    // Total limit = 4000 + 2000 = 6000.00
    expect(budgetMetrics.totalLimitBob).toBe("6000.00");

    // Total spent = 3200 + 1800 = 5000.00
    expect(budgetMetrics.totalSpentBob).toBe("5000.00");

    // Spent ratio = 5000 / 6000 = 83.33%
    expect(budgetMetrics.spentRatioPercentage).toBeCloseTo(83.33, 1);

    // Remaining budget = 1000, safe daily = 1000 / 19 = 52.63
    expect(budgetMetrics.safeDailyRhythmBob).toBe("52.63");
    expect(budgetMetrics.remainingDays).toBe(19);
  });

  it("returns zero metrics when no budgets exist instead of hardcoded fake amounts", () => {
    const emptyMetrics = calculateBudgetMetrics([], 15);
    expect(emptyMetrics.totalLimitBob).toBe("0.00");
    expect(emptyMetrics.totalSpentBob).toBe("0.00");
    expect(emptyMetrics.spentRatioPercentage).toBe(0);
    expect(emptyMetrics.safeDailyRhythmBob).toBe("0.00");
  });

  it("calculates total saved across multi-currency goals", () => {
    const totalSavedBob = calculateTotalSavedBob(mockGoals, 9.85);

    // Goal 1: 21500 BOB
    // Goal 2: 3250 USDT * 9.85 = 32012.50 BOB
    // Total: 21500 + 32012.50 = 53512.50
    expect(totalSavedBob).toBe("53512.50");
  });
});
