import { beforeEach, describe, expect, it, vi } from "vitest";
const refreshLedger = vi.hoisted(() => vi.fn(async () => {}));
const refreshPlanning = vi.hoisted(() => vi.fn(async () => {}));
const registerCardPurchase = vi.hoisted(() => vi.fn());
const actions = vi.hoisted(() => ({ createAccount: vi.fn(), updateAccount: vi.fn(), deleteAccount: vi.fn(), registerTransaction: vi.fn(), updateTransaction: vi.fn(), reverseTransaction: vi.fn(), reconcileAccount: vi.fn(), executeFxTransfer: vi.fn() }));
vi.mock("react", () => ({ useState: (value: unknown) => [value, vi.fn()], useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn, useEffect: () => {} }));
vi.mock("@/modules/ledger/application/useLedgerModule", () => ({ useLedgerModule: () => ({ ...actions, refreshLedger, accounts: [], accountsMap: new Map(), transactions: [] }) }));
vi.mock("@/modules/fx/application/useFxModule", () => ({ useFxModule: () => ({ refreshRate: vi.fn(), rate: null }) }));
vi.mock("@/modules/planning/application/usePlanningModule", () => ({ usePlanningModule: () => ({ refreshPlanning }) }));
vi.mock("@/modules/ingestion/application/useIngestionModule", () => ({ useIngestionModule: () => ({ refreshDrafts: vi.fn(), drafts: [], pendingDrafts: [] }) }));
vi.mock("@/modules/lending/application/useLendingModule", () => ({ useLendingModule: () => ({ refreshLoans: vi.fn(), loans: [], registerCardPurchase }) }));
vi.mock("@/modules/messaging/application/useMessagingModule", () => ({ useMessagingModule: () => ({}) }));
import { useDashboardData } from "./useDashboardData";
beforeEach(() => { vi.clearAllMocks(); refreshPlanning.mockResolvedValue(undefined); Object.values(actions).forEach(action => action.mockReset().mockResolvedValue("preserved-result")); });
describe("useDashboardData refresh contract", () => {
  it("exposes the authoritative card purchase command without another financial write or wrapper retry", async () => {
    const dashboard = useDashboardData("token", "user");
    const payload = { amount: "350.00", currency: "BOB", categoryId: "food", occurredAt: "2027-01-07T00:00:00Z" };
    registerCardPurchase.mockResolvedValueOnce({ id: "purchase-1" });
    expect(dashboard).toHaveProperty("registerCardPurchase", registerCardPurchase);
    await expect(dashboard.registerCardPurchase("card-1", payload)).resolves.toEqual({ id: "purchase-1" });
    expect(registerCardPurchase).toHaveBeenCalledExactlyOnceWith("card-1", payload);
    expect(refreshLedger).not.toHaveBeenCalled();
    expect(refreshPlanning).not.toHaveBeenCalled();
  });

  const cases: Array<[keyof typeof actions, unknown[]]> = [
    ["createAccount", [{ name: "Savings", currency: "BOB", initialBalance: "1000" }]],
    ["updateAccount", ["a", { name: "Renamed savings" }]], ["deleteAccount", ["a"]],
    ["registerTransaction", [{ accountId: "a", direction: "Expense", amount: "500", currency: "BOB" }]],
    ["registerTransaction", [{ accountId: "a", direction: "Income", amount: "500", currency: "BOB" }]],
    ["updateTransaction", ["t", { description: "Correction" }]], ["reverseTransaction", ["t"]],
    ["reconcileAccount", ["a", 500, "Statement check"]],
    ["executeFxTransfer", [{ fromAccountId: "a", toAccountId: "b", amount: "50", occurredAt: "2027-01-12T12:00:00Z" }]],
  ];
  it.each(cases)("refreshes planning once after %s while preserving arguments and results", async (name, args) => {
    let resolve!: (value: string) => void;
    actions[name].mockImplementationOnce(() => new Promise<string>(done => { resolve = done; }));
    const dashboard = useDashboardData("token", "user");
    const operation = (dashboard[name] as (...values: unknown[]) => Promise<unknown>)(...args);
    expect(actions[name]).toHaveBeenCalledExactlyOnceWith(...args);
    expect(refreshPlanning).not.toHaveBeenCalled();
    resolve("preserved-result"); expect(await operation).toBe("preserved-result");
    expect(refreshPlanning).toHaveBeenCalledOnce();
    expect(refreshLedger).not.toHaveBeenCalled();
  });
  it.each(cases)("does not refresh planning or retry a rejected %s", async (name, args) => {
    actions[name].mockRejectedValueOnce(new Error("rejected"));
    const dashboard = useDashboardData("token", "user");
    await expect((dashboard[name] as (...values: unknown[]) => Promise<unknown>)(...args)).rejects.toThrow("rejected");
    expect(actions[name]).toHaveBeenCalledExactlyOnceWith(...args);
    expect(refreshPlanning).not.toHaveBeenCalled();
  });

  it("does not report a committed write as failed or resend it when planning refresh throws", async () => {
    refreshPlanning.mockRejectedValueOnce(new Error("read offline"));
    const dashboard = useDashboardData("token", "user");
    await expect(dashboard.registerTransaction({ accountId: "a", direction: "Expense", amount: "500" })).resolves.toBe("preserved-result");
    expect(actions.registerTransaction).toHaveBeenCalledOnce();
    expect(refreshPlanning).toHaveBeenCalledOnce();
  });
  it("provides a combined refresh for direct movement mutations without repeating their writes", async () => {
    await useDashboardData("token", "user").refreshLedgerAndPlanning();
    expect(refreshLedger).toHaveBeenCalledOnce(); expect(refreshPlanning).toHaveBeenCalledOnce();
    Object.values(actions).forEach(action => expect(action).not.toHaveBeenCalled());
  });
  it("exposes the ledger refresh so movement writes can refresh accounts and raw transactions", () => {
    expect(useDashboardData("token", "user").refreshLedger).toBe(refreshLedger);
  });
});
