import Decimal from "decimal.js";
import { bucketTrackingMode, DistributionPlan, validatePlan } from "./distribution-plan";
import { BudgetDto } from "./planning.types";

export interface CurrencyCap {
  currency: string;
  amount: string;
}

type GuideGroup = { id: string; name: string; percent: number } & (
  | { mode: "Expenses"; caps: CurrencyCap[] }
  | { mode: "TargetOnly"; caps?: never }
);

interface BudgetPlanGuide {
  groups: GuideGroup[];
  general: CurrencyCap[];
  unassigned: CurrencyCap[];
}

function sumCaps(budgets: readonly BudgetDto[]): CurrencyCap[] {
  const totals = new Map<string, Decimal>();
  for (const budget of budgets) {
    const currency = budget.currency.trim().toUpperCase();
    totals.set(currency, (totals.get(currency) ?? new Decimal(0)).plus(budget.limitAmount));
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({ currency, amount: amount.toFixed() }));
}

/** Configured recurrent caps only: no spending, FX conversion, income targets or mutations. */
export function buildBudgetPlanGuide(
  plan: DistributionPlan | null | undefined,
  budgets: readonly BudgetDto[],
  expenseCategoryIds: readonly string[],
): BudgetPlanGuide | null {
  if (!plan?.enabled || validatePlan(plan.buckets, expenseCategoryIds).length) return null;

  const seen = new Set<string>();
  const active = budgets.filter((budget) => {
    if (!budget.isActive || budget.period.toLowerCase() !== "monthly" || seen.has(budget.id)) return false;
    seen.add(budget.id);
    return true;
  });
  const assigned = new Set(plan.buckets.flatMap((bucket) => bucket.categoryIds.map((id) => id.toLowerCase())));
  const groups: GuideGroup[] = plan.buckets.map((bucket) => {
    const base = { id: bucket.id, name: bucket.name, percent: bucket.percent };
    if (bucketTrackingMode(bucket) === "TargetOnly") return { ...base, mode: "TargetOnly" };
    const ids = new Set(bucket.categoryIds.map((id) => id.toLowerCase()));
    return {
      ...base, mode: "Expenses",
      caps: sumCaps(active.filter((budget) => !!budget.categoryId && ids.has(budget.categoryId.toLowerCase()))),
    };
  });
  return {
    groups,
    general: sumCaps(active.filter((budget) => !budget.categoryId)),
    unassigned: sumCaps(active.filter((budget) => !!budget.categoryId && !assigned.has(budget.categoryId.toLowerCase()))),
  };
}
