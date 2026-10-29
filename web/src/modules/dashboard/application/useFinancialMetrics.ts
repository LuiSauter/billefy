import { useMemo } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import {
  BalanceMetrics,
  calculateBalanceMetrics,
} from "@/modules/ledger/domain/balance-calculator";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { BudgetDto, GoalDto } from "@/modules/planning/domain/planning.types";
import {
  BudgetMetrics,
  calculateBudgetMetrics,
  calculateTotalSavedBob,
} from "@/modules/planning/domain/budget-calculator";

export type { BalanceMetrics, BudgetMetrics };
export {
  calculateBalanceMetrics,
  calculateBudgetMetrics,
  calculateTotalSavedBob,
};

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
