import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDto } from "../domain/ledger.types";
import { Movement } from "../domain/movement";

const api = vi.hoisted(() => ({ registerTransaction: vi.fn(), registerTransfer: vi.fn(), updateTransaction: vi.fn(), correctTransfer: vi.fn(), reverseTransaction: vi.fn() }));
vi.mock("../infrastructure/ledger-api.repository", () => ({ LedgerApiRepository: class { registerTransaction = api.registerTransaction; registerTransfer = api.registerTransfer; updateTransaction = api.updateTransaction; correctTransfer = api.correctTransfer; reverseTransaction = api.reverseTransaction; } }));
vi.mock("../application/CategoriesContext", () => ({ useUserCategories: () => ({ categories: [{ id: "category-a", name: "Food" }] }) }));
const slots: unknown[] = []; const refs: Array<{ current: unknown }> = []; let cursor = 0; let refCursor = 0;
vi.mock("react", async (importOriginal) => { const actual = await importOriginal<typeof import("react")>(); return { ...actual, useState: (initial: unknown) => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? (value as (old: unknown) => unknown)(slots[index]) : value; }]; }, useEffect: () => {}, useMemo: (fn: () => unknown) => fn(), useRef: (initial: unknown) => { const index = refCursor++; refs[index] ||= { current: initial }; return refs[index]; } }; });
import { MovementActions } from "./MovementActions";

const account = { id: "account-a", name: "Cash", type: "Cash", currency: "BOB", balance: 0, createdAt: "2026-01-01" } as unknown as AccountDto;
const transfer = { id: "logical-transfer-id", kind: "Transfer", amount: "10", currency: "BOB", direction: "Expense", occurredAt: "2026-05-01T10:00:00Z", accountId: "account-a", accountName: "Cash", isReversal: false, legs: [{ id: "out-leg-id", accountId: "account-a", accountName: "Cash", amount: "10", currency: "BOB", direction: "Expense" }, { id: "in-leg-id", accountId: "account-b", accountName: "Bank", amount: "10", currency: "BOB", direction: "Income" }], allocations: [] } as unknown as Movement;
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const element = tree as { type?: unknown; props?: Record<string, unknown> }; const props = element.props || {}; return [{ type: element.type, props }, ...nodes(props.children)]; }
function text(tree: unknown): string { if (Array.isArray(tree)) return tree.map(text).join(" "); if (!tree || typeof tree !== "object") return String(tree ?? ""); return text((tree as { props?: { children?: unknown } }).props?.children); }
function render(onComplete = vi.fn(async () => {}), movement: Movement = transfer, auditMode = false) { cursor = 0; refCursor = 0; return { tree: MovementActions({ http: {} as never, movement, accounts: [account], auditMode, onComplete }), onComplete }; }
function click(tree: unknown, label: string) { const node = nodes(tree).find(n => text(n.props.children) === label); if (!node) throw new Error(`Missing button ${label}`); (node.props.onClick as () => void)(); }
function find(tree: unknown, label: string) { const node = nodes(tree).find(n => n.props["aria-label"] === label); if (!node) throw new Error(`Missing ${label}`); return node; }
function setValue(tree: unknown, label: string, value: string) { (find(tree,label).props.onChange as (event: unknown)=>void)({ target: { value } }); }
const expense = { ...transfer, id: "ordinary-id", kind: "Expense", amount: "10", categoryId: "category-a", legs: [] } as unknown as Movement;
beforeEach(() => { slots.splice(0); refs.splice(0); Object.values(api).forEach(fn => fn.mockReset()); });

describe("MovementActions", () => {
  it("offers investment cash reversal only after explicit confirmation using the selected ledger transaction id", async () => {
    const reverseInvestmentCash = vi.fn().mockResolvedValue(undefined);
    const investment = { ...expense, id: "selected-cash-transaction", kind: "Investment", investmentId: "investment-a", investmentCashKind: "Contribution" } as unknown as Movement;
    let view = render(vi.fn(async()=>{}), investment);
    // Supply the coordinated investment reversal handler through the component props.
    cursor = 0; refCursor = 0;
    view = { ...view, tree: MovementActions({ http: {} as never, movement: investment, accounts: [account], onComplete: view.onComplete, reverseInvestmentCash }) };
    const available = nodes(view.tree).filter(n => n.type === "button").map(n => text(n.props.children));
    expect(available).toContain("Revertir aporte/retiro"); expect(available).not.toContain("Editar movimiento"); expect(available).not.toContain("Duplicar");
    click(view.tree, "Revertir aporte/retiro"); cursor = 0; refCursor = 0; view = { ...view, tree: MovementActions({ http: {} as never, movement: investment, accounts: [account], onComplete: view.onComplete, reverseInvestmentCash }) };
    expect(reverseInvestmentCash).not.toHaveBeenCalled();
    click(view.tree, "Confirmar reversión"); await Promise.resolve(); await Promise.resolve();
    expect(reverseInvestmentCash).toHaveBeenCalledWith("selected-cash-transaction"); expect(view.onComplete).toHaveBeenCalledOnce();
  });

  it("opens a duplicate draft without writing until explicit save and uses logical transfer id for correction", async () => {
    let view = render(); click(view.tree, "Duplicar"); view = render(view.onComplete);
    expect(text(view.tree)).toContain("Duplicar movimiento"); expect(api.registerTransfer).not.toHaveBeenCalled();
    click(view.tree, "Guardar copia"); await Promise.resolve(); await Promise.resolve();
    expect(api.registerTransfer).toHaveBeenCalledWith(expect.objectContaining({ sourceAccountId: "account-a", destinationAccountId: "account-b", sourceAmount: "10", destinationAmount: "10" }));
    expect(view.onComplete).toHaveBeenCalledOnce();
    slots.splice(0); view = render(); click(view.tree, "Editar movimiento"); view = render(view.onComplete);
    click(view.tree, "Guardar cambios"); await Promise.resolve(); await Promise.resolve();
    expect(api.correctTransfer).toHaveBeenCalledWith("logical-transfer-id", expect.objectContaining({ sourceAccountId: "account-a", destinationAccountId: "account-b" }));
    expect(api.correctTransfer.mock.calls[0][0]).not.toBe("out-leg-id");
  });

  it("locks repeated clicks while an atomic transfer correction is pending", async () => {
    let resolve!: (value: unknown) => void; const pending = new Promise<unknown>(res=>{resolve=res}); api.correctTransfer.mockReturnValue(pending);
    let view = render(); click(view.tree, "Editar movimiento"); view = render(view.onComplete);
    const save = nodes(view.tree).find(n=>text(n.props.children) === "Guardar cambios"); const request = (save?.props.onClick as () => Promise<void>)();
    view = render(view.onComplete); const pendingButton = nodes(view.tree).find(n=>text(n.props.children) === "Guardando…"); expect(pendingButton?.props.disabled).toBe(true);
    (pendingButton?.props.onClick as () => Promise<void>)(); expect(api.correctTransfer).toHaveBeenCalledOnce();
    resolve({ outflowId: "new-out", inflowId: "new-in" }); await request; expect(view.onComplete).toHaveBeenCalledOnce();
  });

  it("requires confirmation before reversing and sends the logical transfer ID", async () => {
    let view = render(); click(view.tree, "Revertir movimiento"); view = render(view.onComplete);
    expect(api.reverseTransaction).not.toHaveBeenCalled();
    expect(text(view.tree)).toContain("No se elimina ningún registro");
    click(view.tree, "Confirmar reversión"); await Promise.resolve(); await Promise.resolve();
    expect(api.reverseTransaction).toHaveBeenCalledWith("logical-transfer-id", "Reversión solicitada por el usuario");
    expect(view.onComplete).toHaveBeenCalledOnce();
  });

  it("blocks an invalid split total and keeps the form open with errors", async () => {
    let view = render(vi.fn(async()=>{}), expense); click(view.tree, "Dividir en categorías"); view = render(view.onComplete, expense);
    click(view.tree, "Agregar categoría"); view = render(view.onComplete, expense);
    setValue(view.tree, "Categoría asignación 1", "category-a"); setValue(view.tree, "Monto asignación 1", "9.99"); view = render(view.onComplete, expense);
    const save = nodes(view.tree).find(n => text(n.props.children) === "Guardar cambios"); expect(save?.props.disabled).toBe(true);
    expect(api.updateTransaction).not.toHaveBeenCalled();
    setValue(view.tree, "Monto asignación 1", "10.00"); view = render(view.onComplete, expense);
    const validSave = nodes(view.tree).find(n=>text(n.props.children) === "Guardar cambios"); expect(validSave?.props.disabled).toBe(false);
    await (validSave?.props.onClick as () => Promise<void>)();
    expect(api.updateTransaction).toHaveBeenCalledWith("ordinary-id", expect.objectContaining({ allocations: [{ categoryId: "category-a", amount: "10.00" }], categoryId: undefined }));
    api.updateTransaction.mockRejectedValueOnce(new Error("conflict"));
    // A normal edit demonstrates that a failed financial write does not dismiss the draft or claim success.
    slots.splice(0); refs.splice(0); view = render(vi.fn(async()=>{}), expense); click(view.tree, "Editar movimiento"); view = render(view.onComplete, expense);
    click(view.tree, "Guardar cambios"); await Promise.resolve(); await Promise.resolve();
    view = render(view.onComplete, expense);
    expect(nodes(view.tree).some(n => n.props.role === "alert" && text(n.props.children).includes("conflict"))).toBe(true);
    expect(nodes(view.tree).some(n => n.props.role === "dialog")).toBe(true);
    expect(view.onComplete).not.toHaveBeenCalled();
  });

  it("keeps audit history read-only except for creating a duplicate draft", () => {
    const view = render(vi.fn(async()=>{}), transfer, true);
    const labels = nodes(view.tree).filter(n => n.type === "button").map(n => text(n.props.children));
    expect(labels).toContain("Duplicar"); expect(labels).not.toContain("Editar movimiento"); expect(labels).not.toContain("Revertir movimiento");
  });
});
