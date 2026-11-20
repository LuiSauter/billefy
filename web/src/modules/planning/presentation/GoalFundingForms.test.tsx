import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
const slots: unknown[] = []; let cursor = 0;
const refs: Array<{ current: unknown }> = []; let refCursor = 0;
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: () => {}, useMemo: (fn: () => unknown) => fn(),
  useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? (initial as () => unknown)() : initial; return [slots[i], (v: unknown) => { slots[i] = v; }]; },
  useRef: (initial: unknown) => { const i = refCursor++; refs[i] ||= { current: initial }; return refs[i]; } }));
import { GoalFundingModal } from "./GoalFundingModal";
import { CreateGoalModal } from "./CreateGoalModal";
const goal = { id: "g", name: "Emergency", currency: "BOB", accountId: "a", accountName: "Savings", fundingMode: "ReservedFunds" as const, trackingStatus: "tracked" as const, targetAmount: 2000, currentAmount: 700, remainingAmount: 1300, percentageAchieved: 35, sharedGoalCount: 0, createdAt: "2027-01-01" };
const accounts = [{ id: "a", name: "Savings", currency: "BOB", balance: new Decimal(1000) }] as AccountDto[];
function nodes(tree: unknown): Array<{ props: Record<string, unknown> }> {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  const props = (tree as { props?: Record<string, unknown> }).props || {};
  const children = typeof props.children === "function" ? (props.children as (args: object) => unknown)({ id: "test" }) : props.children;
  return [{ props }, ...nodes(children), ...nodes(props.footer)];
}
function field(tree: unknown, label: string) { const p = nodes(tree).find(n => n.props["aria-label"] === label)?.props; if (!p) throw new Error("Missing " + label); return p; }
function change(tree: unknown, label: string, value: string) { const p = field(tree, label); if (p.onValueChange) (p.onValueChange as (v: string) => void)(value); else if (label === "Operación de reserva" || label === "Modo de financiación") (p.onChange as (v: string) => void)(value); else (p.onChange as (e: unknown) => void)({ target: { value } }); }
function renderFunding(onSubmit = vi.fn(), onClose = vi.fn()) { cursor = 0; refCursor = 0; return { tree: GoalFundingModal({ goal, onSubmit, onClose }), onSubmit, onClose }; }
function renderCreate(onSubmit = vi.fn(), onClose = vi.fn()) { cursor = 0; refCursor = 0; return { tree: CreateGoalModal({ isOpen: true, accounts, onSubmit, onClose }), onSubmit, onClose }; }
async function submit(tree: unknown) { const p = nodes(tree).find(n => n.props.id === "goal-funding-form" || n.props.id === "create-goal-form")?.props; if (!p) throw new Error("Missing form"); await (p.onSubmit as (e: unknown) => Promise<void>)({ preventDefault() {} }); }
beforeEach(() => { slots.splice(0); refs.splice(0); });
describe("goal funding forms", () => {
  it("retains entered data and reuses the exact key/payload on explicit retry without automatic resubmission", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    let v = renderFunding(onSubmit);
    change(v.tree, "Monto de reserva", "700.01");
    v = renderFunding(onSubmit, v.onClose); await submit(v.tree);
    expect(onSubmit).toHaveBeenCalledOnce(); expect(v.onClose).not.toHaveBeenCalled();
    const first = onSubmit.mock.calls[0];
    expect(first.slice(0, 3)).toEqual(["g", "assign", { amount: "700.01", currency: "BOB" }]);
    expect(typeof first[3]).toBe("string");
    v = renderFunding(onSubmit, v.onClose);
    expect(field(v.tree, "Monto de reserva").value).toBe("700.01");
    await submit(v.tree);
    expect(onSubmit.mock.calls[1]).toEqual(first); expect(v.onClose).toHaveBeenCalledOnce();
  });
  it("uses a different key for a changed payload and supports explicit release", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("offline"));
    let v = renderFunding(onSubmit);
    change(v.tree, "Monto de reserva", "100"); v = renderFunding(onSubmit); await submit(v.tree);
    change(v.tree, "Operación de reserva", "release"); v = renderFunding(onSubmit); await submit(v.tree);
    expect(onSubmit.mock.calls[1][1]).toBe("release");
    expect(onSubmit.mock.calls[1][3]).not.toBe(onSubmit.mock.calls[0][3]);
  });
  it("reuses the original key when returning to an earlier uncertain payload", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("response lost"));
    let v = renderFunding(onSubmit); change(v.tree, "Monto de reserva", "100"); v = renderFunding(onSubmit); await submit(v.tree);
    change(v.tree, "Monto de reserva", "101"); v = renderFunding(onSubmit); await submit(v.tree);
    change(v.tree, "Monto de reserva", "100"); v = renderFunding(onSubmit); await submit(v.tree);
    expect(onSubmit.mock.calls[2]).toEqual(onSubmit.mock.calls[0]);
    expect(onSubmit.mock.calls[1][3]).not.toBe(onSubmit.mock.calls[0][3]);
  });
  it("locks duplicate submissions even before a rerender", async () => {
    let resolve!: () => void; const onSubmit = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    let v = renderFunding(onSubmit); change(v.tree, "Monto de reserva", "100"); v = renderFunding(onSubmit);
    const first = submit(v.tree); await submit(v.tree);
    expect(onSubmit).toHaveBeenCalledOnce(); resolve(); await first;
  });
  it("creates a reserved goal only after linking an account and retains explicit legacy creation", async () => {
    let v = renderCreate();
    change(v.tree, "Nombre de la meta", "Emergency"); change(v.tree, "Monto meta", "2000");
    v = renderCreate(v.onSubmit); await submit(v.tree); expect(v.onSubmit).not.toHaveBeenCalled();
    change(v.tree, "Cuenta vinculada", "a"); v = renderCreate(v.onSubmit); await submit(v.tree);
    expect(v.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ fundingMode: "ReservedFunds", accountId: "a" }));
    slots.splice(0); refs.splice(0); v = renderCreate();
    change(v.tree, "Nombre de la meta", "Legacy"); change(v.tree, "Monto meta", "2000");
    change(v.tree, "Modo de financiación", "AccountTracking"); v = renderCreate(v.onSubmit); await submit(v.tree);
    expect(v.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ fundingMode: "AccountTracking", accountId: undefined }));
  });
});
