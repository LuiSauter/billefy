import { IHttpClient } from "@/shared/application/http-client.contract";
import { toDecimal } from "@/shared/domain/money";
import {
  CreateLoanRequest,
  ILendingRepository,
  LoanDetailDto,
  LoanPaymentResultDto,
  LoanScheduleDto,
  LoanSummaryDto,
  LoanType,
  PaymentAllocationDto,
  RegisterLoanPaymentRequest,
  SimulateLoanRequest,
} from "../domain/lending.types";

export class LendingApiRepository implements ILendingRepository {
  constructor(private readonly http: IHttpClient) {}

  async simulateLoan(req: SimulateLoanRequest): Promise<LoanScheduleDto> {
    return this.http.post<LoanScheduleDto>("/v1/loans/simulate", req);
  }

  async createLoan(req: CreateLoanRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/loans", req);
  }

  async getLoans(type?: LoanType, status?: string): Promise<LoanSummaryDto[]> {
    interface RawLoanSummary {
      id: string;
      counterpartyId: string;
      counterpartyName: string;
      type: LoanType;
      template: string;
      status: string;
      principal: number | string;
      currency: string;
      interestRate: number;
      annualEffectiveRate: number;
      remainingPrincipal: number | string;
      disbursementDate: string;
      firstDueDate: string;
      totalInstallments: number;
      createdAt: string;
    }

    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);

    const query = params.toString() ? `?${params.toString()}` : "";
    const raw = await this.http.get<RawLoanSummary[]>(`/v1/loans${query}`);

    return raw.map((l) => ({
      ...l,
      principal: toDecimal(l.principal),
      remainingPrincipal: toDecimal(l.remainingPrincipal),
    }));
  }

  async getLoanById(id: string): Promise<LoanDetailDto> {
    interface RawLoanDetail {
      summary: {
        id: string;
        counterpartyId: string;
        counterpartyName: string;
        type: LoanType;
        template: string;
        status: string;
        principal: number | string;
        currency: string;
        interestRate: number;
        annualEffectiveRate: number;
        remainingPrincipal: number | string;
        disbursementDate: string;
        firstDueDate: string;
        totalInstallments: number;
        createdAt: string;
      };
      installments: {
        id: string;
        number: number;
        dueDate: string;
        expectedPrincipal: number | string;
        expectedInterest: number | string;
        expectedTotal: number | string;
        paidPrincipal: number | string;
        paidInterest: number | string;
        paidLateInterest: number | string;
        remainingPrincipal: number | string;
        status: string;
      }[];
      payments: {
        id: string;
        amount: number | string;
        currency: string;
        paymentDate: string;
        note?: string;
        allocations: PaymentAllocationDto[];
      }[];
    }

    const raw = await this.http.get<RawLoanDetail>(`/v1/loans/${id}`);

    return {
      summary: {
        ...raw.summary,
        principal: toDecimal(raw.summary.principal),
        remainingPrincipal: toDecimal(raw.summary.remainingPrincipal),
      },
      installments: raw.installments.map((i) => ({
        ...i,
        expectedPrincipal: toDecimal(i.expectedPrincipal),
        expectedInterest: toDecimal(i.expectedInterest),
        expectedTotal: toDecimal(i.expectedTotal),
        paidPrincipal: toDecimal(i.paidPrincipal),
        paidInterest: toDecimal(i.paidInterest),
        paidLateInterest: toDecimal(i.paidLateInterest),
        remainingPrincipal: toDecimal(i.remainingPrincipal),
      })),
      payments: raw.payments.map((p) => ({
        ...p,
        amount: toDecimal(p.amount),
      })),
    };
  }

  async registerLoanPayment(
    loanId: string,
    req: RegisterLoanPaymentRequest
  ): Promise<LoanPaymentResultDto> {
    return this.http.post<LoanPaymentResultDto>(`/v1/loans/${loanId}/payments`, req);
  }
}
