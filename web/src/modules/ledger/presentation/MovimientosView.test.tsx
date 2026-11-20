import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
import type { InvestmentsController } from "@/modules/investments/application/useInvestments";
import { MovementPage, parseMovementPage } from "../domain/movement";
import { AccountDto, TransactionDto } from "../domain/ledger.types";

const { slots, getMovements, reloadMovements, screenState } = vi.hoisted(() => ({ slots: [] as unknown[], getMovements: vi.fn(), reloadMovements: vi.fn(), screenState: { loading: false, error: null as string | null, data: null as unknown } }));
let cursor = 0;
vi.mock("react", async (importOriginal) => { const actual = await importOriginal<typeof import("react")>(); return { ...actual, useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: unknown) => { slots[i] = typeof value === "function" ? (value as (old: unknown) => unknown)(slots[i]) : value; }]; }, useMemo: (fn: () => unknown) => fn(), useEffect: () => {}, useCallback: (callback: () => unknown) => callback, useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot() }; });
vi.mock("../application/useMovements", () => ({ useMovements: (_http: unknown, query: unknown, refreshKey: unknown) => { getMovements(query, refreshKey); return { data: screenState.data ?? pageData, loading: screenState.loading, error: screenState.error, reload: reloadMovements }; } }));
vi.mock("../application/CategoriesContext", () => ({ useUserCategories: () => ({ categories: [{ id: "cat-1", name: "Comida" }, { id: "cat-2", name: "Casa" }] }) }));
import { MovimientosView } from "./MovimientosView";
import { FxTransferModal } from "./FxTransferModal";
import { ColumnResizeHandle } from "./ColumnResizeHandle";

const pageData: MovementPage = parseMovementPage({ page: 1, pageSize: 10, totalCount: 11, summary: [{ currency: "BOB", income: "20", expenses: "8.25", transferOut: "2", transferIn: "3", contributions: "4", disposals: "5" }, { currency: "USD", income: "5", expenses: "2", transferOut: "6", transferIn: "7", contributions: "8", disposals: "9" }], items: [
  { id: "m1", kind: "Expense", amount: "8.25", currency: "BOB", direction: "Expense", occurredAt: "2026-03-04T10:00:00Z", accountId: "a1", accountName: "Banco", categoryId: "cat-1", categoryName: "Comida", description: "Compra", isReversal: false, legs: [], allocations: [{ categoryId: "cat-1", categoryName: "Comida", amount: "5.25" }, { categoryId: "cat-2", categoryName: "Casa", amount: "3.00" }] },
  { id: "m2", kind: "Transfer", amount: "10", currency: "USD", direction: "Expense", occurredAt: "2026-03-03T10:00:00Z", accountId: "a2", accountName: "Cuenta USD", description: "Transferencia", isReversal: false, legs: [{ id: "l1", accountId: "a2", accountName: "Cuenta USD", amount: "10", currency: "USD", direction: "Expense", appliedRate: 7, rateSource: "Manual" }, { id: "l2", accountId: "a3", accountName: "Cuenta BOB", amount: "70", currency: "BOB", direction: "Income", appliedRate: 7, rateSource: "Manual" }], allocations: [] },
  { id: "cash-tx", kind: "Investment", amount: "0.010001", currency: "USD", direction: "Expense", occurredAt: "2026-03-03T10:00:00Z", accountId: "a2", accountName: "Cuenta USD", investmentId: "inv-1", investmentCashKind: "Contribution", description: "Aporte", isReversal: false, legs: [], allocations: [] },
] });
const accounts: AccountDto[] = [{ id: "a1", name: "Banco", type: "Bank", currency: "BOB", balance: new Decimal(0), createdAt: "2026-01-01" }];
const investmentsController = {
  investments: [{ id: "inv-1", name: "Bitcoin", kind: "crypto", iconKey: "coins", colorKey: "amber",
    currency: "USD", quantity: 0, initialValue: 0, currentValue: 0, history: [], createdAt: "2026-01-01" }],
  createInvestment: vi.fn(), updateInvestmentValue: vi.fn(), deleteInvestment: vi.fn(),
  registerOperation: vi.fn(), purchaseInvestment: vi.fn(), recordDividend: vi.fn(), recordValuation: vi.fn(), getTransactions: vi.fn(), getStockQuote: vi.fn(),
  recordCash: vi.fn(), reverseCash: vi.fn().mockResolvedValue({}), refreshAfterCash: vi.fn().mockResolvedValue(undefined),
  syncBinancePortfolio: vi.fn(), syncLiveCryptoPrices: vi.fn(), isSyncingLivePrices: false,
} satisfies InvestmentsController;
function render(onRegister = vi.fn(), onRefresh?: () => Promise<void>, http: unknown = {}, selectedCurrency: "BOB" | "USD" = "BOB", p2pRate = 10, onExecuteFxTransfer = vi.fn().mockResolvedValue(undefined), transactions?: TransactionDto[]) { cursor = 0; return MovimientosView({ http: http as never, accounts, transactions, onRegister, onRefresh, investmentsController, selectedCurrency, p2pRate, onExecuteFxTransfer }); }
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const element = tree as { type?: unknown; props?: Record<string, unknown> }; const props = element.props || {}; return [{ type: element.type, props }, ...nodes(props.children)]; }
function text(tree: unknown): string { if (Array.isArray(tree)) return tree.map(text).join(" "); if (tree === null || tree === undefined || typeof tree === "boolean") return ""; if (typeof tree !== "object") return String(tree); return text((tree as { props?: { children?: unknown } }).props?.children); }
function find(tree: unknown, predicate: (node: { type?: unknown; props: Record<string, unknown> }) => boolean) { const match = nodes(tree).find(predicate); if (!match) throw new Error(`Expected element not found in: ${text(tree)}`); return match; }
beforeEach(() => { slots.splice(0); getMovements.mockClear(); reloadMovements.mockClear(); screenState.loading = false; screenState.error = null; screenState.data = null; });

describe("MovimientosView interactions", () => {
  it("renders a resize handle on every resizable column header, using the stored or default width", () => {
    const tree = render();
    const separators = nodes(tree).filter(n => n.type === ColumnResizeHandle);
    expect(separators).toHaveLength(6);
    const cols = nodes(tree).filter(n => n.type === "col" && n.props.style);
    expect(cols.map(n => (n.props.style as { width?: number }).width)).toEqual([112, 280, 160, 160, 140, 140]);
  });

  it("hides the detail panel entirely until a row is selected, then shows it and hides it again on deselect-by-filter", () => {
    const tree = render();
    expect(nodes(tree).some(n => n.props["aria-label"] === "Detalle de la transacción")).toBe(false);
    expect(nodes(tree).some(n => n.type === "h3")).toBe(false);

    const rows = nodes(tree).filter(n => n.props.tabIndex === 0);
    (rows[0].props.onClick as () => void)();
    const selectedTree = render();
    expect(nodes(selectedTree).some(n => n.props["aria-label"] === "Detalle de la transacción")).toBe(true);
    expect(find(selectedTree, n => n.type === "h3").props.children).toBe("Compra");
  });

  it("forwards the transactions reference for refresh without resetting filters or pagination", () => {
    const transactions: TransactionDto[] = [];
    const updatedTransactions: TransactionDto[] = [];
    const http = {};
    const renderWithTransactions = (input: TransactionDto[]) => render(vi.fn(), undefined, http, "BOB", 10, vi.fn(), input);
    let tree = renderWithTransactions(transactions);
    expect(getMovements.mock.lastCall?.[1]).toBe(transactions);
    (find(tree, n => n.props["aria-label"] === "Cuenta").props.onChange as (e: unknown) => void)({ target: { value: "a1" } });
    tree = renderWithTransactions(transactions);
    (find(tree, n => n.props["aria-label"] === "Página siguiente").props.onClick as () => void)();
    renderWithTransactions(transactions);
    const currentQuery = getMovements.mock.lastCall?.[0];
    expect(currentQuery).toMatchObject({ accountId: "a1", page: 2 });

    renderWithTransactions(updatedTransactions);
    expect(getMovements.mock.lastCall?.[1]).toBe(updatedTransactions);
    expect(getMovements.mock.lastCall?.[0]).toEqual(currentQuery);
  });

  it("renders reconciliation as a distinct adjustment without changing income or expense totals", () => {
    screenState.data = parseMovementPage({ page: 1, pageSize: 10, totalCount: 1, summary: [{ currency: "BOB", income: "20", expenses: "8.25" }], items: [
      { id: "reconcile-tx", kind: "Adjustment", isReconciliationAdjustment: true, amount: "2.125", currency: "BOB", direction: "Expense", occurredAt: "2026-03-02T10:00:00Z", accountId: "a1", accountName: "Banco", description: "Balance correction", isReversal: false, legs: [], allocations: [] },
    ] });
    const tree = render();
    expect(text(tree)).toContain("Ajuste de conciliación");
    expect(nodes(tree).filter(n => (n.type as { name?: string })?.name === "Amount").slice(0, 2).map(n => String(n.props.value))).toEqual(["20", "8.25"]);
    const adjustmentRow = nodes(tree).find(n => n.props.tabIndex === 0 && text(n.props.children).includes("Balance correction"));
    expect(adjustmentRow).toBeDefined();
  });

  it("renders single selected currency totals (BOB or USD), full allocation and transfer-leg detail", () => {
    // 1. Render in BOB mode
    const treeBob = render(vi.fn(), undefined, {}, "BOB", 10);
    const htmlBob = text(treeBob);
    expect(htmlBob).toContain("Ingresos del mes");
    expect(htmlBob).toContain("Gastos del mes");
    expect(htmlBob).toContain("Transferencias");
    expect(htmlBob).toContain("Inversiones");
    const bobAmounts = nodes(treeBob).filter(n => (n.type as { name?: string })?.name === "Amount");
    expect(bobAmounts.slice(0, 4).map(n => String(n.props.value))).toEqual(["70", "28.25", "62", "84"]);
    expect(bobAmounts.slice(0, 4).every(n => n.props.currency === "BOB")).toBe(true);
    expect(nodes(treeBob).filter(n => n.props["data-kpi-card"] === "true")).toHaveLength(4);

    // 2. Render in USD mode
    const treeUsd = render(vi.fn(), undefined, {}, "USD", 10);
    const usdAmounts = nodes(treeUsd).filter(n => (n.type as { name?: string })?.name === "Amount");
    expect(usdAmounts.slice(0, 4).map(n => String(n.props.value))).toEqual(["7", "2.825", "6.2", "8.4"]);
    expect(usdAmounts.slice(0, 4).every(n => n.props.currency === "USD")).toBe(true);

    // The detail panel is hidden until a row is explicitly selected.
    expect(nodes(treeBob).some(n => n.type === "h3")).toBe(false);
    const firstRows = nodes(treeBob).filter(n => n.props.tabIndex === 0);
    (firstRows[0].props.onClick as () => void)();
    const treeWithSelection = render(vi.fn(), undefined, {}, "BOB", 10);
    const selectionBobAmounts = nodes(treeWithSelection).filter(n => (n.type as { name?: string })?.name === "Amount");
    expect(selectionBobAmounts.some(n => n.props.currency === "BOB" && String(n.props.value) === "5.25")).toBe(true);
    expect(selectionBobAmounts.some(n => n.props.currency === "BOB" && String(n.props.value) === "3")).toBe(true);
    const description = find(treeWithSelection, n => n.type === "h3");
    expect(description.props.children).toBe("Compra");

    // Move focus onto the transfer, then inspect both currency-specific legs.
    const rows = nodes(treeWithSelection).filter(n => n.props.tabIndex === 0);
    (rows[1].props.onClick as () => void)();
    const transfer = render(vi.fn(), undefined, {}, "BOB", 10);
    expect(nodes(transfer).some(n => n.type === "b" && text(n.props.children).includes("Tramos de transferencia"))).toBe(true);
    expect(text(transfer)).toMatch(/Tasa\s+Bs\s+7,00\s+·\s+Manual/);
    expect(nodes(transfer).some(n => n.type === "b" && text(n.props.children).includes("Distribución por categoría"))).toBe(false);
    const transferAmounts = nodes(transfer).filter(n => (n.type as { name?: string })?.name === "Amount");
    expect(transferAmounts.some(n => n.props.currency === "USD" && String(n.props.value) === "-10")).toBe(true);
    expect(transferAmounts.some(n => n.props.currency === "BOB" && String(n.props.value) === "70")).toBe(true);
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

  it.each([undefined, "2027-01-15T13:30:00.000Z"])("opens the shared FX modal and delegates date %s with the current P2P rate", async occurredAt => {
    const executeFxTransfer = vi.fn().mockResolvedValue(undefined);
    let tree = render(vi.fn(), undefined, {}, "BOB", 12.5, executeFxTransfer);
    (find(tree,n=>typeof n.type === "function" && text(n.props.children).includes("Transferencia")).props.onClick as () => void)();
    tree = render(vi.fn(), undefined, {}, "BOB", 12.5, executeFxTransfer);
    const modal = nodes(tree).find(n=>n.type === FxTransferModal && n.props.isOpen === true);
    if (!modal) throw new Error("FxTransferModal child not found");
    const data = { fromAccountId: "a", toAccountId: "b", amount: "10.00", description: "FX transfer", ...(occurredAt ? { occurredAt } : {}) };
    await (modal.props.onConfirmTransfer as (input: typeof data) => Promise<void>)(data);
    expect(executeFxTransfer).toHaveBeenCalledExactlyOnceWith({ ...data, p2pRate: 12.5 });
    expect(reloadMovements).toHaveBeenCalledOnce();
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
    // Filter changes reset the selection, so the detail panel is hidden entirely.
    expect(nodes(tree).some(n => n.type === "h3")).toBe(false);
    (find(tree,n=>n.props["aria-label"]==="Categoría").props.onChange as (e: unknown)=>void)({ target: { value: "cat-1" } });
    tree=render(); (find(tree,n=>n.props["aria-label"]==="Tipo").props.onChange as (e: unknown)=>void)({ target: { value: "Expense" } });
    tree=render(); (find(tree,n=>n.props["aria-label"]?.toString().includes("Buscar") === true).props.onChange as (e: unknown)=>void)({ target: { value: "café" } });
    tree=render(); (find(tree,n=>n.props["aria-pressed"]!==undefined).props.onClick as () => void)();
    tree=render(); expect(getMovements.mock.lastCall?.[0]).toMatchObject({ page: 1, accountId: "a1", categoryId: "cat-1", type: "Expense", search: "café", mode: "Audit" });
    expect(getMovements.mock.lastCall?.[0].startUtc).toMatch(/^\d{4}-\d\d-01T/);
    expect(getMovements.mock.lastCall?.[0].endUtcExclusive).toMatch(/^\d{4}-\d\d-01T/);
  });
});
