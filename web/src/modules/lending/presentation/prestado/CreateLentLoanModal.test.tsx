import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanScheduleDto } from "../../domain/lending.types";

// Node-only runner: follow CreateDebtModal's state/effect harness, keeping real
// design-system controls for the static-markup accessibility checks.
const { hooks } = vi.hoisted(() => ({
  hooks: { cursor: 0, slots: [] as unknown[], pending: [] as (() => void)[] },
}));
type EffectSlot = { deps?: React.DependencyList; cleanup?: () => void };
vi.mock("react", async importOriginal => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual,
    useState: (initial: unknown) => {
      const i = hooks.cursor++;
      if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === "function" ? initial() : initial;
      return [hooks.slots[i], (next: unknown) => {
        hooks.slots[i] = typeof next === "function" ? next(hooks.slots[i]) : next;
      }];
    },
    useRef: (initial: unknown) => {
      const i = hooks.cursor++;
      if (!(i in hooks.slots)) hooks.slots[i] = { current: initial };
      return hooks.slots[i];
    },
    useEffect: (effect: () => void | (() => void), deps?: React.DependencyList) => {
      const i = hooks.cursor++;
      const previous = hooks.slots[i] as EffectSlot | undefined;
      if (deps && previous?.deps && deps.length === previous.deps.length && deps.every((dep, index) => Object.is(dep, previous.deps![index]))) return;
      hooks.pending.push(() => {
        previous?.cleanup?.();
        hooks.slots[i] = { deps, cleanup: effect() };
      });
    },
  };
});
vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ open, title, description, children, footer }: import("@/shared/ui/responsive-drawer").ResponsiveDrawerProps) =>
    open ? <section role="dialog"><h2>{title}</h2><p>{description}</p>{children}{footer}</section> : null,
}));

import { CreateLentLoanModal, type CreateLentLoanModalProps } from "./CreateLentLoanModal";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { TableBody, TableRow } from "@/shared/ui/table";

type Node = { type?: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object" || !("props" in tree)) return [];
  const node = tree as Node;
  const children = typeof node.props.children === "function" ? node.props.children({ id: node.props.htmlFor }) : node.props.children;
  return [node, ...nodes(children), ...nodes(node.props.footer), ...nodes(node.props.title)];
}
function text(tree: unknown): string {
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (!tree || typeof tree !== "object" || !("props" in tree)) return "";
  const p = (tree as Node).props;
  const children = typeof p.children === "function" ? p.children({ id: p.htmlFor }) : p.children;
  return [p.label, p.hint, p.title, p.description, children, p.footer].map(text).join(" ");
}
function control(tree: unknown, id: string) {
  const node = nodes(tree).find(item => item.props.id === id);
  if (!node) throw new Error(`Missing control ${id}`);
  return node;
}
function change(tree: unknown, id: string, value: string) {
  const p = control(tree, id).props;
  if (p.onValueChange) (p.onValueChange as (v: string) => void)(value);
  else (p.onChange as (e: unknown) => void)({ target: { value } });
}
function select(tree: unknown, label: string, value: string) {
  const node = nodes(tree).find(item => item.props["aria-label"] === label)!;
  (node.props.onChange as (v: string) => void)(value);
}
function submitButton(tree: unknown) { return nodes(tree).find(item => item.props.type === "submit")!; }
async function submit(tree: unknown) {
  await (nodes(tree).find(item => item.type === "form")!.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}
const accounts: AccountDto[] = [
  { id: "bob", name: "Cuenta BOB", currency: "BOB", balance: new Decimal(0), type: "Savings", createdAt: "2026-01-01" },
  { id: "usd", name: "Cuenta USD", currency: "USD", balance: new Decimal(0), type: "Savings", createdAt: "2026-01-01" },
];
// LOAN_ENGINE vector A, including final-installment rounding and month-end dates.
const schedule: LoanScheduleDto = {
  installments: [
    { number: 1, dueDate: "2026-02-28", principal: 333.33, interest: 0, total: 333.33, balanceAfter: 666.67 },
    { number: 2, dueDate: "2026-03-31", principal: 333.33, interest: 0, total: 333.33, balanceAfter: 333.34 },
    { number: 3, dueDate: "2026-04-30", principal: 333.34, interest: 0, total: 333.34, balanceAfter: 0 },
  ], totalPrincipal: 1000, totalInterest: 0, totalToPay: 1000, annualEffectiveRate: 0,
};
let props: CreateLentLoanModalProps;
function render(overrides: Partial<CreateLentLoanModalProps> = {}) {
  props = { ...props, ...overrides }; hooks.cursor = 0;
  const tree = CreateLentLoanModal(props);
  hooks.pending.splice(0).forEach(effect => effect());
  return tree;
}
function fill() {
  const tree = render();
  change(tree, "lent-person", "  Contacto de prueba  ");
  change(tree, "lent-relationship", "Familia");
  change(tree, "lent-account", "bob");
  change(tree, "lent-principal", "1000");
  change(tree, "lent-rate", "24");
  change(tree, "lent-term", "3");
  change(tree, "lent-date", "2026-01-31");
  change(tree, "lent-notes", "  Compra de equipo  ");
  return render();
}
async function simulate() { await vi.advanceTimersByTimeAsync(300); return render(); }
beforeEach(() => {
  hooks.cursor = 0; hooks.slots.length = 0; hooks.pending.length = 0;
  vi.stubGlobal("React", React); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-31T12:00:00Z"));
  props = { isOpen: true, accounts, onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue({}), onSimulate: vi.fn().mockResolvedValue(schedule) };
});
afterEach(() => {
  hooks.slots.forEach(slot => (slot as EffectSlot | undefined)?.cleanup?.());
  vi.useRealTimers(); vi.unstubAllGlobals();
});

describe("CreateLentLoanModal", () => {
  it("renders the wide design-system drawer with all sections and a disabled incomplete submission", () => {
    const tree = render();
    expect(tree.type).toBe(ResponsiveDrawer); expect(tree.props.size).toBe("xl");
    for (const label of ["Registrar préstamo (dinero prestado)", "Información del préstamo", "Persona o contacto", "Relación", "Cuenta de origen",
      "Monto prestado", "Moneda", "Fecha del préstamo", "Tipo de acuerdo", "Plazo (meses)", "Fecha de vencimiento", "Descripción / Notas",
      "Plan de pagos", "Resumen del préstamo", "Interés total", "Total a recibir", "Cuota mensual estimada", "Calendario de pagos (estimado)",
      "Cancelar", "Registrar préstamo"]) expect(text(tree)).toContain(label);
    expect(submitButton(tree).props.disabled).toBe(true);
    expect(submitButton(tree).props.form).toBe(nodes(tree).find(item => item.type === "form")!.props.id);
  });

  it("renders actual labeled money inputs, plan radios, and the real calendar table", async () => {
    let tree = fill(); select(tree, "Tipo de acuerdo", "none"); render(); tree = await simulate();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('role="dialog"'); expect(html).toContain('for="lent-principal"');
    expect(html).toContain('id="lent-principal"'); expect(html).toContain('data-slot="money-input"');
    expect(html).toContain('role="radiogroup"'); expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-slot="table"'); expect(html).toContain('2026-02-28');
  });

  it("submits exact annual terms and trimmed relationship/description with the automatic preference", async () => {
    await submit(fill());
    expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith({ type: "Lent", counterpartyName: "Contacto de prueba", principal: 1000,
      currency: "BOB", interestRate: 0.24, rateUnit: "Annual", dayCount: "Thirty360", frequency: "Monthly", template: "FixedInstallment",
      totalInstallments: 3, disbursementDate: "2026-01-31", disbursementAccountId: "bob",
      counterpartyNotes: "[Plan: Automático]\nRelación: Familia\nDescripción: Compra de equipo",
      earlyPaymentPolicy: "AdvanceInstallments" });
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("submits configured earlyPaymentPolicy when changed by user", async () => {
    let tree = fill();
    control(tree, "lent-early-policy").props.onChange({ target: { value: "ReduceInstallment" } });
    tree = render();
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ earlyPaymentPolicy: "ReduceInstallment" }));
  });

  it("switches to zero interest, shows server-calculated rounding and dates, and restores the entered rate", async () => {
    let tree = fill(); select(tree, "Tipo de acuerdo", "none"); tree = render();
    expect(nodes(tree).some(item => item.props.id === "lent-rate")).toBe(false);
    tree = await simulate();
    expect(props.onSimulate).toHaveBeenCalledWith({ principal: 1000, rate: 0, rateUnit: "Annual", dayCount: "Thirty360", frequency: "Monthly",
      template: "NoInterest", totalInstallments: 3, disbursementDate: "2026-01-31" });
    const body = nodes(tree).find(item => item.type === TableBody)!;
    expect(nodes(body).filter(item => item.type === TableRow)).toHaveLength(3);
    expect(text(body)).toContain("333,34"); expect(text(body)).toContain("2026-04-30");
    expect(control(tree, "lent-due").props.value).toBe("2026-04-30");
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ interestRate: 0, template: "NoInterest" }));
    // A fresh instance for testing the reverse selection without the successful-write lock.
    render({ isOpen: false }); render({ isOpen: true }); tree = fill();
    select(tree, "Tipo de acuerdo", "none"); tree = render(); select(tree, "Tipo de acuerdo", "interest"); tree = render();
    expect(control(tree, "lent-rate").props.value).toBe("24");
  });

  it("persists manual tracking without altering amortization terms and explains the server schedule", async () => {
    let tree = fill(); select(tree, "Plan de pagos", "manual"); tree = render();
    expect(text(tree)).toContain("registrarás los pagos"); expect(text(tree)).toContain("cronograma de amortización");
    tree = await simulate(); expect(nodes(tree).some(item => item.type === TableBody)).toBe(true);
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ template: "FixedInstallment", totalInstallments: 3,
      counterpartyNotes: "[Plan: Manual]\nRelación: Familia\nDescripción: Compra de equipo" }));
  });

  it("debounces simulation, converts percentages with Decimal, and displays the server's interest totals", async () => {
    props.onSimulate = vi.fn().mockResolvedValue({ ...schedule, totalInterest: 12.34, totalToPay: 1012.34,
      installments: schedule.installments.map((item, i) => ({ ...item, interest: i === 2 ? 4.12 : 4.11, total: i === 2 ? 337.46 : 337.44 })) });
    let tree = fill(); change(tree, "lent-rate", "9.75"); render();
    await vi.advanceTimersByTimeAsync(299); expect(props.onSimulate).not.toHaveBeenCalled();
    tree = await simulate();
    expect(props.onSimulate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ rate: 0.0975, template: "FixedInstallment" }));
    expect(text(tree)).toContain("12,34 BOB"); expect(text(tree)).toContain("1012,34 BOB");
  });

  it.each([["Biweekly", 6], ["Weekly", 13]] as const)("maps a three-month %s plan to %s nominal periods", async (frequency, count) => {
    let tree = fill(); change(tree, "lent-frequency", frequency); tree = render(); await simulate();
    expect(props.onSimulate).toHaveBeenCalledWith(expect.objectContaining({ frequency, totalInstallments: count }));
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ frequency, totalInstallments: count }));
  });

  it("normalizes the initial currency, filters accounts, and clears the account when currency changes", async () => {
    let tree = render({ selectedCurrency: "USDT" }); expect(control(tree, "lent-currency").props.value).toBe("USD");
    tree = fill(); change(tree, "lent-currency", "BOB"); tree = render(); change(tree, "lent-account", "bob"); tree = render();
    change(tree, "lent-currency", "USD"); tree = render();
    expect(control(tree, "lent-account").props.value).toBe("");
    expect(control(tree, "lent-account").props.options).toEqual([{ value: "usd", label: "Cuenta USD" }]);
    change(tree, "lent-account", "bob"); await submit(render()); expect(props.onSubmit).not.toHaveBeenCalled();
    change(tree, "lent-account", "usd"); await submit(render());
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD", disbursementAccountId: "usd" }));
  });

  it.each([["lent-person", " "], ["lent-principal", "0"], ["lent-principal", "NaN"], ["lent-principal", "Infinity"],
    ["lent-rate", "-1"], ["lent-rate", ""], ["lent-term", "0"], ["lent-term", "2.5"], ["lent-date", "2026-02-30"],
    ["lent-currency", "EUR"], ["lent-frequency", "invalid"], ["lent-relationship", "invalid"]])("rejects invalid %s=%s", async (id, value) => {
    let tree = fill(); change(tree, id, value); tree = render(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("shows unavailable simulation honestly and still permits a valid creation", async () => {
    render({ onSimulate: undefined }); const tree = fill();
    expect(text(tree)).toContain("Simulación no disponible"); expect(nodes(tree).some(item => item.type === TableBody)).toBe(false);
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("does not simulate incomplete inputs and explains missing compatible accounts", async () => {
    let tree = render({ accounts: [] }); expect(text(tree)).toContain("No hay cuentas en");
    await vi.advanceTimersByTimeAsync(1000); expect(props.onSimulate).not.toHaveBeenCalled();
    tree = fill(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("invalidates stale and out-of-order calendar responses", async () => {
    let resolve!: (value: LoanScheduleDto) => void;
    props.onSimulate = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockRejectedValueOnce(new Error("private upstream information"));
    let tree = fill(); await simulate(); change(tree, "lent-principal", "2000"); tree = render();
    expect(nodes(tree).some(item => item.type === TableBody)).toBe(false);
    tree = await simulate(); resolve(schedule); await Promise.resolve(); tree = render();
    expect(text(tree)).toContain("No se pudo simular"); expect(text(tree)).not.toContain("private upstream");
    expect(nodes(tree).some(item => item.type === TableBody)).toBe(false);
  });

  it.each([{ ...schedule, installments: [] }, { ...schedule, totalInterest: -1 },
    { ...schedule, installments: [{ ...schedule.installments[0], dueDate: "invalid" }] }])("rejects malformed schedules", async result => {
    props.onSimulate = vi.fn().mockResolvedValue(result); fill(); const tree = await simulate();
    expect(text(tree)).toContain("No se pudo simular"); expect(nodes(tree).some(item => item.type === TableBody)).toBe(false);
  });

  it("locks duplicate writes, retains inputs on error, and permits retry with safe errors", async () => {
    let reject!: (reason: unknown) => void;
    props.onSubmit = vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValue({});
    let tree = fill(); const first = submit(tree); await submit(tree); expect(props.onSubmit).toHaveBeenCalledOnce();
    reject(new Error("private details")); await first; tree = render();
    expect(text(tree)).toContain("No se pudo registrar el préstamo"); expect(text(tree)).not.toContain("private details");
    expect(control(tree, "lent-person").props.value).toContain("Contacto de prueba");
    await submit(tree); await submit(tree); expect(props.onSubmit).toHaveBeenCalledTimes(2); expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("combines manual tracking with zero interest and omits an empty description", async () => {
    let tree = fill(); change(tree, "lent-rate", ""); change(tree, "lent-notes", "   ");
    select(tree, "Tipo de acuerdo", "none"); select(tree, "Plan de pagos", "manual"); tree = render();
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ interestRate: 0, template: "NoInterest",
      counterpartyNotes: "[Plan: Manual]\nRelación: Familia" }));
  });

  it("derives a read-only maturity with leap-year month-end clamping even without simulation", () => {
    render({ onSimulate: undefined }); let tree = fill(); change(tree, "lent-date", "2028-01-31"); change(tree, "lent-term", "1"); tree = render();
    expect(control(tree, "lent-due").props.value).toBe("2028-02-29"); expect(control(tree, "lent-due").props.readOnly).toBe(true);
  });

  it("keeps the current form and pending write intact when the display currency prop changes", async () => {
    let resolve!: (value: unknown) => void;
    props.onSubmit = vi.fn(() => new Promise(done => { resolve = done; }));
    const pending = submit(fill()); const tree = render({ selectedCurrency: "USD" });
    expect(control(tree, "lent-currency").props.value).toBe("BOB");
    resolve({}); await pending; expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("cancels without submitting and resets form and in-flight simulations on close", async () => {
    let resolve!: (value: LoanScheduleDto) => void;
    props.onSimulate = vi.fn(() => new Promise<LoanScheduleDto>(done => { resolve = done; }));
    let tree = fill(); await simulate();
    (nodes(tree).find(item => text(item.props.children).trim() === "Cancelar")!.props.onClick as () => void)();
    expect(props.onClose).toHaveBeenCalledOnce(); expect(props.onSubmit).not.toHaveBeenCalled();
    render({ isOpen: false }); resolve(schedule); await Promise.resolve(); tree = render({ isOpen: true });
    expect(control(tree, "lent-person").props.value).toBe(""); expect(nodes(tree).some(item => item.type === TableBody)).toBe(false);
  });
});
