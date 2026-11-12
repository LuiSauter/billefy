import { IHttpClient } from "@/shared/application/http-client.contract";
import { toDecimal } from "@/shared/domain/money";
import {
  CreateLoanRequest,
  ILendingRepository,
  LoanCancellationResultDto,
  LoanDetailDto,
  LoanInstallmentBalanceDto,
  LoanPaymentQuoteDto,
  LoanPaymentResultDto,
  LoanScheduleDto,
  LoanSummaryDto,
  LoanType,
  RegisterLoanPaymentRequest,
  SimulateLoanRequest,
} from "../domain/lending.types";

type RawMoney = number | string;
type RawLoanSummary = Omit<LoanSummaryDto, "principal" | "remainingPrincipal" | "totalPayoff" | "suggestedAmount"> & {
  principal: RawMoney;
  remainingPrincipal: RawMoney;
  totalPayoff?: RawMoney;
  suggestedAmount?: RawMoney | null;
};
type RawInstallmentBalance = Omit<LoanInstallmentBalanceDto, "outstandingPrincipal" | "outstandingRegularInterest" | "outstandingLateInterest" | "totalOutstanding"> & {
  outstandingPrincipal: RawMoney;
  outstandingRegularInterest: RawMoney;
  outstandingLateInterest: RawMoney;
  totalOutstanding: RawMoney;
};
function optionalDecimal(value: RawMoney | null | undefined) {
  return value == null ? value : toDecimal(value);
}
function mapSummary(raw: RawLoanSummary): LoanSummaryDto {
  return { ...raw, principal: toDecimal(raw.principal), remainingPrincipal: toDecimal(raw.remainingPrincipal),
    totalPayoff: raw.totalPayoff === undefined ? undefined : toDecimal(raw.totalPayoff),
    suggestedAmount: optionalDecimal(raw.suggestedAmount) };
}
function mapInstallmentBalance(raw: RawInstallmentBalance): LoanInstallmentBalanceDto {
  return { ...raw, outstandingPrincipal: toDecimal(raw.outstandingPrincipal),
    outstandingRegularInterest: toDecimal(raw.outstandingRegularInterest),
    outstandingLateInterest: toDecimal(raw.outstandingLateInterest), totalOutstanding: toDecimal(raw.totalOutstanding) };
}

export class LendingApiRepository implements ILendingRepository {
  constructor(private readonly http: IHttpClient) {}

  async simulateLoan(req: SimulateLoanRequest): Promise<LoanScheduleDto> {
    return this.http.post<LoanScheduleDto>("/v1/loans/simulate", req);
  }

  async createLoan(req: CreateLoanRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/loans", req);
  }

  async getLoans(type?: LoanType, status?: string): Promise<LoanSummaryDto[]> {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);

    const query = params.toString() ? `?${params.toString()}` : "";
    const raw = await this.http.get<RawLoanSummary[]>(`/v1/loans${query}`);

    return raw.map(mapSummary);
  }

  async getLoanById(id: string): Promise<LoanDetailDto> {
    interface RawLoanDetail {
      summary: RawLoanSummary;
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
        outstandingPrincipal?: RawMoney | null;
        outstandingInterest?: RawMoney | null;
        outstandingLateInterest?: RawMoney | null;
        totalOutstanding?: RawMoney | null;
        status: string;
      }[];
      payments: (Omit<LoanDetailDto["payments"][number], "amount" | "earlyPrincipalAmount" | "remainingBalanceAfter"> & {
        amount: RawMoney;
        earlyPrincipalAmount?: RawMoney | null;
        remainingBalanceAfter?: RawMoney | null;
      })[];
    }

    const raw = await this.http.get<RawLoanDetail>(`/v1/loans/${id}`);

    return {
      summary: mapSummary(raw.summary),
      installments: raw.installments.map((i) => ({
        ...i,
        expectedPrincipal: toDecimal(i.expectedPrincipal),
        expectedInterest: toDecimal(i.expectedInterest),
        expectedTotal: toDecimal(i.expectedTotal),
        paidPrincipal: toDecimal(i.paidPrincipal),
        paidInterest: toDecimal(i.paidInterest),
        paidLateInterest: toDecimal(i.paidLateInterest),
        remainingPrincipal: toDecimal(i.remainingPrincipal),
        outstandingPrincipal: optionalDecimal(i.outstandingPrincipal),
        outstandingInterest: optionalDecimal(i.outstandingInterest),
        outstandingLateInterest: optionalDecimal(i.outstandingLateInterest),
        totalOutstanding: optionalDecimal(i.totalOutstanding),
      })),
      payments: raw.payments.map((p) => ({
        ...p,
        amount: toDecimal(p.amount),
        earlyPrincipalAmount: optionalDecimal(p.earlyPrincipalAmount),
        remainingBalanceAfter: optionalDecimal(p.remainingBalanceAfter),
      })),
    };
  }

  async getPaymentQuote(loanId: string, paymentDate?: string, amount?: string | number): Promise<LoanPaymentQuoteDto> {
    type RawQuote = Omit<LoanPaymentQuoteDto, "totalPayoff" | "suggestedAmount" | "remainingPrincipal" | "installments" | "projectedInstallments" | "proposedEarlyPrincipalAmount" | "resultingPrincipal" | "historicalSnapshots"> & {
      totalPayoff: RawMoney;
      suggestedAmount: RawMoney | null;
      remainingPrincipal: RawMoney;
      installments: RawInstallmentBalance[];
      projectedInstallments: RawInstallmentBalance[];
      proposedEarlyPrincipalAmount: RawMoney;
      resultingPrincipal: RawMoney;
      historicalSnapshots: (Omit<LoanPaymentQuoteDto["historicalSnapshots"][number], "remainingTotal"> & { remainingTotal: RawMoney | null })[];
    };
    const params = new URLSearchParams();
    if (paymentDate !== undefined) params.set("paymentDate", paymentDate);
    if (amount !== undefined) params.set("amount", amount.toString());
    const query = params.size ? `?${params.toString()}` : "";
    const raw = await this.http.get<RawQuote>(`/v1/loans/${loanId}/quote${query}`);
    return {
      ...raw,
      totalPayoff: toDecimal(raw.totalPayoff),
      suggestedAmount: raw.suggestedAmount === null ? null : toDecimal(raw.suggestedAmount),
      remainingPrincipal: toDecimal(raw.remainingPrincipal),
      installments: raw.installments.map(mapInstallmentBalance),
      projectedInstallments: raw.projectedInstallments.map(mapInstallmentBalance),
      proposedEarlyPrincipalAmount: toDecimal(raw.proposedEarlyPrincipalAmount),
      resultingPrincipal: toDecimal(raw.resultingPrincipal),
      historicalSnapshots: raw.historicalSnapshots.map(snapshot => ({ ...snapshot,
        remainingTotal: snapshot.remainingTotal === null ? null : toDecimal(snapshot.remainingTotal) })),
    };
  }

  async cancelLoan(loanId: string): Promise<LoanCancellationResultDto> {
    return this.http.post<LoanCancellationResultDto>(`/v1/loans/${loanId}/cancel`);
  }

  async registerLoanPayment(
    loanId: string,
    req: RegisterLoanPaymentRequest
  ): Promise<LoanPaymentResultDto> {
    return this.http.post<LoanPaymentResultDto>(`/v1/loans/${loanId}/payments`, req);
  }
}
