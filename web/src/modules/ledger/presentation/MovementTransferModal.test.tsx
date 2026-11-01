import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDto } from "../domain/ledger.types";
const slots: unknown[] = []; let cursor = 0;
const refs: Array<{ current: unknown }> = []; let refCursor = 0;
vi.mock("react", async (importOriginal) => { const actual = await importOriginal<typeof import("react")>(); return { ...actual, useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: unknown) => { slots[i] = typeof value === "function" ? (value as (old: unknown) => unknown)(slots[i]) : value; }]; }, useRef: (initial: unknown) => { const i = refCursor++; refs[i] ||= { current: initial }; return refs[i]; } }; });
import { MovementTransferModal } from "./MovementTransferModal";
const accounts = [
  { id: "bob", name: "Caja BOB", currency: "BOB" },
  { id: "usd", name: "Ahorro USD", currency: "USD" },
] as AccountDto[];
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const item = tree as { type?: unknown; props?: Record<string, unknown> }; const props = item.props || {}; return [{ type: item.type, props }, ...nodes(props.children)]; }
function text(tree: unknown): string { if (Array.isArray(tree)) return tree.map(text).join(" "); if (!tree || typeof tree !== "object") return String(tree ?? ""); return text((tree as { props?: { children?: unknown } }).props?.children); }
function render(onSubmit = vi.fn(async () => {}), onClose = vi.fn()) { cursor = 0; refCursor = 0; return { tree: MovementTransferModal({ isOpen: true, accounts, onClose, onSubmit }), onSubmit, onClose }; }
function find(tree: unknown, label: string) { const node = nodes(tree).find(n => n.props["aria-label"] === label); if (!node) throw new Error(`Missing ${label}`); return node; }
function setInput(tree: unknown, label: string, value: string) { (find(tree,label).props.onChange as (event: unknown)=>void)({ target: { value } }); }
function submit(tree: unknown) { const node = nodes(tree).find(n => n.type === "button" && text(n.props.children) === "Guardar transferencia"); if (!node) throw new Error("Missing save button"); (node.props.onClick as () => void)(); }
beforeEach(() => { slots.splice(0); refs.splice(0); });
describe("MovementTransferModal", () => {
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
  });

  it("locks pending submissions and retains entered values after a server error", async () => {
    let reject!: (reason: Error) => void; const pending = new Promise<void>((_resolve,rejectPromise)=>{reject=rejectPromise;});
    const submitTransfer = vi.fn(() => pending); let view = render(submitTransfer);
    setInput(view.tree, "Monto origen", "100.01"); setInput(view.tree, "Tasa manual BOB por USD", "7.13"); view = render(submitTransfer);
    const button = nodes(view.tree).find(n=>n.type === "button" && text(n.props.children) === "Guardar transferencia"); const pendingCall = (button?.props.onClick as () => Promise<void>)();
    view = render(submitTransfer); const disabledButton = nodes(view.tree).find(n=>n.type === "button" && text(n.props.children) === "Guardando…"); expect(disabledButton?.props.disabled).toBe(true);
    (disabledButton?.props.onClick as () => Promise<void>)(); expect(submitTransfer).toHaveBeenCalledOnce();
    reject(new Error("offline")); await pendingCall; view = render(submitTransfer);
    expect(text(view.tree)).toContain("offline"); expect(find(view.tree,"Monto origen").props.value).toBe("100.01"); expect(view.onClose).not.toHaveBeenCalled();
  });
});
