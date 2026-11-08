import Decimal from "decimal.js";

export type AccountType =
  | "Savings"
  | "Checking"
  | "CryptoWallet"
  | "International"
  | "Wallet"
  | "Bank"
  | "Cash"
  | "Exchange";
export type TransactionDirection = "Income" | "Expense";

export interface AccountDto {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: Decimal;
  createdAt: string;
  iconKey?: string;
  colorKey?: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance?: number | string;
  iconKey?: string;
  colorKey?: string;
}

export interface TransactionAllocationDto { categoryId: string; categoryName?: string; amount: Decimal }

export interface TransactionDto {
  id: string;
  accountId: string;
  amount: Decimal;
  currency: string;
  direction: TransactionDirection;
  categoryId?: string;
  allocations?: TransactionAllocationDto[];
  occurredAt: string;
  description?: string;
  reversesId?: string;
  transferId?: string;
  investmentId?: string;
  investmentCashKind?: "Contribution" | "Disposal";
  isReconciliationAdjustment?: boolean;
  appliedRate?: number;
  rateSource?: string;
  createdAt: string;
}

export interface TransactionAllocationRequest { categoryId: string; amount: string }

export interface RegisterTransactionRequest {
  accountId: string;
  amount: string | number;
  direction: TransactionDirection;
  categoryId?: string;
  occurredAt?: string;
  description?: string;
  allocations?: TransactionAllocationRequest[];
}

export interface RegisterTransferRequest {
  sourceAccountId: string;
  sourceAmount: string;
  destinationAccountId: string;
  destinationAmount: string;
  appliedRate?: string;
  rateSource?: string;
  description?: string;
  occurredAt?: string;
}

export interface UpdateTransactionRequest {
  accountId: string;
  amount: string | number;
  direction: TransactionDirection;
  categoryId?: string;
  occurredAt?: string;
  description?: string;
  allocations?: TransactionAllocationRequest[];
}

export function encodeTransactionText(title: string, details?: string): string {
  const cleanTitle = title.trim();
  const cleanDetails = (details || "").trim();
  if (!cleanDetails) return cleanTitle;
  return `${cleanTitle}\n${cleanDetails}`;
}

export function parseTransactionText(raw?: string): {
  title: string;
  details: string;
} {
  if (!raw) return { title: "", details: "" };
  const idx = raw.indexOf("\n");
  if (idx === -1) {
    return { title: raw.trim(), details: "" };
  }
  return {
    title: raw.slice(0, idx).trim(),
    details: raw.slice(idx + 1).trim(),
  };
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
  updateAccount(
    id: string,
    data: { name: string; iconKey: string; colorKey: string }
  ): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  reconcileAccount(accountId: string, req: ReconcileAccountRequest): Promise<ReconciliationResult>;
  getTransactions(filter?: TransactionFilter): Promise<TransactionDto[]>;
  registerTransaction(req: RegisterTransactionRequest): Promise<{ id: string }>;
  registerTransfer(req: RegisterTransferRequest): Promise<{ outflowId: string; inflowId: string }>;
  updateTransaction(id: string, req: UpdateTransactionRequest): Promise<{ id: string; replacedTransactionId: string }>;
  reverseTransaction(id: string, reason?: string): Promise<{ id: string; reversedTransactionId: string }>;
}
