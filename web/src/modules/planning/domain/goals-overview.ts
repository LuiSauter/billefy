import Decimal from "decimal.js";
import { GoalDto } from "./planning.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { createMoney, formatMoney } from "@/shared/domain/money";

function decimalsFor(currency: string): number {
  return currency.toUpperCase() === "BTC" ? 8 : currency.toUpperCase() === "ETH" ? 8 : 2;
}
function amount(value: number | null, currency: string): string | null {
  if (value === null) return null;
  const precision = decimalsFor(currency);
  return formatMoney(createMoney(value, currency), precision);
}
export interface GoalOverview {
  tracked: boolean; current: string | null; target: string; remaining: string | null;
  percentage: number | null; monthly: string | null; months: number | null; shared: boolean;
  trackingStatus: GoalDto["trackingStatus"]; accountName: string | null;
}
export function buildGoalOverview(goal: GoalDto): GoalOverview {
  const tracked = goal.trackingStatus === "tracked" && goal.currentAmount !== null && goal.percentageAchieved !== null;
  return {
    tracked,
    current: tracked ? amount(goal.currentAmount, goal.currency) : null,
    target: amount(goal.targetAmount, goal.currency)!,
    remaining: tracked ? amount(goal.remainingAmount, goal.currency) : null,
    percentage: tracked ? Math.max(0, Math.min(100, goal.percentageAchieved!)) : null,
    monthly: tracked && goal.monthlyContributionNeeded != null ? amount(goal.monthlyContributionNeeded, goal.currency) : null,
    months: tracked ? goal.monthsRemaining ?? null : null,
    shared: goal.sharedGoalCount > 1,
    trackingStatus: goal.trackingStatus,
    accountName: goal.accountName ?? null,
  };
}

export function eligibleGoalAccounts(accounts: readonly AccountDto[], currency: string): AccountDto[] {
  return accounts.filter((account) => account.currency.toUpperCase() === currency.toUpperCase());
}

export function netCashFlowHint(income: number, expenses: number): string | null {
  return new Decimal(income).gt(0) && new Decimal(expenses).gt(income) ? "Gastaste más de lo que ingresó." : null;
}
