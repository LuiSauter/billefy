import Decimal from "decimal.js";

export type LoanType = "Lent" | "Borrowed";
export type LoanTemplate =
  | "NoInterest"
  | "FlatOnInitialCapital"
  | "SimpleOnBalance"
  | "FixedInstallment"
  | "InterestOnly"
  | "SinglePaymentCompound";

export const LOAN_TEMPLATE_OPTIONS: { value: LoanTemplate; label: string }[] = [
  { value: "FixedInstallment", label: "Francés (Cuota Fija)" },
  { value: "SimpleOnBalance", label: "Alemán / Sobre Saldo (Capital Fijo)" },
  { value: "InterestOnly", label: "Americano (Interés Periódico)" },
  { value: "SinglePaymentCompound", label: "Bullet (Pago Único al Vencer)" },
  { value: "FlatOnInitialCapital", label: "Interés Fijo sobre Capital Inicial" },
  { value: "NoInterest", label: "Sin Interés (0%)" },
];

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

export interface ILendingRepository {
  simulateLoan(req: SimulateLoanRequest): Promise<LoanScheduleDto>;
  createLoan(req: CreateLoanRequest): Promise<{ id: string }>;
  getLoans(type?: LoanType, status?: string): Promise<LoanSummaryDto[]>;
  getLoanById(id: string): Promise<LoanDetailDto>;
  registerLoanPayment(loanId: string, req: RegisterLoanPaymentRequest): Promise<LoanPaymentResultDto>;
}
