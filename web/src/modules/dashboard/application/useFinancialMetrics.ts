import { useMemo } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { BalanceMetrics, calculateBalanceMetrics } from "@/modules/ledger/domain/balance-calculator";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { BudgetDto } from "@/modules/planning/domain/planning.types";
import { BudgetMetrics, calculateBudgetMetrics, calculateTotalSavedBob } from "@/modules/planning/domain/budget-calculator";

export type { BalanceMetrics, BudgetMetrics };
export { calculateBalanceMetrics, calculateBudgetMetrics, calculateTotalSavedBob };

export function useFinancialMetrics({ accounts, loans, budgets, bobTotal, usdTotal, consolidatedUsd, p2pRate }: {
  accounts: AccountDto[]; loans: LoanSummaryDto[]; budgets: BudgetDto[];
  bobTotal: Decimal; usdTotal: Decimal; consolidatedUsd: Decimal; p2pRate: number;
}) {
  const balanceMetrics = useMemo(() => calculateBalanceMetrics({ accounts, loans, bobTotal, usdTotal, consolidatedUsd, p2pRate }), [accounts, loans, bobTotal, usdTotal, consolidatedUsd, p2pRate]);
  const budgetMetrics = useMemo(() => calculateBudgetMetrics(budgets, undefined, p2pRate), [budgets, p2pRate]);
  return { balanceMetrics, budgetMetrics };
}
