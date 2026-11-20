import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoanDetailDto, LoanSummaryDto } from "../../domain/lending.types";
import { DineroPrestadoView, type DineroPrestadoViewProps } from "./DineroPrestadoView";

const harness = vi.hoisted(() => ({
  filter: "Todos",
  changeFilter: undefined as undefined | ((value: string) => void),
  actions: [] as { label?: string; onClick?: () => void; disabled?: boolean }[],
}));
// The repository uses the node/SSR runner. Retain real markup while exposing
// state transitions and portalled menu actions without adding a DOM dependency.
vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return { ...original, useState: (initial: unknown) => {
    const state = original.useState(initial);
    return initial === "Todos" ? [harness.filter, (value: string) => { harness.filter = value; }] : state;
  } };
});
vi.mock("@/shared/ui/button", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/ui/button")>();
  return { ...original, Button: (props: React.ComponentProps<typeof original.Button>) => {
    harness.actions.push({ label: props["aria-label"] ?? (typeof props.children === "string" ? props.children : undefined),
      onClick: props.onClick as (() => void) | undefined, disabled: props.disabled });
    return <original.Button {...props} />;
  } };
});
vi.mock("@/shared/ui/segmented-control", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/ui/segmented-control")>();
  return { SegmentedControl: (props: React.ComponentProps<typeof original.SegmentedControl>) => {
    harness.changeFilter = props.onChange;
    return <original.SegmentedControl {...props} />;
  } };
});
vi.mock("@/shared/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <>{children}</>,
  DropdownMenuTrigger: ({ render }: { render: React.ReactElement }) => render,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: (props: React.ComponentProps<"button">) => {
    harness.actions.push({ label: props["aria-label"], onClick: props.onClick as (() => void) | undefined });
    return <button {...props} />;
  },
}));

const d = (value: number) => new Decimal(value);
const loan = (overrides: Partial<LoanSummaryDto> = {}): LoanSummaryDto => ({
  id: "current", counterpartyId: "borrower", counterpartyName: "Persona Uno", type: "Lent",
  template: "NoInterest", status: "Active", principal: d(1000), remainingPrincipal: d(1000),
  currency: "USD", interestRate: 0, annualEffectiveRate: 0, disbursementDate: "2026-09-01",
  firstDueDate: "2026-10-15", totalInstallments: 10, createdAt: "2026-09-01T00:00:00Z", ...overrides,
});
const current = loan();
const partial = loan({ id: "partial", counterpartyName: "Persona Dos", remainingPrincipal: d(500) });
const late = loan({ id: "late", counterpartyName: "Persona Tres", status: "InArrears", remainingPrincipal: d(100) });
const pending = loan({ id: "pending", counterpartyName: "Persona Cuatro", status: "Draft" });
const paid = loan({ id: "paid", counterpartyName: "Persona Cinco", status: "Paid", remainingPrincipal: d(0) });
const detail = (summary: LoanSummaryDto): LoanDetailDto => ({ summary,
  installments: [{ id: `${summary.id}-1`, number: 1, dueDate: "2026-10-15", expectedPrincipal: d(100),
    expectedInterest: d(10), expectedTotal: d(110), paidPrincipal: d(20), paidInterest: d(10),
    paidLateInterest: d(0), remainingPrincipal: d(80), status: "PartiallyPaid" }],
  payments: [{ id: "payment", amount: d(30), currency: "USD", paymentDate: "2026-10-01", allocations: [] }],
});
const props = (overrides: Partial<DineroPrestadoViewProps> = {}): DineroPrestadoViewProps => ({
  loans: [current, partial, late, pending, paid], onOpenCreateLent: vi.fn(), onOpenPayment: vi.fn(),
  onOpenLoanDetails: vi.fn(), ...overrides,
});
const render = (overrides: Partial<DineroPrestadoViewProps> = {}) => renderToStaticMarkup(<DineroPrestadoView {...props(overrides)} />);
const table = (html: string) => html.slice(html.indexOf("Mis préstamos"), html.indexOf("Acciones rápidas"));

beforeEach(() => {
  vi.stubGlobal("React", React);
  harness.filter = "Todos";
  harness.actions.length = 0;
  harness.changeFilter = undefined;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("DineroPrestadoView", () => {
  it("renders the redesign, five calculated KPIs, charts, health and table", () => {
    const html = render({ loans: [...props().loans,
      loan({ id: "borrowed", type: "Borrowed", counterpartyName: "Excluded debt" }),
      loan({ id: "cancelled", status: "Cancelled", counterpartyName: "Excluded cancelled" })] });
    for (const label of ["Dinero prestado", "Gestiona el dinero que has prestado, controla los pagos y mantén el seguimiento de tus cobros",
      "Registrar préstamo", "Total prestado", "Total cobrado", "Por cobrar", "Préstamos activos", "Préstamos finalizados",
      "Evolución de cobros", "Estado de préstamos", "Próximos cobros", "Mis préstamos", "Resumen", "Acciones rápidas",
      "Cobrado este mes", "Por cobrar este mes", "Vencido", "Filtrar préstamos por estado", "Monto prestado", "Saldo por cobrar", "Progreso", "Próximo cobro"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("5.000,00 USD");
    expect(html).toContain("2.400,00 USD");
    expect(html).toContain("2.600,00 USD");
    expect(html).toContain("48,00% del total");
    expect(html).toContain("52,00% del total");
    expect(html).toMatch(/Préstamos activos<\/p><p[^>]*>4<\/p>/);
    expect(html).toMatch(/Préstamos finalizados<\/p><p[^>]*>1<\/p>/);
    expect(html).toContain("40,00%"); // health: current + completed
    expect(html).not.toMatch(/Excluded debt|Excluded cancelled/);
    expect(html.match(/data-slot="chart"/g)).toHaveLength(2);
    expect(html.match(/data-slot="progress"/g)).toHaveLength(5);
    for (const status of ["Al día", "Parcial", "Pendiente", "Con atraso", "Finalizado"]) {
      expect(html).toContain(`data-status="${status}"`);
    }
    expect(html).toContain("Historial de cobros incompleto");
    expect(html).toContain("Estimaciones");
  });

  it.each([
    ["Todos", ["Persona Uno", "Persona Dos", "Persona Tres", "Persona Cuatro", "Persona Cinco"]],
    ["Activos", ["Persona Uno", "Persona Dos", "Persona Tres", "Persona Cuatro"]],
    ["Finalizados", ["Persona Cinco"]],
    ["Con atraso", ["Persona Tres"]],
  ])("filters table rows with the %s pill", (filter, expected) => {
    render();
    harness.changeFilter!(filter);
    const html = table(render());
    for (const item of props().loans) expect(html.includes(item.counterpartyName)).toBe(expected.includes(item.counterpartyName));
    expect(html).toContain('aria-checked="true"');
  });

  it("renders a no-results row for an empty filter", () => {
    render({ loans: [current] });
    harness.changeFilter!("Finalizados");
    expect(render({ loans: [current] })).toContain("No hay préstamos con este estado");
  });

  it("uses dated server payments, collection amounts and next dates without inventing history", () => {
    const html = render({ loans: [partial], loanDetails: { partial: detail(partial) } });
    expect(html).toContain("30,00 USD");
    expect(html).toContain("80,00 USD");
    expect(html).toContain("15 oct 2026");
    expect(html).toContain("50,00%");
    expect(html).not.toContain("Historial de cobros incompleto");
    expect(html).not.toContain("Estimaciones");
    const history = html.slice(html.indexOf("Evolución mensual de préstamos y cobros"));
    expect(history).toContain("Sep");
    expect(history).toContain("Oct");
  });

  it("matches domain health when an unpaid server installment is overdue", () => {
    const overdue = detail(partial);
    overdue.installments[0].dueDate = "2026-09-30";
    const html = render({ loans: [partial], loanDetails: { partial: overdue } });
    expect(html).toContain('data-status="Con atraso"');
    expect(html).toContain("Vencida");
    expect(html).toContain("100,00%");
  });

  it("converts money through analytics and handles missing required FX safely", () => {
    const bob = loan({ currency: "BOB", principal: d(10000), remainingPrincipal: d(5000) });
    expect(render({ loans: [bob], p2pRate: 10 })).toContain("500,00 USD");
    const html = render({ loans: [bob] });
    expect(html).toContain('role="alert"');
    expect(html).toContain("tipo de cambio");
    expect(html).not.toContain("Total prestado");
  });

  it("supports BOB as the selected currency and rejects invalid amounts", () => {
    const html = render({ loans: [partial], selectedCurrency: "BOB", p2pRate: 10 });
    expect(html).toContain("10.000,00 BOB");
    expect(html).toContain("5.000,00 BOB");
    expect(html).not.toContain("USD");
    expect(render({ loans: [loan({ principal: d(-1) })] })).toContain('role="alert"');
  });

  it("retains fully repaid loans and reports zero remaining capital and full progress", () => {
    const html = render({ loans: [loan({ remainingPrincipal: d(0) })] });
    expect(html).toContain('data-status="Finalizado"');
    expect(html).toContain("100,00%");
    expect(html).toContain("0,00 USD");
    expect(html).not.toContain("Aún no has registrado préstamos");
  });

  it("does not invent dates when schedule dates are unavailable", () => {
    const html = render({ loans: [loan({ firstDueDate: "", disbursementDate: "" })] });
    expect(html).toContain("Sin fecha");
    expect(html).toContain("No hay cobros pendientes con fecha disponible");
    expect(html).not.toContain('dateTime="');
  });

  it("passes upcoming installment context without using its displayed amount as payment input", () => {
    const onOpenPayment = vi.fn();
    const html = render({ onOpenPayment });
    const upcomingAction = harness.actions.find((action) => action.label === "Registrar cobro de Persona Uno");
    expect(upcomingAction).toBeDefined();
    upcomingAction?.onClick?.();
    expect(onOpenPayment).toHaveBeenCalledWith("current", expect.any(Number));
    expect(html).toContain("Seleccioná un préstamo");
    expect(harness.actions.find((action) => action.label === "Registrar cobro")?.disabled).toBe(true);
  });
  it("wires create, collection, details and quick actions to the correct loan", () => {
    const callbacks = props();
    renderToStaticMarkup(<DineroPrestadoView {...callbacks} />);
    harness.actions.filter((action) => action.label === "Registrar préstamo").forEach((action) => action.onClick!());
    expect(callbacks.onOpenCreateLent).toHaveBeenCalledTimes(2);
    harness.actions.find((action) => action.label === "Ver detalles de Persona Dos")!.onClick!();
    expect(callbacks.onOpenLoanDetails).toHaveBeenCalledWith("partial");
    harness.actions.filter((action) => action.label === "Registrar cobro de Persona Uno").forEach((action) => action.onClick!());
    expect(callbacks.onOpenPayment).toHaveBeenCalledWith("current");
    harness.actions.find((action) => action.label === "Registrar cobro")!.onClick!();
    expect(callbacks.onOpenPayment).toHaveBeenLastCalledWith("current");
    expect(callbacks.onOpenPayment).not.toHaveBeenCalledWith("paid");
  });

  it("keeps collections available without optional details and disables them for finished loans", () => {
    const html = render({ loans: [paid], onOpenLoanDetails: undefined });
    expect(html).not.toContain("Ver detalles de");
    expect(harness.actions.find((action) => action.label === "Registrar cobro")?.disabled).not.toBe(false);
    expect(html).not.toContain('aria-label="Registrar cobro de Persona Cinco"');
    expect(html).toContain('data-status="Finalizado"');
  });

  it("keeps collections available for an active loan without a dated schedule or details callback", () => {
    const callbacks = props({ loans: [loan({ firstDueDate: "", disbursementDate: "" })], onOpenLoanDetails: undefined });
    const html = renderToStaticMarkup(<DineroPrestadoView {...callbacks} />);
    expect(html).not.toContain("Ver detalles de");
    expect(callbacks.onOpenPayment).not.toHaveBeenCalledWith("current");
    expect(html).toContain("Seleccioná un préstamo");
  });

  it("shows empty and loading states without zero-valued financial claims", () => {
    for (const loans of [[], [loan({ type: "Borrowed" })], [loan({ status: "Cancelled" })]]) {
      const html = render({ loans });
      expect(html).toContain("Aún no has registrado préstamos");
      expect(html).toContain("Registrar mi primer préstamo");
      expect(html).not.toContain("Mis préstamos");
    }
    const html = render({ loans: [], loading: true });
    expect(html).toContain("Cargando préstamos");
    expect(html).not.toContain("Aún no has registrado préstamos");
    expect(html).not.toContain("Total prestado");
  });
});
