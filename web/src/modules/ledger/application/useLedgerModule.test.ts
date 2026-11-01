import { beforeEach, describe, expect, it, vi } from "vitest";
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
  } as unknown as IHttpClient;
}

function renderLedger(http: IHttpClient) {
  vi.mocked(useState).mockImplementationOnce(() => [accounts, vi.fn()] as never)
    .mockImplementationOnce(() => [[], vi.fn()] as never);
  return useLedgerModule(http);
}

beforeEach(() => vi.mocked(useState).mockReset());

describe("FX transfer module flow", () => {
  it("creates one transfer pair and refreshes ledger after success", async () => {
    const http = createHttp();
    const ledger = renderLedger(http);

    await ledger.executeFxTransfer({ fromAccountId: "bob", toAccountId: "usd", amount: "120.10", description: "FX", p2pRate: 12 });

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith("/v1/transactions/transfers", expect.objectContaining({
      sourceAmount: "120.10", destinationAmount: "10.01", sourceAccountId: "bob", destinationAccountId: "usd",
    }));
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.post.mock.invocationCallOrder[0]).toBeLessThan(http.get.mock.invocationCallOrder[0]);
  });

  it("does not refresh after the atomic transfer request fails", async () => {
    const http = createHttp();
    vi.mocked(http.post).mockRejectedValueOnce(new Error("conflict"));
    const ledger = renderLedger(http);

    await expect(ledger.executeFxTransfer({ fromAccountId: "bob", toAccountId: "usd", amount: "120", description: "FX", p2pRate: 12 })).rejects.toThrow("conflict");
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get).not.toHaveBeenCalled();
  });
});
