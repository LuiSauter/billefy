import Decimal from "decimal.js";
import {
  AccountDto,
  CreateAccountRequest,
  TransactionDto,
  RegisterTransactionRequest,
  RateSnapshotDto,
  DraftDto,
  ConfirmDraftRequest,
  ReconcileAccountRequest,
  ReconciliationResult,
  ImportStatementCsvRequest,
  StatementImportResult,
  SimulateLoanRequest,
  LoanScheduleDto,
  CreateLoanRequest,
  LoanSummaryDto,
  LoanDetailDto,
  RegisterLoanPaymentRequest,
  LoanPaymentResultDto,
  CreateBudgetRequest,
  BudgetDto,
  CreateGoalRequest,
  GoalDto,
  FinancialHealthDto,
  LinkWhatsAppRequest,
  LinkWhatsAppResponse,
  WhatsAppWebhookRequest,
  WhatsAppWebhookResponse,
  ConnectBinanceKeyRequest,
  ConnectBinanceKeyResponse,
  SyncBinanceRequest,
  SyncBinanceResponse,
  ProposeIncomeDistributionRequest,
  IncomeDistributionProposal,
  AuthResponseDto,
  UserDto,
  UserDataExportDto,
  RegisterDeviceTokenRequest,
  DeviceRegistrationDto,
  NotificationLogDto,
  ImportStatementPdfRequest,
} from "../../domain/models/types";

export * from "../../domain/models/types";

export interface ApiClientConfig {
  baseUrl?: string;
  userId?: string;
  authToken?: string;
  fetchFn?: typeof fetch;
}

export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export class BillefyApiClient {
  private readonly baseUrl: string;
  private userId?: string;
  private authToken?: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = (config.baseUrl || "http://localhost:5000").replace(/\/+$/, "");
    this.userId = config.userId;
    this.authToken = config.authToken;
    this.fetchFn = config.fetchFn || (typeof fetch !== "undefined" ? fetch : ((async () => new Response()) as typeof fetch));
  }

  getAuthToken(): string | undefined {
    return this.authToken;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});

    headers.set("Content-Type", "application/json");

    if (this.userId) {
      headers.set("X-User-Id", this.userId);
    }

    if (this.authToken) {
      headers.set("Authorization", `Bearer ${this.authToken}`);
    }

    const res = await this.fetchFn(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let problem: ApiProblemDetails = {};
      try {
        problem = await res.json();
      } catch {
        // Fallback if not JSON
      }
      throw new Error(problem.detail || problem.title || `API error: ${res.statusText}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // --- Accounts ---
  async getAccounts(): Promise<AccountDto[]> {
    interface RawAccountDto {
      id: string;
      name: string;
      type: string;
      currency: string;
      balance: number;
      createdAt: string;
    }

    const raw = await this.request<RawAccountDto[]>("/v1/accounts");
    return raw.map((a) => ({
      ...a,
      balance: new Decimal(a.balance),
    }));
  }

  async createAccount(req: CreateAccountRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/accounts", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async reconcileAccount(
    accountId: string,
    req: ReconcileAccountRequest
  ): Promise<ReconciliationResult> {
    return this.request<ReconciliationResult>(`/v1/accounts/${accountId}/reconcile`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // --- Transactions ---
  async getTransactions(filter: {
    accountId?: string;
    direction?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}): Promise<TransactionDto[]> {
    interface RawTxnDto {
      id: string;
      accountId: string;
      amount: number;
      currency: string;
      direction: "Income" | "Expense";
      categoryId?: string;
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
    const raw = await this.request<RawTxnDto[]>(`/v1/transactions${query}`);

    return raw.map((t) => ({
      ...t,
      amount: new Decimal(t.amount),
    }));
  }

  async registerTransaction(req: RegisterTransactionRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/transactions", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async reverseTransaction(
    id: string,
    reason?: string
  ): Promise<{ id: string; reversedTransactionId: string }> {
    return this.request<{ id: string; reversedTransactionId: string }>(
      `/v1/transactions/${id}/reverse`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  }

  // --- Rates ---
  async getLatestRate(currency: string, baseCurrency: string = "USD"): Promise<RateSnapshotDto> {
    return this.request<RateSnapshotDto>(
      `/v1/rates/latest?currency=${encodeURIComponent(currency)}&baseCurrency=${encodeURIComponent(baseCurrency)}`
    );
  }

  // --- Drafts ---
  async getDrafts(
    status?: string,
    limit?: number
  ): Promise<DraftDto[]> {
    interface RawDraftDto {
      id: string;
      source: string;
      status: "Review" | "Pending" | "Confirmed" | "Discarded";
      direction: "Income" | "Expense";
      amount: number;
      currency: string;
      estimatedDate: string;
      reference?: string;
      fingerprint: string;
      confidence: number;
      suggestedAccountId?: string;
      suggestedCategoryId?: string;
      confirmedAccountId?: string;
      confirmedCategoryId?: string;
      ledgerTransactionId?: string;
      createdAt: string;
      confirmedAt?: string;
      discardedAt?: string;
      linkedEventsCount: number;
    }

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (limit) params.set("limit", limit.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    const raw = await this.request<RawDraftDto[]>(`/v1/drafts${query}`);

    return raw.map((d) => ({
      ...d,
      amount: new Decimal(d.amount),
    }));
  }

  async confirmDraft(
    id: string,
    req: ConfirmDraftRequest
  ): Promise<{ transactionId: string }> {
    return this.request<{ transactionId: string }>(`/v1/drafts/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async discardDraft(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/v1/drafts/${id}/discard`, {
      method: "POST",
    });
  }

  async importStatementCsv(
    req: ImportStatementCsvRequest
  ): Promise<StatementImportResult> {
    return this.request<StatementImportResult>("/v1/ingestion/statements/import-csv", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // --- Lending ---
  async simulateLoan(req: SimulateLoanRequest): Promise<LoanScheduleDto> {
    return this.request<LoanScheduleDto>("/v1/loans/simulate", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async createLoan(req: CreateLoanRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/loans", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async getLoans(type?: "Lent" | "Borrowed", status?: string): Promise<LoanSummaryDto[]> {
    interface RawLoanSummary {
      id: string;
      counterpartyId: string;
      counterpartyName: string;
      type: "Lent" | "Borrowed";
      template: string;
      status: string;
      principal: number;
      currency: string;
      interestRate: number;
      annualEffectiveRate: number;
      remainingPrincipal: number;
      disbursementDate: string;
      firstDueDate: string;
      totalInstallments: number;
      createdAt: string;
    }

    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);

    const query = params.toString() ? `?${params.toString()}` : "";
    const raw = await this.request<RawLoanSummary[]>(`/v1/loans${query}`);

    return raw.map((l) => ({
      ...l,
      principal: new Decimal(l.principal),
      remainingPrincipal: new Decimal(l.remainingPrincipal),
    }));
  }

  async getLoanById(id: string): Promise<LoanDetailDto> {
    interface RawLoanDetail {
      summary: {
        id: string;
        counterpartyId: string;
        counterpartyName: string;
        type: "Lent" | "Borrowed";
        template: string;
        status: string;
        principal: number;
        currency: string;
        interestRate: number;
        annualEffectiveRate: number;
        remainingPrincipal: number;
        disbursementDate: string;
        firstDueDate: string;
        totalInstallments: number;
        createdAt: string;
      };
      installments: {
        id: string;
        number: number;
        dueDate: string;
        expectedPrincipal: number;
        expectedInterest: number;
        expectedTotal: number;
        paidPrincipal: number;
        paidInterest: number;
        paidLateInterest: number;
        remainingPrincipal: number;
        status: string;
      }[];
      payments: {
        id: string;
        amount: number;
        currency: string;
        paymentDate: string;
        note?: string;
        allocations: {
          installmentId: string;
          installmentNumber: number;
          toLateInterest: number;
          toInterest: number;
          toPrincipal: number;
          remainingBalanceAfter: number;
        }[];
      }[];
    }

    const raw = await this.request<RawLoanDetail>(`/v1/loans/${id}`);

    return {
      summary: {
        ...raw.summary,
        principal: new Decimal(raw.summary.principal),
        remainingPrincipal: new Decimal(raw.summary.remainingPrincipal),
      },
      installments: raw.installments.map((i) => ({
        ...i,
        expectedPrincipal: new Decimal(i.expectedPrincipal),
        expectedInterest: new Decimal(i.expectedInterest),
        expectedTotal: new Decimal(i.expectedTotal),
        paidPrincipal: new Decimal(i.paidPrincipal),
        paidInterest: new Decimal(i.paidInterest),
        paidLateInterest: new Decimal(i.paidLateInterest),
        remainingPrincipal: new Decimal(i.remainingPrincipal),
      })),
      payments: raw.payments.map((p) => ({
        ...p,
        amount: new Decimal(p.amount),
      })),
    };
  }

  async registerLoanPayment(
    loanId: string,
    req: RegisterLoanPaymentRequest
  ): Promise<LoanPaymentResultDto> {
    return this.request<LoanPaymentResultDto>(`/v1/loans/${loanId}/payments`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // --- Planning & Health ---
  async createBudget(req: CreateBudgetRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/planning/budgets", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async getBudgets(): Promise<BudgetDto[]> {
    return this.request<BudgetDto[]>("/v1/planning/budgets");
  }

  async deleteBudget(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/v1/planning/budgets/${id}`, {
      method: "DELETE",
    });
  }

  async createGoal(req: CreateGoalRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/planning/goals", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async getGoals(): Promise<GoalDto[]> {
    return this.request<GoalDto[]>("/v1/planning/goals");
  }

  async deleteGoal(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/v1/planning/goals/${id}`, {
      method: "DELETE",
    });
  }

  async getFinancialHealth(): Promise<FinancialHealthDto> {
    return this.request<FinancialHealthDto>("/v1/planning/financial-health");
  }

  // --- Integrations ---
  async linkWhatsApp(req: LinkWhatsAppRequest): Promise<LinkWhatsAppResponse> {
    return this.request<LinkWhatsAppResponse>("/v1/messaging/whatsapp/link", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async sendWhatsAppWebhook(req: WhatsAppWebhookRequest): Promise<WhatsAppWebhookResponse> {
    return this.request<WhatsAppWebhookResponse>("/v1/messaging/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async connectBinanceKey(req: ConnectBinanceKeyRequest): Promise<ConnectBinanceKeyResponse> {
    return this.request<ConnectBinanceKeyResponse>("/v1/integrations/binance/connect", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async syncBinance(req: SyncBinanceRequest): Promise<SyncBinanceResponse> {
    return this.request<SyncBinanceResponse>("/v1/integrations/binance/sync", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async proposeIncomeDistribution(req: ProposeIncomeDistributionRequest): Promise<IncomeDistributionProposal> {
    return this.request<IncomeDistributionProposal>("/v1/planning/income-distribution/propose", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async loginWithGoogle(idToken: string, preferredCurrency = "BOB"): Promise<AuthResponseDto> {
    const res = await this.request<AuthResponseDto>("/api/v1/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken, preferredCurrency }),
    });
    this.authToken = res.accessToken;
    this.userId = res.user.id;
    return res;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const res = await this.request<AuthResponseDto>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    this.authToken = res.accessToken;
    this.userId = res.user.id;
    return res;
  }

  async getCurrentUser(): Promise<UserDto> {
    return this.request<UserDto>("/api/v1/auth/me", { method: "GET" });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.request<void>("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    this.authToken = undefined;
  }

  async requestAccountDeletion(): Promise<void> {
    await this.request<void>("/api/v1/auth/account", { method: "DELETE" });
  }

  async exportUserData(): Promise<UserDataExportDto> {
    return this.request<UserDataExportDto>("/api/v1/auth/export", { method: "GET" });
  }

  async registerDeviceToken(req: RegisterDeviceTokenRequest): Promise<DeviceRegistrationDto> {
    return this.request<DeviceRegistrationDto>("/v1/notifications/devices", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async getNotificationHistory(): Promise<NotificationLogDto[]> {
    return this.request<NotificationLogDto[]>("/v1/notifications", { method: "GET" });
  }

  async importStatementPdf(req: ImportStatementPdfRequest): Promise<StatementImportResult> {
    return this.request<StatementImportResult>("/v1/ingestion/statements/import-pdf", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }
}
