import Decimal from "decimal.js";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { Investment } from "@/modules/investments/domain/investment.types";
import { PatrimonialAsset, PatrimonialLiability } from "@/modules/patrimonio/domain/patrimonio.types";
import { calculatePatrimonioOverview, convertPatrimonioAmount } from "@/modules/patrimonio/domain/net-worth-analytics";
import { DistributionPlan } from "@/modules/planning/domain/distribution-plan";
import { CategoryColorKey } from "@/modules/ledger/domain/category.types";

export interface DashboardHeroKpis {
  netWorth: number;
  netWorthGrowthPct: number;
  totalAssets: number;
  assetsGrowthPct: number;
  totalLiabilities: number;
  liabilitiesGrowthPct: number;
  totalLiquidBalance: number;
}

export interface MonthlyCashFlow {
  income: number;
  expenses: number;
  savings: number;
  chartData: { name: string; amount: number; fill: string }[];
}

export interface DashboardDistributionBucket {
  id: string;
  name: string;
  percent: number;
  amount: number;
  colorKey: CategoryColorKey | string;
}

export interface RecommendedDistribution {
  ruleLabel: string;
  isCustom: boolean;
  buckets: DashboardDistributionBucket[];
  necesidades: number;
  estiloDeVida: number;
  ahorroEInversion: number;
}

export interface CategoryExpenseItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface AssetSummaryItem {
  key: string;
  label: string;
  sublabel: string;
  amount: number;
  icon: string;
  itemCount: number;
}

export interface NetWorthEvolutionPoint {
  month: string;
  value: number;
}

export interface TopInvestmentItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  yieldRate: number;
  icon: string;
}

export interface DashboardInsight {
  text: string;
  type: "growth" | "expense" | "goal" | "info";
}

export interface DashboardHomeAnalyticsResult {
  kpis: DashboardHeroKpis;
  monthlyCashFlow: MonthlyCashFlow;
  recommendedDistribution: RecommendedDistribution;
  categoryExpenses: CategoryExpenseItem[];
  totalExpensesInCategories: number;
  assetsSummary: AssetSummaryItem[];
  netWorthEvolution: NetWorthEvolutionPoint[];
  topInvestments: TopInvestmentItem[];
  insights: DashboardInsight[];
}

export interface DashboardHomeAnalyticsInput {
  accounts?: AccountDto[];
  transactions?: TransactionDto[];
  loans?: LoanSummaryDto[];
  investments?: Investment[];
  manualAssets?: PatrimonialAsset[];
  manualLiabilities?: PatrimonialLiability[];
  categoryNamesMap?: Map<string, string>;
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  year?: number;
  month?: number; // 0-indexed (0 = Jan, 9 = Oct)
  distributionPlan?: DistributionPlan | null;
}

const CATEGORY_COLORS = [
  "#a855f7", // purple
  "#3b82f6", // blue
  "#f43f5e", // rose
  "#eab308", // yellow
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f97316", // orange
  "#64748b", // slate
];

export function calculateDashboardHomeAnalytics({
  accounts = [],
  transactions = [],
  loans = [],
  investments = [],
  manualAssets = [],
  manualLiabilities = [],
  categoryNamesMap = new Map(),
  selectedCurrency = "BOB",
  p2pRate = 10,
  year = new Date().getFullYear(),
  month = new Date().getMonth(),
  distributionPlan,
}: DashboardHomeAnalyticsInput): DashboardHomeAnalyticsResult {
  const targetCurrency: "USD" | "BOB" = selectedCurrency === "USD" ? "USD" : "BOB";
  const effectiveP2pRate = p2pRate > 0 ? p2pRate : 10;

  // 1. Calculate authentic Patrimonio Overview using the core engine
  const patrimonio = calculatePatrimonioOverview({
    manualAssets,
    investments,
    accounts,
    loans,
    manualLiabilities,
    transactions,
    targetCurrency,
    p2pRate: effectiveP2pRate,
  });

  const liquidAssetCat = patrimonio.assetsByCategory.find((c) => c.category === "cash");
  const totalLiquid = liquidAssetCat ? liquidAssetCat.totalValue : 0;

  const kpis: DashboardHeroKpis = {
    netWorth: patrimonio.netWorth,
    netWorthGrowthPct: patrimonio.previousNetWorthChangePct ?? 0,
    totalAssets: patrimonio.totalAssets,
    assetsGrowthPct: patrimonio.assetsChangePct ?? 0,
    totalLiabilities: patrimonio.totalLiabilities,
    liabilitiesGrowthPct: patrimonio.liabilitiesChangePct ?? 0,
    totalLiquidBalance: totalLiquid,
  };

  // 2. Real Assets Breakdown by category
  const realEstateCat = patrimonio.assetsByCategory.find((c) => c.category === "realestate");
  const digitalCat = patrimonio.assetsByCategory.find((c) => c.category === "digital");
  const investmentsCat = patrimonio.assetsByCategory.find((c) => c.category === "investments");
  const vehiclesCat = patrimonio.assetsByCategory.find((c) => c.category === "vehicles");

  const assetsSummary: AssetSummaryItem[] = [
    {
      key: "realestate",
      label: "Inmuebles",
      sublabel: `${realEstateCat?.itemsCount || 0} ${
        realEstateCat?.itemsCount === 1 ? "propiedad" : "propiedades"
      }`,
      amount: realEstateCat?.totalValue || 0,
      icon: "home",
      itemCount: realEstateCat?.itemsCount || 0,
    },
    {
      key: "digital",
      label: "Activos digitales",
      sublabel: "Crypto, dominios, licencias",
      amount: digitalCat?.totalValue || 0,
      icon: "laptop",
      itemCount: digitalCat?.itemsCount || 0,
    },
    {
      key: "investments",
      label: "Inversiones",
      sublabel: "Fondos, acciones, otros",
      amount: investmentsCat?.totalValue || 0,
      icon: "trending-up",
      itemCount: investmentsCat?.itemsCount || 0,
    },
    {
      key: "vehicles",
      label: "Vehículos",
      sublabel: `${vehiclesCat?.itemsCount || 0} ${
        vehiclesCat?.itemsCount === 1 ? "vehículo" : "vehículos"
      }`,
      amount: vehiclesCat?.totalValue || 0,
      icon: "car",
      itemCount: vehiclesCat?.itemsCount || 0,
    },
  ];

  // 3. Real Monthly Cash Flow from transactions
  const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endOfMonth = new Date(year, month + 1, 0);
  const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

  const reversedSet = new Set<string>();
  for (const tx of transactions) {
    if (tx.reversesId) reversedSet.add(tx.reversesId);
  }

  let monthlyIncome = new Decimal(0);
  let monthlyExpenses = new Decimal(0);
  const expensesByCategoryMap = new Map<string, Decimal>();

  for (const tx of transactions) {
    if (!tx.occurredAt || tx.reversesId || reversedSet.has(tx.id)) continue;
    const txDate = tx.occurredAt.slice(0, 10);
    if (txDate >= startStr && txDate <= endStr) {
      const amtNum = Number(tx.amount.toString()) || 0;
      const converted = convertPatrimonioAmount(amtNum, tx.currency, targetCurrency, effectiveP2pRate);
      const decAmt = new Decimal(converted);

      if (tx.direction === "Income") {
        monthlyIncome = monthlyIncome.plus(decAmt);
      } else if (tx.direction === "Expense") {
        monthlyExpenses = monthlyExpenses.plus(decAmt);
        const catId = tx.categoryId || tx.description || "uncategorized";
        const current = expensesByCategoryMap.get(catId) || new Decimal(0);
        expensesByCategoryMap.set(catId, current.plus(decAmt));
      }
    }
  }

  const incomeVal = monthlyIncome.toDecimalPlaces(2).toNumber();
  const expensesVal = monthlyExpenses.toDecimalPlaces(2).toNumber();
  const savingsVal = Math.max(0, new Decimal(incomeVal).minus(expensesVal).toDecimalPlaces(2).toNumber());

  const monthlyCashFlow: MonthlyCashFlow = {
    income: incomeVal,
    expenses: expensesVal,
    savings: savingsVal,
    chartData: [
      { name: "Ingresos", amount: incomeVal, fill: "#10b981" },
      { name: "Gastos", amount: expensesVal, fill: "#f43f5e" },
      { name: "Ahorro / Inversión", amount: savingsVal, fill: "#a855f7" },
    ],
  };

  // 4. Authentic Income Distribution based on user plan or default 50/30/20
  const isCustomPlan = Boolean(distributionPlan?.enabled && distributionPlan.buckets?.length);
  const planBuckets = isCustomPlan
    ? distributionPlan!.buckets
    : [
        { id: "necesidades", name: "Necesidades", percent: 50, colorKey: "emerald" as CategoryColorKey },
        { id: "estiloDeVida", name: "Estilo de vida", percent: 30, colorKey: "amber" as CategoryColorKey },
        { id: "ahorroEInversion", name: "Ahorro e inversión", percent: 20, colorKey: "violet" as CategoryColorKey },
      ];

  const ruleLabel = planBuckets.map((b) => b.percent).join("/");

  const calculatedBuckets: DashboardDistributionBucket[] = planBuckets.map((b) => {
    const bucketAmount = new Decimal(incomeVal)
      .mul(b.percent)
      .div(100)
      .toDecimalPlaces(2)
      .toNumber();
    return {
      id: b.id || b.name,
      name: b.name,
      percent: b.percent,
      amount: bucketAmount,
      colorKey: (b.colorKey as CategoryColorKey) || "blue",
    };
  });

  const findBucketAmount = (keywords: string[], fallbackIndex: number) => {
    const match = calculatedBuckets.find((b) =>
      keywords.some((k) => b.name.toLowerCase().includes(k))
    );
    return match ? match.amount : calculatedBuckets[fallbackIndex]?.amount ?? 0;
  };

  const recommendedDistribution: RecommendedDistribution = {
    ruleLabel,
    isCustom: isCustomPlan,
    buckets: calculatedBuckets,
    necesidades: findBucketAmount(["necesidad"], 0),
    estiloDeVida: findBucketAmount(["estilo", "deseo"], 1),
    ahorroEInversion: findBucketAmount(["ahorro", "invers"], 2),
  };

  // 5. Real Category Expenses Breakdown
  const sortedCategories = Array.from(expensesByCategoryMap.entries()).sort(
    (a, b) => b[1].minus(a[1]).toNumber()
  );

  const categoryExpenses: CategoryExpenseItem[] = sortedCategories.map(([catKey, amountDec], index) => {
    const rawAmt = amountDec.toDecimalPlaces(2).toNumber();
    const pct = expensesVal > 0 ? Math.round((rawAmt / expensesVal) * 100) : 0;
    const catName =
      categoryNamesMap.get(catKey) ||
      (catKey !== "uncategorized" ? catKey : "Otros");

    return {
      id: catKey,
      name: catName,
      amount: rawAmt,
      percentage: pct,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    };
  });

  // 6. Real 6-Month Net Worth Evolution
  const netWorthEvolution: NetWorthEvolutionPoint[] = patrimonio.evolutionPoints.map((pt) => ({
    month: pt.month,
    value: pt.value,
  }));

  // 7. Real Top Investments from investments module
  const topInvestments: TopInvestmentItem[] = [...investments]
    .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
    .slice(0, 4)
    .map((inv) => {
      const balance = convertPatrimonioAmount(
        inv.currentValue || 0,
        inv.currency,
        targetCurrency,
        effectiveP2pRate
      );
      const yieldRate =
        inv.initialValue > 0
          ? Math.round(((inv.currentValue - inv.initialValue) / inv.initialValue) * 1000) / 10
          : 0;

      return {
        id: inv.id,
        name: inv.name,
        type: inv.kind,
        balance,
        yieldRate,
        icon: inv.kind === "crypto" ? "bitcoin" : inv.kind === "stocks" ? "chart" : "layers",
      };
    });

  // 8. Authentic Insights based on real financial ratios
  const insights: DashboardInsight[] = [];

  // Insight 1: Net Worth trend
  if (kpis.netWorthGrowthPct !== 0) {
    if (kpis.netWorthGrowthPct > 0) {
      insights.push({
        text: `Tu patrimonio creció +${kpis.netWorthGrowthPct.toFixed(1)}% respecto al mes anterior. ¡Excelente progreso!`,
        type: "growth",
      });
    } else {
      insights.push({
        text: `Tu patrimonio tuvo una variación de ${kpis.netWorthGrowthPct.toFixed(1)}% este mes. Revisa tus gastos y deudas.`,
        type: "growth",
      });
    }
  } else if (kpis.netWorth > 0) {
    insights.push({
      text: "Tu patrimonio neto se mantiene estable en este período.",
      type: "growth",
    });
  } else {
    insights.push({
      text: "Comienza vinculando tus cuentas e inversiones para ver la evolución de tu patrimonio neto.",
      type: "growth",
    });
  }

  // Insight 2: Cash flow & expenses
  if (incomeVal > 0 && expensesVal > 0) {
    const expenseRatio = Math.round((expensesVal / incomeVal) * 100);
    if (expenseRatio > 80) {
      insights.push({
        text: `Tus gastos representan el ${expenseRatio}% de tus ingresos este mes. Te sugerimos revisar las categorías con mayor consumo.`,
        type: "expense",
      });
    } else {
      const savingsRate = Math.round((savingsVal / incomeVal) * 100);
      insights.push({
        text: `Has mantenido una tasa de ahorro del ${savingsRate}% de tus ingresos en lo que va del mes.`,
        type: "expense",
      });
    }
  } else if (expensesVal > 0) {
    insights.push({
      text: `Tienes gastos registrados por ${expensesVal.toFixed(2)} ${targetCurrency}. Registra tus ingresos para calcular tu margen de ahorro.`,
      type: "expense",
    });
  } else {
    insights.push({
      text: "Registra tus movimientos mensuales para activar el análisis automático de flujo y presupuesto 50/30/20.",
      type: "expense",
    });
  }

  // Insight 3: Liquidity or Investments
  if (topInvestments.length > 0) {
    const topInv = topInvestments[0];
    insights.push({
      text: `Tu principal activo de inversión es ${topInv.name} con un rendimiento acumulado de ${topInv.yieldRate >= 0 ? "+" : ""}${topInv.yieldRate.toFixed(1)}%.`,
      type: "goal",
    });
  } else if (totalLiquid > 0) {
    insights.push({
      text: `Dispones de ${totalLiquid.toFixed(2)} ${targetCurrency} en saldo líquido disponible en tus cuentas y billeteras.`,
      type: "goal",
    });
  } else {
    insights.push({
      text: "Configura tus metas de ahorro e inversión en la sección de Planificación.",
      type: "goal",
    });
  }

  return {
    kpis,
    monthlyCashFlow,
    recommendedDistribution,
    categoryExpenses,
    totalExpensesInCategories: expensesVal,
    assetsSummary,
    netWorthEvolution,
    topInvestments,
    insights,
  };
}
