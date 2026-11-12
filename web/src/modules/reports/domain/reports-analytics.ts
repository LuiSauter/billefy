import Decimal from "decimal.js";
import type { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { getActiveFlowTransactions } from "@/modules/ledger/domain/monthly-analytics";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import type { BudgetDto } from "@/modules/planning/domain/planning.types";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const BUDGET_MONTHS: Record<string, number | undefined> = {
  monthly: 1,
  mensual: 1,
  quarterly: 3,
  trimestral: 3,
  semiannual: 6,
  semestral: 6,
  yearly: 12,
  anual: 12,
  annual: 12,
};

export interface FinancialReportParams {
  transactions: TransactionDto[];
  accounts: AccountDto[];
  loans?: LoanSummaryDto[];
  budgets?: BudgetDto[];
  periodMonths?: number;
  referenceDate?: string | Date;
  selectedCurrency?: string;
  /** BOB per USD. Required only for nonzero cross-currency amounts. */
  p2pRate?: number;
}

export interface FinancialReport {
  kpis: {
    totalIncome: number;
    incomeGrowthPct: number;
    totalExpenses: number;
    expensesGrowthPct: number;
    savingsAndInvestments: number;
    savingsGrowthPct: number;
    netBalance: number;
    netBalanceGrowthPct: number;
  };
  cashFlowEvolution: { month: string; monthKey: string; income: number; expenses: number; net: number }[];
  categoryExpenses: { category: string; amount: number; percentage: number }[];
  netWorthEvolution: { month: string; monthKey: string; netWorth: number }[];
  periodSummary: {
    savingsRatio: number;
    netWorthGrowthPct: number;
    debtRatio: number;
    budgetCompliance: number;
  };
  conclusion: {
    title: string;
    narrative: string;
    healthStatus: "excellent" | "good" | "warning" | "critical";
  };
}

function amount(value: Decimal.Value): Decimal {
  const result = new D(value);
  if (!result.isFinite()) throw new RangeError("Monetary amounts must be finite.");
  return result;
}
function sum(values: Decimal[]): Decimal {
  return values.reduce((total, value) => total.plus(value), new D(0));
}
function output(value: Decimal, places = 6): number {
  const result = value.toDecimalPlaces(places).toNumber();
  if (!Number.isFinite(result)) throw new RangeError("Report value exceeds the supported numeric range.");
  return result;
}
function ratio(part: Decimal, total: Decimal): Decimal {
  return total.isZero() ? new D(0) : part.div(total).times(100);
}
/** A zero baseline has no defined percentage change; return 0, not invented growth. */
function growth(current: Decimal, previous: Decimal): Decimal {
  return ratio(current.minus(previous), previous.abs());
}
function date(value: string | Date): Date | undefined {
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : undefined;
}
function monthStart(value: Date, offset = 0): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1));
}
function monthInfo(value: Date) {
  return { month: MONTHS[value.getUTCMonth()], monthKey: `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}` };
}
function converter(selectedCurrency: string, p2pRate?: number) {
  const normalize = (currency: string | undefined | null) =>
    (currency || "").trim().toUpperCase().replace(/^(USDT|USDC)$/, "USD");
  const target = normalize(selectedCurrency);
  return (value: Decimal.Value, currency: string | undefined | null): Decimal => {
    const parsed = amount(value);
    const from = normalize(currency);
    if (from === target || parsed.isZero()) return parsed;
    if (!((from === "BOB" && target === "USD") || (from === "USD" && target === "BOB"))) {
      throw new RangeError("Unsupported cross-currency conversion; only BOB and USD/USDT/USDC are supported.");
    }
    if (p2pRate === undefined || !Number.isFinite(p2pRate) || p2pRate <= 0) {
      throw new RangeError("A finite positive BOB-per-USD P2P rate is required for conversion.");
    }
    return target === "BOB" ? parsed.times(new D(p2pRate)) : parsed.div(new D(p2pRate));
  };
}

/**
 * Calendar-month reporting in UTC, including the reference month only through
 * referenceDate; comparison uses the immediately preceding N calendar months.
 * Account and loan DTOs must be snapshots at referenceDate, with complete ledger
 * history for the reported window. All monetary math stays Decimal until output
 * (six monetary decimal places; two percentage places).
 *
 * Savings/investments is positive retained surplus, NOT investment performance:
 * max(operating income - operating expenses, 0). Internal transfers, investment
 * cash entries, reconciliations and reversed flows are not operating activity.
 *
 * Net worth covers supplied accounts plus outstanding lent principal minus
 * borrowed principal and overdrafts. Account history unwinds ALL ledger entries,
 * including reversals and transfers. Loan summaries lack repayment history, so
 * outstanding principal is held constant after origination: history is an
 * estimate, not a fabricated investment valuation or complete patrimony report.
 *
 * Budget execution is expenses / planned limits (not a capped health score).
 * Active recurring limits are normalized to monthly amounts and counted for
 * each eligible month; the current partial month uses its full monthly limit.
 * Missing baselines/budgets yield 0; positive debt with no assets yields a 100%
 * risk sentinel. The narrative explains missing data rather than praising it.
 */
export function calculateFinancialReport({
  transactions, accounts, loans = [], budgets = [], periodMonths = 6,
  referenceDate = new Date(), selectedCurrency = "BOB", p2pRate,
}: FinancialReportParams): FinancialReport {
  if (!Number.isSafeInteger(periodMonths) || periodMonths < 1) throw new RangeError("periodMonths must be a positive integer.");
  const reference = date(referenceDate);
  if (!reference) throw new RangeError("referenceDate must be valid.");
  const start = monthStart(reference, 1 - periodMonths);
  const priorStart = monthStart(start, -periodMonths);
  if (!Number.isFinite(priorStart.getTime())) throw new RangeError("Reporting period exceeds the supported date range.");
  const convert = converter(selectedCurrency, p2pRate);
  const months = Array.from({ length: periodMonths }, (_, index) => monthStart(start, index));
  // Future reversals must not erase flows already present at the reference date.
  const dated = transactions.flatMap((transaction) => {
    const at = date(transaction.occurredAt);
    return at && at <= reference ? [{ transaction, at }] : [];
  });
  const flows = getActiveFlowTransactions(dated.map((item) => item.transaction)).flatMap((transaction) => {
    const at = date(transaction.occurredAt)!;
    return at >= priorStart ? [{ transaction, at, value: convert(transaction.amount, transaction.currency) }] : [];
  });
  const totals = (from: Date, until?: Date) => {
    const included = flows.filter((item) => item.at >= from && (!until || item.at < until));
    const income = sum(included.filter((item) => item.transaction.direction === "Income").map((item) => item.value));
    const expenses = sum(included.filter((item) => item.transaction.direction === "Expense").map((item) => item.value));
    const net = income.minus(expenses);
    return { income, expenses, net, savings: D.max(0, net) };
  };
  const current = totals(start);
  const previous = totals(priorStart, start);
  const cashFlowEvolution = months.map((month) => {
    const flow = totals(month, monthStart(month, 1));
    return { ...monthInfo(month), income: output(flow.income), expenses: output(flow.expenses), net: output(flow.net) };
  });

  const categoryNames = new Map<string, string>();
  for (const { transaction } of flows) {
    for (const allocation of transaction.allocations ?? []) {
      if (allocation.categoryName) categoryNames.set(allocation.categoryId, allocation.categoryName);
    }
  }
  const categories = new Map<string, Decimal>();
  const addCategory = (id: string | undefined, value: Decimal) => {
    const label = id ? categoryNames.get(id) ?? id : "Sin categoría";
    categories.set(label, (categories.get(label) ?? new D(0)).plus(value));
  };
  for (const { transaction, at, value } of flows) {
    if (at < start || transaction.direction !== "Expense") continue;
    if (!transaction.allocations?.length) {
      addCategory(transaction.categoryId, value);
      continue;
    }
    const allocations = transaction.allocations.map((allocation) => ({
      id: allocation.categoryId, value: convert(allocation.amount, transaction.currency),
    }));
    const allocated = sum(allocations.map((item) => item.value));
    if (allocated.gt(value) || allocations.some((item) => item.value.isNegative())) {
      throw new RangeError("Category allocations must be non-negative and cannot exceed the expense.");
    }
    for (const allocation of allocations) addCategory(allocation.id, allocation.value);
    if (allocated.lt(value)) addCategory(undefined, value.minus(allocated));
  }
  const categoryExpenses = [...categories].filter(([, value]) => value.gt(0))
    .sort(([a, av], [b, bv]) => bv.comparedTo(av) || a.localeCompare(b))
    .map(([category, value]) => ({ category, amount: output(value), percentage: output(ratio(value, current.expenses), 2) }));

  const accountIds = new Set(accounts.map((item) => item.id));
  const movements = dated.filter((item) => accountIds.has(item.transaction.accountId)).map(({ transaction, at }) => {
    const value = convert(transaction.amount, transaction.currency);
    return { accountId: transaction.accountId, at, signed: transaction.direction === "Income" ? value : value.negated() };
  });
  const accountPositions = accounts.map((item) => ({
    id: item.id, created: date(item.createdAt), balance: convert(item.balance, item.currency),
  }));
  const loanPositions = loans.filter((item) => item.status !== "Cancelled" && item.status !== "Paid")
    .map((item) => ({ type: item.type, created: date(item.disbursementDate) ?? date(item.createdAt),
      remaining: D.max(0, convert(item.remainingPrincipal, item.currency)) }));
  const position = (cutoff: Date, inclusive: boolean) => {
    const present = (at: Date) => inclusive ? at <= cutoff : at < cutoff;
    const balances = accountPositions.filter((item) => item.created && present(item.created)).map((item) =>
      item.balance.minus(sum(movements.filter((movement) => movement.accountId === item.id && !present(movement.at)).map((movement) => movement.signed))));
    const eligibleLoans = loanPositions.filter((item) => item.created && present(item.created));
    const assets = sum(balances.map((balance) => D.max(0, balance))).plus(sum(eligibleLoans.filter((item) => item.type === "Lent").map((item) => item.remaining)));
    const debt = sum(balances.map((balance) => D.max(0, balance.negated()))).plus(sum(eligibleLoans.filter((item) => item.type === "Borrowed").map((item) => item.remaining)));
    return { assets, debt, net: assets.minus(debt) };
  };
  const latest = position(reference, true);
  const baseline = position(start, false);
  const netWorthEvolution = months.map((month, index) => ({ ...monthInfo(month),
    netWorth: output(index === months.length - 1 ? latest.net : position(monthStart(month, 1), false).net),
  }));

  const planned = sum(budgets.filter((item) => item.isActive).map((item) => {
    const created = date(item.createdAt);
    if (!created || created > reference) return new D(0);
    const periodKey = (item.period || "monthly").trim().toLowerCase();
    const divisor = BUDGET_MONTHS[periodKey] ?? 1;
    const eligibleMonths = months.filter((month, index) => index === months.length - 1
      ? created <= reference : created < monthStart(month, 1)).length;
    return D.max(0, convert(item.limitAmount, item.currency)).div(divisor).times(eligibleMonths);
  }));
  const savingsRatio = ratio(current.net, current.income);
  const netWorthGrowth = growth(latest.net, baseline.net);
  const debtRatio = latest.assets.gt(0) ? ratio(latest.debt, latest.assets) : latest.debt.gt(0) ? new D(100) : new D(0);
  const budgetCompliance = ratio(current.expenses, planned);
  const noFlows = current.income.isZero() && current.expenses.isZero();
  const healthStatus: FinancialReport["conclusion"]["healthStatus"] = current.net.lt(0) || debtRatio.gte(50) ? "critical"
    : noFlows || savingsRatio.lt(10) || debtRatio.gte(30) || budgetCompliance.gt(100) ? "warning"
      : savingsRatio.gte(20) ? "excellent" : "good";
  const healthLabels = { excellent: "excelente", good: "buena", warning: "requiere atención", critical: "crítica" };
  const narrative = [
    noFlows ? "No hay ingresos ni gastos operativos registrados en el período; faltan datos para evaluar tu ahorro."
      : current.income.isZero() ? "Hay gastos sin ingresos registrados: revisa cómo estás financiando el período."
        : `Tu salud financiera ${healthStatus === "warning" ? "requiere atención" : `es ${healthLabels[healthStatus]}`}. Tu ratio de ahorro es ${savingsRatio.toFixed(1)}%${savingsRatio.gte(20) ? ", por encima del objetivo del 20%" : "; procura alcanzar el objetivo del 20%"}.`,
    current.net.lt(0) ? "Tus gastos superan tus ingresos; prioriza reducir el déficit antes de invertir más." : "",
    baseline.net.isZero() ? "No hay una base patrimonial previa distinta de cero para calcular el crecimiento."
      : `Tu patrimonio neto ${netWorthGrowth.gte(0) ? "creció" : "disminuyó"} ${netWorthGrowth.abs().toFixed(1)}% respecto al cierre anterior al período.`,
    latest.debt.gt(0) && latest.assets.isZero() ? "Tienes deuda sin activos registrados; el riesgo de endeudamiento es alto."
      : `Tu endeudamiento es ${debtRatio.toFixed(1)}% de los activos${debtRatio.lt(30) ? ", en un nivel saludable" : "; reduce la deuda hacia un nivel inferior al 30%"}.`,
    planned.isZero() ? "Sin presupuesto disponible: no es posible evaluar su cumplimiento."
      : `Ejecutaste el ${budgetCompliance.toFixed(1)}% del gasto planificado${budgetCompliance.gt(100) ? "; revisa los excesos" : ", dentro del límite"}.`,
    categoryExpenses[0] ? `La mayor concentración de gastos está en ${categoryExpenses[0].category} (${new D(categoryExpenses[0].percentage).toFixed(1)}%); revisa allí las oportunidades de ahorro.` : "",
    "La evolución patrimonial es una estimación basada en las cuentas y préstamos suministrados, sin valoraciones históricas de inversiones ni amortizaciones no informadas.",
  ].filter(Boolean).join(" ");

  return {
    kpis: { totalIncome: output(current.income), incomeGrowthPct: output(growth(current.income, previous.income), 2),
      totalExpenses: output(current.expenses), expensesGrowthPct: output(growth(current.expenses, previous.expenses), 2),
      savingsAndInvestments: output(current.savings), savingsGrowthPct: output(growth(current.savings, previous.savings), 2),
      netBalance: output(current.net), netBalanceGrowthPct: output(growth(current.net, previous.net), 2) },
    cashFlowEvolution, categoryExpenses, netWorthEvolution,
    periodSummary: { savingsRatio: output(savingsRatio, 2), netWorthGrowthPct: output(netWorthGrowth, 2),
      debtRatio: output(debtRatio, 2), budgetCompliance: output(budgetCompliance, 2) },
    conclusion: { title: "Conclusión del período", narrative, healthStatus },
  };
}
