import Decimal from "decimal.js";

export type LoanType = "Lent" | "Borrowed";
export type LoanTemplate =
  | "NoInterest"
  | "FlatOnInitialCapital"
  | "SimpleOnBalance"
  | "FixedInstallment"
  | "InterestOnly"
  | "SinglePaymentCompound";

export type EarlyPaymentPolicy =
  | "AdvanceInstallments"
  | "ReduceInstallment"
  | "ReduceTerm";

export const EARLY_PAYMENT_POLICY_OPTIONS: {
  value: EarlyPaymentPolicy;
  label: string;
  description: string;
}[] = [
  {
    value: "AdvanceInstallments",
    label: "Adelantar cuotas futuras",
    description: "El excedente cubre las próximas cuotas pactadas sin alterar el cronograma original.",
  },
  {
    value: "ReduceInstallment",
    label: "Abonar a capital (reducir cuota)",
    description: "El excedente reduce el capital y recalcula cuotas mensuales más bajas manteniendo el plazo.",
  },
  {
    value: "ReduceTerm",
    label: "Abonar a capital (reducir plazo)",
    description: "El excedente reduce el capital manteniendo el monto de cuota y acortando el plazo.",
  },
];

export function getCompatibleEarlyPaymentPolicies(template: LoanTemplate): typeof EARLY_PAYMENT_POLICY_OPTIONS {
  switch (template) {
    case "FixedInstallment":
    case "SimpleOnBalance":
    case "NoInterest":
      return EARLY_PAYMENT_POLICY_OPTIONS;
    case "InterestOnly":
      return EARLY_PAYMENT_POLICY_OPTIONS.filter((o) => o.value !== "ReduceTerm");
    case "FlatOnInitialCapital":
    case "SinglePaymentCompound":
    default:
      return EARLY_PAYMENT_POLICY_OPTIONS.filter((o) => o.value === "AdvanceInstallments");
  }
}

export const LOAN_TEMPLATE_OPTIONS: { value: LoanTemplate; label: string }[] = [
  { value: "FixedInstallment", label: "Francés (Cuota Fija)" },
  { value: "SimpleOnBalance", label: "Alemán / Sobre Saldo (Capital Fijo)" },
  { value: "InterestOnly", label: "Americano (Interés Periódico)" },
  { value: "SinglePaymentCompound", label: "Bullet (Pago Único al Vencer)" },
  { value: "FlatOnInitialCapital", label: "Interés Fijo sobre Capital Inicial" },
  { value: "NoInterest", label: "Sin Interés (0%)" },
];

export interface SimulateLoanRequest {
  principal: string | number;
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
  principal: string | number;
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
  earlyPaymentPolicy?: EarlyPaymentPolicy | string;
  originationKind?: "CashDisbursement" | "OpeningBalance";
  loanKind?: "Loan" | "CreditCard";
  idempotencyKey?: string;
}

export interface LoanCancellationEligibilityDto {
  canCancel: boolean;
  reasonCode: string | null;
}

export interface LoanCancellationResultDto {
  status: "Cancelled";
  reversalTransactionId: string | null;
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
  cancellationEligibility?: LoanCancellationEligibilityDto;
  originationKind?: "CashDisbursement" | "OpeningBalance" | null;
  loanKind?: "Loan" | "CreditCard" | null;
  earlyPaymentPolicy?: EarlyPaymentPolicy | string;
  lateRate?: number | null;
  graceDays?: number;
  totalPayoff?: Decimal;
  suggestedAmount?: Decimal | null;
}

export interface PaymentAllocationDto {
  installmentId: string;
  installmentNumber: number;
  toLateInterest: number;
  toInterest: number;
  toPrincipal: number;
  remainingBalanceAfter: number;
}

export interface LoanInstallmentBalanceDto {
  installmentId: string;
  number: number;
  dueDate: string;
  outstandingPrincipal: Decimal;
  outstandingRegularInterest: Decimal;
  outstandingLateInterest: Decimal;
  totalOutstanding: Decimal;
}

export interface LoanHistoricalSnapshotDto {
  paymentDate: string;
  createdAt: string;
  recordSequence: number | null;
  remainingTotal: Decimal | null;
  isAmbiguous: boolean;
  paymentId: string | null;
}

export interface LoanPaymentQuoteDto {
  loanId: string;
  currency: string;
  asOfDate: string;
  totalPayoff: Decimal;
  suggestedAmount: Decimal | null;
  remainingPrincipal: Decimal;
  loanStatus: string;
  earlyPaymentPolicy: EarlyPaymentPolicy | string;
  installments: LoanInstallmentBalanceDto[];
  projectedInstallments: LoanInstallmentBalanceDto[];
  proposedAllocations: PaymentAllocationDto[];
  proposedEarlyPrincipalAmount: Decimal;
  proposedEarlyPrincipalEffectiveDate: string | null;
  resultingPrincipal: Decimal;
  resultingState: string;
  historicalSnapshots: LoanHistoricalSnapshotDto[];
}

export interface LoanDetailDto {
  summary: LoanSummaryDto;
  purchases?: CardPurchaseDto[];
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
    outstandingPrincipal?: Decimal | null;
    outstandingInterest?: Decimal | null;
    outstandingLateInterest?: Decimal | null;
    totalOutstanding?: Decimal | null;
    status: string;
  }[];
  payments: {
    id: string;
    amount: Decimal;
    currency: string;
    paymentDate: string;
    note?: string;
    allocations: PaymentAllocationDto[];
    recordSequence?: number | null;
    calculationVersion?: number | null;
    earlyPrincipalAmount?: Decimal | null;
    earlyPrincipalEffectiveDate?: string | null;
    remainingBalanceAfter?: Decimal | null;
    isAmbiguous?: boolean;
  }[];
}

export interface RegisterLoanPaymentRequest {
  amount: string | number;
  paymentDate?: string;
  accountId?: string;
  note?: string;
  interestCategoryId?: string;
  idempotencyKey?: string;
}

export interface RegisterCardPurchaseRequest {
  amount: string;
  currency: string;
  categoryId?: string;
  occurredAt: string;
  description?: string;
  idempotencyKey?: string;
}
export interface CardPurchaseDto {
  id: string; amount: Decimal; currency: string; categoryId?: string; occurredAt: string;
  description?: string; ledgerTransactionId: string;
}

export interface LoanPaymentResultDto {
  paymentId: string;
  amountPaid: number;
  remainingPrincipal: number;
  loanStatus: string;
  allocations: PaymentAllocationDto[];
}

export interface ILendingRepository {
  simulateLoan(req: SimulateLoanRequest): Promise<LoanScheduleDto>;
  createLoan(req: CreateLoanRequest): Promise<{ id: string }>;
  getLoans(type?: LoanType, status?: string): Promise<LoanSummaryDto[]>;
  getLoanById(id: string): Promise<LoanDetailDto>;
  getPaymentQuote(loanId: string, paymentDate?: string, amount?: string | number): Promise<LoanPaymentQuoteDto>;
  registerLoanPayment(loanId: string, req: RegisterLoanPaymentRequest): Promise<LoanPaymentResultDto>;
  cancelLoan(loanId: string): Promise<LoanCancellationResultDto>;
  registerCardPurchase(loanId: string, req: RegisterCardPurchaseRequest): Promise<{ id: string }>;
}
