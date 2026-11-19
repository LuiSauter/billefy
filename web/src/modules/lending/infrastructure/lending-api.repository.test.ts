import { describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
import type { IHttpClient } from "@/shared/application/http-client.contract";
import { LendingApiRepository } from "./lending-api.repository";

const rawQuote = {
  loanId: "loan-1", currency: "USD", asOfDate: "2026-02-01", totalPayoff: "123.456789", suggestedAmount: "23.123456",
  remainingPrincipal: "100.123456", loanStatus: "InArrears", earlyPaymentPolicy: "ReduceTerm",
  installments: [{ installmentId: "i1", number: 1, dueDate: "2026-01-01", outstandingPrincipal: "20.000001",
    outstandingRegularInterest: "2", outstandingLateInterest: "1.123455", totalOutstanding: "23.123456" }],
  projectedInstallments: [{ installmentId: "i2", number: 2, dueDate: "2026-03-01", outstandingPrincipal: 10,
    outstandingRegularInterest: 1, outstandingLateInterest: 0, totalOutstanding: 11 }],
  proposedAllocations: [{ installmentId: "i1", installmentNumber: 1, toPrincipal: 20, toInterest: 2, toLateInterest: 1, remainingBalanceAfter: 80 }],
  proposedEarlyPrincipalAmount: "5.123456", proposedEarlyPrincipalEffectiveDate: "2026-03-01", resultingPrincipal: "95",
  resultingState: "Active", historicalSnapshots: [
    { paymentDate: "2026-01-01", createdAt: "2026-01-01T12:00:00Z", recordSequence: 1, remainingTotal: "150.123456", isAmbiguous: false, paymentId: "p1" },
    { paymentDate: "2026-01-01", createdAt: "2026-01-01T12:00:00Z", recordSequence: null, remainingTotal: null, isAmbiguous: true, paymentId: null },
  ],
};

describe("LendingApiRepository payment quote and detail", () => {
  it("requests dated quotes with an exact amount string and maps all monetary quote fields to decimals", async () => {
    const get = vi.fn().mockResolvedValue(rawQuote);
    const repository = new LendingApiRepository({ get } as unknown as IHttpClient);
    const result = await repository.getPaymentQuote("loan-1", "2026-02-01", "99999999999999.999999");
    expect(get).toHaveBeenCalledExactlyOnceWith("/v1/loans/loan-1/quote?paymentDate=2026-02-01&amount=99999999999999.999999");
    for (const field of ["totalPayoff", "suggestedAmount", "remainingPrincipal", "proposedEarlyPrincipalAmount", "resultingPrincipal"] as const)
      expect(result[field]).toEqual(new Decimal(rawQuote[field]));
    expect(result.installments[0].outstandingPrincipal.toString()).toBe("20.000001");
    expect(result.installments[0].outstandingRegularInterest).toEqual(new Decimal(2));
    expect(result.installments[0].outstandingLateInterest.toString()).toBe("1.123455");
    expect(result.installments[0].totalOutstanding.toString()).toBe("23.123456");
    expect(result.projectedInstallments[0].totalOutstanding).toEqual(new Decimal(11));
    expect(result.historicalSnapshots[0].remainingTotal).toEqual(new Decimal("150.123456"));
    expect(result.historicalSnapshots[1]).toEqual(rawQuote.historicalSnapshots[1]);
    expect(result.proposedAllocations).toEqual(rawQuote.proposedAllocations);
    expect(result.earlyPaymentPolicy).toBe("ReduceTerm");
  });

  it("omits absent query parameters, preserves a null suggestion and includes zero amounts", async () => {
    const get = vi.fn().mockResolvedValue({ ...rawQuote, suggestedAmount: null });
    const repository = new LendingApiRepository({ get } as unknown as IHttpClient);
    expect((await repository.getPaymentQuote("loan-1")).suggestedAmount).toBeNull();
    expect(get).toHaveBeenLastCalledWith("/v1/loans/loan-1/quote");
    await repository.getPaymentQuote("loan-1", undefined, 0);
    expect(get).toHaveBeenLastCalledWith("/v1/loans/loan-1/quote?amount=0");
  });

  it("maps authoritative optional detail amounts and immutable payment metadata without fabricating legacy null values", async () => {
    const raw = {
      summary: { principal: "200", remainingPrincipal: "100", totalPayoff: "123.456789", suggestedAmount: "23.123456", earlyPaymentPolicy: "ReduceTerm", lateRate: 0.01, graceDays: 3 },
      installments: [{ expectedPrincipal: "100", expectedInterest: "10", expectedTotal: "110", paidPrincipal: "80", paidInterest: "8", paidLateInterest: "1",
        remainingPrincipal: "20", outstandingPrincipal: "20", outstandingInterest: "2", outstandingLateInterest: "1.123456", totalOutstanding: "23.123456" }],
      payments: [{ id: "p1", amount: "89", recordSequence: 2, calculationVersion: 1, earlyPrincipalAmount: "5.123456", earlyPrincipalEffectiveDate: "2026-03-01", remainingBalanceAfter: "123.456789", isAmbiguous: false, allocations: [] },
        { id: "legacy", amount: "10", recordSequence: null, calculationVersion: null, earlyPrincipalAmount: null, earlyPrincipalEffectiveDate: null, remainingBalanceAfter: null, isAmbiguous: true, allocations: [] }],
    };
    const get = vi.fn().mockResolvedValue(raw);
    const detail = await new LendingApiRepository({ get } as unknown as IHttpClient).getLoanById("loan-1");
    expect(detail.summary.totalPayoff).toEqual(new Decimal("123.456789"));
    expect(detail.summary.suggestedAmount).toEqual(new Decimal("23.123456"));
    expect(detail.summary.earlyPaymentPolicy).toBe("ReduceTerm");
    for (const field of ["outstandingPrincipal", "outstandingInterest", "outstandingLateInterest", "totalOutstanding"] as const)
      expect(detail.installments[0][field]).toEqual(new Decimal(raw.installments[0][field]));
    expect(detail.payments[0].earlyPrincipalAmount).toEqual(new Decimal("5.123456"));
    expect(detail.payments[0].remainingBalanceAfter).toEqual(new Decimal("123.456789"));
    expect(detail.payments[0].recordSequence).toBe(2); expect(detail.payments[0].calculationVersion).toBe(1);
    expect(detail.payments[1].remainingBalanceAfter).toBeNull(); expect(detail.payments[1].earlyPrincipalAmount).toBeNull();
    expect(detail.payments[1].isAmbiguous).toBe(true);
  });
});

describe("LendingApiRepository.registerLoanPayment", () => {
  it("forwards operation keys as headers without changing exact purchase or payment amounts", async () => {
    const post = vi.fn().mockResolvedValue({ id: "purchase" });
    const repo = new LendingApiRepository({ post } as unknown as IHttpClient);
    await repo.registerCardPurchase("card", { amount: "350.00", currency: "BOB", categoryId: "food", occurredAt: "2027-01-07T00:00:00Z", idempotencyKey: "purchase-key" });
    expect(post).toHaveBeenLastCalledWith("/v1/loans/card/purchases", { amount: "350.00", currency: "BOB", categoryId: "food", occurredAt: "2027-01-07T00:00:00Z" }, { headers: { "Idempotency-Key": "purchase-key" } });
    await repo.registerLoanPayment("card", { amount: "700.00", accountId: "bank", idempotencyKey: "payment-key" });
    expect(post).toHaveBeenLastCalledWith("/v1/loans/card/payments", { amount: "700.00", accountId: "bank" }, { headers: { "Idempotency-Key": "payment-key" } });
  });

  it("passes exact decimal amounts as JSON strings while preserving numeric callers", async () => {
    const post = vi.fn().mockResolvedValue({});
    const http = { post } as unknown as IHttpClient;
    const repository = new LendingApiRepository(http);

    await repository.registerLoanPayment("loan-1", { amount: "99999999999999.999999" });
    expect(post).toHaveBeenLastCalledWith("/v1/loans/loan-1/payments", { amount: "99999999999999.999999" });
    expect(JSON.stringify(post.mock.calls[0][1])).toBe('{"amount":"99999999999999.999999"}');

    await repository.registerLoanPayment("loan-1", { amount: 200 });
    expect(post).toHaveBeenLastCalledWith("/v1/loans/loan-1/payments", { amount: 200 });
  });
});
