import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { ModalsContainer, openLoanPaymentFromDetail } from "./ModalsContainer";
vi.mock("next/dynamic", () => ({ default: (loader: () => unknown) => Object.assign(() => null, { loader: loader.toString() }) }));
function elements(tree: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return [];
  return [tree, ...elements(tree.props.children as React.ReactNode)];
}
describe("ModalsContainer transfer dates", () => {
  it.each([
    { native: true, occurredAt: "2027-01-15T13:30:00.000Z" },
    { native: true, occurredAt: undefined },
    { native: false, occurredAt: "2027-01-15T13:30:00.000Z" },
    { native: false, occurredAt: undefined },
  ])("forwards date $occurredAt with native=$native, preserving old no-date consumers", async ({ native, occurredAt }) => {
    const actions = { executeFxTransfer: native ? vi.fn() : undefined, registerTransaction: vi.fn() };
    const tree = ModalsContainer({ modals: { isFxTransferOpen: true }, actions, accounts: [], pendingDrafts: [], p2pRate: 10, selectedCurrency: "BOB", onSelectCurrency: vi.fn() } as unknown as Parameters<typeof ModalsContainer>[0]);
    const modal = elements(tree).find(element => (element.type as unknown as { loader?: string }).loader?.includes("presentation/FxTransferModal"))!;
    const date = occurredAt ? { occurredAt } : {};
    const data = { fromAccountId: "bob", toAccountId: "usd", amount: "10.00", description: "FX", ...date };
    await (modal.props.onConfirmTransfer as (input: typeof data) => Promise<void>)(data);
    if (native) {
      expect(actions.executeFxTransfer).toHaveBeenCalledExactlyOnceWith({ ...data, p2pRate: 10 });
      expect(actions.registerTransaction).not.toHaveBeenCalled();
    } else {
      expect(actions.registerTransaction).toHaveBeenCalledExactlyOnceWith({ accountId: "bob", amount: "10.00", direction: "Expense", description: "FX", ...date });
    }
  });
});

describe("ModalsContainer detail collection transition", () => {
  it("closes loan detail before opening a card purchase, preserving the selected identity", () => {
    const order: string[] = [];
    const modals = { isLoanDetailModalOpen: true, selectedLoanDetail: { id: "card-1" },
      closeLoanDetail: vi.fn(() => order.push("close-detail")) };
    const openPurchase = vi.fn((id: string) => { order.push(`purchase:${id}`); });
    const tree = ModalsContainer({ modals, actions: {}, accounts: [], pendingDrafts: [],
      p2pRate: 10, selectedCurrency: "BOB", onSelectCurrency: vi.fn(), onOpenCardPurchase: openPurchase
    } as unknown as Parameters<typeof ModalsContainer>[0]);
    const detail = elements(tree).find(element => (element.type as unknown as { loader?: string }).loader?.includes("presentation/LoanDetailModal"))!;
    expect(detail.props.onOpenCardPurchase).toBeTypeOf("function");
    (detail.props.onOpenCardPurchase as (id: string) => void)("card-1");
    expect(order).toEqual(["close-detail", "purchase:card-1"]);
    expect(openPurchase).toHaveBeenCalledExactlyOnceWith("card-1");
  });

  it("closes detail before opening the same loan collection flow", () => {
    const order: string[] = [];
    const openPayment = vi.fn((id: string) => { order.push(`payment:${id}`); });
    openLoanPaymentFromDetail("loan-1", () => order.push("close-detail"), openPayment);
    expect(order).toEqual(["close-detail", "payment:loan-1"]);
    expect(openPayment).toHaveBeenCalledWith("loan-1");
  });
  it("carries a selected installment from detail to payment", () => {
    const openPayment = vi.fn();
    openLoanPaymentFromDetail("loan-1", vi.fn(), openPayment, 4);
    expect(openPayment).toHaveBeenCalledWith("loan-1", undefined, 4);
  });
  it.each(["Borrowed", "Lent"] as const)("uses RegisterLoanPaymentModal and authoritative quotes for %s", async type => {
    vi.stubGlobal("React", React);
    const selectedLoan = { id: "loan-1", type, currency: "USD" } as LoanSummaryDto;
    const modals = { isLoanPaymentModalOpen: true, selectedLoanForPayment: selectedLoan, selectedInstallmentNumber: 2,
      closeLoanPayment: vi.fn(), refreshSelectedLoanDetail: vi.fn() };
    const actions = { getPaymentQuote: vi.fn(), registerLoanPayment: vi.fn() };
    const tree = ModalsContainer({ modals, actions, accounts: [], pendingDrafts: [], p2pRate: 7, selectedCurrency: "BOB", onSelectCurrency: vi.fn() } as unknown as Parameters<typeof ModalsContainer>[0]);
    const payment = elements(tree).find(element => (element.type as unknown as { loader?: string }).loader?.includes("modals/RegisterLoanPaymentModal"));
    expect(payment).toBeDefined(); expect(payment?.props.loan).toBe(selectedLoan);
    expect(payment?.props.installmentNumber).toBe(2); expect(payment?.props.onGetQuote).toBe(actions.getPaymentQuote);
    expect(elements(tree).some(element => (element.type as unknown as { loader?: string }).loader?.includes("presentation/LoanPaymentModal"))).toBe(false);
    await (payment!.props.onSubmit as (id: string, req: { amount: string }) => Promise<void>)("loan-1", { amount: "23.123456" });
    expect(actions.registerLoanPayment).toHaveBeenCalledWith("loan-1", { amount: "23.123456" });
    expect(modals.refreshSelectedLoanDetail).toHaveBeenCalledWith("loan-1");
    vi.unstubAllGlobals();
  });
});
