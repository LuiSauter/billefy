import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanSummaryDto } from "../../domain/lending.types";

// The repository uses a Node-only Vitest runner; mirror the neighboring modal
// handler/effect tests while exercising the real field markup through SSR.
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
      hooks.pending.push(() => { previous?.cleanup?.(); hooks.slots[i] = { deps, cleanup: effect() }; });
    },
  };
});
vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ open, title, description, children, footer }: import("@/shared/ui/responsive-drawer").ResponsiveDrawerProps) =>
    open ? <section role="dialog"><h2>{title}</h2><p>{description}</p>{children}{footer}</section> : null,
}));

import { RegisterLoanPaymentModal, type RegisterLoanPaymentModalProps } from "./RegisterLoanPaymentModal";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
type Node = { type?: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object" || !("props" in tree)) return [];
  const node = tree as Node;
  const children = typeof node.props.children === "function" ? node.props.children({ id: node.props.htmlFor }) : node.props.children;
  return [node, ...nodes(children), ...nodes(node.props.footer)];
}
function text(tree: unknown): string {
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (!tree || typeof tree !== "object" || !("props" in tree)) return "";
  const p = (tree as Node).props;
  const children = typeof p.children === "function" ? p.children({ id: p.htmlFor }) : p.children;
  return [p.title, p.label, p.hint, p.description, children, p.footer].map(text).join(" ");
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
async function submit(tree: unknown) {
  await (nodes(tree).find(item => item.type === "form")!.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}
const loan: LoanSummaryDto = {
  id: "loan-1", counterpartyId: "contact", counterpartyName: "Contacto de prueba", type: "Lent", template: "NoInterest", status: "Active",
  principal: new Decimal(1000), remainingPrincipal: new Decimal("100.30"), currency: "BOB", interestRate: 0, annualEffectiveRate: 0,
  disbursementDate: "2026-01-01", firstDueDate: "2026-02-01", totalInstallments: 3, createdAt: "2026-01-01",
};
const accounts: AccountDto[] = [
  { id: "bob", name: "Cuenta BOB", currency: "BOB", balance: new Decimal(0), type: "Savings", createdAt: "2026-01-01" },
  { id: "usd", name: "Cuenta USD", currency: "USD", balance: new Decimal(0), type: "Savings", createdAt: "2026-01-01" },
];
let props: RegisterLoanPaymentModalProps;
function render(overrides: Partial<RegisterLoanPaymentModalProps> = {}) {
  props = { ...props, ...overrides }; hooks.cursor = 0;
  const tree = RegisterLoanPaymentModal(props); hooks.pending.splice(0).forEach(effect => effect()); return tree;
}
beforeEach(() => {
  hooks.cursor = 0; hooks.slots.length = 0; hooks.pending.length = 0;
  vi.stubGlobal("React", React); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-02-01T12:00:00Z"));
  props = { isOpen: true, loan, accounts, onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue({}) };
});
afterEach(() => {
  hooks.slots.forEach(slot => (slot as EffectSlot | undefined)?.cleanup?.()); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe("RegisterLoanPaymentModal", () => {
  it.each([["Lent", "Registrar cobro"], ["Borrowed", "Registrar pago de deuda"]] as const)("renders %s with the correct title and remaining-principal default", (type, title) => {
    const tree = render({ loan: { ...loan, type } });
    expect(tree?.type).toBe(ResponsiveDrawer); expect(tree?.props.title).toBe(title);
    expect(text(tree)).toContain("Contacto de prueba"); expect(control(tree, "payment-amount").props.value).toBe("100.30");
    expect(control(tree, "payment-date").props.value).toBe("2026-02-01");
    for (const label of ["Cuenta", "Fecha del pago", "Nota", "Capital restante antes", "Capital restante después (estimado)", "Cancelar"])
      expect(text(tree)).toContain(label);
  });

  it("uses real accessible fields and wires the footer submit button to the form", () => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain('role="dialog"'); expect(html).toContain('for="payment-amount"');
    expect(html).toContain('id="payment-amount"'); expect(html).toContain('data-slot="money-input"');
    expect(html).toContain('form="register-loan-payment-form"'); expect(html).toContain('type="date"');
  });

  it("updates decimal balance estimates and submits the selected loan, account, date and trimmed note", async () => {
    let tree = render(); change(tree, "payment-amount", "0.10"); change(tree, "payment-account", "bob");
    change(tree, "payment-date", "2026-01-31"); change(tree, "payment-note", "  Recibo de prueba  "); tree = render();
    expect(text(tree)).toContain("100,20 BOB");
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith("loan-1", { amount: 0.1, accountId: "bob", paymentDate: "2026-01-31", note: "Recibo de prueba" });
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("allows no ledger account and omits an empty optional note", async () => {
    let tree = render(); change(tree, "payment-note", "   "); tree = render(); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith("loan-1", { amount: 100.3, paymentDate: "2026-02-01", accountId: undefined, note: undefined });
  });

  it("filters account currency and rejects incompatible selections", async () => {
    let tree = render(); expect(control(tree, "payment-account").props.options).toEqual([
      { value: "", label: "Sin movimiento en cuenta" }, { value: "bob", label: "Cuenta BOB" },
    ]);
    change(tree, "payment-account", "usd"); tree = render(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    tree = render({ loan: { ...loan, id: "usd-loan", currency: "USD" } }); tree = render();
    expect(control(tree, "payment-account").props.value).toBe(""); expect(control(tree, "payment-amount").props.currency).toBe("$");
  });

  it.each([["payment-amount", "0"], ["payment-amount", "-1"], ["payment-amount", ""], ["payment-amount", "NaN"],
    ["payment-amount", "Infinity"], ["payment-amount", "0.001"], ["payment-date", ""], ["payment-date", "2026-02-30"]])("rejects invalid %s=%s", async (id, value) => {
    let tree = render(); change(tree, id, value); tree = render(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    expect(nodes(tree).find(item => item.props.type === "submit")!.props.disabled).toBe(true);
  });

  it("does not cap payments at principal when interest may be owed and labels the allocation estimate honestly", async () => {
    let tree = render({ loan: { ...loan, template: "FixedInstallment", interestRate: 0.12 } });
    change(tree, "payment-amount", "110.30"); tree = render();
    expect(text(tree)).toContain("0,00 BOB"); expect(text(tree)).toContain("mora e intereses"); expect(text(tree)).toContain("servidor");
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: 110.3 }));
  });

  it("renders nothing without a loan and disables payments for settled or inactive loans", async () => {
    expect(render({ loan: null })).toBeNull();
    for (const summary of [{ ...loan, remainingPrincipal: new Decimal(0), status: "PaidOff" }, { ...loan, status: "Cancelled" }]) {
      let tree = render({ loan: summary }); tree = render(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    }
  });

  it("prevents duplicate writes, blocks dismissal while pending, and preserves input after a safe failure", async () => {
    let reject!: (reason: unknown) => void;
    props.onSubmit = vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValue({});
    let tree = render(); change(tree, "payment-amount", "25.50"); tree = render(); const first = submit(tree); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledOnce(); tree = render();
    tree!.props.onOpenChange(false); expect(props.onClose).not.toHaveBeenCalled();
    reject(new Error("private account details")); await first; tree = render();
    expect(text(tree)).toContain("No se pudo registrar"); expect(text(tree)).not.toContain("private account details");
    expect(control(tree, "payment-amount").props.value).toBe("25.50"); await submit(tree); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledTimes(2); expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("resets input on close/reopen and when switching loans", () => {
    let tree = render(); change(tree, "payment-amount", "20"); change(tree, "payment-note", "old note");
    render({ isOpen: false }); tree = render({ isOpen: true });
    expect(control(tree, "payment-amount").props.value).toBe("100.30"); expect(control(tree, "payment-note").props.value).toBe("");
    change(tree, "payment-amount", "10"); tree = render({ loan: { ...loan, id: "loan-2", remainingPrincipal: new Decimal("55.25") } }); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("55.25"); expect(control(tree, "payment-account").props.value).toBe("");
  });

  it("does not close a newly selected loan when an earlier loan's payment completes", async () => {
    let resolve!: (value: unknown) => void;
    props.onSubmit = vi.fn(() => new Promise(done => { resolve = done; }));
    const pending = submit(render()); render({ loan: { ...loan, id: "loan-2" } });
    resolve({}); await pending; expect(props.onClose).not.toHaveBeenCalled();
  });

  it("cancels without writing", () => {
    const tree = render(); (nodes(tree).find(item => text(item.props.children).trim() === "Cancelar")!.props.onClick as () => void)();
    expect(props.onClose).toHaveBeenCalledOnce(); expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
