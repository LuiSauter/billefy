import { beforeEach, describe, expect, it, vi } from "vitest";
const { slots } = vi.hoisted(() => ({ slots: [] as unknown[] }));
let cursor = 0;
vi.mock("react", async (importOriginal) => { const actual = await importOriginal<typeof import("react")>(); return { ...actual, useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? (initial as () => unknown)() : initial; return [slots[i], (next: unknown) => { slots[i] = typeof next === "function" ? (next as (old: unknown) => unknown)(slots[i]) : next; }]; }, useRef: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; } }; });
import { InvestmentCashModal } from "./InvestmentCashModal";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";

const accounts = [{ id: "acc", name: "Efectivo", currency: "BOB" }] as AccountDto[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const controller: any = { investments: [{ id: "inv", name: "Bitcoin" }], recordCash: vi.fn(), refreshAfterCash: vi.fn() };
const onClose = vi.fn(); const onComplete = vi.fn().mockResolvedValue(undefined);
function render(extra: { investmentId?: string } = {}) { cursor = 0; return InvestmentCashModal({ open: true, onClose, controller, accounts, onComplete, ...extra }); }
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== "object") return []; const e = tree as { type?: unknown; props?: Record<string, unknown> }; const props = e.props || {}; return [{ type: e.type, props }, ...nodes(props.children), ...nodes(props.footer)]; }
function find(tree: unknown, label: string) { const node = nodes(tree).find(n => n.props["aria-label"] === label); if (!node) throw new Error(`Missing ${label}`); return node; }
beforeEach(() => { slots.splice(0); controller.recordCash.mockReset(); controller.recordCash.mockResolvedValue({}); controller.refreshAfterCash.mockReset().mockResolvedValue(undefined); onClose.mockReset(); onComplete.mockReset().mockResolvedValue(undefined); });

describe("InvestmentCashModal", () => {
  it("does not write before save and sends the exact native decimal payload before refreshing", async () => {
    let tree = render();
    expect(controller.recordCash).not.toHaveBeenCalled();
    (find(tree, "Activo").props.onChange as (e: unknown) => void)({ target: { value: "inv" } });
    (find(tree, "Cuenta de efectivo").props.onChange as (e: unknown) => void)({ target: { value: "acc" } });
    (find(tree, "Monto de inversión").props.onChange as (e: unknown) => void)({ target: { value: "0.010001" } });
    (find(tree, "Descripción del movimiento de inversión").props.onChange as (e: unknown) => void)({ target: { value: "Aporte" } });
    tree = render();
    const form = nodes(tree).find(n => n.type === "form")!;
    await (form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    expect(controller.recordCash).toHaveBeenCalledWith("inv", "Contribution", expect.objectContaining({ accountId: "acc", amount: "0.010001", description: "Aporte" }));
    expect(controller.refreshAfterCash).toHaveBeenCalledOnce(); expect(onComplete).toHaveBeenCalledOnce(); expect(onClose).toHaveBeenCalledOnce();
  });

  it("submits a disposal (retiro) when kind is changed via segmented control", async () => {
    let tree = render();
    (find(tree, "Tipo de movimiento de inversión").props.onChange as (v: string) => void)("Disposal");
    (find(tree, "Activo").props.onChange as (e: unknown) => void)({ target: { value: "inv" } });
    (find(tree, "Cuenta de efectivo").props.onChange as (e: unknown) => void)({ target: { value: "acc" } });
    (find(tree, "Monto de inversión").props.onChange as (e: unknown) => void)({ target: { value: "500.00" } });
    (find(tree, "Descripción del movimiento de inversión").props.onChange as (e: unknown) => void)({ target: { value: "Retiro de ganancias" } });
    tree = render();
    const form = nodes(tree).find(n => n.type === "form")!;
    await (form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    expect(controller.recordCash).toHaveBeenCalledWith("inv", "Disposal", expect.objectContaining({ accountId: "acc", amount: "500.00", description: "Retiro de ganancias" }));
  });

  it("does not offer a financial retry when the write succeeded but a refresh failed", async () => {
    controller.refreshAfterCash.mockRejectedValueOnce(new Error("refresh offline"));
    let tree = render();
    (find(tree, "Activo").props.onChange as (e: unknown) => void)({ target: { value: "inv" } });
    (find(tree, "Cuenta de efectivo").props.onChange as (e: unknown) => void)({ target: { value: "acc" } });
    (find(tree, "Monto de inversión").props.onChange as (e: unknown) => void)({ target: { value: "2.50" } });
    tree = render(); const submit = nodes(tree).find(n => n.type === "form")!.props.onSubmit as (e: unknown) => Promise<void>;
    await submit({ preventDefault: vi.fn() }); await submit({ preventDefault: vi.fn() });
    expect(controller.recordCash).toHaveBeenCalledOnce(); expect(onComplete).not.toHaveBeenCalled();
    tree = render(); expect(nodes(tree).some(n => n.props.role === "alert" && String(n.props.children).includes("No lo vuelvas a enviar"))).toBe(true);
    expect(nodes(tree).some(n => n.props.type === "submit" && n.props.disabled)).toBe(true);
  });

  it("locks double submit and retains entered values when the financial write fails", async () => {
    let release!: (value: unknown) => void;
    controller.recordCash.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    let tree = render();
    (find(tree, "Activo").props.onChange as (e: unknown) => void)({ target: { value: "inv" } });
    (find(tree, "Cuenta de efectivo").props.onChange as (e: unknown) => void)({ target: { value: "acc" } });
    (find(tree, "Monto de inversión").props.onChange as (e: unknown) => void)({ target: { value: "12.30" } });
    tree = render(); const submit = nodes(tree).find(n => n.type === "form")!.props.onSubmit as (e: unknown) => Promise<void>;
    const first = submit({ preventDefault: vi.fn() }); await submit({ preventDefault: vi.fn() });
    expect(controller.recordCash).toHaveBeenCalledOnce();
    release(Promise.reject(new Error("offline"))); await first;
    tree = render(); expect(find(tree, "Monto de inversión").props.value).toBe("12.30");
    expect(nodes(tree).some(n => n.props.role === "alert" && String(n.props.children).includes("offline"))).toBe(true);
    expect(controller.refreshAfterCash).not.toHaveBeenCalled();
  });

  it("preselects and locks the asset when opened from a specific investment, submitting without re-picking it", async () => {
    let tree = render({ investmentId: "inv" });
    const select = find(tree, "Activo");
    expect(select.props.value).toBe("inv");
    expect(select.props.disabled).toBe(true);
    (find(tree, "Cuenta de efectivo").props.onChange as (e: unknown) => void)({ target: { value: "acc" } });
    (find(tree, "Monto de inversión").props.onChange as (e: unknown) => void)({ target: { value: "75.5" } });
    tree = render({ investmentId: "inv" });
    await (nodes(tree).find(n => n.type === "form")!.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    expect(controller.recordCash).toHaveBeenCalledWith("inv", "Contribution", expect.objectContaining({ accountId: "acc", amount: "75.5" }));
  });

  it("keeps the asset selectable when opened from the general action", () => {
    const tree = render();
    expect(find(tree, "Activo").props.disabled).toBeFalsy();
    expect(find(tree, "Activo").props.value).toBe("");
  });
});
