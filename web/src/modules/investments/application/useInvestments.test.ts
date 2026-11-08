import { describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({ useCallback: (fn: unknown) => fn, useEffect: () => {}, useMemo: (fn: () => unknown) => fn(), useState: (initial: unknown) => [initial, vi.fn()] }));
vi.mock("@/shared/lib/notify", () => ({ notify: { error: vi.fn() } }));
import { useInvestments } from "./useInvestments";

describe("investment cash controller", () => {
  it("sends native positive decimal strings to the verified contribution route and propagates failures", async () => {
    const post = vi.fn().mockResolvedValue({ ledgerTransactionId: "tx", investmentId: "inv", kind: "Contribution" });
    const controller = useInvestments({ post } as never);
    await expect(controller.recordCash("inv", "Contribution", { accountId: "acc", amount: "0.010001", description: "Aporte" })).resolves.toEqual({ ledgerTransactionId: "tx", investmentId: "inv", kind: "Contribution" });
    expect(post).toHaveBeenCalledWith("/v1/planning/investments/inv/cash/Contribution", { accountId: "acc", amount: "0.010001", description: "Aporte" });
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(controller.recordCash("inv", "Disposal", { accountId: "acc", amount: "1.00" })).rejects.toThrow("offline");
  });

  it("reverses the exact linked ledger transaction without a body-bearing financial retry", async () => {
    const post = vi.fn().mockResolvedValue({ ledgerTransactionId: "tx", investmentId: "inv", kind: "Disposal" });
    const controller = useInvestments({ post } as never);
    await controller.reverseCash("selected-ledger-id");
    expect(post).toHaveBeenCalledWith("/v1/planning/investment-cash/selected-ledger-id/reverse");
  });

  it("syncs live crypto prices when crypto investments have changed market value", async () => {
    const put = vi.fn().mockResolvedValue({});
    const get = vi.fn().mockResolvedValue([]);
    const controller = useInvestments({ put, get } as never);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lastPrice: "80000.00" }),
    });

    const cryptoInvestment = {
      id: "inv-btc",
      name: "Bitcoin (BTC)",
      kind: "crypto" as const,
      iconKey: "coins" as const,
      colorKey: "amber" as const,
      currency: "USDT",
      quantity: 0.5,
      initialValue: 35000,
      currentValue: 35000,
      history: [],
      createdAt: "2026-01-01",
    };

    const updated = await controller.syncLiveCryptoPrices([cryptoInvestment]);
    expect(updated).toBe(1);
    expect(put).toHaveBeenCalledWith("/v1/planning/investments/inv-btc/value", {
      currentValue: 40000,
      quantity: 0.5,
    });
  });
});
