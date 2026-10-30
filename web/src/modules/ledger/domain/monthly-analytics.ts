import { AccountDto, TransactionDto } from "./ledger.types";

export function toBob(amount: number, currency: string, p2pRate: number): number {
  return currency === "BOB" ? amount : amount * p2pRate;
}

/** Removes reversed/superseded entries and their reversal counterparts. */
export function getActiveTransactions(transactions: TransactionDto[]): TransactionDto[] {
  const reversed = new Set<string>();
  for (const t of transactions) {
    if (t.reversesId) reversed.add(t.reversesId);
  }
  return transactions.filter((t) => !t.reversesId && !reversed.has(t.id));
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Current month first, followed by previous months that have activity (max 12). */
export function getAvailableMonths(transactions: TransactionDto[]): string[] {
  const current = monthKey(new Date());
  const set = new Set<string>([current]);
  for (const t of transactions) {
    const d = new Date(t.occurredAt);
    if (!isNaN(d.getTime())) set.add(monthKey(d));
  }
  return Array.from(set).sort().reverse().slice(0, 12);
}

export interface AccountMonthlyChange {
  accountId: string;
  balance: number;
  previousBalance: number;
  /** null when there is no previous-month baseline (new or zero-balance account). */
  changePct: number | null;
}

/**
 * Balance at end of previous month = current balance - net movements since the
 * start of the current month. Uses every ledger entry (reversals included) so
 * the result stays consistent with the derived balance.
 */
export function computeAccountMonthlyChanges(
  accounts: AccountDto[],
  transactions: TransactionDto[]
): Map<string, AccountMonthlyChange> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const netThisMonth = new Map<string, number>();

  for (const t of transactions) {
    if (new Date(t.occurredAt).getTime() < startOfMonth) continue;
    const amount = Number(t.amount) || 0;
    const signed = t.direction === "Income" ? amount : -amount;
    netThisMonth.set(t.accountId, (netThisMonth.get(t.accountId) ?? 0) + signed);
  }

  const result = new Map<string, AccountMonthlyChange>();
  for (const acc of accounts) {
    const balance = acc.balance.toNumber();
    const previousBalance = balance - (netThisMonth.get(acc.id) ?? 0);
    const changePct =
      Math.abs(previousBalance) < 0.005
        ? null
        : ((balance - previousBalance) / Math.abs(previousBalance)) * 100;
    result.set(acc.id, { accountId: acc.id, balance, previousBalance, changePct });
  }
  return result;
}

export function sumByMonth(
  transactions: TransactionDto[],
  month: string,
  direction: "Income" | "Expense",
  p2pRate: number
): number {
  let total = 0;
  for (const t of getActiveTransactions(transactions)) {
    if (t.direction !== direction) continue;
    const d = new Date(t.occurredAt);
    if (isNaN(d.getTime()) || monthKey(d) !== month) continue;
    total += toBob(Number(t.amount) || 0, t.currency, p2pRate);
  }
  return total;
}
