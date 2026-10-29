import Decimal from "decimal.js";

export type AccountType = "Bank" | "Wallet" | "Cash" | "Exchange";
export type TransactionDirection = "Income" | "Expense";

export interface AccountDto {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: Decimal;
  createdAt: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance?: number | string;
}

export interface TransactionDto {
  id: string;
  accountId: string;
  amount: Decimal;
  currency: string;
  direction: TransactionDirection;
  categoryId?: string;
  occurredAt: string;
  description?: string;
  reversesId?: string;
  transferId?: string;
  appliedRate?: number;
  rateSource?: string;
  createdAt: string;
}

export interface RegisterTransactionRequest {
  accountId: string;
  amount: string | number;
  direction: TransactionDirection;
  categoryId?: string;
  occurredAt?: string;
  description?: string;
}

export interface ReconcileAccountRequest {
  realBalance: number;
  notes?: string;
}

export interface ReconciliationResult {
  accountId: string;
  previousBalance: number;
  realBalance: number;
  difference: number;
  adjustmentTransactionId?: string;
}

export interface TransactionFilter {
  accountId?: string;
  direction?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ILedgerRepository {
  getAccounts(): Promise<AccountDto[]>;
  createAccount(req: CreateAccountRequest): Promise<{ id: string }>;
  reconcileAccount(accountId: string, req: ReconcileAccountRequest): Promise<ReconciliationResult>;
  getTransactions(filter?: TransactionFilter): Promise<TransactionDto[]>;
  registerTransaction(req: RegisterTransactionRequest): Promise<{ id: string }>;
  reverseTransaction(id: string, reason?: string): Promise<{ id: string; reversedTransactionId: string }>;
}
