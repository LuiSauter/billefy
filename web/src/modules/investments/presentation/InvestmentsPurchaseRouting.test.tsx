import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvestmentsView } from "./InvestmentsView";
import { InvestmentsTableCard } from "./main/InvestmentsTableCard";
import { InvestmentDetailView } from "./detail/InvestmentDetailView";
import { PurchaseInvestmentModal } from "./modals/PurchaseInvestmentModal";
import { UpdatePriceModal } from "./modals/UpdatePriceModal";
import { InvestmentsController } from "../application/useInvestments";
import { Investment } from "../domain/investment.types";
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === "function" ? initial() : initial;
    return [state.slots[index], (value: unknown) => { state.slots[index] = value; }];
  }, useRef: (initial: unknown) => ({ current: initial }), useEffect: () => {}, useMemo: (fn: () => unknown) => fn(),
}));
vi.mock("@/shared/hooks/use-number-format", () => ({ useNumberFormat: () => String }));
const investment: Investment = { id: "shares", name: "Shares", kind: "stocks", currency: "BOB", quantity: 20, initialValue: 2000, currentValue: 2000, createdAt: "2027-01-01", history: [], iconKey: "trending-up", colorKey: "blue" };
function component<P>(tree: unknown, type: React.ComponentType<P>): P {
  if (Array.isArray(tree)) {
    for (const child of tree) { const found = component(child, type); if (found) return found; }
    return undefined as P;
  }
  if (!React.isValidElement<Record<string, unknown>>(tree)) return undefined as P;
  return tree.type === type ? tree.props as P : component(tree.props.children, type);
}
beforeEach(() => { state.slots = []; state.cursor = 0; });
describe("investment action routing", () => {
  it("opens the real purchase form and never follows a purchase with a second cash-only post", async () => {
    const purchase = vi.fn().mockResolvedValue({ id: "operation" });
    const cash = vi.fn();
    const legacy = vi.fn();
    const complete = vi.fn().mockResolvedValue(undefined);
    const controller = { investments: [investment], purchaseInvestment: purchase, recordCash: cash, registerOperation: legacy } as unknown as InvestmentsController;
    const render = () => { state.cursor = 0; return InvestmentsView({ controller, p2pRate: 1, accounts: [], onCashComplete: complete }); };
    let tree = render();
    component(tree, InvestmentsTableCard).onOpenPurchase!(investment);
    tree = render();
    const modal = component(tree, PurchaseInvestmentModal);
    expect(modal.isOpen).toBe(true);
    const input = { quantity: "5", unitPrice: "120", totalAmount: "600", fees: "0", linkedAccountId: "bank", occurredAt: "2027-01-13T00:00:00.000Z" };
    await modal.onPurchase("shares", input, "same-key");
    expect(purchase).toHaveBeenCalledWith("shares", input, "same-key");
    expect(complete).toHaveBeenCalledOnce();
    expect(legacy).not.toHaveBeenCalled();
    expect(cash).not.toHaveBeenCalled();
  });
  it("connects the existing price action to dated valuation in the asset's native currency", async () => {
    const valuation = vi.fn().mockResolvedValue({ id: "valuation" });
    const transactions = vi.fn().mockResolvedValue([]);
    const controller = { investments: [investment], recordValuation: valuation, getTransactions: transactions } as unknown as InvestmentsController;
    const render = () => { state.cursor = 0; return InvestmentsView({ controller, p2pRate: 1, accounts: [], onCashComplete: vi.fn() }); };
    let tree = render();
    component(tree, InvestmentsTableCard).onSelectInvestment("shares");
    tree = render();
    component(tree, InvestmentDetailView).onOpenUpdatePrice(investment);
    tree = render();
    const modal = component(tree, UpdatePriceModal);
    expect(modal.currency).toBe("BOB");
    const input = { unitPrice: "110", totalAmount: "2750", occurredAt: "2027-01-21T00:00:00.000Z" };
    await modal.onRecordValuation!("shares", input);
    expect(valuation).toHaveBeenCalledWith("shares", input);
    expect(transactions).toHaveBeenCalledWith("shares");
  });
});
