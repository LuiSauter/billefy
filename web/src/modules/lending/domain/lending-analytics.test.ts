import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateDebtMetrics, calculateLentMetrics } from "./lending-analytics";
import type { LoanDetailDto, LoanSummaryDto } from "./lending.types";

const d = (value: Decimal.Value) => new Decimal(value);
const loan = (overrides: Partial<LoanSummaryDto> = {}): LoanSummaryDto => ({
  id: "loan-1", counterpartyId: "person-1", counterpartyName: "Personal",
  type: "Borrowed", template: "NoInterest", status: "Active",
  principal: d(1200), remainingPrincipal: d(1200), currency: "USD",
  interestRate: 0, annualEffectiveRate: 0, totalInstallments: 12,
  disbursementDate: "2026-06-01", firstDueDate: "2026-07-01", createdAt: "2026-06-01",
  ...overrides,
});
const installment = (
  overrides: Partial<LoanDetailDto["installments"][number]> = {},
): LoanDetailDto["installments"][number] => ({
  id: "installment-1", number: 1, dueDate: "2026-06-20",
  expectedPrincipal: d(100), expectedInterest: d(10), expectedTotal: d(110),
  paidPrincipal: d(0), paidInterest: d(0), paidLateInterest: d(0),
  remainingPrincipal: d(100), status: "Pending", ...overrides,
});
const detail = (
  summary: LoanSummaryDto, installments: LoanDetailDto["installments"] = [],
  payments: LoanDetailDto["payments"] = [],
): LoanDetailDto => ({ summary, installments, payments });
const payment = (
  overrides: Partial<LoanDetailDto["payments"][number]> = {},
): LoanDetailDto["payments"][number] => ({
  id: "payment-1", amount: d(100), currency: "USD", paymentDate: "2026-06-10",
  allocations: [], ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("debt analytics", () => {
  it("returns finite empty metrics and a twelve-month zero projection", () => {
    const result = calculateDebtMetrics([], 0);
    expect(result).toMatchObject({ totalDebt: 0, monthlyPayment: 0, averageInterestRate: 0,
      dtiRatio: 0, dtiStatus: "Controlado", upcomingPayments: [], paymentPriority: [] });
    expect(result.distribution.every((item) => item.total === 0 && item.percentage === 0)).toBe(true);
    expect(result.amortizationProjection).toHaveLength(12);
    expect(result.amortizationProjection.every((point) => point.balance === 0)).toBe(true);
    expect(result.insights.map((item) => item.id)).toContain("no-debt");
  });

  it("excludes lent, cancelled, and paid loans, without mutating input", () => {
    const loans = [loan(), loan({ id: "lent", type: "Lent" }),
      loan({ id: "cancelled", status: "Cancelled" }), loan({ id: "paid", status: "Paid" })];
    const snapshot = JSON.stringify(loans);
    const result = calculateDebtMetrics(loans, 1000, "USD");
    expect(result.totalDebt).toBe(1200);
    expect(result.monthlyPayment).toBe(100);
    expect(result.dtiRatio).toBe(10);
    expect(result.paymentPriority).toHaveLength(1);
    expect(JSON.stringify(loans)).toBe(snapshot);
  });

  it("weights annual percentage rates by converted remaining principal and ranks avalanche priority", () => {
    const loans = [loan({ id: "low", principal: d(1000), remainingPrincipal: d(500), annualEffectiveRate: 0.1 }),
      loan({ id: "high", counterpartyName: "Tarjeta Visa", principal: d(1000),
        remainingPrincipal: d(1000), annualEffectiveRate: 0.4 })];
    const result = calculateDebtMetrics(loans, 1000);
    expect(result.averageInterestRate).toBe(30);
    expect(result.paymentPriority.map((item) => item.id)).toEqual(["high", "low"]);
    expect(result.paymentPriority[0]).toMatchObject({ rank: 1, name: "Tarjeta Visa", rate: 40,
      remainingPrincipal: 1000, monthlyPayment: 83.33 });
    expect(result.insights.find((item) => item.id === "avalanche")?.text).toContain("Tarjeta Visa");
    expect(result.insights.map((item) => item.id)).toContain("automation");
  });

  it.each([[29, "Controlado"], [30, "Atención"], [40, "Atención"], [41, "Crítico"]])(
    "classifies DTI %s as %s", (paymentAmount, status) => {
      const result = calculateDebtMetrics([loan({ principal: d(paymentAmount),
        remainingPrincipal: d(paymentAmount), totalInstallments: 1 })], 100);
      expect(result.dtiRatio).toBe(paymentAmount);
      expect(result.dtiStatus).toBe(status);
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("safely handles invalid income %s", (income) => {
    const result = calculateDebtMetrics([loan()], income);
    expect(result.dtiRatio).toBe(100);
    expect(result.dtiStatus).toBe("Crítico");
    expect(result.insights.find((item) => item.id === "dti")?.text).toContain("ingresos");
  });

  it("infers all categories from names and falls back to Otros", () => {
    const names = ["Crédito hipotecario", "Mastercard", "Préstamo personal", "Vehículo", "Sin categoría"];
    const result = calculateDebtMetrics(names.map((counterpartyName, i) => loan({ id: String(i), counterpartyName })), 1000);
    expect(result.distribution.map((item) => item.category)).toEqual(["Hipoteca", "Tarjetas", "Personal", "Vehicular", "Otros"]);
    for (const item of result.distribution) expect(item).toMatchObject({ total: 1200, percentage: 20 });
  });

  it("estimates monthly annuities with fractional annual nominal rates", () => {
    const result = calculateDebtMetrics([loan({ template: "FixedInstallment", principal: d(1000),
      remainingPrincipal: d(1000), interestRate: 0.24 })], 1000);
    expect(result.monthlyPayment).toBe(94.56);
    expect(result.hasEstimates).toBe(true);
    expect(result.upcomingPayments[0]).toMatchObject({ amount: 94.56, dueDate: "2026-07-01", isEstimated: true });
    expect(result.amortizationProjection[0]).toEqual({ month: "Jun", balance: 1000 });
    expect(result.amortizationProjection[1].balance).toBe(925.44);
    expect(result.amortizationProjection.every((point, i, all) => point.balance >= 0 &&
      (i === 0 || point.balance <= all[i - 1].balance))).toBe(true);
  });

  it("absorbs rounding in the final no-interest installment and clamps projections to zero", () => {
    const result = calculateDebtMetrics([loan({ principal: d(1000), remainingPrincipal: d(1000),
      totalInstallments: 3, firstDueDate: "2026-06-20" })], 1000);
    expect(result.monthlyPayment).toBe(333.33);
    expect(result.amortizationProjection.slice(0, 4).map((point) => point.balance)).toEqual([666.67, 333.34, 0, 0]);
  });

  it("keeps interest-only principal until maturity and supports flat and German estimates", () => {
    const base = { principal: d(1000), remainingPrincipal: d(1000), interestRate: 0.36,
      totalInstallments: 3, firstDueDate: "2026-06-20" };
    const interestOnly = calculateDebtMetrics([loan({ ...base, template: "InterestOnly" })], 1000);
    expect(interestOnly.monthlyPayment).toBe(30);
    expect(interestOnly.amortizationProjection.slice(0, 3).map((point) => point.balance)).toEqual([1000, 1000, 0]);
    expect(calculateDebtMetrics([loan({ ...base, template: "FlatOnInitialCapital" })], 1000).monthlyPayment).toBe(363.33);
    expect(calculateDebtMetrics([loan({ ...base, template: "SimpleOnBalance" })], 1000).monthlyPayment).toBe(363.33);
  });

  it("uses detailed unpaid installments, including partial interest, and sorts due dates", () => {
    const a = loan({ id: "a", remainingPrincipal: d(150), interestRate: 0.99 });
    const b = loan({ id: "b", remainingPrincipal: d(50) });
    const details = [detail(a, [
      installment({ id: "paid", status: "Paid", dueDate: "2026-05-01", paidPrincipal: d(100), paidInterest: d(10), remainingPrincipal: d(0) }),
      installment({ id: "partial", paidPrincipal: d(50), remainingPrincipal: d(50), paidInterest: d(4), status: "PartiallyPaid" }),
      installment({ id: "later", number: 3, dueDate: "2026-07-20" }),
    ]), detail(b, [installment({ dueDate: "2026-06-16", expectedPrincipal: d(50),
      remainingPrincipal: d(50), expectedTotal: d(60) })])];
    const result = calculateDebtMetrics([a, b], 1000, "USD", undefined, details);
    expect(result.monthlyPayment).toBe(116);
    expect(result.upcomingPayments.map((item) => item.loanId)).toEqual(["b", "a", "a"]);
    expect(result.upcomingPayments[1]).toMatchObject({ amount: 56, principal: 50, interest: 6, isEstimated: false });
    expect(result.amortizationProjection.slice(0, 2).map((point) => point.balance)).toEqual([100, 0]);
    expect(result.hasEstimates).toBe(false);
  });

  it("does not estimate missing installments when an explicitly loaded detail is empty", () => {
    const summary = loan();
    const result = calculateDebtMetrics([summary], 1000, "USD", undefined, { [summary.id]: detail(summary) });
    expect(result.upcomingPayments).toEqual([]);
    expect(result.monthlyPayment).toBe(0);
    expect(result.hasEstimates).toBe(false);
    expect(result.amortizationProjection.every((point) => point.balance === 1200)).toBe(true);
  });

  it("anchors estimated dates to month-end without drift and skips already repaid principal", () => {
    const result = calculateDebtMetrics([loan({ principal: d(300), remainingPrincipal: d(200),
      totalInstallments: 3, firstDueDate: "2026-01-31" })], 1000);
    expect(result.upcomingPayments.map((item) => item.dueDate)).toEqual(["2026-02-28", "2026-03-31"]);
    expect(result.amortizationProjection[0].balance).toBe(0);
  });

  it("estimates bullet payments at maturity rather than amortizing principal early", () => {
    const result = calculateDebtMetrics([loan({ template: "SinglePaymentCompound", principal: d(1000),
      remainingPrincipal: d(1000), interestRate: 0.36, totalInstallments: 3,
      firstDueDate: "2026-06-20" })], 1000);
    expect(result.upcomingPayments).toHaveLength(1);
    expect(result.upcomingPayments[0]).toMatchObject({ dueDate: "2026-08-20", amount: 1092.73 });
    expect(result.amortizationProjection.slice(0, 3).map((point) => point.balance)).toEqual([1000, 1000, 0]);
  });

  it("does not expose zero-value estimated installments for sub-cent principal portions", () => {
    const result = calculateDebtMetrics([loan({ principal: d("0.01"), remainingPrincipal: d("0.01"),
      totalInstallments: 3, firstDueDate: "2026-06-20" })], 1000);
    expect(result.upcomingPayments).toHaveLength(1);
    expect(result.upcomingPayments[0]).toMatchObject({ amount: 0.01, dueDate: "2026-08-20" });
  });

  it("falls back to disbursement date and handles zero balance and invalid installment counts", () => {
    const result = calculateDebtMetrics([loan({ firstDueDate: "", totalInstallments: 0 }),
      loan({ id: "zero", remainingPrincipal: d(0) })], 1000);
    expect(result.upcomingPayments).toHaveLength(1);
    expect(result.upcomingPayments[0]).toMatchObject({ dueDate: "2026-07-01", amount: 1200 });
    expect(result.paymentPriority.map((item) => item.id)).toEqual(["loan-1"]);
  });
});

describe("currency conversion and decimal safety", () => {
  const mixed = () => [loan({ id: "bob", currency: "BOB", principal: d(1000), remainingPrincipal: d(500),
    annualEffectiveRate: 0.1 }), loan({ id: "usd", principal: d(200), remainingPrincipal: d(100), annualEffectiveRate: 0.4 })];

  it("converts both directions before aggregating and weighting", () => {
    const usd = calculateDebtMetrics(mixed(), 1000, "USD", 10);
    const bob = calculateDebtMetrics(mixed(), 10000, "BOB", 10);
    expect(usd.totalDebt).toBe(150);
    expect(bob.totalDebt).toBe(1500);
    expect(usd.averageInterestRate).toBe(30);
    expect(bob.averageInterestRate).toBe(30);
    const lent = calculateLentMetrics(mixed().map((item) => ({ ...item, type: "Lent" })), "USD", 10);
    expect(lent).toMatchObject({ totalLent: 300, totalCollected: 150, totalPending: 150,
      collectedPercentage: 50, pendingPercentage: 50 });
  });

  it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects unusable required FX rate %s", (rate) => {
    expect(() => calculateDebtMetrics(mixed(), 1000, "USD", rate)).toThrow(RangeError);
    expect(() => calculateLentMetrics([loan({ type: "Lent", currency: "BOB" })], "USD", rate)).toThrow(RangeError);
  });

  it("does not require a rate for same-currency or USD/USDT amounts", () => {
    expect(calculateDebtMetrics([loan()], 1000, "usd", 0).totalDebt).toBe(1200);
    expect(calculateDebtMetrics([loan({ currency: "USDT" })], 1000, "USD").totalDebt).toBe(1200);
    expect(() => calculateDebtMetrics([loan({ currency: "EUR" })], 1000, "USD", 10)).toThrow(RangeError);
  });

  it("keeps calculations independent of global Decimal precision and rounding", () => {
    const { precision, rounding } = Decimal;
    try {
      Decimal.set({ precision: 4, rounding: Decimal.ROUND_DOWN });
      const result = calculateLentMetrics([loan({ type: "Lent", principal: d("100000.75"),
        remainingPrincipal: d("99900.50") })]);
      expect(result.totalCollected).toBe(100.25);
      expect(result.totalPending).toBe(99900.5);
      expect(Decimal.precision).toBe(4);
      expect(Decimal.rounding).toBe(Decimal.ROUND_DOWN);
    } finally {
      Decimal.set({ precision, rounding });
    }
  });

  it("converts detailed installment totals and projected principal in the loan currency", () => {
    const summary = loan({ currency: "BOB", remainingPrincipal: d(1000) });
    const result = calculateDebtMetrics([summary], 1000, "USD", 10, [detail(summary, [
      installment({ expectedPrincipal: d(1000), remainingPrincipal: d(1000),
        expectedInterest: d(100), expectedTotal: d(1100) }),
    ])]);
    expect(result.monthlyPayment).toBe(110);
    expect(result.upcomingPayments[0]).toMatchObject({ amount: 110, principal: 100, interest: 10, currency: "USD" });
    expect(result.amortizationProjection[0].balance).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])("rejects invalid monetary inputs %s", (value) => {
    expect(() => calculateDebtMetrics([loan({ remainingPrincipal: d(value) })], 1000)).toThrow(RangeError);
  });

  it("adds decimal amounts without floating-point artifacts or premature FX rounding", () => {
    expect(calculateDebtMetrics([loan({ remainingPrincipal: d("0.1") }),
      loan({ id: "b", remainingPrincipal: d("0.2") })], 1).totalDebt).toBe(0.3);
    const thirds = [1, 2, 3].map((i) => loan({ id: String(i), currency: "BOB", remainingPrincipal: d(1) }));
    expect(calculateDebtMetrics(thirds, 1, "USD", 3).totalDebt).toBe(1);
  });
});

describe("lent analytics", () => {
  it("returns safe empty totals, breakdown, and six chronological months", () => {
    const result = calculateLentMetrics([]);
    expect(result).toMatchObject({ totalLent: 0, totalCollected: 0, collectedPercentage: 0,
      totalPending: 0, pendingPercentage: 0, activeLoansCount: 0, completedLoansCount: 0,
      upcomingCollections: [], monthSummary: { collectedThisMonth: 0, pendingThisMonth: 0, overdueAmount: 0 } });
    expect(result.monthlyEvolution).toEqual(["Ene", "Feb", "Mar", "Abr", "May", "Jun"]
      .map((month) => ({ month, lent: 0, collected: 0 })));
    expect(result.healthBreakdown.every((item) => item.count === 0 && item.percentage === 0)).toBe(true);
  });

  it("includes fully paid lent loans and excludes cancelled and borrowed loans", () => {
    const result = calculateLentMetrics([loan({ type: "Lent", remainingPrincipal: d(600) }),
      loan({ id: "paid", type: "Lent", status: "Paid", remainingPrincipal: d(0) }),
      loan({ id: "cancelled", type: "Lent", status: "Cancelled" }), loan()]);
    expect(result).toMatchObject({ totalLent: 2400, totalCollected: 1800, totalPending: 600,
      collectedPercentage: 75, pendingPercentage: 25, activeLoansCount: 1, completedLoansCount: 1 });
    expect(result.upcomingCollections).toHaveLength(6);
  });

  it("counts completion using either status or zero remaining principal", () => {
    const result = calculateLentMetrics([loan({ type: "Lent", remainingPrincipal: d(0) }),
      loan({ id: "paid", type: "Lent", status: "Paid", remainingPrincipal: d(10) })]);
    expect(result.activeLoansCount).toBe(0);
    expect(result.completedLoansCount).toBe(2);
    expect(result.upcomingCollections).toEqual([]);
  });

  it("maps health with arrears taking precedence over partial progress", () => {
    const result = calculateLentMetrics([
      loan({ id: "active", type: "Lent" }),
      loan({ id: "overdue", type: "Lent", status: "InArrears", remainingPrincipal: d(500) }),
      loan({ id: "partial", type: "Lent", remainingPrincipal: d(600) }),
      loan({ id: "pending", type: "Lent", status: "PendingAcceptance" }),
    ]);
    expect(result.healthBreakdown).toEqual([
      { status: "Al día", count: 1, percentage: 25 },
      { status: "Con atraso", count: 1, percentage: 25 },
      { status: "Parcial", count: 1, percentage: 25 },
      { status: "Pendiente", count: 1, percentage: 25 },
    ]);
  });

  it("uses actual payment dates and currencies; includes interest in collected cash flow only", () => {
    const a = loan({ type: "Lent", principal: d(300), remainingPrincipal: d(200), disbursementDate: "2026-03-10" });
    const details = { [a.id]: detail(a, [
      installment({ id: "old", dueDate: "2026-05-20", expectedInterest: d(20), expectedTotal: d(120),
        paidPrincipal: d(40), paidInterest: d(5), remainingPrincipal: d(60), status: "PartiallyPaid" }),
      installment({ id: "today", number: 2, dueDate: "2026-06-15" }),
      installment({ id: "future", number: 3, dueDate: "2026-07-20", expectedPrincipal: d(40), remainingPrincipal: d(40) }),
    ], [
      payment({ paymentDate: "2026-05-10", amount: d(50) }),
      payment({ id: "bob", paymentDate: "2026-06-10", amount: d(500), currency: "BOB" }),
      payment({ id: "interest", paymentDate: "2026-06-15", amount: d(25) }),
      payment({ id: "future", paymentDate: "2026-06-30", amount: d(999) }),
    ]) };
    const result = calculateLentMetrics([a], "USD", 10, details);
    expect(result.totalCollected).toBe(100);
    expect(result.monthlyEvolution).toEqual([
      { month: "Ene", lent: 0, collected: 0 }, { month: "Feb", lent: 0, collected: 0 },
      { month: "Mar", lent: 300, collected: 0 }, { month: "Abr", lent: 0, collected: 0 },
      { month: "May", lent: 0, collected: 50 }, { month: "Jun", lent: 0, collected: 75 },
    ]);
    expect(result.monthSummary).toEqual({ collectedThisMonth: 75, pendingThisMonth: 110, overdueAmount: 75 });
    expect(result.healthBreakdown.find((item) => item.status === "Con atraso")?.count).toBe(1);
    expect(result.upcomingCollections.map((item) => item.dueDate)).toEqual(["2026-05-20", "2026-06-15", "2026-07-20"]);
    expect(result.collectionHistoryComplete).toBe(true);
  });

  it("combines loaded details and estimates without fabricating undated collection history", () => {
    const a = loan({ id: "loaded", type: "Lent", remainingPrincipal: d(1100) });
    const b = loan({ id: "unloaded", type: "Lent", remainingPrincipal: d(600) });
    const result = calculateLentMetrics([a, b], "USD", undefined, [detail(a, [], [payment()])]);
    expect(result.totalCollected).toBe(700);
    expect(result.monthlyEvolution[5]).toMatchObject({ lent: 2400, collected: 100 });
    expect(result.collectionHistoryComplete).toBe(false);
    expect(result.hasEstimates).toBe(true);
    expect(result.upcomingCollections.every((item) => item.loanId === "unloaded" && item.isEstimated)).toBe(true);
  });

  it("estimates current-month pending and overdue amounts but flags missing payment history", () => {
    const result = calculateLentMetrics([loan({ type: "Lent", firstDueDate: "2026-05-20", totalInstallments: 3,
      principal: d(300), remainingPrincipal: d(300), status: "InArrears" })]);
    expect(result.monthSummary).toEqual({ collectedThisMonth: 0, pendingThisMonth: 100, overdueAmount: 100 });
    expect(result.collectionHistoryComplete).toBe(false);
    expect(result.monthlyEvolution.every((point) => point.collected === 0)).toBe(true);
  });

  it("does not include forgiven or fully settled detailed installments in pending dues", () => {
    const summary = loan({ type: "Lent" });
    const result = calculateLentMetrics([summary], "USD", undefined, [detail(summary, [
      installment({ status: "Forgiven", dueDate: "2026-01-01" }),
      installment({ id: "settled", paidPrincipal: d(100), paidInterest: d(10), remainingPrincipal: d(0) }),
    ])]);
    expect(result.upcomingCollections).toEqual([]);
    expect(result.monthSummary).toEqual({ collectedThisMonth: 0, pendingThisMonth: 0, overdueAmount: 0 });
    expect(result.healthBreakdown.find((item) => item.status === "Al día")?.count).toBe(1);
  });

  it("uses UTC calendar boundaries across year changes and leap-day estimates", () => {
    vi.setSystemTime(new Date("2027-01-01T00:30:00Z"));
    const a = loan({ type: "Lent", disbursementDate: "2026-12-31", remainingPrincipal: d(0), status: "Paid" });
    const result = calculateLentMetrics([a], "USD", undefined, [detail(a, [], [
      payment({ paymentDate: "2026-12-31T23:59:59Z", amount: d(20) }),
      payment({ paymentDate: "2027-01-01T00:00:00Z", amount: d(30) }),
    ])]);
    expect(result.monthlyEvolution.map((point) => point.month)).toEqual(["Ago", "Sep", "Oct", "Nov", "Dic", "Ene"]);
    expect(result.monthSummary.collectedThisMonth).toBe(30);
    vi.setSystemTime(new Date("2028-01-01T00:00:00Z"));
    expect(calculateDebtMetrics([loan({ firstDueDate: "2028-01-31", totalInstallments: 3 })], 1000)
      .upcomingPayments.map((item) => item.dueDate)).toEqual(["2028-01-31", "2028-02-29", "2028-03-31"]);
  });
});
