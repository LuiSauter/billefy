import { IHttpClient } from "@/shared/application/http-client.contract";
import { toDecimal } from "@/shared/domain/money";
import { resolveAccountVisualMeta } from "../domain/account-meta";
import {
  AccountDto,
  CreateAccountRequest,
  ILedgerRepository,
  ReconcileAccountRequest,
  ReconciliationResult,
  RegisterTransactionRequest,
  RegisterTransferRequest,
  UpdateTransactionRequest,
  TransactionDirection,
  TransactionDto,
  TransactionFilter,
} from "../domain/ledger.types";
import { MovementPage, MovementQuery, parseMovementPage } from "../domain/movement";

export type CorrectTransferRequest = RegisterTransferRequest;

export class LedgerApiRepository implements ILedgerRepository {
  constructor(private readonly http: IHttpClient) {}

  async getAccounts(): Promise<AccountDto[]> {
    interface RawAccountDto {
      id: string;
      name: string;
      type: string;
      currency: string;
      balance: number | string;
      createdAt: string;
      iconKey?: string | null;
      colorKey?: string | null;
    }

    const raw = await this.http.get<RawAccountDto[]>("/v1/accounts");
    return raw.map((a) => {
      const meta = resolveAccountVisualMeta(a);
      return {
        ...a,
        balance: toDecimal(a.balance),
        iconKey: meta.iconKey,
        colorKey: meta.colorKey,
      };
    });
  }

  async createAccount(req: CreateAccountRequest): Promise<{ id: string }> {
    const payload = {
      name: req.name,
      type: req.type,
      currency: req.currency,
      initialBalance:
        typeof req.initialBalance === "string"
          ? parseFloat(req.initialBalance) || 0
          : (req.initialBalance ?? 0),
      iconKey: req.iconKey,
      colorKey: req.colorKey,
    };
    return this.http.post<{ id: string }>("/v1/accounts", payload);
  }

  async updateAccount(
    id: string,
    data: { name: string; iconKey: string; colorKey: string }
  ): Promise<void> {
    await this.http.put<void>(`/v1/accounts/${id}`, data);
  }

  async reconcileAccount(
    accountId: string,
    req: ReconcileAccountRequest
  ): Promise<ReconciliationResult> {
    return this.http.post<ReconciliationResult>(
      `/v1/accounts/${accountId}/reconcile`,
      req
    );
  }

  async getTransactions(filter: TransactionFilter = {}): Promise<TransactionDto[]> {
    interface RawTxnDto {
      id: string;
      accountId: string;
      amount: number | string;
      currency: string;
      direction: TransactionDirection;
      categoryId?: string;
      allocations?: Array<{ categoryId: string; categoryName?: string; amount: number | string }>;
      occurredAt: string;
      description?: string;
      reversesId?: string;
      transferId?: string;
      appliedRate?: number;
      rateSource?: string;
      createdAt: string;
    }

    const params = new URLSearchParams();
    if (filter.accountId) params.set("accountId", filter.accountId);
    if (filter.direction) params.set("direction", filter.direction);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    if (filter.limit) params.set("limit", filter.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    const raw = await this.http.get<RawTxnDto[]>(`/v1/transactions${query}`);

    return raw.map((t) => ({
      ...t,
      amount: toDecimal(t.amount),
      allocations: t.allocations?.map((allocation) => ({ ...allocation, amount: toDecimal(allocation.amount) })),
    }));
  }

  async getMovements(query: MovementQuery, signal?: AbortSignal): Promise<MovementPage> {
    const params = new URLSearchParams();
    if (query.startUtc) params.set("startUtc", query.startUtc);
    if (query.endUtcExclusive) params.set("endUtcExclusive", query.endUtcExclusive);
    if (query.accountId) params.set("accountId", query.accountId);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.type) params.set("type", query.type);
    if (query.search) params.set("search", query.search);
    params.set("mode", query.mode);
    params.set("page", String(query.page));
    params.set("pageSize", String(query.pageSize));
    const raw = await this.http.get<unknown>(`/v1/transactions/movements?${params.toString()}`, { signal });
    return parseMovementPage(raw as Parameters<typeof parseMovementPage>[0]);
  }

  async registerTransaction(req: RegisterTransactionRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/transactions", req);
  }

  async registerTransfer(req: RegisterTransferRequest): Promise<{ outflowId: string; inflowId: string }> {
    return this.http.post<{ outflowId: string; inflowId: string }>("/v1/transactions/transfers", req);
  }

  async updateTransaction(
    id: string,
    req: UpdateTransactionRequest
  ): Promise<{ id: string; replacedTransactionId: string }> {
    return this.http.put<{ id: string; replacedTransactionId: string }>(
      `/v1/transactions/${id}`,
      req
    );
  }

  async correctTransfer(id: string, req: CorrectTransferRequest): Promise<{ outflowId: string; inflowId: string; replacedTransferId: string }> {
    return this.http.put<{ outflowId: string; inflowId: string; replacedTransferId: string }>(`/v1/transactions/transfers/${id}`, req);
  }

  async reverseTransaction(
    id: string,
    reason?: string
  ): Promise<{ id: string; reversedTransactionId: string }> {
    return this.http.post<{ id: string; reversedTransactionId: string }>(
      `/v1/transactions/${id}/reverse`,
      { reason }
    );
  }
}
