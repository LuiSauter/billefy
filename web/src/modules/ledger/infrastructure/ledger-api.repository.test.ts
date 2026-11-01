import { describe, expect, it, vi } from "vitest";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { LedgerApiRepository } from "./ledger-api.repository";

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
