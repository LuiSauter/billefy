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
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const element = tree as { type?: unknown; props?: Record<string, unknown> }; const props = element.props || {}; const children = typeof props.children === "function" ? (props.children as (control: Record<string, unknown>) => unknown)({ id: "test-field" }) : props.children; return [{ type: element.type, props }, ...nodes(children), ...nodes(props.footer)]; }
function text(tree: unknown): string { if (Array.isArray(tree)) return tree.map(text).join(" "); if (!tree || typeof tree !== "object") return String(tree ?? ""); const props = (tree as { props?: { children?: unknown; title?: unknown; footer?: unknown } }).props; return `${text(props?.title)} ${text(props?.children)} ${text(props?.footer)}`; }
function render(onComplete = vi.fn(async () => {}), movement: Movement = transfer, auditMode = false) { cursor = 0; refCursor = 0; return { tree: MovementActions({ http: {} as never, movement, accounts: [account], auditMode, onComplete }), onComplete }; }
function click(tree: unknown, label: string) { const node = nodes(tree).find(n => text(n.props.children) === label); if (!node) throw new Error(`Missing button ${label}`); if (node.props.form === "movement-action-form") { const form = nodes(tree).find(n => n.props.id === node.props.form); (form?.props.onSubmit as (event: unknown) => void)({ preventDefault: () => {} }); } else (node.props.onClick as () => void)(); }
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
    const available = nodes(view.tree).filter(n => typeof n.props.onClick === "function").map(n => text(n.props.children));
    expect(available).toContain("Revertir aporte/retiro"); expect(available).not.toContain("Editar transacción"); expect(available).not.toContain("Duplicar");
    click(view.tree, "Revertir aporte/retiro"); cursor = 0; refCursor = 0; view = { ...view, tree: MovementActions({ http: {} as never, movement: investment, accounts: [account], onComplete: view.onComplete, reverseInvestmentCash }) };
    expect(reverseInvestmentCash).not.toHaveBeenCalled();
    click(view.tree, "Confirmar reversión"); await Promise.resolve(); await Promise.resolve();
    expect(reverseInvestmentCash).toHaveBeenCalledWith("selected-cash-transaction"); expect(view.onComplete).toHaveBeenCalledOnce();
  });

  it("opens a duplicate draft without writing until explicit save and uses logical transfer id for correction", async () => {
    let view = render(); click(view.tree, "Duplicar"); view = render(view.onComplete);
    expect(text(view.tree)).toContain("Duplicar transacción"); expect(api.registerTransfer).not.toHaveBeenCalled();
    click(view.tree, "Guardar copia"); await Promise.resolve(); await Promise.resolve();
    expect(api.registerTransfer).toHaveBeenCalledWith(expect.objectContaining({ sourceAccountId: "account-a", destinationAccountId: "account-b", sourceAmount: "10", destinationAmount: "10" }));
    expect(view.onComplete).toHaveBeenCalledOnce();
    slots.splice(0); view = render(); click(view.tree, "Editar transacción"); view = render(view.onComplete);
    click(view.tree, "Guardar cambios"); await Promise.resolve(); await Promise.resolve();
    expect(api.correctTransfer).toHaveBeenCalledWith("logical-transfer-id", expect.objectContaining({ sourceAccountId: "account-a", destinationAccountId: "account-b" }));
    expect(api.correctTransfer.mock.calls[0][0]).not.toBe("out-leg-id");
  });

  it("locks repeated clicks while an atomic transfer correction is pending", async () => {
    let resolve!: (value: unknown) => void; const pending = new Promise<unknown>(res=>{resolve=res}); api.correctTransfer.mockReturnValue(pending);
    let view = render(); click(view.tree, "Editar transacción"); view = render(view.onComplete);
    const form = nodes(view.tree).find(n => n.props.id === "movement-action-form"); const request = (form?.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: () => {} });
    view = render(view.onComplete); const pendingButton = nodes(view.tree).find(n => text(n.props.children) === "Guardando…"); expect(pendingButton?.props.disabled).toBe(true);
    (nodes(view.tree).find(n => n.props.id === "movement-action-form")?.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: () => {} }); expect(api.correctTransfer).toHaveBeenCalledOnce();
    resolve({ outflowId: "new-out", inflowId: "new-in" }); await request; expect(view.onComplete).toHaveBeenCalledOnce();
  });

  it("requires confirmation before reversing and sends the logical transfer ID", async () => {
    let view = render(); click(view.tree, "Revertir transacción"); view = render(view.onComplete);
    expect(api.reverseTransaction).not.toHaveBeenCalled();
    expect(text(view.tree)).toContain("No se elimina ningún registro");
    click(view.tree, "Confirmar reversión"); await Promise.resolve(); await Promise.resolve();
    expect(api.reverseTransaction).toHaveBeenCalledWith("logical-transfer-id", "Reversión solicitada por el usuario");
    expect(view.onComplete).toHaveBeenCalledOnce();
  });

  it("triggers onEdit handler when provided for standard edit modal", () => {
    const onEdit = vi.fn();
    cursor = 0; refCursor = 0;
    const tree = MovementActions({ http: {} as never, movement: expense, accounts: [account], onComplete: vi.fn(async()=>{}), onEdit });
    click(tree, "Editar transacción");
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("keeps audit history read-only except for creating a duplicate draft", () => {
    const view = render(vi.fn(async()=>{}), transfer, true);
    const labels = nodes(view.tree).filter(n => typeof n.props.onClick === "function").map(n => text(n.props.children));
    expect(labels).toContain("Duplicar"); expect(labels).not.toContain("Editar transacción"); expect(labels).not.toContain("Revertir transacción");
  });
});
