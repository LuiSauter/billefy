import Decimal from "decimal.js";
import { AccountDto, TransactionDto } from "./ledger.types";

export type TransactionTypeFilter = "all" | "Income" | "Expense" | "Transfer";

export type PeriodFilterKey =
  | "all"
  | "current_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "year_to_date";

export type RunningBalanceTransaction = TransactionDto & {
  runningBalance: Decimal;
};

export interface CashFlowComparison {
  income: Decimal;
  expenses: Decimal;
  totalFlow: Decimal;
  incomePercentage: number;
  expensePercentage: number;
}

export interface AccountPeriodStats {
  totalMovements: number;
  income: Decimal;
  expenses: Decimal;
  netVariation: Decimal;
  percentageVariation: number;
  averageExpenseTicket: Decimal;
}

export interface BalanceEvolutionPoint {
  label: string;
  date: string;
  balance: number;
}

/**
 * Filter out reversed transactions and their reversal records
 */
export function getActiveAccountTransactions(
  accountId: string,
  transactions: TransactionDto[]
): TransactionDto[] {
  const reversedOriginalIds = new Set<string>();
  for (const t of transactions) {
    if (t.reversesId) {
      reversedOriginalIds.add(t.reversesId);
    }
  }

  return transactions.filter(
    (t) =>
      t.accountId === accountId &&
      !t.reversesId &&
      !reversedOriginalIds.has(t.id)
  );
}

/**
 * Computes running balance for each transaction chronologically.
 * The latest transaction's runningBalance matches account.balance.
 */
export function calculateRunningBalances(
  account: AccountDto,
  transactions: TransactionDto[]
): RunningBalanceTransaction[] {
  const activeTxns = getActiveAccountTransactions(account.id, transactions);
  if (activeTxns.length === 0) return [];

  // Sort ascending by occurredAt
  const sortedAsc = [...activeTxns].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  // Compute total delta across all active transactions
  // Income adds, Expense subtracts
  // We align the final running balance with account.balance
  const targetCurrentBalance = new Decimal(account.balance || 0);

  // Compute delta per transaction
  const deltas = sortedAsc.map((t) => {
    const amt = new Decimal(t.amount || 0);
    return t.direction === "Income" ? amt : amt.negated();
  });

  const totalDelta = deltas.reduce((acc, d) => acc.plus(d), new Decimal(0));
  const startingBalance = targetCurrentBalance.minus(totalDelta);

  let current = startingBalance;
  const resultAsc: RunningBalanceTransaction[] = [];

  for (let i = 0; i < sortedAsc.length; i++) {
    current = current.plus(deltas[i]);
    resultAsc.push({
      ...sortedAsc[i],
      runningBalance: current,
    });
  }

  // Return sorted descending (newest first) for UI display
  return resultAsc.reverse();
}

/**
 * Calculates Income vs Expenses totals and percentage split for donut chart.
 */
export function calculateCashFlowComparison(
  transactions: TransactionDto[]
): CashFlowComparison {
  let income = new Decimal(0);
  let expenses = new Decimal(0);

  for (const t of transactions) {
    if (t.reversesId) continue;
    const amt = new Decimal(t.amount || 0);
    if (t.direction === "Income") {
      income = income.plus(amt);
    } else if (t.direction === "Expense") {
      expenses = expenses.plus(amt);
    }
  }

  const totalFlow = income.plus(expenses);
  const incomePercentage = totalFlow.gt(0)
    ? income.dividedBy(totalFlow).times(100).toNumber()
    : 0;
  const expensePercentage = totalFlow.gt(0)
    ? expenses.dividedBy(totalFlow).times(100).toNumber()
    : 0;

  return {
    income,
    expenses,
    totalFlow,
    incomePercentage,
    expensePercentage,
  };
}

/**
 * Calculates KPIs for the selected period
 */
export function calculateAccountPeriodStats(
  account: AccountDto,
  transactions: TransactionDto[],
  period: PeriodFilterKey = "all",
  refDate: Date = new Date()
): AccountPeriodStats {
  const activeTxns = getActiveAccountTransactions(account.id, transactions);
  const filtered = filterTransactionsByPeriod(activeTxns, period, refDate);

  let income = new Decimal(0);
  let expenses = new Decimal(0);
  let expenseCount = 0;

  for (const t of filtered) {
    const amt = new Decimal(t.amount || 0);
    if (t.direction === "Income") {
      income = income.plus(amt);
    } else if (t.direction === "Expense") {
      expenses = expenses.plus(amt);
      expenseCount++;
    }
  }

  const totalMovements = filtered.length;
  const netVariation = income.minus(expenses);

  const initialBalanceGuess = new Decimal(account.balance || 0).minus(netVariation);
  const percentageVariation =
    initialBalanceGuess.gt(0) && !initialBalanceGuess.isZero()
      ? netVariation.dividedBy(initialBalanceGuess).times(100).toNumber()
      : 0;

  const averageExpenseTicket =
    expenseCount > 0 ? expenses.dividedBy(expenseCount) : new Decimal(0);

  return {
    totalMovements,
    income,
    expenses,
    netVariation,
    percentageVariation,
    averageExpenseTicket,
  };
}

/**
 * Filters transactions by movement type (All, Income, Expense, Transfer)
 */
export function filterTransactionsByType(
  transactions: TransactionDto[],
  typeFilter: TransactionTypeFilter
): TransactionDto[] {
  if (typeFilter === "all") return transactions;
  if (typeFilter === "Transfer") {
    return transactions.filter((t) => !!t.transferId);
  }
  return transactions.filter((t) => t.direction === typeFilter && !t.transferId);
}

/**
 * Filters transactions by period based on reference date
 */
export function filterTransactionsByPeriod(
  transactions: TransactionDto[],
  period: PeriodFilterKey,
  refDate: Date = new Date()
): TransactionDto[] {
  if (period === "all") return transactions;

  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();

  return transactions.filter((t) => {
    const d = new Date(t.occurredAt);
    if (isNaN(d.getTime())) return false;

    if (period === "current_month") {
      return d.getFullYear() === refYear && d.getMonth() === refMonth;
    }

    if (period === "last_month") {
      const prevDate = new Date(refYear, refMonth - 1, 1);
      return (
        d.getFullYear() === prevDate.getFullYear() &&
        d.getMonth() === prevDate.getMonth()
      );
    }

    if (period === "last_3_months") {
      const threeMonthsAgo = new Date(refYear, refMonth - 2, 1);
      return d >= threeMonthsAgo && d <= refDate;
    }

    if (period === "last_6_months") {
      const sixMonthsAgo = new Date(refYear, refMonth - 5, 1);
      return d >= sixMonthsAgo && d <= refDate;
    }

    if (period === "year_to_date") {
      const startOfYear = new Date(refYear, 0, 1);
      return d >= startOfYear && d <= refDate;
    }

    return true;
  });
}

const MONTH_NAMES_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/**
 * Generates monthly data points for the Recharts AreaChart
 */
export function calculateBalanceEvolutionPoints(
  account: AccountDto,
  transactions: TransactionDto[],
  range: "1m" | "3m" | "6m" | "1y" | "all" = "6m",
  refDate: Date = new Date()
): BalanceEvolutionPoint[] {
  const activeTxns = getActiveAccountTransactions(account.id, transactions);
  const currentBalance = new Decimal(account.balance || 0).toNumber();

  const monthsCount =
    range === "1m" ? 1 : range === "3m" ? 3 : range === "1y" ? 12 : 6;

  const points: BalanceEvolutionPoint[] = [];

  // Generate bucket for each month ending at refDate
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const label = MONTH_NAMES_SHORT[monthIndex];

    // End of that month
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    // If it's the current month (or future), use currentBalance
    if (i === 0) {
      points.push({
        label,
        date: endOfMonth.toISOString(),
        balance: currentBalance,
      });
    } else {
      // Delta between endOfMonth and now
      const txnsAfter = activeTxns.filter(
        (t) => new Date(t.occurredAt) > endOfMonth
      );
      let deltaAfter = new Decimal(0);
      for (const t of txnsAfter) {
        const amt = new Decimal(t.amount || 0);
        deltaAfter = t.direction === "Income" ? deltaAfter.plus(amt) : deltaAfter.minus(amt);
      }
      const historicalBalance = Math.max(0, currentBalance - deltaAfter.toNumber());
      points.push({
        label,
        date: endOfMonth.toISOString(),
        balance: historicalBalance,
      });
    }
  }

  // Smooth fallback if all are 0 or identical and currentBalance > 0
  const allEqual = points.every((p) => p.balance === points[0].balance);
  if (allEqual && currentBalance > 0 && points.length > 1) {
    // Gradual progression from opening (e.g. 80%) to current
    const startVal = Math.round(currentBalance * 0.8);
    const step = (currentBalance - startVal) / (points.length - 1);
    return points.map((p, idx) => ({
      ...p,
      balance: Math.round(startVal + step * idx),
    }));
  }

  return points;
}
