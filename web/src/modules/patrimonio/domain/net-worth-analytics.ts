import Decimal from "decimal.js";
import { Investment, getKindLabel } from "@/modules/investments/domain/investment.types";
import { getAccountTypeLabel } from "@/modules/ledger/domain/account-meta";
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

type TargetCurrency = "USD" | "BOB";

const DEFAULT_P2P_RATE = 9.85;
const HISTORY_MONTHS = 12;

/** Overview metrics plus the previous month-end totals the MoM percentages are based on. */
export interface PatrimonioOverview extends PatrimonioOverviewMetrics {
  previousTotalAssets: number;
  previousTotalLiabilities: number;
  previousNetWorth: number;
}

export type PatrimonioPeriod = "6m" | "12m" | "ytd";

export const PATRIMONIO_PERIOD_OPTIONS: { value: PatrimonioPeriod; label: string; months: number | null }[] = [
  { value: "6m", label: "Últimos 6 meses", months: 6 },
  { value: "12m", label: "Últimos 12 meses", months: 12 },
  { value: "ytd", label: "Este año", months: null },
];

/** Narrows the chronological evolution series to the selected period ("ytd" keeps the reference year's points). */
export function sliceEvolutionPoints(
  points: PatrimonioEvolutionPoint[],
  period: PatrimonioPeriod,
  now: Date = new Date()
): PatrimonioEvolutionPoint[] {
  const months = PATRIMONIO_PERIOD_OPTIONS.find((option) => option.value === period)?.months ?? null;
  if (months !== null) return points.slice(-months);
  const year = String(now.getFullYear());
  return points.filter((point) => point.date.startsWith(year));
}

// ---------------------------------------------------------------------------
// Money helpers (Decimal internally; plain numbers only at the public boundary)
// ---------------------------------------------------------------------------

function toDecimal(value: unknown): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    const parsed = new Decimal(value as Decimal.Value);
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

/** Avoids leaking `-0` (e.g. `0 * -1`) into totals, chart points and assertions. */
function toNumber(value: Decimal): number {
  return value.toNumber() + 0;
}

/**
 * Single currency policy for both targets: BOB is BOB; USDT and every other
 * currency (or an unknown one) is valued at USD parity. A missing currency is
 * assumed to already be in the target currency.
 */
function normalizeCurrency(currency: string | undefined, fallback: TargetCurrency): TargetCurrency {
  return (currency || fallback).toUpperCase() === "BOB" ? "BOB" : "USD";
}

function convertDecimal(
  amount: Decimal,
  fromCurrency: string | undefined,
  targetCurrency: TargetCurrency,
  p2pRate: number
): Decimal {
  if (amount.isZero()) return new Decimal(0);
  const rate = new Decimal(p2pRate > 0 ? p2pRate : DEFAULT_P2P_RATE);
  const from = normalizeCurrency(fromCurrency, targetCurrency);
  if (from === targetCurrency) return amount;
  return targetCurrency === "BOB" ? amount.times(rate) : amount.div(rate);
}

export function convertPatrimonioAmount(
  amount: number,
  fromCurrency: string | undefined,
  targetCurrency: TargetCurrency = "USD",
  p2pRate: number = DEFAULT_P2P_RATE
): number {
  if (!amount) return 0;
  return toNumber(convertDecimal(toDecimal(amount), fromCurrency, targetCurrency, p2pRate));
}

/** Unparseable dates are treated as "always existed": we cannot prove the record was absent. */
function timeOf(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * Only an explicit property/mortgage signal in the creditor's name counts: a
 * bank's brand name alone (e.g. "Santander") says nothing about the product, and
 * the lending domain exposes no mortgage kind (only `loanKind: Loan | CreditCard`).
 */
function classifyBorrowedLoan(loan: LoanSummaryDto): LiabilityCategory {
  if (loan.loanKind === "CreditCard") return "creditcard";
  const name = (loan.counterpartyName || "").toLowerCase();
  const isMortgage = ["hipotec", "vivienda", "inmueble"].some((signal) => name.includes(signal));
  return isMortgage ? "mortgage" : "loan";
}

// ---------------------------------------------------------------------------
// Point-in-time valuation (shared by the MoM baseline and the evolution series)
// ---------------------------------------------------------------------------

interface DatedAmount {
  at: number;
  amount: Decimal;
}

interface Snapshot {
  assets: Decimal;
  liabilities: Decimal;
}

const isSettledOrActive = (status: string) => status === "Active" || status === "Paid";

/**
 * Builds `valueAt(time)` returning assets/liabilities as they stood at `time`,
 * counting only records that already existed (createdAt) and rewinding current
 * balances with the ledger flows that happened afterwards. Parsing and currency
 * conversion happen once here, not per month.
 */
function createSnapshotter(
  { investments, accounts, transactions, manualAssets, manualLiabilities, loans }: Required<Pick<
    CalculatePatrimonioParams,
    "investments" | "accounts" | "transactions" | "manualAssets" | "manualLiabilities" | "loans"
  >>,
  targetCurrency: TargetCurrency,
  p2pRate: number
): (time: number) => Snapshot {
  const convert = (amount: Decimal, currency: string | undefined) =>
    convertDecimal(amount, currency, targetCurrency, p2pRate);
  const signedTransactionAmount = (t: TransactionDto) => {
    const amount = convert(toDecimal(t.amount), t.currency);
    return t.direction === "Income" ? amount : t.direction === "Expense" ? amount.negated() : new Decimal(0);
  };

  const accountFlows = new Map<string, DatedAmount[]>();
  const loanTransactions = new Map<string, TransactionDto[]>();
  for (const t of transactions) {
    const at = timeOf(t.occurredAt);
    if (t.accountId) {
      const flows = accountFlows.get(t.accountId) ?? [];
      flows.push({ at, amount: signedTransactionAmount(t) });
      accountFlows.set(t.accountId, flows);
    }
    if (t.loanId && t.loanCashKind) {
      const list = loanTransactions.get(t.loanId) ?? [];
      list.push(t);
      loanTransactions.set(t.loanId, list);
    }
  }

  const investmentTimelines = investments.map((inv) => ({
    createdAt: timeOf(inv.createdAt),
    archivedAt: inv.archivedAt ? timeOf(inv.archivedAt) : Number.POSITIVE_INFINITY,
    initial: convert(toDecimal(inv.initialValue), inv.currency),
    valuations: (inv.history ?? [])
      .map((h) => ({ at: timeOf(h.at), amount: convert(toDecimal(h.value), inv.currency) }))
      .sort((a, b) => a.at - b.at),
  }));

  const accountTimelines = accounts.map((acc) => ({
    createdAt: timeOf(acc.createdAt),
    balanceNow: convert(toDecimal(acc.balance), acc.currency),
    flows: accountFlows.get(acc.id) ?? [],
  }));

  const manualAssetTimeline = manualAssets.map((a) => ({
    createdAt: timeOf(a.createdAt),
    amount: convert(toDecimal(a.value), a.currency),
  }));
  const manualLiabilityTimeline = manualLiabilities.map((l) => ({
    createdAt: timeOf(l.createdAt),
    amount: convert(toDecimal(l.amount), l.currency),
  }));

  // Remaining principal moves with principal cash legs and card purchases, so it can be rewound from today's value.
  const loanTimelines = loans
    .filter((l) => isSettledOrActive(l.status))
    .map((l) => {
      const isLent = l.type === "Lent";
      const rewinds: DatedAmount[] = (loanTransactions.get(l.id) ?? []).flatMap((t) => {
        const amount = convert(toDecimal(t.amount), t.currency);
        const at = timeOf(t.occurredAt);
        if (t.loanCashKind === "CardPurchase") return t.direction === "Expense" && !isLent ? [{ at, amount: amount.negated() }] : [];
        if (t.loanCashKind !== "Principal") return [];
        // Lent: Expense = money out (receivable grows), Income = repayment. Borrowed is the mirror image.
        const increasesBalance = isLent ? t.direction === "Expense" : t.direction === "Income";
        return [{ at, amount: increasesBalance ? amount.negated() : amount }];
      });
      return {
        isLent,
        createdAt: timeOf(l.createdAt),
        remainingNow: l.status === "Active" ? convert(toDecimal(l.remainingPrincipal), l.currency) : new Decimal(0),
        rewinds,
      };
    });

  const sumAfter = (entries: DatedAmount[], time: number) =>
    entries.reduce((total, entry) => (entry.at > time ? total.plus(entry.amount) : total), new Decimal(0));

  return (time: number): Snapshot => {
    let assets = new Decimal(0);
    let liabilities = new Decimal(0);

    for (const inv of investmentTimelines) {
      if (inv.createdAt > time || inv.archivedAt <= time) continue;
      let value = inv.initial;
      for (const valuation of inv.valuations) {
        if (valuation.at <= time) value = valuation.amount;
      }
      assets = assets.plus(value);
    }

    for (const acc of accountTimelines) {
      if (acc.createdAt > time) continue;
      const balance = acc.balanceNow.minus(sumAfter(acc.flows, time));
      if (balance.isNegative()) liabilities = liabilities.plus(balance.abs());
      else assets = assets.plus(balance);
    }

    for (const a of manualAssetTimeline) if (a.createdAt <= time) assets = assets.plus(a.amount);
    for (const l of manualLiabilityTimeline) if (l.createdAt <= time) liabilities = liabilities.plus(l.amount);

    for (const loan of loanTimelines) {
      if (loan.createdAt > time) continue;
      const remaining = Decimal.max(0, loan.remainingNow.plus(sumAfter(loan.rewinds, time)));
      if (loan.isLent) assets = assets.plus(remaining);
      else liabilities = liabilities.plus(remaining);
    }

    return { assets, liabilities };
  };
}

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function percentChange(current: Decimal, previous: Decimal): number | null {
  if (!previous.isPositive() || previous.isZero() || !current.isPositive() || current.isZero()) return null;
  return toNumber(current.minus(previous).div(previous).times(100).toDecimalPlaces(1));
}

export function calculatePatrimonioOverview({
  manualAssets = [],
  investments = [],
  accounts = [],
  loans = [],
  manualLiabilities = [],
  transactions = [],
  targetCurrency = "USD",
  p2pRate = DEFAULT_P2P_RATE,
}: CalculatePatrimonioParams): PatrimonioOverview {
  const preferences = getNumberFormatPreferences();
  const convert = (amount: Decimal, currency: string | undefined) =>
    convertDecimal(amount, currency, targetCurrency, p2pRate);

  // 1. Grouping Assets and collecting authentic sub-items
  const assetMap: Record<AssetCategory, { total: Decimal; items: AssetItemDetail[] }> = {
    realestate: { total: new Decimal(0), items: [] },
    investments: { total: new Decimal(0), items: [] },
    vehicles: { total: new Decimal(0), items: [] },
    digital: { total: new Decimal(0), items: [] },
    cash: { total: new Decimal(0), items: [] },
    other: { total: new Decimal(0), items: [] },
  };

  // Liabilities are built together with assets because a negative account balance lands here.
  const liabMap: Record<LiabilityCategory, { total: Decimal; items: LiabilityItemDetail[] }> = {
    mortgage: { total: new Decimal(0), items: [] },
    loan: { total: new Decimal(0), items: [] },
    creditcard: { total: new Decimal(0), items: [] },
    other: { total: new Decimal(0), items: [] },
  };

  // Add investments from the Investments module
  for (const inv of investments) {
    const rawVal = toDecimal(inv.currentValue);
    if (rawVal.isPositive() && !rawVal.isZero()) {
      const val = convert(rawVal, inv.currency);
      assetMap.investments.total = assetMap.investments.total.plus(val);
      assetMap.investments.items.push({
        id: inv.id,
        name: inv.name,
        value: toNumber(val),
        originalValue: toNumber(rawVal),
        category: "investments",
        currency: inv.currency,
        notes: `${getKindLabel(inv.kind)} • ${inv.quantity} u.`,
        isFromModule: true,
      });
    }
  }

  // Add bank accounts from Ledger: positive balances are assets, negative ones (overdraft) are liabilities
  for (const acc of accounts) {
    const bal = toDecimal(acc.balance);
    if (bal.isZero()) continue;
    const val = convert(bal.abs(), acc.currency);
    if (bal.isPositive()) {
      assetMap.cash.total = assetMap.cash.total.plus(val);
      assetMap.cash.items.push({
        id: acc.id,
        name: acc.name,
        value: toNumber(val),
        originalValue: toNumber(bal),
        category: "cash",
        currency: acc.currency,
        notes: getAccountTypeLabel(acc.type),
        isFromModule: true,
      });
    } else {
      liabMap.other.total = liabMap.other.total.plus(val);
      liabMap.other.items.push({
        id: acc.id,
        name: acc.name,
        amount: toNumber(val),
        originalAmount: toNumber(bal.abs()),
        category: "other",
        currency: acc.currency,
        notes: `${getAccountTypeLabel(acc.type)} • Saldo negativo`,
        isFromModule: true,
      });
    }
  }

  // Add registered manual assets
  for (const ast of manualAssets) {
    const cat = ast.category || "other";
    const target = assetMap[cat] || assetMap.other;
    const rawVal = toDecimal(ast.value);
    const val = convert(rawVal, ast.currency);
    target.total = target.total.plus(val);
    target.items.push({
      id: ast.id,
      name: ast.name,
      value: toNumber(val),
      originalValue: toNumber(rawVal),
      category: cat,
      currency: ast.currency,
      notes: ast.notes,
      isFromModule: false,
    });
  }

  // Add active loans receivable (Dinero prestado) from Lending module
  for (const loan of loans) {
    if (loan.type === "Lent" && loan.status === "Active") {
      const remaining = toDecimal(loan.remainingPrincipal);

      if (remaining.isPositive() && !remaining.isZero()) {
        const val = convert(remaining, loan.currency);
        assetMap.other.total = assetMap.other.total.plus(val);
        assetMap.other.items.push({
          id: loan.id,
          name: loan.counterpartyName ? `Préstamo a ${loan.counterpartyName}` : "Dinero prestado",
          value: toNumber(val),
          originalValue: toNumber(remaining),
          category: "other",
          currency: loan.currency,
          notes: `Tasa: ${formatPercent(loan.interestRate * 100, preferences)} • Saldo pendiente`,
          isFromModule: true,
        });
      }
    }
  }

  // Sort sub-items inside each category descending by value
  for (const cat of Object.keys(assetMap) as AssetCategory[]) {
    assetMap[cat].items.sort((a, b) => b.value - a.value);
  }

  const totalAssetsDec = Object.values(assetMap).reduce((acc, item) => acc.plus(item.total), new Decimal(0));
  const totalAssets = toNumber(totalAssetsDec);

  // 2. Liabilities from the Lending module
  for (const loan of loans) {
    if (loan.type === "Borrowed" && loan.status === "Active") {
      const remaining = toDecimal(loan.remainingPrincipal);
      const category = classifyBorrowedLoan(loan);
      const rem = convert(remaining, loan.currency);
      liabMap[category].total = liabMap[category].total.plus(rem);
      liabMap[category].items.push({
        id: loan.id,
        name: loan.counterpartyName || "Préstamo",
        amount: toNumber(rem),
        originalAmount: toNumber(remaining),
        category,
        currency: loan.currency,
        notes: `Tasa: ${formatPercent(loan.interestRate * 100, preferences)}`,
        isFromModule: true,
      });
    }
  }

  // Add manual liabilities
  for (const liab of manualLiabilities) {
    const cat = liab.category || "other";
    const target = liabMap[cat] || liabMap.other;
    const rawAmt = toDecimal(liab.amount);
    const amt = convert(rawAmt, liab.currency);
    target.total = target.total.plus(amt);
    target.items.push({
      id: liab.id,
      name: liab.name,
      amount: toNumber(amt),
      originalAmount: toNumber(rawAmt),
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

  const totalLiabilitiesDec = Object.values(liabMap).reduce((acc, item) => acc.plus(item.total), new Decimal(0));
  const totalLiabilities = toNumber(totalLiabilitiesDec);

  // 3. Net Worth & Debt Ratio
  const netWorthDec = totalAssetsDec.minus(totalLiabilitiesDec);
  const netWorth = toNumber(netWorthDec);
  const debtRatioPct = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const debtHealth: "Saludable" | "Moderado" | "Comprometido" =
    debtRatioPct <= 35 ? "Saludable" : debtRatioPct <= 50 ? "Moderado" : "Comprometido";

  // 4. Historical series + month-over-month baseline, from one point-in-time valuation
  const now = new Date();
  const valueAt = createSnapshotter(
    { investments, accounts, transactions, manualAssets, manualLiabilities, loans },
    targetCurrency,
    p2pRate
  );
  const evolutionPoints: PatrimonioEvolutionPoint[] = [];
  let previousSnapshot: Snapshot = { assets: new Decimal(0), liabilities: new Decimal(0) };
  const pushPoint = (date: Date, net: Decimal) => {
    const value = Math.round(toNumber(net)) + 0;
    evolutionPoints.push({
      date: formatLocalDate(date),
      month: MONTH_NAMES_ES[date.getMonth()],
      value,
      formattedValue: formatAmountText(value, targetCurrency, preferences),
    });
  };
  for (let i = HISTORY_MONTHS - 1; i >= 1; i--) {
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime() - 1;
    const snapshot = valueAt(monthEnd);
    if (i === 1) previousSnapshot = snapshot;
    pushPoint(lastDayOfMonth, snapshot.assets.minus(snapshot.liabilities));
  }
  pushPoint(now, netWorthDec); // today's point is the overview itself, so the chart always reconciles with the KPIs

  const previousTotalAssets = toNumber(previousSnapshot.assets);
  const previousTotalLiabilities = toNumber(previousSnapshot.liabilities);
  const previousNetWorthDec = previousSnapshot.assets.minus(previousSnapshot.liabilities);
  const previousNetWorthChangePct = percentChange(netWorthDec, previousNetWorthDec);
  const assetsChangePct = percentChange(totalAssetsDec, previousSnapshot.assets);
  const liabilitiesChangePct = percentChange(totalLiabilitiesDec, previousSnapshot.liabilities);

  // 5. Assets by category with percentages
  const assetsByCategory: AssetCategorySummary[] = (
    Object.keys(ASSET_CATEGORY_METADATA) as AssetCategory[]
  )
    .filter((cat) => assetMap[cat] && assetMap[cat].total.greaterThan(0))
    .map((cat) => {
      const item = assetMap[cat];
      const total = toNumber(item.total);
      const pct = totalAssets > 0 ? (total / totalAssets) * 100 : 0;
      return {
        category: cat,
        label: ASSET_CATEGORY_METADATA[cat].label,
        description: ASSET_CATEGORY_METADATA[cat].description,
        totalValue: total,
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
    .filter((cat) => liabMap[cat] && liabMap[cat].total.greaterThan(0))
    .map((cat) => {
      const item = liabMap[cat];
      const total = toNumber(item.total);
      const pct = totalLiabilities > 0 ? (total / totalLiabilities) * 100 : 0;
      return {
        category: cat,
        label: LIABILITY_CATEGORY_METADATA[cat].label,
        totalAmount: total,
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

  // 8. Authentic automated insights
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
        text: `Tu nivel de deuda (${formatPercent(debtRatioPct, preferences)}) se mantiene en un rango ${debtHealth.toLowerCase()}.`,
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
    previousTotalAssets,
    previousTotalLiabilities,
    previousNetWorth: toNumber(previousNetWorthDec),
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
