import { beforeEach, describe, expect, it, vi } from "vitest";
import { MovementPage, parseMovementPage } from "../domain/movement";
import { AccountDto } from "../domain/ledger.types";

const { slots, getMovements, reloadMovements, screenState } = vi.hoisted(() => ({ slots: [] as unknown[], getMovements: vi.fn(), reloadMovements: vi.fn(), screenState: { loading: false, error: null as string | null, data: null as unknown } }));
let cursor = 0;
vi.mock("react", async (importOriginal) => { const actual = await importOriginal<typeof import("react")>(); return { ...actual, useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: unknown) => { slots[i] = typeof value === "function" ? (value as (old: unknown) => unknown)(slots[i]) : value; }]; }, useMemo: (fn: () => unknown) => fn(), useEffect: () => {} }; });
vi.mock("../application/useMovements", () => ({ useMovements: (_http: unknown, query: unknown) => { getMovements(query); return { data: screenState.data ?? pageData, loading: screenState.loading, error: screenState.error, reload: reloadMovements }; } }));
vi.mock("../application/CategoriesContext", () => ({ useUserCategories: () => ({ categories: [{ id: "cat-1", name: "Comida" }, { id: "cat-2", name: "Casa" }] }) }));
import { MovimientosView } from "./MovimientosView";

const pageData: MovementPage = parseMovementPage({ page: 1, pageSize: 10, totalCount: 11, summary: [{ currency: "BOB", income: "20", expenses: "8.25", transferOut: "2", transferIn: "3", contributions: "4", disposals: "5" }, { currency: "USD", income: "5", expenses: "2", transferOut: "6", transferIn: "7", contributions: "8", disposals: "9" }], items: [
  { id: "m1", kind: "Expense", amount: "8.25", currency: "BOB", direction: "Expense", occurredAt: "2026-03-04T10:00:00Z", accountId: "a1", accountName: "Banco", categoryId: "cat-1", categoryName: "Comida", description: "Compra", isReversal: false, legs: [], allocations: [{ categoryId: "cat-1", categoryName: "Comida", amount: "5.25" }, { categoryId: "cat-2", categoryName: "Casa", amount: "3.00" }] },
  { id: "m2", kind: "Transfer", amount: "10", currency: "USD", direction: "Expense", occurredAt: "2026-03-03T10:00:00Z", accountId: "a2", accountName: "Cuenta USD", description: "Transferencia", isReversal: false, legs: [{ id: "l1", accountId: "a2", accountName: "Cuenta USD", amount: "10", currency: "USD", direction: "Expense", appliedRate: 7, rateSource: "Manual" }, { id: "l2", accountId: "a3", accountName: "Cuenta BOB", amount: "70", currency: "BOB", direction: "Income", appliedRate: 7, rateSource: "Manual" }], allocations: [] },
  { id: "cash-tx", kind: "Investment", amount: "0.010001", currency: "USD", direction: "Expense", occurredAt: "2026-03-03T10:00:00Z", accountId: "a2", accountName: "Cuenta USD", investmentId: "inv-1", investmentCashKind: "Contribution", description: "Aporte", isReversal: false, legs: [], allocations: [] },
] });
const accounts = [{ id: "a1", name: "Banco", type: "Bank", currency: "BOB", balance: 0, createdAt: "2026-01-01" }] as unknown as AccountDto[];
const investmentsController = { investments: [{ id: "inv-1", name: "Bitcoin" }], recordCash: vi.fn(), reverseCash: vi.fn().mockResolvedValue({}), refreshAfterCash: vi.fn().mockResolvedValue(undefined) } as never;
function render(onRegister = vi.fn(), onRefresh?: () => Promise<void>, http: unknown = {}, selectedCurrency: "BOB" | "USD" = "BOB", p2pRate = 10) { cursor = 0; return MovimientosView({ http: http as never, accounts, onRegister, onRefresh, investmentsController, selectedCurrency, p2pRate }); }
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const element = tree as { type?: unknown; props?: Record<string, unknown> }; const props = element.props || {}; return [{ type: element.type, props }, ...nodes(props.children)]; }
function text(tree: unknown): string { if (Array.isArray(tree)) return tree.map(text).join(" "); if (tree === null || tree === undefined || typeof tree === "boolean") return ""; if (typeof tree !== "object") return String(tree); return text((tree as { props?: { children?: unknown } }).props?.children); }
function find(tree: unknown, predicate: (node: { type?: unknown; props: Record<string, unknown> }) => boolean) { const match = nodes(tree).find(predicate); if (!match) throw new Error(`Expected element not found in: ${text(tree)}`); return match; }
beforeEach(() => { slots.splice(0); getMovements.mockClear(); reloadMovements.mockClear(); screenState.loading = false; screenState.error = null; screenState.data = null; });

describe("MovimientosView interactions", () => {
  it("renders single selected currency totals (BOB or USD), full allocation and transfer-leg detail", () => {
    // 1. Render in BOB mode
    const treeBob = render(vi.fn(), undefined, {}, "BOB", 10);
    const htmlBob = text(treeBob);
    expect(htmlBob).toContain("Ingresos del mes");
    expect(htmlBob).toContain("Gastos del mes");
    expect(htmlBob).toContain("Transferencias");
    expect(htmlBob).toContain("Inversiones");
    expect(htmlBob).toContain("Bs. 70,00"); // 20 BOB + (5 USD * 10)
    expect(htmlBob).toContain("Bs. 28,25"); // 8.25 BOB + (2 USD * 10)
    expect(htmlBob).toContain("Bs. 62,00"); // 2 BOB + (6 USD * 10)
    expect(htmlBob).toContain("Bs. 84,00"); // 4 BOB + (8 USD * 10)
    expect(nodes(treeBob).filter(n => n.props["data-kpi-card"] === "true")).toHaveLength(4);

    // 2. Render in USD mode
    const treeUsd = render(vi.fn(), undefined, {}, "USD", 10);
    const htmlUsd = text(treeUsd);
    expect(htmlUsd).toContain("$ 7,00"); // (20 BOB / 10) + 5 USD
    expect(htmlUsd).toContain("$ 2,83"); // (8.25 BOB / 10) + 2 USD
    expect(htmlUsd).toContain("$ 6,20"); // (2 BOB / 10) + 6 USD
    expect(htmlUsd).toContain("$ 8,40"); // (4 BOB / 10) + 8 USD

    expect(htmlBob).toContain("Comida BOB 5.25");
    expect(htmlBob).toContain("Casa BOB 3.00");
    const description = find(treeBob, n => n.type === "h3");
    expect(description.props.children).toBe("Compra");

    // Move focus onto the transfer, then inspect both currency-specific legs.
    const rows = nodes(treeBob).filter(n => n.props.tabIndex === 0);
    (rows[1].props.onClick as () => void)();
    const transfer = render(vi.fn(), undefined, {}, "BOB", 10);
    expect(nodes(transfer).some(n => n.type === "b" && text(n.props.children).includes("Tramos de transferencia"))).toBe(true);
    expect(text(transfer)).toMatch(/Tasa\s+7\s+·\s+Manual/);
    expect(nodes(transfer).some(n => n.type === "b" && text(n.props.children).includes("Distribución por categoría"))).toBe(false);
    const transferText = text(transfer);
    expect(transferText).toMatch(/Cuenta USD\s*−\s*USD 10\.00/);
    expect(transferText).toMatch(/Cuenta BOB\s*\+\s*BOB 70\.00/);
  });

  it("shows investment cash linked to its investment and offers only linked reversal actions", async () => {
    let tree = render(); const rows = nodes(tree).filter(n => n.props.tabIndex === 0);
    (rows[2].props.onClick as () => void)(); tree = render();
    expect(text(tree)).toContain("Aporte de inversión"); expect(text(tree)).toContain("Bitcoin");
    const child = nodes(tree).find(n => typeof n.type === "function" && (n.props.movement as { kind?: string } | undefined)?.kind === "Investment")!;
    expect(child.props.reverseInvestmentCash).toBeTypeOf("function");
    await (child.props.reverseInvestmentCash as (id: string) => Promise<void>)("cash-tx");
    expect(investmentsController.reverseCash).toHaveBeenCalledWith("cash-tx");
  });

  it("shows loading, empty, and recoverable error states and calls the real register callback", () => {
    screenState.loading = true; screenState.data = { items: [], totalCount: 0, summary: [], page: 1, pageSize: 10 };
    const onRegister = vi.fn(); let tree = render(onRegister); expect(text(tree)).toContain("Cargando…");
    (find(tree, n => typeof n.props.onClick === "function" && text(n.props.children).includes("Registrar")).props.onClick as () => void)(); expect(onRegister).toHaveBeenCalledOnce();
    screenState.loading = false; tree = render(); expect(text(tree)).toContain("No hay transacciones para estos filtros.");
    screenState.error = "offline"; tree = render(); expect(find(tree, n => n.props.role === "alert")).toBeDefined();
    expect(text(tree)).toContain("Reintentar");
  });

  it("refreshes dashboard and movements after successful mutations, and reports refresh failures without retrying writes", async () => {
    const refresh = vi.fn(async()=>{}); let tree = render(vi.fn(), refresh);
    const action = nodes(tree).find(n=>typeof n.type === "function" && typeof n.props.onComplete === "function"); if (!action) throw new Error("MovementActions child not found"); await (action.props.onComplete as () => Promise<void>)();
    expect(refresh).toHaveBeenCalledOnce(); expect(reloadMovements).toHaveBeenCalledOnce();
    refresh.mockRejectedValueOnce(new Error("offline")); tree = render(vi.fn(), refresh);
    const retryingAction = nodes(tree).find(n=>typeof n.type === "function" && typeof n.props.onComplete === "function"); if (!retryingAction) throw new Error("MovementActions child not found"); await (retryingAction.props.onComplete as () => Promise<void>)();
    tree = render(vi.fn(), refresh); expect(find(tree,n=>n.props.role === "status")).toBeDefined();
    expect(text(tree)).toContain("El cambio se guardó, pero no se pudo actualizar");
    expect(reloadMovements).toHaveBeenCalledTimes(2);
  });

  it("registers transfers through the real repository then refreshes dashboard and movement page", async () => {
    const post = vi.fn().mockResolvedValue({ outflowId: "out", inflowId: "in" }); const http = { post };
    const refresh = vi.fn(async()=>{}); let tree = render(vi.fn(), refresh, http);
    (find(tree,n=>n.type === "button" && text(n.props.children).includes("Registrar transferencia")).props.onClick as () => void)();
    tree = render(vi.fn(), refresh, http);
    const modal = nodes(tree).find(n=>typeof n.type === "function" && n.props.isOpen === true && typeof n.props.onSubmit === "function"); if (!modal) throw new Error("Transfer modal child not found");
    await (modal.props.onSubmit as (request: unknown) => Promise<void>)({ sourceAccountId: "a", sourceAmount: "1.00", destinationAccountId: "b", destinationAmount: "1.00" });
    expect(post).toHaveBeenCalledWith("/v1/transactions/transfers", expect.objectContaining({ sourceAmount: "1.00", destinationAmount: "1.00" }));
    expect(refresh).toHaveBeenCalledOnce(); expect(reloadMovements).toHaveBeenCalledOnce();
  });

  it("serializes month, filters, audit, search and pagination; filter changes reset page and selection", () => {
    let tree = render();
    expect(text(tree)).toContain("Mostrando 1–3 de 11 transacciones");
    expect(nodes(tree).filter(n => n.props["aria-label"]?.toString().startsWith("Ir a página "))).toHaveLength(2);
    expect(find(tree,n=>n.type === "summary")).toBeDefined();
    (find(tree,n=>n.props["aria-label"]==="Página siguiente").props.onClick as () => void)();
    tree = render(); expect(getMovements.mock.lastCall?.[0].page).toBe(2);
    const rows = nodes(tree).filter(n => n.props.tabIndex === 0); (rows[1].props.onClick as () => void)(); tree = render();
    expect(find(tree, n => n.type === "h3").props.children).toBe("Transferencia");
    (find(tree,n=>n.props["aria-label"]==="Cuenta").props.onChange as (e: unknown)=>void)({ target: { value: "a1" } });
    tree = render(); expect(getMovements.mock.lastCall?.[0]).toMatchObject({ page: 1, accountId: "a1" });
    expect(find(tree, n => n.type === "h3").props.children).toBe("Compra");
    (find(tree,n=>n.props["aria-label"]==="Categoría").props.onChange as (e: unknown)=>void)({ target: { value: "cat-1" } });
    tree=render(); (find(tree,n=>n.props["aria-label"]==="Tipo").props.onChange as (e: unknown)=>void)({ target: { value: "Expense" } });
    tree=render(); (find(tree,n=>n.props["aria-label"]?.toString().includes("Buscar")).props.onChange as (e: unknown)=>void)({ target: { value: "café" } });
    tree=render(); (find(tree,n=>n.props["aria-pressed"]!==undefined).props.onClick as () => void)();
    tree=render(); expect(getMovements.mock.lastCall?.[0]).toMatchObject({ page: 1, accountId: "a1", categoryId: "cat-1", type: "Expense", search: "café", mode: "Audit" });
    expect(getMovements.mock.lastCall?.[0].startUtc).toMatch(/^\d{4}-\d\d-01T/);
    expect(getMovements.mock.lastCall?.[0].endUtcExclusive).toMatch(/^\d{4}-\d\d-01T/);
  });
});
