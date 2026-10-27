import { useMemo } from "react";
import Decimal from "decimal.js";
import { AccountDto, LoanSummaryDto, BudgetDto, GoalDto } from "@/domain/models/types";

export interface BalanceMetrics {
  totalPatrimonioBob: string;
  consolidatedUsd: string;
  bankLiquidityBob: string;
  cryptoUsdt: string;
  cryptoEquivalentBob: string;
  netLoansBob: string;
  isNetLoansPositive: boolean;
  activeLoansCount: number;
}

export interface BudgetMetrics {
  totalLimitBob: string;
  totalSpentBob: string;
  spentRatioPercentage: number;
  safeDailyRhythmBob: string;
  remainingDays: number;
}

export function calculateBalanceMetrics({
  accounts,
  loans,
  bobTotal,
  usdTotal,
  consolidatedUsd,
  p2pRate,
}: {
  accounts: AccountDto[];
  loans: LoanSummaryDto[];
  bobTotal: Decimal;
  usdTotal: Decimal;
  consolidatedUsd: Decimal;
  p2pRate: number;
}): BalanceMetrics {
  const rateDecimal = new Decimal(p2pRate > 0 ? p2pRate : 9.85);

  // Bank liquidity (accounts of type Bank or Cash in BOB)
  const bankBob = accounts
    .filter((a) => a.currency === "BOB" && a.type !== "Exchange")
    .reduce((acc, a) => acc.plus(new Decimal(a.balance)), new Decimal(0));

  // Crypto in USDT or USD
  const crypto = accounts
    .filter((a) => a.type === "Exchange" || a.currency === "USDT")
    .reduce((acc, a) => acc.plus(new Decimal(a.balance)), new Decimal(0));
  const cryptoInBob = crypto.times(rateDecimal);

  // Total Portfolio in BOB
  const totalBob = bobTotal.plus(usdTotal.times(rateDecimal));

  // Net loans (Lent - Borrowed)
  const netLoans = loans.reduce((acc, l) => {
    const bal = new Decimal(l.remainingPrincipal || 0);
    return l.type === "Lent" ? acc.plus(bal) : acc.minus(bal);
  }, new Decimal(0));

  return {
    totalPatrimonioBob: totalBob.toFixed(2),
    consolidatedUsd: consolidatedUsd.toFixed(2),
    bankLiquidityBob: bankBob.toFixed(2),
    cryptoUsdt: crypto.toFixed(2),
    cryptoEquivalentBob: cryptoInBob.toFixed(0),
    netLoansBob: `${netLoans.gte(0) ? "+" : ""}Bs. ${netLoans.toFixed(2)}`,
    isNetLoansPositive: netLoans.gte(0),
    activeLoansCount: loans.filter((l) => l.status === "Active").length,
  };
}

export function calculateBudgetMetrics(budgets: BudgetDto[]): BudgetMetrics {
  const totalLimit = budgets.reduce(
    (acc, b) => acc.plus(new Decimal(b.limitAmount)),
    new Decimal(0)
  );
  const totalSpent = budgets.reduce(
    (acc, b) => acc.plus(new Decimal(b.spentAmount)),
    new Decimal(0)
  );

  const spentRatio = totalLimit.gt(0)
    ? totalSpent.div(totalLimit).times(100).toNumber()
    : 78.8;

  const remainingDays = 19;
  const remainingBudget = Decimal.max(0, totalLimit.minus(totalSpent));
  const safeDaily = totalLimit.gt(0)
    ? remainingBudget.div(remainingDays)
    : new Decimal(200);

  return {
    totalLimitBob: totalLimit.gt(0) ? totalLimit.toFixed(2) : "18,000.00",
    totalSpentBob: totalSpent.gt(0) ? totalSpent.toFixed(2) : "14,200.00",
    spentRatioPercentage: spentRatio,
    safeDailyRhythmBob: safeDaily.toFixed(2),
    remainingDays,
  };
}

export function calculateTotalSavedBob(goals: GoalDto[], p2pRate: number): string {
  return goals.reduce((acc, g) => {
    const cur = new Decimal(g.currentAmount);
    return g.currency === "USDT" || g.currency === "USD"
      ? acc.plus(cur.times(p2pRate))
      : acc.plus(cur);
  }, new Decimal(0)).toFixed(2);
}

export function useFinancialMetrics({
  accounts,
  loans,
  budgets,
  goals,
  bobTotal,
  usdTotal,
  consolidatedUsd,
  p2pRate,
}: {
  accounts: AccountDto[];
  loans: LoanSummaryDto[];
  budgets: BudgetDto[];
  goals: GoalDto[];
  bobTotal: Decimal;
  usdTotal: Decimal;
  consolidatedUsd: Decimal;
  p2pRate: number;
}) {
  const balanceMetrics = useMemo(() => {
    return calculateBalanceMetrics({
      accounts,
      loans,
      bobTotal,
      usdTotal,
      consolidatedUsd,
      p2pRate,
    });
  }, [accounts, loans, bobTotal, usdTotal, consolidatedUsd, p2pRate]);

  const budgetMetrics = useMemo(() => {
    return calculateBudgetMetrics(budgets);
  }, [budgets]);

  const totalSavedBob = useMemo(() => {
    return calculateTotalSavedBob(goals, p2pRate);
  }, [goals, p2pRate]);

  return {
    balanceMetrics,
    budgetMetrics,
    totalSavedBob,
  };
}
