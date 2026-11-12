import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanPaymentQuoteDto, LoanSummaryDto } from "../../domain/lending.types";

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
const quote = (overrides: Partial<LoanPaymentQuoteDto> = {}): LoanPaymentQuoteDto => ({
  loanId: loan.id, currency: loan.currency, asOfDate: "2026-02-01", totalPayoff: new Decimal("123.456789"),
  suggestedAmount: new Decimal("40.30"), remainingPrincipal: loan.remainingPrincipal, loanStatus: "Active",
  earlyPaymentPolicy: "AdvanceInstallments", installments: [
    { installmentId: "i2", number: 2, dueDate: "2026-01-01", outstandingPrincipal: new Decimal(20),
      outstandingRegularInterest: new Decimal(2), outstandingLateInterest: new Decimal("1.123456"), totalOutstanding: new Decimal("23.123456") },
  ], projectedInstallments: [], proposedAllocations: [], proposedEarlyPrincipalAmount: new Decimal(0),
  proposedEarlyPrincipalEffectiveDate: null, resultingPrincipal: loan.remainingPrincipal, resultingState: "Active", historicalSnapshots: [],
  ...overrides,
});
function click(tree: unknown, label: string) {
  const button = nodes(tree).find(item => item.props.type === "button" && text(item.props.children).trim() === label);
  if (!button) throw new Error(`Missing button ${label}`);
  (button.props.onClick as () => void)();
}
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
  it.each([["Lent", "Registrar cobro"], ["Borrowed", "Registrar pago de deuda"]] as const)("renders %s with a blank amount and deliberate account choice", (type, title) => {
    const tree = render({ loan: { ...loan, type } });
    expect(tree?.type).toBe(ResponsiveDrawer); expect(tree?.props.title).toBe(title);
    expect(text(tree)).toContain("Contacto de prueba"); expect(control(tree, "payment-amount").props.value).toBe("");
    expect(control(tree, "payment-date").props.value).toBe("2026-02-01");
    for (const label of [type === "Lent" ? "Cuenta de destino" : "Cuenta de origen", type === "Lent" ? "Fecha del cobro" : "Fecha del pago", "Nota", "Capital pendiente", "Cancelar"])
      expect(text(tree)).toContain(label);
  });

  it("uses real accessible fields and wires the footer submit button to the form", () => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain('role="dialog"'); expect(html).toContain('for="payment-amount"');
    expect(html).toContain('id="payment-amount"'); expect(html).toContain('data-slot="money-input"');
    expect(html).toContain('form="register-loan-payment-form"'); expect(html).toContain('type="date"');
  });

  it("keeps capital unchanged in the preview and submits the entered amount, account, date and trimmed note", async () => {
    let tree = render(); change(tree, "payment-amount", "0.10"); change(tree, "payment-account", "bob");
    change(tree, "payment-date", "2026-01-31"); change(tree, "payment-note", "  Recibo de prueba  "); tree = render();
    expect(text(tree)).toContain("100,30 BOB");
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith("loan-1", { amount: "0.1", accountId: "bob", paymentDate: "2026-01-31", note: "Recibo de prueba" });
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("allows a deliberate no-account collection and omits an empty optional note", async () => {
    let tree = render(); change(tree, "payment-amount", "100.30"); change(tree, "payment-account", "none"); change(tree, "payment-note", "   "); tree = render(); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith("loan-1", { amount: "100.3", paymentDate: "2026-02-01", accountId: undefined, note: undefined });
  });

  it("filters account currency and rejects incompatible selections", async () => {
    let tree = render(); expect(control(tree, "payment-account").props.options).toEqual([
      { value: "", label: "Seleccioná una opción" }, { value: "none", label: "(Sin movimiento en cuenta bancaria)" }, { value: "bob", label: "Cuenta BOB" },
    ]);
    change(tree, "payment-account", "usd"); tree = render(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    tree = render({ loan: { ...loan, id: "usd-loan", currency: "USD" } }); tree = render();
    expect(control(tree, "payment-account").props.value).toBe(""); expect(control(tree, "payment-amount").props.currency).toBe("$");
  });

  it("uses the local calendar day across a UTC date boundary", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    vi.setSystemTime(new Date("2026-02-01T02:00:00Z"));
    expect(control(render(), "payment-date").props.value).toBe("2026-01-31");
    if (previousTimezone === undefined) delete process.env.TZ; else process.env.TZ = previousTimezone;
  });

  it("allows six decimals without account movement but enforces account currency precision and numeric bounds", async () => {
    let tree = render(); change(tree, "payment-amount", "1.123456"); change(tree, "payment-account", "none"); tree = render();
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: "1.123456", accountId: undefined }));
    tree = render(); change(tree, "payment-amount", "1.123"); change(tree, "payment-account", "bob"); tree = render(); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledOnce();
    expect(text(tree)).toContain("Ingresá un monto positivo");
  });

  it("preserves valid numeric(20,6) precision and normalizes the submitted decimal string", async () => {
    let tree = render(); change(tree, "payment-amount", "99999999999999.999999"); change(tree, "payment-account", "none"); tree = render();
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: "99999999999999.999999", accountId: undefined }));
  });

  it("normalizes trailing decimal zeros in the submitted amount", async () => {
    let tree = render(); change(tree, "payment-amount", "200.000000"); change(tree, "payment-account", "none"); tree = render();
    await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: "200", accountId: undefined }));
  });

  it("rejects amounts beyond numeric(20,6)", async () => {
    let tree = render(); change(tree, "payment-amount", "999999999999999"); change(tree, "payment-account", "none"); tree = render(); await submit(tree);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it.each([["payment-amount", "0"], ["payment-amount", "-1"], ["payment-amount", ""], ["payment-amount", "NaN"],
    ["payment-amount", "Infinity"], ["payment-amount", "0.001"], ["payment-date", ""], ["payment-date", "2026-02-30"]])("rejects invalid %s=%s", async (id, value) => {
    let tree = render(); change(tree, "payment-account", "bob"); change(tree, id, value); tree = render(); await submit(tree); expect(props.onSubmit).not.toHaveBeenCalled();
    expect(nodes(tree).find(item => item.props.type === "submit")!.props.disabled).toBe(true);
  });

  it("allows a partial/interest-inclusive amount without predicting capital allocation", async () => {
    let tree = render({ loan: { ...loan, template: "FixedInstallment", interestRate: 0.12 } });
    change(tree, "payment-amount", "110.30"); tree = render();
    expect(text(tree)).toContain("100,30 BOB"); expect(text(tree)).toContain("mora"); expect(text(tree)).not.toContain("Capital restante después");
    change(tree, "payment-account", "none"); tree = render(); await submit(tree); expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: "110.3" }));
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
    let tree = render(); change(tree, "payment-amount", "25.50"); change(tree, "payment-account", "none"); tree = render(); const first = submit(tree); await submit(tree);
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
    expect(control(tree, "payment-amount").props.value).toBe(""); expect(control(tree, "payment-account").props.value).toBe(""); expect(control(tree, "payment-note").props.value).toBe("");
    change(tree, "payment-amount", "10"); tree = render({ loan: { ...loan, id: "loan-2", remainingPrincipal: new Decimal("55.25") } }); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe(""); expect(control(tree, "payment-account").props.value).toBe("");
  });

  it("does not close a newly selected loan when an earlier loan's payment completes", async () => {
    let resolve!: (value: unknown) => void;
    props.onSubmit = vi.fn(() => new Promise(done => { resolve = done; }));
    let tree = render(); change(tree, "payment-amount", "1"); change(tree, "payment-account", "none"); tree = render();
    const pending = submit(tree); render({ loan: { ...loan, id: "loan-2" } });
    resolve({}); await pending; expect(props.onClose).not.toHaveBeenCalled();
  });

  it("prefills the selected installment's exact dated outstanding amount, including late interest", async () => {
    const onGetQuote = vi.fn().mockResolvedValue(quote());
    render({ onGetQuote, installmentNumber: 2 }); await Promise.resolve(); const tree = render();
    expect(onGetQuote).toHaveBeenCalledExactlyOnceWith("loan-1", "2026-02-01");
    expect(control(tree, "payment-amount").props.value).toBe("23.123456");
    expect(text(tree)).toContain("23,123456 BOB"); expect(text(tree)).toContain("Incluye intereses de mora");
    expect(text(tree)).toContain("Saldo total para cancelar:"); expect(text(tree)).toContain("123,456789 BOB");
    expect(text(tree)).toContain("pendientes más antiguas");
  });

  it("uses the suggested oldest installment and offers explicit suggested/payoff chips", async () => {
    const onGetQuote = vi.fn().mockResolvedValue(quote());
    render({ onGetQuote }); await Promise.resolve(); let tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("40.3");
    click(tree, "Cancelar total"); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("123.456789");
    change(tree, "payment-account", "none"); tree = render(); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: "123.456789" }));
    click(tree, "Cuota sugerida"); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("40.3");
  });

  it("renders live distribution preview when amount is entered (e.g. 100 BOB on 89.12 BOB installment)", async () => {
    const multiInstallmentQuote = quote({
      installments: [
        { installmentId: "i1", number: 1, dueDate: "2026-02-01", outstandingPrincipal: new Decimal("70"),
          outstandingRegularInterest: new Decimal("19.12"), outstandingLateInterest: new Decimal(0), totalOutstanding: new Decimal("89.12") },
        { installmentId: "i2", number: 2, dueDate: "2026-03-01", outstandingPrincipal: new Decimal("71.12"),
          outstandingRegularInterest: new Decimal("18"), outstandingLateInterest: new Decimal(0), totalOutstanding: new Decimal("89.12") },
      ],
      earlyPaymentPolicy: "AdvanceInstallments",
    });
    render({ onGetQuote: vi.fn().mockResolvedValue(multiInstallmentQuote) });
    await Promise.resolve();
    let tree = render();
    change(tree, "payment-amount", "100.00");
    tree = render();
    expect(text(tree)).toContain("Distribución prevista del monto");
    expect(text(tree)).toContain("Cancelada 100%");
    expect(text(tree)).toContain("Abono parcial");
    expect(text(tree)).toContain("Falta 78,24 BOB");
  });

  it.each([null, new Decimal(0)])("falls back to total payoff when suggestion is %s and the selected installment is missing", async suggestedAmount => {
    render({ installmentNumber: 99, onGetQuote: vi.fn().mockResolvedValue(quote({ suggestedAmount })) });
    await Promise.resolve(); const tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("123.456789");
    expect(text(tree)).not.toContain("Cuota sugerida");
  });

  it("updates an automatic amount on date change but preserves manual edits and deliberate clearing", async () => {
    const onGetQuote = vi.fn().mockResolvedValueOnce(quote()).mockResolvedValue(quote({ suggestedAmount: new Decimal(50) }));
    render({ onGetQuote }); await Promise.resolve(); let tree = render();
    change(tree, "payment-date", "2026-02-02"); render(); await Promise.resolve(); tree = render();
    expect(onGetQuote).toHaveBeenLastCalledWith("loan-1", "2026-02-02");
    expect(control(tree, "payment-amount").props.value).toBe("50");
    change(tree, "payment-amount", "12.345600"); change(tree, "payment-date", "2026-02-03"); render(); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("12.345600");
    change(tree, "payment-amount", ""); change(tree, "payment-date", "2026-02-04"); render(); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("");
  });

  it("preserves an amount typed while the initial quote is pending", async () => {
    let resolve!: (value: LoanPaymentQuoteDto) => void;
    let tree = render({ onGetQuote: vi.fn(() => new Promise(done => { resolve = done; })) });
    change(tree, "payment-amount", "17.50"); resolve(quote()); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("17.50");
  });

  it("ignores stale quotes after date changes, loan switches and close/reopen", async () => {
    const resolvers: ((value: LoanPaymentQuoteDto) => void)[] = [];
    const onGetQuote = vi.fn(() => new Promise<LoanPaymentQuoteDto>(done => resolvers.push(done)));
    let tree = render({ onGetQuote }); change(tree, "payment-date", "2026-02-02"); render();
    resolvers[1](quote({ suggestedAmount: new Decimal(50) })); await Promise.resolve();
    resolvers[0](quote()); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("50");
    tree = render({ loan: { ...loan, id: "loan-2" } }); render({ isOpen: false }); render({ isOpen: true });
    resolvers[2](quote({ loanId: "loan-2", suggestedAmount: new Decimal(99) })); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("");
    resolvers[3](quote({ loanId: "loan-2", suggestedAmount: new Decimal(60) })); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("60");
  });

  it("shows a safe quote error, blocks submission and supports retry without losing input", async () => {
    const onGetQuote = vi.fn().mockRejectedValueOnce(new Error("private data")).mockResolvedValue(quote());
    let tree = render({ onGetQuote }); change(tree, "payment-amount", "15"); change(tree, "payment-account", "none");
    await Promise.resolve(); tree = render(); await submit(tree);
    expect(props.onSubmit).not.toHaveBeenCalled(); expect(text(tree)).toContain("No se pudo consultar el saldo");
    expect(text(tree)).not.toContain("private data");
    click(tree, "Reintentar cotización"); render(); await Promise.resolve(); tree = render();
    expect(control(tree, "payment-amount").props.value).toBe("15");
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("allows interest-only outstanding debt even when remaining principal is zero", async () => {
    render({ loan: { ...loan, type: "Borrowed", remainingPrincipal: new Decimal(0) },
      onGetQuote: vi.fn().mockResolvedValue(quote({ totalPayoff: new Decimal(30), suggestedAmount: new Decimal(30), remainingPrincipal: new Decimal(0) })) });
    await Promise.resolve(); let tree = render(); change(tree, "payment-account", "bob"); tree = render();
    expect(text(tree)).toContain("Resumen del pago"); expect(text(tree)).not.toContain("Monto cobrado");
    await submit(tree); expect(props.onSubmit).toHaveBeenCalledWith("loan-1", expect.objectContaining({ amount: "30", accountId: "bob" }));
  });

  it("does not request a quote for a closed modal or invalid date", async () => {
    const onGetQuote = vi.fn().mockResolvedValue(quote());
    render({ isOpen: false, onGetQuote }); expect(onGetQuote).not.toHaveBeenCalled();
    let tree = render({ isOpen: true }); await Promise.resolve(); tree = render();
    change(tree, "payment-date", "2026-02-30"); render(); await Promise.resolve();
    expect(onGetQuote).toHaveBeenCalledOnce();
  });

  it("cancels without writing", () => {
    const tree = render(); (nodes(tree).find(item => text(item.props.children).trim() === "Cancelar")!.props.onClick as () => void)();
    expect(props.onClose).toHaveBeenCalledOnce(); expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
