import { DistributionPlan, PlanBucket, bucketTrackingMode } from "./distribution-plan";
import { BudgetDto } from "./planning.types";

export interface CategoryBudgetDetail {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  spentAmount: number;
}

export interface DistributionGroupMetric {
  id: string;
  name: string;
  percent: number;
  colorKey: string;
  trackingMode: "Expenses" | "TargetOnly";
  targetAmount: number;
  budgetedAmount: number;
  spentAmount: number;
  isOverBudgeted: boolean;
  overBudgetedAmount: number;
  budgetedRatio: number; // e.g. 118 for 118%
  isOverSpent: boolean;
  overSpentAmount: number;
  spentRatio: number;
  categoryBudgets: CategoryBudgetDetail[];
}

export interface BudgetDistributionMetricsResult {
  groups: DistributionGroupMetric[];
  unassignedCategoryBudgets: CategoryBudgetDetail[];
  unassignedTotalLimit: number;
  unassignedTotalSpent: number;
  totalTargetAmount: number;
  totalBudgetedAmount: number;
  totalOverrunAmount: number;
  hasAnyOverrun: boolean;
}

interface CalculateBudgetDistributionMetricsParams {
  plan?: DistributionPlan | null;
  monthlyIncome: number;
  budgets: readonly BudgetDto[];
  getCategoryName?: (categoryId: string) => string;
}

const DEFAULT_BUCKETS: PlanBucket[] = [
  { id: "default-1", name: "Necesidades", percent: 50, colorKey: "emerald", trackingMode: "Expenses", categoryIds: [] },
  { id: "default-2", name: "Estilo de vida", percent: 30, colorKey: "blue", trackingMode: "Expenses", categoryIds: [] },
  { id: "default-3", name: "Ahorro e inversión", percent: 20, colorKey: "violet", trackingMode: "TargetOnly", categoryIds: [] },
];

export function calculateBudgetDistributionMetrics({
  plan,
  monthlyIncome,
  budgets,
  getCategoryName = (id) => id,
}: CalculateBudgetDistributionMetricsParams): BudgetDistributionMetricsResult {
  const buckets: PlanBucket[] =
    plan?.enabled && plan.buckets?.length > 0 ? plan.buckets : DEFAULT_BUCKETS;

  // Filter active monthly budgets
  const activeBudgets = budgets.filter(
    (b) => b.isActive && (!b.period || b.period.toLowerCase() === "monthly")
  );

  // Map of categoryId to BudgetDto
  const budgetByCategory = new Map<string, BudgetDto[]>();
  for (const b of activeBudgets) {
    if (b.categoryId) {
      const lower = b.categoryId.toLowerCase();
      const list = budgetByCategory.get(lower) ?? [];
      list.push(b);
      budgetByCategory.set(lower, list);
    }
  }

  const assignedCategoryIds = new Set<string>();

  const groups: DistributionGroupMetric[] = buckets.map((bucket) => {
    const targetAmount = (monthlyIncome * bucket.percent) / 100;
    const mode = bucketTrackingMode(bucket);

    if (mode === "TargetOnly") {
      return {
        id: bucket.id,
        name: bucket.name,
        percent: bucket.percent,
        colorKey: bucket.colorKey || "violet",
        trackingMode: "TargetOnly",
        targetAmount,
        budgetedAmount: 0,
        spentAmount: 0,
        isOverBudgeted: false,
        overBudgetedAmount: 0,
        budgetedRatio: 0,
        isOverSpent: false,
        overSpentAmount: 0,
        spentRatio: 0,
        categoryBudgets: [],
      };
    }

    const catDetails: CategoryBudgetDetail[] = [];
    let groupBudgeted = 0;
    let groupSpent = 0;

    for (const catId of bucket.categoryIds) {
      const lower = catId.toLowerCase();
      assignedCategoryIds.add(lower);
      const bList = budgetByCategory.get(lower) ?? [];
      for (const b of bList) {
        const limit = Number(b.limitAmount) || 0;
        const spent = Number(b.spentAmount) || 0;
        groupBudgeted += limit;
        groupSpent += spent;
        catDetails.push({
          budgetId: b.id,
          categoryId: b.categoryId || catId,
          categoryName: getCategoryName(b.categoryId || catId),
          limitAmount: limit,
          spentAmount: spent,
        });
      }
    }

    const isOverBudgeted = targetAmount > 0 ? groupBudgeted > targetAmount : groupBudgeted > 0;
    const overBudgetedAmount = Math.max(0, groupBudgeted - targetAmount);
    const budgetedRatio = targetAmount > 0 ? (groupBudgeted / targetAmount) * 100 : 0;

    const isOverSpent = targetAmount > 0 ? groupSpent > targetAmount : groupSpent > 0;
    const overSpentAmount = Math.max(0, groupSpent - targetAmount);
    const spentRatio = targetAmount > 0 ? (groupSpent / targetAmount) * 100 : 0;

    return {
      id: bucket.id,
      name: bucket.name,
      percent: bucket.percent,
      colorKey: bucket.colorKey || "blue",
      trackingMode: "Expenses",
      targetAmount,
      budgetedAmount: groupBudgeted,
      spentAmount: groupSpent,
      isOverBudgeted,
      overBudgetedAmount,
      budgetedRatio,
      isOverSpent,
      overSpentAmount,
      spentRatio,
      categoryBudgets: catDetails,
    };
  });

  // Calculate unassigned category budgets
  const unassignedDetails: CategoryBudgetDetail[] = [];
  let unassignedTotalLimit = 0;
  let unassignedTotalSpent = 0;

  for (const b of activeBudgets) {
    if (b.categoryId && !assignedCategoryIds.has(b.categoryId.toLowerCase())) {
      const limit = Number(b.limitAmount) || 0;
      const spent = Number(b.spentAmount) || 0;
      unassignedTotalLimit += limit;
      unassignedTotalSpent += spent;
      unassignedDetails.push({
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: getCategoryName(b.categoryId),
        limitAmount: limit,
        spentAmount: spent,
      });
    }
  }

  const totalTargetAmount = groups.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalBudgetedAmount = groups.reduce((acc, g) => acc + g.budgetedAmount, 0) + unassignedTotalLimit;
  const totalOverrunAmount = groups.reduce((acc, g) => acc + g.overBudgetedAmount, 0);
  const hasAnyOverrun = totalOverrunAmount > 0;

  return {
    groups,
    unassignedCategoryBudgets: unassignedDetails,
    unassignedTotalLimit,
    unassignedTotalSpent,
    totalTargetAmount,
    totalBudgetedAmount,
    totalOverrunAmount,
    hasAnyOverrun,
  };
}
