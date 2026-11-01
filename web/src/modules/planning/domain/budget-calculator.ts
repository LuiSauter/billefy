import Decimal from "decimal.js";
import { createMoney, toDecimal } from "@/shared/domain/money";
import { budgetCurrencyDecimals } from "./budget-edit";
import { BudgetDto, GoalDto } from "./planning.types";

export type BudgetRowStatus = "exceeded" | "alert" | "ok";

export interface BudgetRowViewModel {
  budget: BudgetDto;
  status: BudgetRowStatus;
  usedPercent: number;
  barPercent: number;
  thresholdPercent: number;
  thresholdLabel: string;
  limit: string;
  spent: string;
  balanceLabel: "Disponible" | "Excedido";
  balance: string;
}

export function buildBudgetRows(budgets: readonly BudgetDto[]): BudgetRowViewModel[] {
  const rows = budgets.map((b): BudgetRowViewModel => {
    const decimals = budgetCurrencyDecimals(b.currency);
    const limitDec = createMoney(b.limitAmount, b.currency).amount.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
    const spentDec = createMoney(b.spentAmount, b.currency).amount.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
    const thresholdDec = new Decimal(b.alertThreshold ?? 0.8);
    const thresholdPercent = thresholdDec.times(100).toNumber();
    const thresholdLabel = `${thresholdDec.times(100).toString()}%`;

    const usedRatio = limitDec.gt(0) ? spentDec.dividedBy(limitDec) : new Decimal(0);
    const usedPercent = Math.round(usedRatio.times(100).toNumber());
    const barPercent = Math.min(100, Math.max(0, usedPercent));

    let status: BudgetRowStatus = "ok";
    if (spentDec.gt(limitDec)) {
      status = "exceeded";
    } else if (usedRatio.gte(thresholdDec)) {
      status = "alert";
    }

    const isExceeded = spentDec.gt(limitDec);
    const diff = isExceeded ? spentDec.minus(limitDec) : limitDec.minus(spentDec);
    const balanceLabel: "Disponible" | "Excedido" = isExceeded ? "Excedido" : "Disponible";

    return {
      budget: b,
      status,
      usedPercent,
      barPercent,
      thresholdPercent,
      thresholdLabel,
      limit: `${b.currency} ${limitDec.toFixed(decimals)}`,
      spent: `${b.currency} ${spentDec.toFixed(decimals)}`,
      balanceLabel,
      balance: `${b.currency} ${diff.toFixed(decimals)}`,
    };
  });

  const priorityOrder: Record<BudgetRowStatus, number> = { exceeded: 0, alert: 1, ok: 2 };
  return rows.sort((a, b) => {
    const pDiff = priorityOrder[a.status] - priorityOrder[b.status];
    if (pDiff !== 0) return pDiff;
    // Within same status, higher used percentage first
    return b.usedPercent - a.usedPercent;
  });
}

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

// Retained for legacy callers; current goals UI deliberately avoids this FX-converted aggregate.
export function calculateTotalSavedBob(goals: GoalDto[], p2pRate: number): string {
  const rate = toDecimal(p2pRate > 0 ? p2pRate : 9.85);
  return goals.reduce((sum, goal) => {
    const current = toDecimal(goal.currentAmount);
    return goal.currency === "USDT" || goal.currency === "USD" ? sum.plus(current.times(rate)) : sum.plus(current);
  }, new Decimal(0)).toFixed(2);
}
