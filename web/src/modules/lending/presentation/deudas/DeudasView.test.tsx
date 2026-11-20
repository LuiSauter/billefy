import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoanDetailDto, LoanSummaryDto } from "../../domain/lending.types";
import { calculateDebtMetrics } from "../../domain/lending-analytics";
import { DeudasView, type DeudasViewProps } from "./DeudasView";

const { buttons } = vi.hoisted(() => ({ buttons: [] as { label?: string; onClick?: () => void }[] }));
vi.mock("@/shared/ui/button", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/ui/button")>();
  return { ...original, Button: (props: React.ComponentProps<typeof original.Button>) => {
    buttons.push({ label: props["aria-label"] ?? (typeof props.children === "string" ? props.children : undefined),
      onClick: props.onClick as (() => void) | undefined });
    return <original.Button {...props} />;
  } };
});

const d = (value: number) => new Decimal(value);
const loan = (overrides: Partial<LoanSummaryDto> = {}): LoanSummaryDto => ({
  id: "mortgage", counterpartyId: "creditor", counterpartyName: "Crédito hipotecario",
  type: "Borrowed", template: "NoInterest", status: "Active", principal: d(1200),
  remainingPrincipal: d(1200), currency: "USD", interestRate: 0, annualEffectiveRate: 0.095,
  disbursementDate: "2026-09-01", firstDueDate: "2026-10-05", totalInstallments: 12,
  createdAt: "2026-09-01T00:00:00Z", ...overrides,
});
const mortgage = loan();
const card = loan({ id: "card", counterpartyName: "Tarjeta Visa", annualEffectiveRate: 0.36,
  principal: d(600), remainingPrincipal: d(600), status: "InArrears" });
const detail = (summary: LoanSummaryDto): LoanDetailDto => ({ summary, payments: [], installments: [{
  id: "installment", number: 1, dueDate: "2026-10-15", expectedPrincipal: d(100),
  expectedInterest: d(10), expectedTotal: d(110), paidPrincipal: d(20), paidInterest: d(10),
  paidLateInterest: d(0), remainingPrincipal: d(80), status: "PartiallyPaid",
}] });
const props = (overrides: Partial<DeudasViewProps> = {}): DeudasViewProps => ({
  loans: [mortgage, card], monthlyIncome: 1000,
  onOpenCreateDebt: vi.fn(), onOpenPayment: vi.fn(), onOpenLoanDetails: vi.fn(), ...overrides,
});
const render = (overrides: Partial<DeudasViewProps> = {}) => renderToStaticMarkup(<DeudasView {...props(overrides)} />);

beforeEach(() => {
  // Vitest uses classic JSX; some shared shadcn components rely on Next's
  // automatic JSX runtime instead of importing React at runtime.
  vi.stubGlobal("React", React);
  buttons.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("DeudasView", () => {
  it("keeps card purchase actions available at zero debt without creating a manual liability", () => {
    const onOpenCardPurchase = vi.fn();
    const html = render({ loans: [loan({ id: "operational-card", counterpartyName: "Synthetic issuer", loanKind: "CreditCard", status: "Paid", remainingPrincipal: d(0) })], onOpenCardPurchase });
    expect(html).toContain("Compras con tarjeta");
    buttons.find(button => button.label === "Registrar compra de Synthetic issuer")?.onClick?.();
    expect(onOpenCardPurchase).toHaveBeenCalledExactlyOnceWith("operational-card");
  });

  it("classifies typed cards without guessing purchase due dates from their opening principal", () => {
    const metrics = calculateDebtMetrics([loan({ counterpartyName: "Synthetic issuer", loanKind: "CreditCard", principal: d(600), remainingPrincipal: d(950) })], 1000);
    expect(metrics.totalDebt).toBe(950);
    expect(metrics.distribution.find(item => item.category === "Tarjetas")?.total).toBe(950);
    expect(metrics.monthlyPayment).toBe(0);
    expect(metrics.upcomingPayments).toEqual([]);
  });

  it("renders the redesign sections and real debt KPIs, excluding lent and closed loans", () => {
    const html = render({ loans: [mortgage, card, loan({ id: "lent", type: "Lent", counterpartyName: "Not a debt" }),
      loan({ id: "paid", status: "Paid", counterpartyName: "Paid debt" }),
      loan({ id: "cancelled", status: "Cancelled", counterpartyName: "Cancelled debt" })] });
    for (const label of ["Deudas y préstamos", "Controla tus deudas, préstamos y pagos para mejorar tu salud financiera",
      "Registrar deuda", "Deuda total", "Pago mensual", "Interés promedio", "Ratio deuda / ingreso",
      "Mis deudas", "Distribución de deudas", "Proyección de pago", "Próximos pagos", "Prioridad de pago",
      "Método Avalancha", "Insights y recomendaciones", "Controlado", "Hipoteca", "Tarjeta"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("1.800,00 USD");
    expect(html).toContain("150,00 USD");
    expect(html).toContain("18,33%");
    expect(html).toContain("15,00%");
    expect(html).toContain("66,67%");
    expect(html).toContain("33,33%");
    expect(html).not.toMatch(/Not a debt|Paid debt|Cancelled debt/);
    expect(html.match(/data-slot="chart"/g)).toHaveLength(2);
    expect(html).toContain("Filtrar deudas por estado");
    expect(html).toContain("Estimaciones");
  });

  it("ranks higher rates first and provides actionable calculated insights", () => {
    const html = render();
    const priority = html.slice(html.indexOf("Método Avalancha"));
    expect(priority.indexOf("Tarjeta Visa")).toBeLessThan(priority.indexOf("Crédito hipotecario"));
    expect(priority).toContain("36,00%");
    expect(html).toContain("Prioriza abonos extra a Tarjeta Visa");
  });

  it("shows all 12 projection months with schedule-derived balances", () => {
    const html = render({ loans: [mortgage] });
    const projection = html.slice(html.indexOf("Saldo proyectado por mes"));
    for (const month of ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep"]) {
      expect(projection).toContain(month);
    }
    expect(projection).toContain("1.100,00 USD");
    expect(projection).toContain("0,00 USD");
  });

  it("uses server installments for partial status, next date and outstanding payment amount", () => {
    const html = render({ loans: [mortgage], loanDetails: { mortgage: detail(mortgage) } });
    expect(html).toContain("Pago parcial");
    expect(html).toContain("15 oct 2026");
    expect(html).toContain("80,00 USD");
    expect(html).not.toContain("Estimaciones");
  });

  it("does not classify a regularly amortized loan as a partial installment", () => {
    const html = render({ loans: [loan({ remainingPrincipal: d(600) })] });
    expect(html).toContain('data-status="Al día"');
    expect(html).not.toContain('data-status="Pago parcial"');
  });

  it("prioritizes overdue status over partial payments in server schedules", () => {
    const overdue = detail(mortgage);
    overdue.installments[0].dueDate = "2026-09-30";
    const html = render({ loans: [mortgage], loanDetails: { mortgage: overdue } });
    expect(html).toContain('data-status="Atrasada"');
  });

  it.each([[500, "Atención"], [300, "Crítico"]])("labels the income ratio for income %s", (monthlyIncome, status) => {
    expect(render({ monthlyIncome })).toContain(status);
  });

  it("requests income instead of presenting missing income as a controlled ratio", () => {
    const html = render({ monthlyIncome: undefined });
    expect(html).toContain("Crítico");
    expect(html).toContain("Registra tus ingresos mensuales");
  });

  it("converts currencies using the analytics P2P rate", () => {
    const html = render({ loans: [loan({ currency: "BOB", principal: d(12000), remainingPrincipal: d(12000) })], p2pRate: 10 });
    expect(html).toContain("1.200,00 USD");
    expect(html).toContain("100,00 USD");
  });

  it("recognizes every debt category from real loan summaries", () => {
    const html = render({ loans: [mortgage, card,
      loan({ id: "personal", counterpartyName: "Préstamo personal" }),
      loan({ id: "car", counterpartyName: "Crédito vehicular" }),
      loan({ id: "other", counterpartyName: "Financiación" })] });
    for (const category of ["Hipoteca", "Tarjeta", "Personal", "Vehicular", "Otros"]) {
      expect(html).toContain(category);
    }
  });

  it("does not invent payment dates when neither details nor valid summary dates exist", () => {
    const html = render({ loans: [loan({ firstDueDate: "", disbursementDate: "" })] });
    expect(html).toContain("Sin fecha");
    expect(html).toContain("No hay cuotas pendientes con fecha disponible");
    expect(html).not.toContain('dateTime="');
  });

  it("does not show fabricated totals when a required exchange rate is missing", () => {
    const html = render({ loans: [loan({ currency: "BOB" })] });
    expect(html).toContain('role="alert"');
    expect(html).toContain("tipo de cambio");
    expect(html).not.toContain("Deuda total");
  });

  it("renders an empty state with a first-debt CTA, including when only lent loans exist", () => {
    for (const loans of [[], [loan({ type: "Lent" })], [loan({ remainingPrincipal: d(0) })],
      [loan({ status: "Paid" }), loan({ id: "cancelled", status: "Cancelled" })]]) {
      const html = render({ loans });
      expect(html).toContain("No tienes deudas pendientes");
      expect(html).toContain("Registrar mi primera deuda");
      expect(html).not.toContain("Mis deudas");
    }
  });

  it("shows loading without an empty state or zero-valued financial claims", () => {
    const html = render({ loans: [], loading: true });
    expect(html).toContain("Cargando deudas");
    expect(html).not.toContain("Registrar mi primera deuda");
    expect(html).not.toContain("Deuda total");
  });

  it("connects create, details, and payment actions to the correct callbacks", () => {
    const callbacks = props();
    renderToStaticMarkup(<DeudasView {...callbacks} />);
    buttons.find((button) => button.label === "Registrar deuda")!.onClick!();
    expect(callbacks.onOpenCreateDebt).toHaveBeenCalledOnce();
    buttons.find((button) => button.label === "Ver detalles de Tarjeta Visa")!.onClick!();
    expect(callbacks.onOpenLoanDetails).toHaveBeenCalledWith("card");
    const payments = buttons.filter((button) => button.label === "Pagar Tarjeta Visa");
    expect(payments.length).toBeGreaterThanOrEqual(2);
    payments.forEach((button) => button.onClick!());
    expect(callbacks.onOpenPayment).toHaveBeenCalledWith("card");
  });

  it("keeps payments available without an optional details callback", () => {
    const html = render({ onOpenLoanDetails: undefined });
    expect(html).not.toContain("Ver detalles de");
    expect(html).toContain('aria-label="Pagar Tarjeta Visa"');
  });
});
