import Decimal from "decimal.js";

export type AccountType = "Bank" | "Wallet" | "Cash" | "Exchange";
export type TransactionDirection = "Income" | "Expense";
export type DraftStatus = "Review" | "Pending" | "Confirmed" | "Discarded";
export type LoanType = "Lent" | "Borrowed";
export type LoanTemplate =
  | "NoInterest"
  | "FlatOnInitialCapital"
  | "SimpleOnBalance"
  | "FixedInstallment"
  | "InterestOnly"
  | "SinglePaymentCompound";

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
  amount: string;
  direction: TransactionDirection;
  categoryId?: string;
  occurredAt?: string;
  description?: string;
}

export interface RateSnapshotDto {
  appliedRate: number;
  rateSource: string;
  fetchedAt: string;
  isStale: boolean;
}

export interface DraftDto {
  id: string;
  source: string;
  status: DraftStatus;
  direction: TransactionDirection;
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
  template: LoanTemplate;
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
  type: LoanType;
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
  type: LoanType;
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

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  pictureUrl?: string;
  preferredCurrency: string;
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserDto;
}

export interface UserDataExportDto {
  user: UserDto;
  exportedAt: string;
  systemVersion: string;
}

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: string;
}

export interface DeviceRegistrationDto {
  id: string;
  platform: string;
  createdAt: string;
}

export interface NotificationLogDto {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  sentAt: string;
  status: string;
}

export interface ImportStatementPdfRequest {
  accountId: string;
  fileName: string;
  pdfTextContent: string;
  currency: string;
}
