import { Investment, InvestmentTransactionDto } from "./investment.types";

export type InvestmentOperationType =
  | "buy"
  | "sell"
  | "contribution"
  | "withdrawal"
  | "revaluation"
  | "dividend"
  | "fee";

export interface InvestmentOperation {
  id: string;
  investmentId: string;
  date: string;
  type: InvestmentOperationType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: "completed" | "pending";
  notes?: string;
}

export interface InvestmentAlert {
  id: string;
  investmentId: string;
  condition: "above" | "below";
  targetPrice: number;
  active: boolean;
}

export interface InvestmentMetadata {
  platform: string;
  ticker: string;
  notes: string;
  fees: number;
  startDate: string;
}

export interface InvestmentDetailMetrics {
  currentValue: number;
  initialValue: number;
  gainLoss: number;
  gainLossPct: number;
  roiPct: number;
  quantity: number;
  averageCost: number;
  currentUnitPrice: number;
  recentChangePct: number | null;
  portfolioSharePct: number;
}

export interface AssetEvolutionPoint {
  date: string;
  month: string;
  value: number;
  formattedValue: string;
}

const MONTH_NAMES_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

export function calculateInvestmentDetailMetrics(
  investment: Investment,
  allInvestments: Investment[]
): InvestmentDetailMetrics {
  const currentValue = investment.currentValue || 0;
  const initialValue = investment.initialValue || 0;
  const quantity = investment.quantity > 0 ? investment.quantity : 1;

  const gainLoss = currentValue - initialValue;
  const gainLossPct = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
  const roiPct = gainLossPct;

  const averageCost = initialValue / quantity;
  const currentUnitPrice = currentValue / quantity;

  // Recent change (vs. last history entry)
  let recentChangePct: number | null = null;
  if (investment.history && investment.history.length >= 2) {
    const prev = investment.history[investment.history.length - 2].value;
    if (prev > 0) {
      recentChangePct = ((currentValue - prev) / prev) * 100;
    }
  } else if (initialValue > 0) {
    recentChangePct = gainLossPct;
  }

  // Portfolio share
  const totalPortfolioValue = allInvestments.reduce((acc, i) => acc + (i.currentValue || 0), 0);
  const portfolioSharePct =
    totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;

  return {
    currentValue,
    initialValue,
    gainLoss,
    gainLossPct,
    roiPct,
    quantity,
    averageCost,
    currentUnitPrice,
    recentChangePct,
    portfolioSharePct,
  };
}

export function calculateAssetEvolutionPoints(
  investment: Investment,
  monthsCount: number = 6
): AssetEvolutionPoint[] {
  const points: AssetEvolutionPoint[] = [];
  const now = new Date();

  const history = investment.history || [];
  const currentVal = investment.currentValue || 0;
  const initialVal = investment.initialValue || 0;

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const monthLabel = MONTH_NAMES_ES[d.getMonth()];

    let pointVal = currentVal;
    if (i === 0) {
      pointVal = currentVal;
    } else if (history.length >= monthsCount) {
      // Pick matching or interpolated from history
      const idx = history.length - 1 - i;
      pointVal = history[Math.max(0, idx)].value;
    } else {
      // Linear progression from initial to current
      const factor = (monthsCount - 1 - i) / (monthsCount - 1);
      pointVal = Math.round(initialVal + (currentVal - initialVal) * factor);
    }

    points.push({
      date: d.toISOString().split("T")[0],
      month: monthLabel,
      value: pointVal,
      formattedValue: `$ ${pointVal.toLocaleString("en-US")}`,
    });
  }

  return points;
}

export function mapTransactionsToOperations(
  transactions: InvestmentTransactionDto[]
): InvestmentOperation[] {
  return transactions.map((t) => {
    let mappedType: InvestmentOperationType = "buy";
    const lower = t.type.toLowerCase();
    if (lower === "buy") mappedType = "buy";
    else if (lower === "sell") mappedType = "sell";
    else if (lower === "dividend") mappedType = "dividend";
    else if (lower === "fee") mappedType = "fee";
    else if (lower === "revaluation") mappedType = "revaluation";

    return {
      id: t.id,
      investmentId: t.investmentId,
      date: t.occurredAt,
      type: mappedType,
      quantity: t.quantity,
      unitPrice: t.unitPrice,
      totalAmount: t.totalAmount,
      status: "completed" as const,
      notes: t.notes,
    };
  });
}

export function getDerivedOperations(investment: Investment): InvestmentOperation[] {
  const ops: InvestmentOperation[] = [];
  const quantity = investment.quantity > 0 ? investment.quantity : 1;
  const unitPrice = (investment.initialValue || investment.currentValue) / quantity;

  // Add initial purchase operation
  ops.push({
    id: `op-init-${investment.id}`,
    investmentId: investment.id,
    date: investment.createdAt || new Date().toISOString(),
    type: "buy",
    quantity: quantity,
    unitPrice: unitPrice,
    totalAmount: investment.initialValue || investment.currentValue,
    status: "completed",
    notes: "Compra inicial registrada al dar de alta el activo.",
  });

  // If history has points, reflect them as revaluation or operations
  if (investment.history && investment.history.length > 1) {
    investment.history.slice(1).forEach((hp, idx) => {
      const prevVal = investment.history[idx].value;
      const diff = hp.value - prevVal;
      ops.push({
        id: `op-hist-${investment.id}-${idx}`,
        investmentId: investment.id,
        date: hp.at,
        type: diff >= 0 ? "revaluation" : "revaluation",
        quantity: quantity,
        unitPrice: hp.value / quantity,
        totalAmount: Math.abs(diff),
        status: "completed",
        notes: `Ajuste manual de valuación: de $ ${prevVal.toLocaleString()} a $ ${hp.value.toLocaleString()}.`,
      });
    });
  }

  return ops.reverse(); // Most recent first
}
