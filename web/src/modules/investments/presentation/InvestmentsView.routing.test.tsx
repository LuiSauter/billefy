import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvestmentsView } from "./InvestmentsView";
import { InvestmentsTableCard } from "./main/InvestmentsTableCard";
import { InvestmentDetailView } from "./detail/InvestmentDetailView";
import { ArchiveInvestmentModal } from "./modals/ArchiveInvestmentModal";
import { InvestmentCashModal } from "./InvestmentCashModal";
import { PurchaseInvestmentModal } from "./modals/PurchaseInvestmentModal";
import { UpdatePriceModal } from "./modals/UpdatePriceModal";
import { RegisterOperationModal } from "./modals/RegisterOperationModal";
import { CreateInvestmentModal } from "./modals/CreateInvestmentModal";
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

function count<P>(tree: unknown, type: React.ComponentType<P>): number {
  if (Array.isArray(tree)) return tree.reduce((n: number, child) => n + count(child, type), 0);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return 0;
  return (tree.type === type ? 1 : 0) + count(tree.props.children, type);
}

function setup() {
  const deleteInvestment = vi.fn().mockResolvedValue(undefined);
  const controller = { investments: [investment], deleteInvestment, getTransactions: vi.fn().mockResolvedValue([]) } as unknown as InvestmentsController;
  const render = () => { state.cursor = 0; return InvestmentsView({ controller, p2pRate: 1, accounts: [], onCashComplete: vi.fn() }); };
  return { deleteInvestment, render };
}

beforeEach(() => { state.slots = []; state.cursor = 0; });

describe("InvestmentsView action routing", () => {
  it("routes the list-row archive action through the confirmation modal instead of deleting immediately", async () => {
    const { deleteInvestment, render } = setup();
    let tree = render();
    component(tree, InvestmentsTableCard).onArchiveInvestment(investment);
    expect(deleteInvestment).not.toHaveBeenCalled();
    tree = render();
    const modal = component(tree, ArchiveInvestmentModal);
    expect(modal.isOpen).toBe(true);
    expect(modal.investment).toEqual(investment);
    await modal.onDelete("shares");
    expect(deleteInvestment).toHaveBeenCalledWith("shares");
  });

  it("passes the investment picked from a row's cash action to the cash modal", () => {
    const { render } = setup();
    let tree = render();
    expect(component(tree, InvestmentCashModal).investmentId).toBeUndefined();
    component(tree, InvestmentsTableCard).onOpenCashModal(investment);
    tree = render();
    const modal = component(tree, InvestmentCashModal);
    expect(modal.open).toBe(true);
    expect(modal.investmentId).toBe("shares");
  });

  it("passes the detail asset to the cash modal and clears the preselection on close", () => {
    const { render } = setup();
    let tree = render();
    component(tree, InvestmentsTableCard).onSelectInvestment("shares");
    tree = render();
    component(tree, InvestmentDetailView).onOpenOperation(investment, "cash");
    tree = render();
    expect(component(tree, InvestmentCashModal).investmentId).toBe("shares");
    component(tree, InvestmentCashModal).onClose();
    tree = render();
    expect(component(tree, InvestmentCashModal).open).toBe(false);
  });

  it("archives from the detail view with the same modal and returns to the list afterwards", async () => {
    const { deleteInvestment, render } = setup();
    let tree = render();
    component(tree, InvestmentsTableCard).onSelectInvestment("shares");
    tree = render();
    component(tree, InvestmentDetailView).onOpenArchiveInvestment(investment);
    tree = render();
    const modal = component(tree, ArchiveInvestmentModal);
    expect(modal.isOpen).toBe(true);
    await modal.onDelete("shares");
    expect(deleteInvestment).toHaveBeenCalledWith("shares");
    tree = render();
    expect(component(tree, InvestmentsTableCard)).toBeDefined();
  });

  it("renders each shared modal exactly once in both the list and the detail view", () => {
    const { render } = setup();
    let tree = render();
    const modals = [ArchiveInvestmentModal, InvestmentCashModal, PurchaseInvestmentModal, UpdatePriceModal, RegisterOperationModal, CreateInvestmentModal];
    for (const modal of modals) expect(count(tree, modal as React.ComponentType<unknown>)).toBe(1);
    component(tree, InvestmentsTableCard).onSelectInvestment("shares");
    tree = render();
    expect(component(tree, InvestmentDetailView)).toBeDefined();
    for (const modal of modals) expect(count(tree, modal as React.ComponentType<unknown>)).toBe(1);
  });
});
