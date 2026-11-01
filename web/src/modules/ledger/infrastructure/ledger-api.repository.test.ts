import { describe, expect, it, vi } from "vitest";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { LedgerApiRepository } from "./ledger-api.repository";

describe("ledger movements repository", () => {
  it("serializes server filters and parses decimal summaries, allocations and transfer legs", async () => {
    const get = vi.fn().mockResolvedValue({ page: 2, pageSize: 10, totalCount: 1, items: [{ id: "m", amount: "12.30", legs: [{ id: "l", amount: "12.30" }], allocations: [{ categoryId: "c", amount: "12.30" }] }], summary: [{ currency: "BOB", income: "0", expenses: "12.30" }] });
    const repository = new LedgerApiRepository({ get } as unknown as IHttpClient);
    const page = await repository.getMovements({ mode: "Audit", page: 2, pageSize: 10, accountId: "a", search: "cafe" });
    expect(get).toHaveBeenCalledWith("/v1/transactions/movements?accountId=a&search=cafe&mode=Audit&page=2&pageSize=10", { signal: undefined });
    expect(page.items[0].amount.toFixed(2)).toBe("12.30");
    expect(page.items[0].allocations[0].amount.toFixed(2)).toBe("12.30");
    expect(page.summary[0].expenses.toFixed(2)).toBe("12.30");
  });
});

describe("legacy transaction investment markers", () => {
  it("preserves investment linkage markers while parsing raw transactions", async () => {
    const http = { get: vi.fn().mockResolvedValue([{ id: "cash", accountId: "a", amount: "0.010001", currency: "USD", direction: "Expense", occurredAt: "2026-01-01", createdAt: "2026-01-01", investmentId: "inv", investmentCashKind: "Contribution" }]) };
    const transactions = await new LedgerApiRepository(http as unknown as IHttpClient).getTransactions();
    expect(transactions[0]).toMatchObject({ id: "cash", investmentId: "inv", investmentCashKind: "Contribution" });
    expect(transactions[0].amount.toString()).toBe("0.010001");
  });
});

describe("ledger transfer repository", () => {
  it("sends the decimal-safe native-currency pair through one atomic transfer request", async () => {
    const post = vi.fn().mockResolvedValue({ outflowId: "out", inflowId: "in" });
    const http = { post } as unknown as IHttpClient;
    const repository = new LedgerApiRepository(http);
    const request = {
      sourceAccountId: "source",
      sourceAmount: "100.01",
      destinationAccountId: "destination",
      destinationAmount: "8.33",
      appliedRate: "12.0012",
      rateSource: "Binance P2P",
      description: "FX movement",
    };

    await expect(repository.registerTransfer(request)).resolves.toEqual({ outflowId: "out", inflowId: "in" });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/v1/transactions/transfers", request);
  });
});
