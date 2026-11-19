import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { useState } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { useLedgerModule } from "./useLedgerModule";

vi.mock("react", () => ({
  useState: vi.fn(),
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
}));

const accounts = [
  { id: "bob", name: "Bolivianos", type: "Cash", currency: "BOB", balance: 100, createdAt: "2026-01-01" },
  { id: "usd", name: "Dólares", type: "Bank", currency: "USD", balance: 0, createdAt: "2026-01-01" },
];

function createHttp() {
  return {
    get: vi.fn(async (path: string) => path === "/v1/accounts" ? accounts : []),
    post: vi.fn(async () => ({ outflowId: "out", inflowId: "in" })),
    put: vi.fn(), delete: vi.fn(), setAuthSession: vi.fn(), getAuthToken: vi.fn(), getUserId: vi.fn(),
  } as unknown as Mocked<IHttpClient>;
}

function useLedgerForTest(http: IHttpClient) {
  vi.mocked(useState).mockImplementationOnce(() => [accounts, vi.fn()] as never)
    .mockImplementationOnce(() => [[], vi.fn()] as never);
  return useLedgerModule(http);
}

beforeEach(() => vi.mocked(useState).mockReset());

describe("FX transfer module flow", () => {
  it.each([undefined, "2027-01-15T13:30:00.000Z"])("preserves optional effective date %s through the actual HTTP payload", async occurredAt => {
    const http = createHttp();
    const ledger = useLedgerForTest(http);
    await ledger.executeFxTransfer({ fromAccountId: "bob", toAccountId: "usd", amount: "100.01", description: "January", p2pRate: 10, ...(occurredAt ? { occurredAt } : {}) });
    expect(http.post).toHaveBeenCalledExactlyOnceWith("/v1/transactions/transfers", {
      sourceAccountId: "bob", destinationAccountId: "usd", sourceAmount: "100.01", destinationAmount: "10.00", description: "January",
      ...(occurredAt ? { occurredAt } : {}),
    });
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it("creates one transfer pair and refreshes ledger after success", async () => {
    const http = createHttp();
    const ledger = useLedgerForTest(http);

    await ledger.executeFxTransfer({ fromAccountId: "bob", toAccountId: "usd", amount: "120.10", description: "FX", p2pRate: 12 });

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith("/v1/transactions/transfers", expect.objectContaining({
      sourceAmount: "120.10", destinationAmount: "10.01", sourceAccountId: "bob", destinationAccountId: "usd",
    }));
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.post.mock.invocationCallOrder[0]).toBeLessThan(http.get.mock.invocationCallOrder[0]);
  });

  it("does not treat a post-write refresh failure as a failed transfer", async () => {
    const http = createHttp();
    vi.mocked(http.get).mockRejectedValueOnce(new Error("refresh unavailable"));
    const ledger = useLedgerForTest(http);

    await expect(ledger.executeFxTransfer({ fromAccountId: "bob", toAccountId: "usd", amount: "10.00", description: "FX", p2pRate: 12 })).resolves.toBeUndefined();
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it("does not refresh after the atomic transfer request fails", async () => {
    const http = createHttp();
    vi.mocked(http.post).mockRejectedValueOnce(new Error("conflict"));
    const ledger = useLedgerForTest(http);

    await expect(ledger.executeFxTransfer({ fromAccountId: "bob", toAccountId: "usd", amount: "120", description: "FX", p2pRate: 12 })).rejects.toThrow("conflict");
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get).not.toHaveBeenCalled();
  });

  it("deletes account and refreshes ledger", async () => {
    const http = createHttp();
    const ledger = useLedgerForTest(http);

    await ledger.deleteAccount("bob");
    expect(http.delete).toHaveBeenCalledWith("/v1/accounts/bob");
    expect(http.get).toHaveBeenCalledWith("/v1/accounts");
  });
});
