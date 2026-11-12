import React from "react";
import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const buttons = vi.hoisted(() => [] as { children: React.ReactNode; onClick?: () => void; "aria-label"?: string }[]);
vi.mock("@/shared/ui/button", () => ({ Button: (props: { children: React.ReactNode; onClick?: () => void; "aria-label"?: string }) => { buttons.push(props); return <button>{props.children}</button>; } }));
vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <>{footer}{children}</> }));
vi.mock("@/shared/ui/progress", () => ({ Progress: () => <div /> }));
import { LoanDetailModal } from "./LoanDetailModal";
import type { LoanDetailDto, LoanType } from "../domain/lending.types";
const loan = (type: LoanType, status: string): LoanDetailDto => ({ summary: { id: "l1", type, status, counterpartyName: "Marta", template: "NoInterest", annualEffectiveRate: 0, principal: 100, remainingPrincipal: 80, currency: "BOB", totalInstallments: 2 } as never, installments: [], payments: [] });
beforeEach(() => { buttons.length = 0; vi.stubGlobal("React", React); });
describe("LoanDetailModal collection action", () => {
  it.each(["Active", "InArrears"])("exposes collection for payable Lent status %s", status => {
    const onOpenPayment = vi.fn(); renderToStaticMarkup(<LoanDetailModal isOpen loan={loan("Lent", status)} onClose={vi.fn()} onOpenPayment={onOpenPayment} />);
    expect(buttons.some(button => button.children === "Registrar cobro")).toBe(true);
    buttons.find(button => button.children === "Registrar cobro")?.onClick?.(); expect(onOpenPayment).toHaveBeenCalledWith("l1");
  });
  it.each(["Paid", "Cancelled"])("hides collection for Lent status %s", status => {
    renderToStaticMarkup(<LoanDetailModal isOpen loan={loan("Lent", status)} onClose={vi.fn()} onOpenPayment={vi.fn()} />);
    expect(buttons.some(button => button.children === "Registrar cobro")).toBe(false);
  });
  it.each(["Active", "InArrears"])("exposes payment for Borrowed status %s", status => {
    const onOpenPayment = vi.fn();
    renderToStaticMarkup(<LoanDetailModal isOpen loan={loan("Borrowed", status)} onClose={vi.fn()} onOpenPayment={onOpenPayment} />);
    buttons.find(button => button.children === "Registrar pago")?.onClick?.();
    expect(onOpenPayment).toHaveBeenCalledWith("l1");
    expect(buttons.some(button => button.children === "Registrar cobro")).toBe(false);
  });
  it.each(["PaidOff", "Cancelled"])("hides payment for Borrowed status %s", status => {
    renderToStaticMarkup(<LoanDetailModal isOpen loan={loan("Borrowed", status)} onClose={vi.fn()} onOpenPayment={vi.fn()} />);
    expect(buttons.some(button => button.children === "Registrar pago")).toBe(false);
  });
  it.each(["Lent", "Borrowed"] as const)("opens an unpaid installment with its number for %s, but not a paid installment", type => {
    const detail = loan(type, "Active");
    detail.installments = ["PartiallyPaid", "Paid"].map((status, index) => ({ id: `i${index}`, number: index + 1, dueDate: "2026-02-01", status,
      expectedPrincipal: new Decimal(50), expectedInterest: new Decimal(5), expectedTotal: new Decimal(55),
      paidPrincipal: new Decimal(50), paidInterest: new Decimal(3), paidLateInterest: new Decimal(0), remainingPrincipal: new Decimal(0),
      totalOutstanding: new Decimal(index === 0 ? 2 : 0) }));
    const onOpenPayment = vi.fn();
    renderToStaticMarkup(<LoanDetailModal isOpen loan={detail} onClose={vi.fn()} onOpenPayment={onOpenPayment} />);
    const verb = type === "Lent" ? "Cobrar" : "Pagar";
    buttons.find(button => button["aria-label"] === `${verb} cuota 1`)?.onClick?.();
    expect(onOpenPayment).toHaveBeenCalledWith("l1", 1);
    expect(buttons.some(button => button["aria-label"] === `${verb} cuota 2`)).toBe(false);
  });
  it("renders the early payment policy badge and outstanding amounts", () => {
    const detail = loan("Borrowed", "Active");
    detail.summary.earlyPaymentPolicy = "ReduceInstallment";
    detail.summary.totalPayoff = new Decimal(85);
    detail.installments = [{
      id: "i1", number: 1, dueDate: "2026-02-01", status: "PartiallyPaid",
      expectedPrincipal: new Decimal(50), expectedInterest: new Decimal(5), expectedTotal: new Decimal(55),
      paidPrincipal: new Decimal(20), paidInterest: new Decimal(0), paidLateInterest: new Decimal(0), remainingPrincipal: new Decimal(30),
      totalOutstanding: new Decimal(35)
    }];
    const html = renderToStaticMarkup(<LoanDetailModal isOpen loan={detail} onClose={vi.fn()} />);
    expect(html).toContain("Abono a capital (reducir cuota)");
    expect(html).toContain("Pendiente");
    expect(html).toContain("35.00");
    expect(html).toContain("Total para cancelar");
  });
});
