import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDto, RegisterTransferRequest } from "../domain/ledger.types";
const slots: unknown[] = []; let cursor = 0;
const refs: Array<{ current: unknown }> = []; let refCursor = 0;
vi.mock("react", async (importOriginal) => { const actual = await importOriginal<typeof import("react")>(); return { ...actual, useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: unknown) => { slots[i] = typeof value === "function" ? (value as (old: unknown) => unknown)(slots[i]) : value; }]; }, useRef: (initial: unknown) => { const i = refCursor++; refs[i] ||= { current: initial }; return refs[i]; } }; });
import { MovementTransferModal } from "./MovementTransferModal";
const accounts = [
  { id: "bob", name: "Caja BOB", currency: "BOB" },
  { id: "usd", name: "Ahorro USD", currency: "USD" },
] as AccountDto[];
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const item = tree as { type?: unknown; props?: Record<string, unknown> }; const props = item.props || {}; const children = typeof props.children === "function" ? (props.children as (control: Record<string, unknown>) => unknown)({ id: "test-field" }) : props.children; return [{ type: item.type, props }, ...nodes(children), ...nodes(props.footer)]; }
function text(tree: unknown): string { if (Array.isArray(tree)) return tree.map(text).join(" "); if (!tree || typeof tree !== "object") return String(tree ?? ""); const props = (tree as { props?: { children?: unknown; title?: unknown; footer?: unknown } }).props; return `${text(props?.title)} ${text(props?.children)} ${text(props?.footer)}`; }
function render(onSubmit = vi.fn(async (_request: RegisterTransferRequest) => {}), onClose = vi.fn(), inputAccounts = accounts) { cursor = 0; refCursor = 0; return { tree: MovementTransferModal({ isOpen: true, accounts: inputAccounts, onClose, onSubmit }), onSubmit, onClose }; }
function find(tree: unknown, label: string) { const node = nodes(tree).find(n => n.props["aria-label"] === label); if (!node) throw new Error(`Missing ${label}`); return node; }
function setInput(tree: unknown, label: string, value: string) { const props = find(tree, label).props; if (typeof props.onValueChange === "function") (props.onValueChange as (value: string) => void)(value); else (props.onChange as (event: unknown) => void)({ target: { value } }); }
function submit(tree: unknown) { const form = nodes(tree).find(n => n.props.id === "movement-transfer-form"); if (!form) throw new Error("Missing transfer form"); return (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: () => {} }); }
beforeEach(() => { slots.splice(0); refs.splice(0); });
describe("MovementTransferModal", () => {
  it.each(["BOB", "USD"])("submits a January local date/time in a BOB → %s transfer payload", async currency => {
    const inputAccounts = [accounts[0], { ...accounts[1], currency }];
    let view = render(undefined, undefined, inputAccounts);
    setInput(view.tree, "Monto origen", "100.01");
    if (currency === "USD") setInput(view.tree, "Tasa manual BOB por USD", "7.13");
    expect(find(view.tree, "Fecha").props.type).toBe("date");
    setInput(view.tree, "Fecha", "2027-01-15");
    view = render(view.onSubmit, view.onClose, inputAccounts);
    expect(find(view.tree, "Hora").props.type).toBe("time");
    setInput(view.tree, "Hora", "09:30");
    view = render(view.onSubmit, view.onClose, inputAccounts);
    await submit(view.tree);
    expect(view.onSubmit).toHaveBeenCalledExactlyOnceWith({
      sourceAccountId: "bob", destinationAccountId: "usd", sourceAmount: "100.01",
      destinationAmount: currency === "USD" ? "14.03" : "100.01", description: undefined,
      ...(currency === "USD" ? { appliedRate: "7.130000", rateSource: "Manual" } : {}),
      occurredAt: new Date(2027, 0, 15, 9, 30).toISOString(),
    });
    expect(view.onClose).toHaveBeenCalledOnce();
  });

  it("omits an unselected or cleared date so the server retains its current-time default", async () => {
    let view = render();
    setInput(view.tree, "Monto origen", "100.01");
    setInput(view.tree, "Tasa manual BOB por USD", "7.13");
    setInput(view.tree, "Fecha", "2027-01-15");
    view = render(view.onSubmit, view.onClose);
    setInput(view.tree, "Fecha", "");
    view = render(view.onSubmit, view.onClose);
    await submit(view.tree);
    expect(view.onSubmit).toHaveBeenCalledOnce();
    expect(view.onSubmit.mock.calls[0][0]).not.toHaveProperty("occurredAt");
    expect(view.onClose).toHaveBeenCalledOnce();
  });

  it("requires an explicit Manual quote for foreign currencies and submits exact decimal strings", async () => {
    let view = render();
    expect(text(view.tree)).toContain("Tasa manual");
    setInput(view.tree, "Monto origen", "100.01");
    setInput(view.tree, "Tasa manual BOB por USD", "7.13");
    view = render(view.onSubmit);
    expect(text(view.tree)).toContain("Monto destino calculado");
    submit(view.tree); await Promise.resolve();
    expect(view.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ sourceAccountId: "bob", destinationAccountId: "usd", sourceAmount: "100.01", destinationAmount: "14.03", appliedRate: "7.130000", rateSource: "Manual" }));
    expect(view.onClose).toHaveBeenCalledOnce();
    expect(view.onSubmit.mock.calls[0][0]).not.toHaveProperty("occurredAt");
  });

  it("locks pending submissions and retains entered values after a server error", async () => {
    let reject!: (reason: Error) => void; const pending = new Promise<void>((_resolve,rejectPromise)=>{reject=rejectPromise;});
    const submitTransfer = vi.fn((_request: RegisterTransferRequest) => pending); let view = render(submitTransfer);
    setInput(view.tree, "Monto origen", "100.01"); setInput(view.tree, "Tasa manual BOB por USD", "7.13");
    setInput(view.tree, "Fecha", "2027-01-15"); view = render(submitTransfer);
    setInput(view.tree, "Hora", "09:30"); view = render(submitTransfer);
    const form = nodes(view.tree).find(n => n.props.id === "movement-transfer-form"); const pendingCall = (form?.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: () => {} });
    view = render(submitTransfer); const disabledButton = nodes(view.tree).find(n => text(n.props.children) === "Guardando…"); expect(disabledButton?.props.disabled).toBe(true);
    (nodes(view.tree).find(n => n.props.id === "movement-transfer-form")?.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: () => {} }); expect(submitTransfer).toHaveBeenCalledOnce();
    reject(new Error("offline")); await pendingCall; view = render(submitTransfer);
    expect(text(view.tree)).toContain("offline"); expect(find(view.tree,"Monto origen").props.value).toBe("100.01"); expect(view.onClose).not.toHaveBeenCalled();
    expect(find(view.tree, "Fecha").props.value).toBe("2027-01-15");
    expect(find(view.tree, "Hora").props.value).toBe("09:30");
  });
});
