import Decimal from "decimal.js";
import type { LoanDetailDto, LoanSummaryDto } from "./lending.types";

// Keep analytics independent of the application's global Decimal configuration.
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CATEGORIES = ["Hipoteca", "Tarjetas", "Personal", "Vehicular", "Otros"] as const;
const HEALTH_STATUSES = ["Al día", "Con atraso", "Parcial", "Pendiente"] as const;
export type LoanAnalyticsDetails = Record<string, LoanDetailDto> | LoanDetailDto[];
export type DebtCategory = (typeof CATEGORIES)[number];
export type LoanHealthStatus = (typeof HEALTH_STATUSES)[number];
export type DtiStatus = "Controlado" | "Atención" | "Crítico";

export interface UpcomingLoanPayment {
  loanId: string;
  name: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  currency: string;
  isEstimated: boolean;
}

export interface LendingInsight {
  id: string;
  text: string;
  type: "info" | "positive" | "warning";
}

export interface DebtMetrics {
  currency: string;
  totalDebt: number;
  monthlyPayment: number;
  /** Annual effective rate expressed as a percentage, not a fraction. */
  averageInterestRate: number;
  dtiRatio: number;
  dtiStatus: DtiStatus;
  distribution: { category: DebtCategory; total: number; percentage: number }[];
  paymentPriority: {
    id: string; rank: number; name: string; rate: number;
    monthlyPayment: number; remainingPrincipal: number;
  }[];
  amortizationProjection: { month: string; balance: number }[];
  upcomingPayments: UpcomingLoanPayment[];
  insights: LendingInsight[];
  hasEstimates: boolean;
}

export interface LentMetrics {
  currency: string;
  totalLent: number;
  /** Principal recovered; unlike payment cash flows, excludes interest. */
  totalCollected: number;
  collectedPercentage: number;
  totalPending: number;
  pendingPercentage: number;
  activeLoansCount: number;
  completedLoansCount: number;
  healthBreakdown: { status: LoanHealthStatus; count: number; percentage: number }[];
  /** Actual dated cash flows only. Collected includes interest; see collectionHistoryComplete. */
  monthlyEvolution: { month: string; lent: number; collected: number }[];
  upcomingCollections: UpcomingLoanPayment[];
  monthSummary: { collectedThisMonth: number; pendingThisMonth: number; overdueAmount: number };
  hasEstimates: boolean;
  /** False if any included loan lacks details; undated recoveries are never fabricated. */
  collectionHistoryComplete: boolean;
}

interface OutstandingInstallment {
  number: number;
  date: Date;
  principal: Decimal;
  interest: Decimal;
  total: Decimal;
}
interface Position {
  loan: LoanSummaryDto;
  detail?: LoanDetailDto;
  principal: Decimal;
  remaining: Decimal;
  installments: OutstandingInstallment[];
  monthly: Decimal;
}

function amount(value: Decimal.Value): Decimal {
  const result = new D(value);
  if (!result.isFinite() || result.isNegative()) throw new RangeError("Amounts and rates must be finite and non-negative.");
  return result;
}
function sum(values: Decimal[]): Decimal {
  return values.reduce((total, value) => total.plus(value), new D(0));
}
function output(value: Decimal): number {
  const result = value.toDecimalPlaces(2).toNumber();
  if (!Number.isFinite(result)) throw new RangeError("Analytics value exceeds the supported numeric range.");
  return result;
}
function percentage(part: Decimal, total: Decimal): number {
  return total.gt(0) ? output(part.div(total).times(100)) : 0;
}
function currencyCode(currency: string): string {
  return currency.trim().toUpperCase();
}
function converter(selectedCurrency: string, p2pRate?: number) {
  const normalize = (currency: string) => currencyCode(currency) === "USDT" ? "USD" : currencyCode(currency);
  const target = normalize(selectedCurrency);
  return (value: Decimal, fromCurrency: string): Decimal => {
    const from = normalize(fromCurrency);
    if (from === target || value.isZero()) return value;
    if (!((from === "BOB" && target === "USD") || (from === "USD" && target === "BOB"))) {
      throw new RangeError("Only BOB and USD/USDT cross-currency conversion is supported.");
    }
    if (p2pRate === undefined || !Number.isFinite(p2pRate) || p2pRate <= 0) {
      throw new RangeError("A finite positive BOB-per-USD P2P rate is required for conversion.");
    }
    return target === "BOB" ? value.times(new D(p2pRate)) : value.div(new D(p2pRate));
  };
}

function day(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && date.toISOString().slice(0, 10) !== value) return undefined;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function monthStart(date: Date, offset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}
function addMonths(date: Date, offset: number): Date {
  const start = monthStart(date, offset);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return start;
}
function inMonth(date: Date, start: Date): boolean {
  return date >= start && date < monthStart(start, 1);
}
function completed(loan: LoanSummaryDto): boolean {
  return loan.status === "Paid" || amount(loan.remainingPrincipal).isZero();
}

/**
 * Fallback preview only, never a replacement for server schedules. Summary DTOs
 * omit frequency, rate unit, day count, and early-payment policy. Assume monthly,
 * nominal annual interestRate as a FRACTION (0.24 = 24%, per the API), and allocate
 * recovered principal oldest-first. Dates anchor to firstDueDate without month-end
 * drift, or one month after disbursement. Invalid dates yield no invented dates.
 */
function estimateInstallments(loan: LoanSummaryDto): OutstandingInstallment[] {
  const principal = amount(loan.principal);
  const remaining = amount(loan.remainingPrincipal);
  if (remaining.isZero() || principal.isZero()) return [];
  const disbursed = day(loan.disbursementDate);
  const first = day(loan.firstDueDate) ?? (disbursed ? addMonths(disbursed, 1) : undefined);
  if (!first) return [];
  const n = Number.isSafeInteger(loan.totalInstallments) && loan.totalInstallments > 0 ? loan.totalInstallments : 1;
  const rate = loan.template === "NoInterest" ? new D(0) : amount(loan.interestRate).div(12);
  const fixedPrincipal = principal.div(n).toDecimalPlaces(2);
  const annuity = rate.isZero() ? fixedPrincipal
    : principal.times(rate).div(new D(1).minus(new D(1).plus(rate).pow(-n))).toDecimalPlaces(2);
  let scheduledBalance = principal;
  let recovered = D.max(0, principal.minus(remaining));
  const result: OutstandingInstallment[] = [];
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    let interest = scheduledBalance.times(rate).toDecimalPlaces(2);
    let portion = fixedPrincipal;
    switch (loan.template) {
      case "InterestOnly":
        portion = last ? scheduledBalance : new D(0);
        break;
      case "SinglePaymentCompound":
        if (!last) continue;
        interest = principal.times(new D(1).plus(rate).pow(n)).minus(principal).toDecimalPlaces(2);
        portion = scheduledBalance;
        break;
      case "FlatOnInitialCapital":
        interest = principal.times(rate).toDecimalPlaces(2);
        break;
      case "NoInterest":
      case "SimpleOnBalance":
        break;
      default:
        portion = D.max(0, annuity.minus(interest));
    }
    portion = last ? scheduledBalance : D.min(scheduledBalance, portion);
    scheduledBalance = D.max(0, scheduledBalance.minus(portion));
    const paid = D.min(recovered, portion);
    recovered = recovered.minus(paid);
    const unpaidPrincipal = portion.minus(paid);
    // For interest-only schedules principal cannot identify paid interest. Treat
    // those interest installments as outstanding until details are loaded.
    if (paid.eq(portion) && portion.gt(0)) continue;
    const total = unpaidPrincipal.plus(interest);
    if (total.gt(0)) result.push({ number: i + 1, date: addMonths(first, i), principal: unpaidPrincipal,
      interest, total });
  }
  return result;
}

function detailedInstallments(detail: LoanDetailDto): OutstandingInstallment[] {
  return detail.installments.flatMap((item) => {
    const date = day(item.dueDate);
    if (!date || item.status === "Paid" || item.status === "Forgiven") return [];
    const principal = item.outstandingPrincipal != null ? amount(item.outstandingPrincipal) : amount(item.remainingPrincipal);
    const regularInterest = item.outstandingInterest != null
      ? amount(item.outstandingInterest)
      : D.max(0, amount(item.expectedInterest).minus(amount(item.paidInterest)));
    const lateInterest = item.outstandingLateInterest != null ? amount(item.outstandingLateInterest) : new D(0);
    const interest = regularInterest.plus(lateInterest);
    const total = item.totalOutstanding != null
      ? amount(item.totalOutstanding)
      : D.max(0, amount(item.expectedTotal).minus(amount(item.paidPrincipal)).minus(amount(item.paidInterest)));
    return total.gt(0) ? [{ number: item.number, date, principal, interest, total }] : [];
  });
}

function positions(loans: LoanSummaryDto[], details: LoanAnalyticsDetails | undefined,
  convert: ReturnType<typeof converter>): Position[] {
  const index = new Map(Object.values(details ?? {}).map((item) => [item.summary.id, item]));
  return loans.map((loan) => {
    const detail = index.get(loan.id);
    // Card summaries carry opening principal, not the subsequently appended
    // purchase obligations. Only server details can supply their due schedule.
    const raw = completed(loan) ? [] : detail ? detailedInstallments(detail)
      : loan.loanKind === "CreditCard" ? [] : estimateInstallments(loan);
    const installments = raw.map((item) => ({ ...item,
      principal: convert(item.principal, loan.currency), interest: convert(item.interest, loan.currency),
      total: convert(item.total, loan.currency),
    })).sort((a, b) => a.date.getTime() - b.date.getTime() || a.number - b.number);
    // A schedule-derived monthly commitment: all unpaid installments in the next
    // unpaid calendar month (also handles weekly/biweekly detailed schedules).
    const nextMonth = installments[0] ? monthStart(installments[0].date) : undefined;
    return { loan, detail, principal: convert(amount(loan.principal), loan.currency),
      remaining: convert(amount(loan.remainingPrincipal), loan.currency), installments,
      monthly: sum(installments.filter((item) => nextMonth && inMonth(item.date, nextMonth)).map((item) => item.total)) };
  });
}
function upcoming(items: Position[], currency: string): UpcomingLoanPayment[] {
  return items.flatMap((position) => position.installments.map((item) => ({
    loanId: position.loan.id, name: position.loan.counterpartyName, installmentNumber: item.number,
    dueDate: item.date.toISOString().slice(0, 10), amount: output(item.total),
    principal: output(item.principal), interest: output(item.interest), currency,
    isEstimated: !position.detail,
  }))).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.loanId.localeCompare(b.loanId) || a.installmentNumber - b.installmentNumber);
}
function category(loan: LoanSummaryDto): DebtCategory {
  if (loan.loanKind === "CreditCard") return "Tarjetas";
  // Notes aren't exposed on LoanSummaryDto; recognize them if a caller carries
  // the creation DTO's optional notes without requiring a contract change.
  const notes = (loan as LoanSummaryDto & { counterpartyNotes?: string }).counterpartyNotes ?? "";
  const text = `${loan.counterpartyName} ${notes}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/hipotec|mortgage|vivienda|inmueble/.test(text)) return "Hipoteca";
  if (/tarjeta|card|visa|master/.test(text)) return "Tarjetas";
  if (/vehic|\bauto\b|automovil|carro|\bmoto\b/.test(text)) return "Vehicular";
  if (/personal|persona|prestamo|personal loan/.test(text)) return "Personal";
  return "Otros";
}

/**
 * Currency defaults to USD; p2pRate is BOB per USD. Missing/invalid required FX
 * throws rather than silently adding incompatible currencies. Financial math is
 * Decimal throughout; only presentation outputs are rounded to two decimals.
 * Projection starts at the end of the current UTC month; overdue principal is
 * assumed paid in that first month. No extra-payment or refinancing assumptions.
 */
export function calculateDebtMetrics(loans: LoanSummaryDto[], monthlyIncome: number,
  selectedCurrency = "USD", p2pRate?: number, details?: LoanAnalyticsDetails): DebtMetrics {
  const currency = currencyCode(selectedCurrency);
  const convert = converter(currency, p2pRate);
  const items = positions(loans.filter((loan) => loan.type === "Borrowed" && loan.status !== "Cancelled" && loan.status !== "Paid"), details, convert);
  const total = sum(items.map((item) => item.remaining));
  const monthly = sum(items.map((item) => item.monthly));
  const validIncome = Number.isFinite(monthlyIncome) && monthlyIncome > 0;
  // A positive commitment with no usable income is critical, not a false 0% DTI.
  const dti = validIncome ? monthly.div(new D(monthlyIncome)).times(100) : monthly.gt(0) ? new D(100) : new D(0);
  const dtiStatus: DtiStatus = dti.lt(30) ? "Controlado" : dti.lte(40) ? "Atención" : "Crítico";
  const priority = items.filter((item) => item.remaining.gt(0)).sort((a, b) =>
    amount(b.loan.annualEffectiveRate).comparedTo(amount(a.loan.annualEffectiveRate)) || a.loan.id.localeCompare(b.loan.id));
  const paymentPriority = priority.map((item, index) => ({ id: item.loan.id, rank: index + 1,
    name: item.loan.counterpartyName, rate: output(amount(item.loan.annualEffectiveRate).times(100)),
    monthlyPayment: output(item.monthly), remainingPrincipal: output(item.remaining) }));
  const today = day(new Date().toISOString())!;
  const amortizationProjection = Array.from({ length: 12 }, (_, index) => {
    const start = monthStart(today, index);
    const end = monthStart(start, 1);
    const balance = sum(items.map((item) => D.max(0, item.remaining.minus(sum(
      item.installments.filter((installment) => installment.date < end).map((installment) => installment.principal),
    )))));
    return { month: MONTHS[start.getUTCMonth()], balance: output(balance) };
  });
  const insights: LendingInsight[] = [];
  if (total.isZero()) {
    insights.push({ id: "no-debt", type: "positive", text: "No tienes deudas pendientes. Mantén un fondo de emergencia." });
  } else {
    if (paymentPriority[0]?.rate > 0) insights.push({ id: "avalanche", type: "info",
      text: `Prioriza abonos extra a ${paymentPriority[0].name} (${paymentPriority[0].rate}% anual) y cubre los mínimos del resto.` });
    insights.push({ id: "dti", type: dtiStatus === "Controlado" ? "positive" : "warning",
      text: !validIncome ? "Registra tus ingresos mensuales para evaluar tu capacidad de pago."
        : dtiStatus === "Controlado" ? "Tu DTI está controlado. Conserva margen para imprevistos."
          : `Tu DTI es ${output(dti)}%. Reduce compromisos antes de asumir otra deuda.` });
    insights.push({ id: "automation", type: "info", text: "Programa recordatorios o automatiza pagos para evitar atrasos e intereses de mora." });
  }
  return { currency, totalDebt: output(total), monthlyPayment: output(monthly),
    averageInterestRate: total.gt(0) ? output(sum(items.map((item) =>
      item.remaining.times(amount(item.loan.annualEffectiveRate)))).div(total).times(100)) : 0,
    dtiRatio: output(dti), dtiStatus,
    distribution: CATEGORIES.map((name) => {
      const value = sum(items.filter((item) => category(item.loan) === name).map((item) => item.remaining));
      return { category: name, total: output(value), percentage: percentage(value, total) };
    }),
    paymentPriority, amortizationProjection, upcomingPayments: upcoming(items, currency), insights,
    hasEstimates: items.some((item) => !item.detail),
  };
}

function health(item: Position, today: Date): LoanHealthStatus {
  if (completed(item.loan)) return "Al día";
  if (item.loan.status === "InArrears" || (item.detail && item.installments.some((installment) => installment.date < today))) return "Con atraso";
  if (item.remaining.gt(0) && item.remaining.lt(item.principal)) return "Parcial";
  return item.loan.status === "Active" ? "Al día" : "Pendiente";
}

/**
 * Summary totals measure principal. History and collectedThisMonth measure actual
 * cash received, including interest, converted using each payment's currency.
 * Missing details produce schedule estimates but NO invented collection dates;
 * collectionHistoryComplete tells callers to label partial history accordingly.
 * pendingThisMonth includes all unpaid dues this month; overdueAmount includes
 * every unpaid due before today, so these figures may overlap within this month.
 */
export function calculateLentMetrics(loans: LoanSummaryDto[], selectedCurrency = "USD",
  p2pRate?: number, details?: LoanAnalyticsDetails): LentMetrics {
  const currency = currencyCode(selectedCurrency);
  const convert = converter(currency, p2pRate);
  const items = positions(loans.filter((loan) => loan.type === "Lent" && loan.status !== "Cancelled"), details, convert);
  const total = sum(items.map((item) => item.principal));
  const pending = sum(items.map((item) => item.remaining));
  const collected = sum(items.map((item) => D.max(0, item.principal.minus(item.remaining))));
  const today = day(new Date().toISOString())!;
  const start = monthStart(today);
  const payments = items.flatMap((item) => (item.detail?.payments ?? []).flatMap((payment) => {
    const date = day(payment.paymentDate);
    return date && date <= today ? [{ date, amount: convert(amount(payment.amount), payment.currency) }] : [];
  }));
  const monthlyEvolution = Array.from({ length: 6 }, (_, index) => {
    const month = monthStart(today, index - 5);
    return { month: MONTHS[month.getUTCMonth()],
      lent: output(sum(items.filter((item) => {
        const disbursed = day(item.loan.disbursementDate);
        return disbursed && disbursed <= today && inMonth(disbursed, month);
      }).map((item) => item.principal))),
      collected: output(sum(payments.filter((payment) => inMonth(payment.date, month)).map((payment) => payment.amount))),
    };
  });
  const installments = items.flatMap((item) => item.installments);
  return { currency, totalLent: output(total), totalCollected: output(collected),
    collectedPercentage: percentage(collected, total), totalPending: output(pending), pendingPercentage: percentage(pending, total),
    activeLoansCount: items.filter((item) => !completed(item.loan)).length,
    completedLoansCount: items.filter((item) => completed(item.loan)).length,
    healthBreakdown: HEALTH_STATUSES.map((status) => {
      const count = items.filter((item) => health(item, today) === status).length;
      return { status, count, percentage: percentage(new D(count), new D(items.length)) };
    }),
    monthlyEvolution, upcomingCollections: upcoming(items, currency),
    monthSummary: {
      collectedThisMonth: monthlyEvolution[5].collected,
      pendingThisMonth: output(sum(installments.filter((item) => inMonth(item.date, start)).map((item) => item.total))),
      overdueAmount: output(sum(installments.filter((item) => item.date < today).map((item) => item.total))),
    },
    hasEstimates: items.some((item) => !item.detail),
    collectionHistoryComplete: items.every((item) => Boolean(item.detail)),
  };
}
