import Decimal from "decimal.js";

export type AccountType = "Bank" | "Wallet" | "Cash" | "Exchange";
export type TransactionDirection = "Income" | "Expense";

export interface AccountDto {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: Decimal;
  createdAt: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance?: number | string | Decimal;
}

export interface RegisterTransactionRequest {
  accountId: string;
  amount: number | string | Decimal;
  direction: TransactionDirection;
  categoryId?: string;
  occurredAt?: string;
  description?: string;
  appliedRate?: number | string | Decimal;
  rateSource?: string;
}

export interface RegisterTransferRequest {
  sourceAccountId: string;
  sourceAmount: number | string | Decimal;
  destinationAccountId: string;
  destinationAmount: number | string | Decimal;
  occurredAt?: string;
  appliedRate?: number | string | Decimal;
  rateSource?: string;
  description?: string;
}

export interface RateSnapshotDto {
  appliedRate: number;
  rateSource: string;
  fetchedAt: string;
  isStale: boolean;
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

export interface GetTransactionsFilter {
  accountId?: string;
  direction?: TransactionDirection;
  from?: string;
  to?: string;
  limit?: number;
}

export interface DraftDto {
  id: string;
  source: string;
  status: "Review" | "Pending" | "Confirmed" | "Discarded";
  direction: "Income" | "Expense";
  amount: Decimal;
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

export interface ConfirmDraftRequest {
  accountId: string;
  categoryId?: string;
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

export interface ImportStatementCsvRequest {
  accountId: string;
  fileName: string;
  csvContent: string;
  currency: string;
}

export interface StatementImportResult {
  importId: string;
  fileName: string;
  fileHash: string;
  isDuplicateFile: boolean;
  warning?: string;
  totalRows: number;
  draftsCreated: number;
  duplicatesLinked: number;
}

export interface SimulateLoanRequest {
  principal: number;
  rate: number;
  rateUnit?: "Monthly" | "Annual";
  dayCount?: "Thirty360" | "Actual365";
  frequency?: "Monthly" | "Biweekly" | "Weekly" | "Single";
  template: "NoInterest" | "FlatOnInitialCapital" | "SimpleOnBalance" | "FixedInstallment" | "InterestOnly" | "SinglePaymentCompound";
  totalInstallments: number;
  disbursementDate?: string;
  graceDays?: number;
  lateRate?: number;
}

export interface InstallmentScheduleDto {
  number: number;
  dueDate: string;
  principal: number;
  interest: number;
  total: number;
  balanceAfter: number;
}

export interface LoanScheduleDto {
  installments: InstallmentScheduleDto[];
  totalPrincipal: number;
  totalInterest: number;
  totalToPay: number;
  annualEffectiveRate: number;
}

export interface CreateLoanRequest {
  counterpartyName: string;
  type: "Lent" | "Borrowed";
  template: string;
  principal: number;
  currency: string;
  interestRate: number;
  rateUnit?: string;
  dayCount?: string;
  frequency?: string;
  totalInstallments: number;
  disbursementDate?: string;
  disbursementAccountId?: string;
  counterpartyNotes?: string;
  graceDays?: number;
  lateRate?: number;
}

export interface LoanSummaryDto {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  type: "Lent" | "Borrowed";
  template: string;
  status: string;
  principal: Decimal;
  currency: string;
  interestRate: number;
  annualEffectiveRate: number;
  remainingPrincipal: Decimal;
  disbursementDate: string;
  firstDueDate: string;
  totalInstallments: number;
  createdAt: string;
}

export interface PaymentAllocationDto {
  installmentId: string;
  installmentNumber: number;
  toLateInterest: number;
  toInterest: number;
  toPrincipal: number;
  remainingBalanceAfter: number;
}

export interface LoanDetailDto {
  summary: LoanSummaryDto;
  installments: {
    id: string;
    number: number;
    dueDate: string;
    expectedPrincipal: Decimal;
    expectedInterest: Decimal;
    expectedTotal: Decimal;
    paidPrincipal: Decimal;
    paidInterest: Decimal;
    paidLateInterest: Decimal;
    remainingPrincipal: Decimal;
    status: string;
  }[];
  payments: {
    id: string;
    amount: Decimal;
    currency: string;
    paymentDate: string;
    note?: string;
    allocations: PaymentAllocationDto[];
  }[];
}

export interface RegisterLoanPaymentRequest {
  amount: number;
  paymentDate?: string;
  accountId?: string;
  note?: string;
}

export interface LoanPaymentResultDto {
  paymentId: string;
  amountPaid: number;
  remainingPrincipal: number;
  loanStatus: string;
  allocations: PaymentAllocationDto[];
}

export interface CreateBudgetRequest {
  limitAmount: number;
  currency: string;
  categoryId?: string;
  alertThreshold?: number;
  period?: string;
}

export interface BudgetDto {
  id: string;
  categoryId?: string;
  period: string;
  limitAmount: number;
  currency: string;
  alertThreshold: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isAlertTriggered: boolean;
  isExceeded: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  currency: string;
  targetDate?: string;
  accountId?: string;
}

export interface GoalDto {
  id: string;
  accountId?: string;
  name: string;
  targetAmount: number;
  currency: string;
  targetDate?: string;
  currentAmount: number;
  remainingAmount: number;
  percentageAchieved: number;
  monthsRemaining?: number;
  monthlyContributionNeeded?: number;
  createdAt: string;
}

export interface BudgetSplit503020Dto {
  monthlyIncome: number;
  needsTarget: number;
  wantsTarget: number;
  savingsTarget: number;
}

export interface FinancialHealthDto {
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
  savingsRate: number;
  totalLiquidBalance: number;
  emergencyFundMonths: number;
  totalDebtLiabilities: number;
  split503020: BudgetSplit503020Dto;
}

export interface LinkWhatsAppRequest {
  phoneNumber: string;
}

export interface LinkWhatsAppResponse {
  linkId: string;
  phoneNumber: string;
  verificationCode: string;
  status: string;
  instructions: string;
}

export interface WhatsAppWebhookRequest {
  providerMessageId: string;
  fromNumber: string;
  messageText: string;
}

export interface WhatsAppWebhookResponse {
  processed: boolean;
  replyText?: string;
  actionTaken?: string;
}

export interface ConnectBinanceKeyRequest {
  apiKey: string;
  apiSecret: string;
  permitsTrading?: boolean;
  permitsWithdrawals?: boolean;
}

export interface ConnectBinanceKeyResponse {
  connected: boolean;
  status: string;
  message: string;
}

export interface SyncBinanceRequest {
  accountId: string;
}

export interface SyncBinanceResponse {
  draftsCreated: number;
  duplicatesLinked: number;
  status: string;
}

export interface ProposeIncomeDistributionRequest {
  incomeAmount: number;
  currency?: string;
}

export interface IncomeDistributionProposal {
  totalIncome: number;
  currency: string;
  needsAmount: number;
  wantsAmount: number;
  debtPaymentAmount: number;
  savingsAmount: number;
  needsPercentage: number;
  wantsPercentage: number;
  debtPercentage: number;
  savingsPercentage: number;
  rationale: string;
}

export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ApiProblemDetails,
    message?: string
  ) {
    super(message || problem.detail || problem.title || `API error ${status}`);
    this.name = "ApiError";
  }
}

export class BillefyApiClient {
  private readonly baseUrl: string;
  private readonly userId: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: { baseUrl?: string; userId: string; fetchFn?: typeof fetch }) {
    this.baseUrl = (options.baseUrl || "http://localhost:5000").replace(/\/$/, "");
    this.userId = options.userId;
    this.fetchFn = options.fetchFn || fetch;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    headers.set("X-User-Id", this.userId);

    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let problem: ApiProblemDetails = {};
      try {
        problem = await response.json();
      } catch {
        // Fallback if not JSON
      }
      throw new ApiError(response.status, problem);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json();
  }

  async getAccounts(): Promise<AccountDto[]> {
    interface RawAccountDto {
      id: string;
      name: string;
      type: AccountType;
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

  async createAccount(request: CreateAccountRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/accounts", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        initialBalance: request.initialBalance ? new Decimal(request.initialBalance).toNumber() : 0,
      }),
    });
  }

  async registerTransaction(request: RegisterTransactionRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>("/v1/transactions", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        amount: new Decimal(request.amount).toNumber(),
        appliedRate: request.appliedRate ? new Decimal(request.appliedRate).toNumber() : undefined,
      }),
    });
  }

  async registerTransfer(
    request: RegisterTransferRequest
  ): Promise<{ outflowId: string; inflowId: string }> {
    return this.request<{ outflowId: string; inflowId: string }>("/v1/transactions/transfers", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        sourceAmount: new Decimal(request.sourceAmount).toNumber(),
        destinationAmount: new Decimal(request.destinationAmount).toNumber(),
        appliedRate: request.appliedRate ? new Decimal(request.appliedRate).toNumber() : undefined,
      }),
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

  async getTransactions(filter: GetTransactionsFilter = {}): Promise<TransactionDto[]> {
    interface RawTxnDto {
      id: string;
      accountId: string;
      amount: number;
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

  async getDrafts(
    status?: "Pending" | "Review" | "Confirmed" | "Discarded",
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

  async reconcileAccount(
    accountId: string,
    req: ReconcileAccountRequest
  ): Promise<ReconciliationResult> {
    return this.request<ReconciliationResult>(`/v1/accounts/${accountId}/reconcile`, {
      method: "POST",
      body: JSON.stringify(req),
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

  async getLatestRate(currency: string, baseCurrency: string = "USD"): Promise<RateSnapshotDto> {
    const params = new URLSearchParams({ currency, baseCurrency });
    return this.request<RateSnapshotDto>(`/v1/rates/latest?${params.toString()}`);
  }
}
