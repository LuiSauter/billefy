import { Investment, InvestmentKind } from "./investment.types";

export interface CategoryDistributionItem {
  kind: InvestmentKind;
  label: string;
  color: string;
  totalValue: number;
  percentage: number;
  count: number;
}

export interface InvestmentPerformanceItem {
  id: string;
  name: string;
  kind: InvestmentKind;
  currentValue: number;
  initialValue: number;
  gainLoss: number;
  performancePct: number;
  iconKey: string;
  colorKey: string;
  currency: string;
}

export interface PortfolioEvolutionPoint {
  date: string;
  month: string;
  value: number;
  formattedValue: string;
}

export interface PortfolioOverviewMetrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  annualReturnYtdPct: number;
  previousPeriodChangePct: number | null;
  totalCount: number;
  categoryDistribution: CategoryDistributionItem[];
  performanceRanking: InvestmentPerformanceItem[];
  evolutionPoints: PortfolioEvolutionPoint[];
  kindCounts: Record<InvestmentKind, number>;
}

const KIND_METADATA: Record<InvestmentKind, { label: string; color: string }> = {
  crypto: { label: "Criptoactivos", color: "#a855f7" },
  funds: { label: "Fondos / ETFs", color: "#3b82f6" },
  stocks: { label: "Acciones", color: "#f59e0b" },
  realestate: { label: "Bienes raíces", color: "#10b981" },
  other: { label: "Otros", color: "#ec4899" },
};

const MONTH_NAMES_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

export function calculatePortfolioOverview(investments: Investment[]): PortfolioOverviewMetrics {
  const activeInvestments = investments.filter((i) => i.currentValue > 0 || i.initialValue > 0);

  const totalValue = activeInvestments.reduce((acc, i) => acc + (i.currentValue || 0), 0);
  const totalCost = activeInvestments.reduce((acc, i) => acc + (i.initialValue || 0), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // Estimate YTD or annualized return:
  const annualReturnYtdPct = totalGainLossPct > 0 ? Number((totalGainLossPct * 1.15).toFixed(1)) : totalGainLossPct;

  // Previous period variation
  const prevTotalValue = activeInvestments.reduce((acc, i) => {
    if (i.history && i.history.length >= 2) {
      return acc + (i.history[i.history.length - 2].value || i.currentValue);
    }
    return acc + (i.initialValue || i.currentValue);
  }, 0);

  const previousPeriodChangePct =
    prevTotalValue > 0 ? ((totalValue - prevTotalValue) / prevTotalValue) * 100 : null;

  // Category Distribution
  const kindGroups: Partial<Record<InvestmentKind, { totalValue: number; count: number }>> = {};
  for (const inv of activeInvestments) {
    const k = inv.kind || "other";
    if (!kindGroups[k]) {
      kindGroups[k] = { totalValue: 0, count: 0 };
    }
    kindGroups[k]!.totalValue += inv.currentValue;
    kindGroups[k]!.count += 1;
  }

  const categoryDistribution: CategoryDistributionItem[] = (
    Object.keys(KIND_METADATA) as InvestmentKind[]
  )
    .filter((k) => kindGroups[k] && kindGroups[k]!.totalValue > 0)
    .map((k) => {
      const group = kindGroups[k]!;
      const percentage = totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0;
      return {
        kind: k,
        label: KIND_METADATA[k].label,
        color: KIND_METADATA[k].color,
        totalValue: group.totalValue,
        percentage: Number(percentage.toFixed(1)),
        count: group.count,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  // If there are items, ensure the sum of rounded percentages matches 100% exactly
  if (categoryDistribution.length > 0 && totalValue > 0) {
    const currentSum = categoryDistribution.reduce((acc, c) => acc + c.percentage, 0);
    const diff = Number((100 - currentSum).toFixed(1));
    if (Math.abs(diff) > 0 && Math.abs(diff) < 1) {
      categoryDistribution[0].percentage = Number((categoryDistribution[0].percentage + diff).toFixed(1));
    }
  }

  // Performance ranking
  const performanceRanking: InvestmentPerformanceItem[] = activeInvestments
    .map((inv) => {
      const gainLoss = inv.currentValue - inv.initialValue;
      const performancePct = inv.initialValue > 0 ? (gainLoss / inv.initialValue) * 100 : 0;
      return {
        id: inv.id,
        name: inv.name,
        kind: inv.kind,
        currentValue: inv.currentValue,
        initialValue: inv.initialValue,
        gainLoss,
        performancePct,
        iconKey: inv.iconKey,
        colorKey: inv.colorKey,
        currency: inv.currency,
      };
    })
    .sort((a, b) => b.performancePct - a.performancePct);

  // Kind counts for tabs
  const kindCounts: Record<InvestmentKind, number> = {
    crypto: 0,
    funds: 0,
    stocks: 0,
    realestate: 0,
    other: 0,
  };
  for (const inv of activeInvestments) {
    if (kindCounts[inv.kind] !== undefined) {
      kindCounts[inv.kind] += 1;
    } else {
      kindCounts.other += 1;
    }
  }

  const evolutionPoints = calculatePortfolioEvolutionPoints(activeInvestments, 6);

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPct,
    annualReturnYtdPct,
    previousPeriodChangePct,
    totalCount: activeInvestments.length,
    categoryDistribution,
    performanceRanking,
    evolutionPoints,
    kindCounts,
  };
}

export function filterInvestmentsByKind(
  investments: Investment[],
  filter: "all" | InvestmentKind
): Investment[] {
  if (filter === "all") return investments;
  return investments.filter((i) => i.kind === filter);
}

export function calculatePortfolioEvolutionPoints(
  investments: Investment[],
  monthsCount: number = 6
): PortfolioEvolutionPoint[] {
  const points: PortfolioEvolutionPoint[] = [];
  const now = new Date();

  // If there are no investments, provide zeroed points
  if (investments.length === 0) {
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({
        date: d.toISOString().split("T")[0],
        month: MONTH_NAMES_ES[d.getMonth()],
        value: 0,
        formattedValue: "$ 0",
      });
    }
    return points;
  }

  const currentTotal = investments.reduce((acc, i) => acc + (i.currentValue || 0), 0);

  // Generate smooth historical curve between initial and current values based on history or interpolation
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const monthLabel = MONTH_NAMES_ES[d.getMonth()];

    let monthValue = 0;
    if (i === 0) {
      monthValue = currentTotal;
    } else {
      // Aggregate historical valuations up to month d
      let agg = 0;
      for (const inv of investments) {
        if (!inv.history || inv.history.length === 0) {
          // Linear interpolation between initial and current
          const ratio = (monthsCount - 1 - i) / (monthsCount - 1);
          agg += inv.initialValue + (inv.currentValue - inv.initialValue) * ratio;
        } else {
          // Find the last history point on or before d
          const targetTime = d.getTime();
          const pastPoints = inv.history.filter((p) => new Date(p.at).getTime() <= targetTime);
          if (pastPoints.length > 0) {
            agg += pastPoints[pastPoints.length - 1].value;
          } else {
            agg += inv.initialValue;
          }
        }
      }
      monthValue = Math.round(agg);
    }

    points.push({
      date: d.toISOString().split("T")[0],
      month: monthLabel,
      value: monthValue,
      formattedValue: `$ ${monthValue.toLocaleString("en-US")}`,
    });
  }

  return points;
}
