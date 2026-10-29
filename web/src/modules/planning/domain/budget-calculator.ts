import Decimal from "decimal.js";
import { toDecimal } from "@/shared/domain/money";
import { BudgetDto, GoalDto } from "./planning.types";

export interface BudgetMetrics {
  totalLimitBob: string;
  totalSpentBob: string;
  spentRatioPercentage: number;
  safeDailyRhythmBob: string;
  remainingDays: number;
}

export function getRemainingDaysInMonth(referenceDate: Date = new Date()): number {
  const lastDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  ).getDate();
  return Math.max(1, lastDay - referenceDate.getDate());
}

export function calculateBudgetMetrics(
  budgets: BudgetDto[],
  remainingDays: number = getRemainingDaysInMonth()
): BudgetMetrics {
  const safeDays = Math.max(1, remainingDays);

  const totalLimit = budgets.reduce(
    (acc, b) => acc.plus(toDecimal(b.limitAmount)),
    new Decimal(0)
  );
  const totalSpent = budgets.reduce(
    (acc, b) => acc.plus(toDecimal(b.spentAmount)),
    new Decimal(0)
  );

  const spentRatio = totalLimit.gt(0)
    ? totalSpent.div(totalLimit).times(100).toNumber()
    : 0;

  const remainingBudget = Decimal.max(0, totalLimit.minus(totalSpent));
  const safeDaily = totalLimit.gt(0)
    ? remainingBudget.div(safeDays)
    : new Decimal(0);

  return {
    totalLimitBob: totalLimit.toFixed(2),
    totalSpentBob: totalSpent.toFixed(2),
    spentRatioPercentage: spentRatio,
    safeDailyRhythmBob: safeDaily.toFixed(2),
    remainingDays: safeDays,
  };
}

export function calculateTotalSavedBob(goals: GoalDto[], p2pRate: number): string {
  const rate = toDecimal(p2pRate > 0 ? p2pRate : 9.85);
  return goals
    .reduce((acc, g) => {
      const cur = toDecimal(g.currentAmount);
      return g.currency === "USDT" || g.currency === "USD"
        ? acc.plus(cur.times(rate))
        : acc.plus(cur);
    }, new Decimal(0))
    .toFixed(2);
}
