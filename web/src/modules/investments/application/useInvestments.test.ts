import { describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({ useCallback: (fn: unknown) => fn, useEffect: () => {}, useMemo: (fn: () => unknown) => fn(), useState: (initial: unknown) => [initial, vi.fn()] }));
vi.mock("@/shared/lib/notify", () => ({ notify: { error: vi.fn() } }));
import { useInvestments } from "./useInvestments";

describe("investment cash controller", () => {
  it("records dividend income in one keyed operation and never resubmits after a refresh failure", async () => {
    const post = vi.fn().mockResolvedValue({ id: "dividend", ledgerTransactionId: "income" });
    const get = vi.fn().mockRejectedValue(new Error("refresh offline"));
    const controller = useInvestments({ post, get } as never);
    const input = { totalAmount: "40.00", linkedAccountId: "bank", occurredAt: "2027-01-20T12:00:00.000Z" };
    await expect(controller.recordDividend("shares", input, "dividend-key")).resolves.toEqual({ id: "dividend", ledgerTransactionId: "income" });
    expect(post).toHaveBeenCalledExactlyOnceWith("/v1/planning/investments/shares/operations", { ...input, type: "Dividend", quantity: "0", unitPrice: "0", fees: "0" }, { headers: { "Idempotency-Key": "dividend-key" } });
    expect(get).toHaveBeenCalledOnce();
  });
  it("does not invite another valuation post when only the post-save refresh fails", async () => {
    const post = vi.fn().mockResolvedValue({ id: "saved-valuation" });
    const get = vi.fn().mockRejectedValue(new Error("refresh offline"));
    const controller = useInvestments({ post, get } as never);
    await expect(controller.recordValuation("shares", { unitPrice: "110", totalAmount: "2750", occurredAt: "2027-01-21T00:00:00.000Z" })).resolves.toEqual({ id: "saved-valuation" });
    expect(post).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledOnce();
  });
  it("purchases with exact decimal strings and a caller-stable retry key, propagating failures", async () => {
    const post = vi.fn().mockResolvedValue({ id: "operation", ledgerTransactionId: "cash" });
    const get = vi.fn().mockResolvedValue([]);
    const controller = useInvestments({ post, get } as never);
    const input = { quantity: "5", unitPrice: "120", totalAmount: "600", fees: "0", linkedAccountId: "bank", occurredAt: "2027-01-13T00:00:00.000Z" };
    await controller.purchaseInvestment("shares", input, "stable-key");
    expect(post).toHaveBeenCalledWith("/v1/planning/investments/shares/operations", { ...input, type: "Buy" }, { headers: { "Idempotency-Key": "stable-key" } });
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(controller.purchaseInvestment("shares", input, "stable-key")).rejects.toThrow("offline");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("records a dated valuation without a linked cash account or a unit mutation", async () => {
    const post = vi.fn().mockResolvedValue({ id: "valuation" });
    const get = vi.fn().mockResolvedValue([]);
    const controller = useInvestments({ post, get } as never);
    await controller.recordValuation("shares", { unitPrice: "110", totalAmount: "2750", occurredAt: "2027-01-21T00:00:00.000Z" });
    expect(post).toHaveBeenCalledWith("/v1/planning/investments/shares/operations", {
      type: "Revaluation", quantity: "0", unitPrice: "110", totalAmount: "2750", occurredAt: "2027-01-21T00:00:00.000Z",
    });
    expect(get).toHaveBeenCalledOnce();
  });
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
