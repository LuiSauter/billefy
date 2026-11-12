import { Investment } from "@/modules/investments/domain/investment.types";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import {
  AssetCategory,
  LiabilityCategory,
  PatrimonialAsset,
  PatrimonialLiability,
  AssetCategorySummary,
  LiabilityCategorySummary,
  AssetItemDetail,
  LiabilityItemDetail,
  PatrimonioOverviewMetrics,
  PatrimonioEvolutionPoint,
  PatrimonioInsight,
} from "./patrimonio.types";
import { formatAmountText, formatPercent } from "@/shared/lib/amount-format";
import { getNumberFormatPreferences } from "@/shared/lib/number-format";

interface CalculatePatrimonioParams {
  manualAssets?: PatrimonialAsset[];
  investments?: Investment[];
  accounts?: AccountDto[];
  loans?: LoanSummaryDto[];
  manualLiabilities?: PatrimonialLiability[];
  transactions?: TransactionDto[];
  p2pRate?: number;
  targetCurrency?: "USD" | "BOB";
}

const ASSET_CATEGORY_METADATA: Record<
  AssetCategory,
  { label: string; description: string; color: string; icon: string }
> = {
  realestate: {
    label: "Inmuebles",
    description: "Casa, departamento, terrenos",
    color: "#3b82f6", // blue-500
    icon: "home",
  },
  investments: {
    label: "Inversiones",
    description: "Fondos, acciones, ETFs, cripto",
    color: "#a855f7", // purple-500
    icon: "trending-up",
  },
  vehicles: {
    label: "Vehículos",
    description: "Auto, moto, etc.",
    color: "#ec4899", // pink-500
    icon: "car",
  },
  digital: {
    label: "Activos digitales",
    description: "Dominios, licencias, otros",
    color: "#10b981", // emerald-500
    icon: "laptop",
  },
  cash: {
    label: "Efectivo y bancos",
    description: "Cuentas bancarias, wallets",
    color: "#06b6d4", // cyan-500
    icon: "banknote",
  },
  other: {
    label: "Otros activos",
    description: "Joyas, colección, otros",
    color: "#f59e0b", // amber-500
    icon: "sparkles",
  },
};

const LIABILITY_CATEGORY_METADATA: Record<
  LiabilityCategory,
  { label: string; color: string; icon: string }
> = {
  mortgage: {
    label: "Crédito hipotecario",
    color: "#f43f5e", // rose-500
    icon: "home",
  },
  loan: {
    label: "Préstamo personal",
    color: "#8b5cf6", // violet-500
    icon: "user",
  },
  creditcard: {
    label: "Tarjetas de crédito",
    color: "#f97316", // orange-500
    icon: "credit-card",
  },
  other: {
    label: "Otros pasivos",
    color: "#64748b", // slate-500
    icon: "more-horizontal",
  },
};

const MONTH_NAMES_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

export function convertPatrimonioAmount(
  amount: number,
  fromCurrency: string | undefined,
  targetCurrency: "USD" | "BOB" = "USD",
  p2pRate: number = 9.85
): number {
  if (!amount || amount === 0) return 0;
  const rate = p2pRate > 0 ? p2pRate : 9.85;
  const from = (fromCurrency || targetCurrency).toUpperCase();

  if (targetCurrency === "BOB") {
    if (from === "BOB") return amount;
    if (from === "USD" || from === "USDT") return amount * rate;
    return amount * rate;
  } else {
    // targetCurrency === "USD"
    if (from === "USD" || from === "USDT") return amount;
    if (from === "BOB") return amount / rate;
    return amount;
  }
}

export function calculatePatrimonioOverview({
  manualAssets = [],
  investments = [],
  accounts = [],
  loans = [],
  manualLiabilities = [],
  transactions = [],
  targetCurrency = "USD",
  p2pRate = 9.85,
}: CalculatePatrimonioParams): PatrimonioOverviewMetrics {
  // 1. Grouping Assets and collecting authentic sub-items
  const assetMap: Record<AssetCategory, { total: number; items: AssetItemDetail[] }> = {
    realestate: { total: 0, items: [] },
    investments: { total: 0, items: [] },
    vehicles: { total: 0, items: [] },
    digital: { total: 0, items: [] },
    cash: { total: 0, items: [] },
    other: { total: 0, items: [] },
  };

  // Add investments from the Investments module
  for (const inv of investments) {
    const rawVal = inv.currentValue || 0;
    if (rawVal > 0) {
      const val = convertPatrimonioAmount(rawVal, inv.currency, targetCurrency, p2pRate);
      assetMap.investments.total += val;
      assetMap.investments.items.push({
        id: inv.id,
        name: inv.name,
        value: val,
        originalValue: rawVal,
        category: "investments",
        currency: inv.currency,
        notes: `${inv.kind} • ${inv.quantity} u.`,
        isFromModule: true,
      });
    }
  }

  // Add liquid bank accounts from Ledger
  for (const acc of accounts) {
    const bal = typeof acc.balance === "number" ? acc.balance : Number(acc.balance?.toString() || 0);
    if (bal > 0) {
      const val = convertPatrimonioAmount(bal, acc.currency, targetCurrency, p2pRate);
      assetMap.cash.total += val;
      assetMap.cash.items.push({
        id: acc.id,
        name: acc.name,
        value: val,
        originalValue: bal,
        category: "cash",
        currency: acc.currency,
        notes: acc.type,
        isFromModule: true,
      });
    }
  }

  // Add registered manual assets
  for (const ast of manualAssets) {
    const cat = ast.category || "other";
    const target = assetMap[cat] || assetMap.other;
    const rawVal = ast.value;
    const val = convertPatrimonioAmount(rawVal, ast.currency, targetCurrency, p2pRate);
    target.total += val;
    target.items.push({
      id: ast.id,
      name: ast.name,
      value: val,
      originalValue: rawVal,
      category: cat,
      currency: ast.currency,
      notes: ast.notes,
      isFromModule: false,
    });
  }

  // Add active loans receivable (Dinero prestado) from Lending module
  for (const loan of loans) {
    if (loan.type === "Lent" && loan.status === "Active") {
      const remaining = typeof loan.remainingPrincipal === "number"
        ? loan.remainingPrincipal
        : Number(loan.remainingPrincipal?.toString() || 0);

      if (remaining > 0) {
        const val = convertPatrimonioAmount(remaining, loan.currency, targetCurrency, p2pRate);
        assetMap.other.total += val;
        assetMap.other.items.push({
          id: loan.id,
          name: loan.counterpartyName ? `Préstamo a ${loan.counterpartyName}` : "Dinero prestado",
          value: val,
          originalValue: remaining,
          category: "other",
          currency: loan.currency,
          notes: `Tasa: ${formatPercent(loan.interestRate * 100, getNumberFormatPreferences())} • Saldo pendiente`,
          isFromModule: true,
        });
      }
    }
  }

  // Sort sub-items inside each category descending by value
  for (const cat of Object.keys(assetMap) as AssetCategory[]) {
    assetMap[cat].items.sort((a, b) => b.value - a.value);
  }

  const totalLiquidityVal = assetMap.cash.total;
  const totalAssets = Object.values(assetMap).reduce((acc, item) => acc + item.total, 0);

  // 2. Grouping Liabilities and collecting authentic sub-items
  const liabMap: Record<LiabilityCategory, { total: number; items: LiabilityItemDetail[] }> = {
    mortgage: { total: 0, items: [] },
    loan: { total: 0, items: [] },
    creditcard: { total: 0, items: [] },
    other: { total: 0, items: [] },
  };

  // Add loans from Lending module
  for (const loan of loans) {
    if (loan.type === "Borrowed" && loan.status === "Active") {
      const remaining = typeof loan.remainingPrincipal === "number"
        ? loan.remainingPrincipal
        : Number(loan.remainingPrincipal?.toString() || 0);

      const nameLower = (loan.counterpartyName || "").toLowerCase();
      const isMortgage =
        nameLower.includes("hipotec") ||
        nameLower.includes("santander") ||
        nameLower.includes("vivienda") ||
        nameLower.includes("inmueble");

      const category: LiabilityCategory = isMortgage ? "mortgage" : "loan";
      const rem = convertPatrimonioAmount(remaining, loan.currency, targetCurrency, p2pRate);
      liabMap[category].total += rem;
      liabMap[category].items.push({
        id: loan.id,
        name: loan.counterpartyName || "Préstamo",
        amount: rem,
        originalAmount: remaining,
        category,
        currency: loan.currency,
        notes: `Tasa: ${formatPercent(loan.interestRate * 100, getNumberFormatPreferences())}`,
        isFromModule: true,
      });
    }
  }

  // Add manual liabilities
  for (const liab of manualLiabilities) {
    const cat = liab.category || "other";
    const target = liabMap[cat] || liabMap.other;
    const rawAmt = liab.amount;
    const amt = convertPatrimonioAmount(rawAmt, liab.currency, targetCurrency, p2pRate);
    target.total += amt;
    target.items.push({
      id: liab.id,
      name: liab.name,
      amount: amt,
      originalAmount: rawAmt,
      category: cat,
      currency: liab.currency,
      notes: liab.notes,
      isFromModule: false,
    });
  }

  // Sort sub-items inside each liability category descending by amount
  for (const cat of Object.keys(liabMap) as LiabilityCategory[]) {
    liabMap[cat].items.sort((a, b) => b.amount - a.amount);
  }

  const totalLiabilities = Object.values(liabMap).reduce((acc, item) => acc + item.total, 0);

  // 3. Net Worth & Debt Ratio
  const netWorth = totalAssets - totalLiabilities;
  const debtRatioPct = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const debtHealth: "Saludable" | "Moderado" | "Comprometido" =
    debtRatioPct <= 35 ? "Saludable" : debtRatioPct <= 50 ? "Moderado" : "Comprometido";

  // 4. Calculate authentic month-over-month variation
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Transactions occurred during current month
  const currentMonthTxns = transactions.filter(
    (t) => new Date(t.occurredAt).getTime() >= startOfThisMonth.getTime()
  );
  let netCashFlowThisMonth = 0;
  for (const t of currentMonthTxns) {
    const amt = typeof t.amount === "number" ? t.amount : Number(t.amount?.toString() || 0);
    const convertedAmt = convertPatrimonioAmount(amt, t.currency, targetCurrency, p2pRate);
    if (t.direction === "Income") netCashFlowThisMonth += convertedAmt;
    else if (t.direction === "Expense") netCashFlowThisMonth -= convertedAmt;
  }

  // Investments previous valuation
  let previousInvestmentsVal = 0;
  for (const inv of investments) {
    let rawPast = inv.initialValue;
    if (inv.history && inv.history.length > 0) {
      const past = inv.history.filter(
        (h) => new Date(h.at).getTime() < startOfThisMonth.getTime()
      );
      if (past.length > 0) {
        rawPast = past[past.length - 1].value;
      }
    }
    previousInvestmentsVal += convertPatrimonioAmount(rawPast, inv.currency, targetCurrency, p2pRate);
  }

  const previousAccountsVal = Math.max(0, totalLiquidityVal - netCashFlowThisMonth);
  const previousManualAssetsVal = manualAssets
    .filter((a) => new Date(a.createdAt).getTime() < startOfThisMonth.getTime())
    .reduce((acc, a) => acc + convertPatrimonioAmount(a.value, a.currency, targetCurrency, p2pRate), 0);

  const previousManualLiabVal = manualLiabilities
    .filter((l) => new Date(l.createdAt).getTime() < startOfThisMonth.getTime())
    .reduce((acc, l) => acc + convertPatrimonioAmount(l.amount, l.currency, targetCurrency, p2pRate), 0);

  // Approximate previous loans
  const previousBorrowedLoansVal = loans
    .filter((l) => l.type === "Borrowed" && l.status === "Active")
    .reduce((acc, l) => {
      const rem = typeof l.remainingPrincipal === "number" ? l.remainingPrincipal : Number(l.remainingPrincipal?.toString() || 0);
      return acc + convertPatrimonioAmount(rem, l.currency, targetCurrency, p2pRate);
    }, 0);

  const previousLentLoansVal = loans
    .filter((l) => l.type === "Lent" && l.status === "Active")
    .reduce((acc, l) => {
      const rem = typeof l.remainingPrincipal === "number" ? l.remainingPrincipal : Number(l.remainingPrincipal?.toString() || 0);
      return acc + convertPatrimonioAmount(rem, l.currency, targetCurrency, p2pRate);
    }, 0);

  const previousTotalAssets =
    previousInvestmentsVal + previousAccountsVal + previousManualAssetsVal + previousLentLoansVal;

  const previousTotalLiabilities = previousBorrowedLoansVal + previousManualLiabVal;
  const previousNetWorth = previousTotalAssets - previousTotalLiabilities;

  let previousNetWorthChangePct: number | null = null;
  if (previousNetWorth > 0 && netWorth > 0) {
    previousNetWorthChangePct = Number(
      (((netWorth - previousNetWorth) / previousNetWorth) * 100).toFixed(1)
    );
  }

  let assetsChangePct: number | null = null;
  if (previousTotalAssets > 0 && totalAssets > 0) {
    assetsChangePct = Number(
      (((totalAssets - previousTotalAssets) / previousTotalAssets) * 100).toFixed(1)
    );
  }

  let liabilitiesChangePct: number | null = null;
  if (previousTotalLiabilities > 0 && totalLiabilities > 0) {
    liabilitiesChangePct = Number(
      (((totalLiabilities - previousTotalLiabilities) / previousTotalLiabilities) * 100).toFixed(1)
    );
  }

  // 5. Assets by category with percentages
  const assetsByCategory: AssetCategorySummary[] = (
    Object.keys(ASSET_CATEGORY_METADATA) as AssetCategory[]
  )
    .filter((cat) => assetMap[cat] && assetMap[cat].total > 0)
    .map((cat) => {
      const item = assetMap[cat];
      const pct = totalAssets > 0 ? (item.total / totalAssets) * 100 : 0;
      return {
        category: cat,
        label: ASSET_CATEGORY_METADATA[cat].label,
        description: ASSET_CATEGORY_METADATA[cat].description,
        totalValue: item.total,
        percentage: Number(pct.toFixed(1)),
        color: ASSET_CATEGORY_METADATA[cat].color,
        icon: ASSET_CATEGORY_METADATA[cat].icon,
        itemsCount: item.items.length,
        items: item.items,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  if (assetsByCategory.length > 0 && totalAssets > 0) {
    const currentSum = assetsByCategory.reduce((acc, c) => acc + c.percentage, 0);
    const diff = Number((100 - currentSum).toFixed(1));
    if (Math.abs(diff) > 0 && Math.abs(diff) < 1) {
      assetsByCategory[0].percentage = Number(
        (assetsByCategory[0].percentage + diff).toFixed(1)
      );
    }
  }

  // 6. Liabilities by category
  const liabilitiesByCategory: LiabilityCategorySummary[] = (
    Object.keys(LIABILITY_CATEGORY_METADATA) as LiabilityCategory[]
  )
    .filter((cat) => liabMap[cat] && liabMap[cat].total > 0)
    .map((cat) => {
      const item = liabMap[cat];
      const pct = totalLiabilities > 0 ? (item.total / totalLiabilities) * 100 : 0;
      return {
        category: cat,
        label: LIABILITY_CATEGORY_METADATA[cat].label,
        totalAmount: item.total,
        percentage: Number(pct.toFixed(1)),
        color: LIABILITY_CATEGORY_METADATA[cat].color,
        icon: LIABILITY_CATEGORY_METADATA[cat].icon,
        itemsCount: item.items.length,
        items: item.items,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // 7. Composition General
  const totalGross = totalAssets + totalLiabilities;
  const assetsPct = totalGross > 0 ? Number(((totalAssets / totalGross) * 100).toFixed(1)) : 100;
  const liabilitiesPct = totalGross > 0 ? Number(((totalLiabilities / totalGross) * 100).toFixed(1)) : 0;

  // 8. Authentic monthly timeline evolution
  const evolutionPoints = calculateHistoricalEvolutionPoints(
    investments,
    accounts,
    transactions,
    manualAssets,
    manualLiabilities,
    loans,
    12,
    targetCurrency,
    p2pRate
  );

  // 9. Authentic automated insights
  const insights: PatrimonioInsight[] = [];

  if (totalAssets === 0 && totalLiabilities === 0) {
    insights.push({
      id: "ins-empty",
      text: "Registrá tus activos y pasivos para visualizar tu patrimonio neto consolidado.",
      type: "info",
    });
  } else {
    if (previousNetWorthChangePct !== null) {
      insights.push({
        id: "ins-growth",
        text: `Tu patrimonio neto ${
          previousNetWorthChangePct >= 0 ? "creció +" : "varió "
        }${previousNetWorthChangePct}% este mes.`,
        type: previousNetWorthChangePct >= 0 ? "positive" : "warning",
      });
    }

    if (assetsByCategory.length > 0 && assetsByCategory[0].percentage >= 35) {
      insights.push({
        id: "ins-concentration",
        text: `El ${Math.round(assetsByCategory[0].percentage)}% de tu patrimonio está en ${assetsByCategory[0].label.toLowerCase()}.`,
        type: "info",
      });
    }

    if (totalLiabilities > 0) {
      insights.push({
        id: "ins-debt",
        text: `Tu nivel de deuda (${formatPercent(debtRatioPct, getNumberFormatPreferences())}) se mantiene en un rango ${debtHealth.toLowerCase()}.`,
        type: debtHealth === "Saludable" ? "positive" : debtHealth === "Moderado" ? "info" : "warning",
      });
    } else {
      insights.push({
        id: "ins-no-debt",
        text: "No tenés deudas registradas; tu patrimonio neto equivale al 100% de tus activos.",
        type: "positive",
      });
    }
  }

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtRatioPct,
    debtHealth,
    previousNetWorthChangePct,
    assetsChangePct,
    liabilitiesChangePct,
    assetsByCategory,
    liabilitiesByCategory,
    composition: {
      assetsPct,
      liabilitiesPct,
    },
    evolutionPoints,
    insights,
  };
}

function calculateHistoricalEvolutionPoints(
  investments: Investment[],
  accounts: AccountDto[],
  transactions: TransactionDto[],
  manualAssets: PatrimonialAsset[],
  manualLiabilities: PatrimonialLiability[],
  loans: LoanSummaryDto[],
  monthsCount: number = 12,
  targetCurrency: "USD" | "BOB" = "USD",
  p2pRate: number = 9.85
): PatrimonioEvolutionPoint[] {
  const points: PatrimonioEvolutionPoint[] = [];
  const now = new Date();

  const currentTotalAssets =
    investments.reduce((acc, i) => acc + convertPatrimonioAmount(i.currentValue || 0, i.currency, targetCurrency, p2pRate), 0) +
    accounts.reduce((acc, a) => {
      const b = typeof a.balance === "number" ? a.balance : Number(a.balance?.toString() || 0);
      return acc + (b > 0 ? convertPatrimonioAmount(b, a.currency, targetCurrency, p2pRate) : 0);
    }, 0) +
    manualAssets.reduce((acc, a) => acc + convertPatrimonioAmount(a.value, a.currency, targetCurrency, p2pRate), 0);

  const currentTotalLiabilities =
    loans.reduce((acc, l) => {
      const r = typeof l.remainingPrincipal === "number" ? l.remainingPrincipal : Number(l.remainingPrincipal?.toString() || 0);
      return acc + convertPatrimonioAmount(r, l.currency, targetCurrency, p2pRate);
    }, 0) +
    manualLiabilities.reduce((acc, l) => acc + convertPatrimonioAmount(l.amount, l.currency, targetCurrency, p2pRate), 0);

  const currentNet = Math.round(currentTotalAssets - currentTotalLiabilities);

  if (currentTotalAssets === 0 && currentTotalLiabilities === 0) {
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
      points.push({
        date: d.toISOString().split("T")[0],
        month: MONTH_NAMES_ES[d.getMonth()],
        value: 0,
        formattedValue: formatAmountText(0, targetCurrency, getNumberFormatPreferences()),
      });
    }
    return points;
  }

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const monthLabel = MONTH_NAMES_ES[d.getMonth()];

    if (i === 0) {
      points.push({
        date: d.toISOString().split("T")[0],
        month: monthLabel,
        value: currentNet,
        formattedValue: formatAmountText(currentNet, targetCurrency, getNumberFormatPreferences()),
      });
    } else {
      // Historical calculation as of date d
      const targetTime = d.getTime();

      let astSum = 0;
      for (const inv of investments) {
        let rawVal = inv.initialValue;
        if (inv.history && inv.history.length > 0) {
          const past = inv.history.filter((h) => new Date(h.at).getTime() <= targetTime);
          if (past.length > 0) rawVal = past[past.length - 1].value;
        }
        astSum += convertPatrimonioAmount(rawVal, inv.currency, targetCurrency, p2pRate);
      }

      for (const ast of manualAssets) {
        if (new Date(ast.createdAt).getTime() <= targetTime) {
          astSum += convertPatrimonioAmount(ast.value, ast.currency, targetCurrency, p2pRate);
        }
      }

      // Accounts balance backwards from now
      const laterTxns = transactions.filter((t) => new Date(t.occurredAt).getTime() > targetTime);
      let laterFlow = 0;
      for (const t of laterTxns) {
        const amt = typeof t.amount === "number" ? t.amount : Number(t.amount?.toString() || 0);
        const convertedAmt = convertPatrimonioAmount(amt, t.currency, targetCurrency, p2pRate);
        if (t.direction === "Income") laterFlow += convertedAmt;
        else if (t.direction === "Expense") laterFlow -= convertedAmt;
      }

      const totalAccToday = accounts.reduce((acc, a) => {
        const b = typeof a.balance === "number" ? a.balance : Number(a.balance?.toString() || 0);
        return acc + (b > 0 ? convertPatrimonioAmount(b, a.currency, targetCurrency, p2pRate) : 0);
      }, 0);
      astSum += Math.max(0, totalAccToday - laterFlow);

      let liabSum = 0;
      for (const l of manualLiabilities) {
        if (new Date(l.createdAt).getTime() <= targetTime) {
          liabSum += convertPatrimonioAmount(l.amount, l.currency, targetCurrency, p2pRate);
        }
      }
      for (const loan of loans) {
        if (new Date(loan.createdAt).getTime() <= targetTime) {
          const rem = typeof loan.remainingPrincipal === "number" ? loan.remainingPrincipal : Number(loan.remainingPrincipal?.toString() || 0);
          liabSum += convertPatrimonioAmount(rem, loan.currency, targetCurrency, p2pRate);
        }
      }

      const net = Math.round(astSum - liabSum);
      points.push({
        date: d.toISOString().split("T")[0],
        month: monthLabel,
        value: net,
        formattedValue: formatAmountText(net, targetCurrency, getNumberFormatPreferences()),
      });
    }
  }

  return points;
}
