import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceBalancesView } from "./WorkspaceBalancesView";
import { SettleBalanceModal } from "./SettleBalanceModal";
import { balanceSummary, buildSettlementRequest } from "./workspace-balances";
import { Button } from "@/shared/ui/button";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import type { WorkspaceBalancesDto, WorkspaceExpenseDto, WorkspaceMemberDto } from "../domain/workspaces.types";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
  }, useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  } };
});
vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <div>{children}{footer}</div> }));
vi.mock("@/modules/ledger/application/CategoriesContext", () => ({ useUserCategories: () => ({ findCategory: () => undefined }) }));
const members: WorkspaceMemberDto[] = [
  { id: "one", userId: "viewer", workspaceRole: "Owner", incomeSharePercentage: 50, joinedAt: "2026-01-01", isActive: true },
  { id: "two", userId: "other", workspaceRole: "Member", incomeSharePercentage: 50, joinedAt: "2026-01-01", isActive: true },
];
const expenses: WorkspaceExpenseDto[] = [{ id: "expense", workspaceId: "home", description: "Compra compartida", categoryId: "food", notes: null, amount: 450, currency: "BOB", paidByMemberId: "one", date: "2026-10-28", splitRuleType: "EqualParts", allocations: [{ memberId: "one", amount: 225, percentage: 50 }, { memberId: "two", amount: 225, percentage: 50 }] }];
const debt = { debtorMemberId: "two", creditorMemberId: "one", amount: 125, currency: "BOB" };
const balances: WorkspaceBalancesDto = { pairwiseBalances: [debt], memberNetBalances: [{ memberId: "one", balance: 125, currency: "BOB" }, { memberId: "two", balance: -125, currency: "BOB" }], settlements: [{ id: "settlement", payerMemberId: "two", receiverMemberId: "one", amount: 100, currency: "BOB", settlementDate: "2026-10-29", notes: "Abono octubre", status: "Completed" }] };
type Element = React.ReactElement<Record<string, unknown>>;
function nodes(tree: React.ReactNode): Element[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  const node = tree as Element;
  return [node, ...nodes(node.props.children as React.ReactNode), ...nodes(node.props.footer as React.ReactNode)];
}
const props = () => ({ members, expenses, balances, currency: "BOB", viewerUserId: "viewer", onSettleBalance: vi.fn() });

describe("WorkspaceBalancesView and settlements", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });

  it("renders real balances, expenses, period summary and settlement history", () => {
    const html = renderToStaticMarkup(<WorkspaceBalancesView {...props()} />);
    for (const text of ["Balance entre integrantes", "Quién debe a quién y cuánto", "Te deben", "Bs 125,00", "Gastó", "Su parte", "Resumen del período", "Total de gastos", "Parte de cada uno", "Diferencia", "Acciones rápidas", "Registrar liquidación", "Liquidar todo el saldo", "Recordar pago", "Detalle de balances", "Por persona", "Por categoría", "Compra compartida", "Historial de liquidaciones", "Abono octubre", "Completado"]) expect(html).toContain(text);
  });

  it("uses actual allocations rather than assuming a 50/50 split or mixing currencies", () => {
    const result = balanceSummary([...expenses, { ...expenses[0], id: "usd", amount: 999, currency: "USD" }], members, "BOB");
    expect(result.total).toBe("450");
    expect(result.members.map((member) => [member.paid, member.allocated])).toEqual([["450", "225"], ["0", "225"]]);
    const uneven = balanceSummary([{ ...expenses[0], allocations: [{ memberId: "one", amount: 300, percentage: 66.666 }, { memberId: "two", amount: 150, percentage: 33.334 }] }], members, "BOB");
    expect(uneven.members.map((member) => member.allocated)).toEqual(["300", "150"]);
  });

  it("routes both settlement actions with the full current pairwise debt and supports category grouping", () => {
    const input = props();
    const render = () => { hooks.cursor = 0; return WorkspaceBalancesView(input); };
    const buttons = nodes(render()).filter((node) => node.type === Button);
    const action = (label: string) => buttons.find((node) => nodes(node.props.children as React.ReactNode).some((child) => child.props.children === label) || node.props.children === label)!;
    (action("Registrar liquidación").props.onClick as () => void)();
    (action("Liquidar todo el saldo").props.onClick as () => void)();
    expect(input.onSettleBalance.mock.calls).toEqual([[debt], [debt]]);
    const toggle = nodes(render()).find((node) => node.type === SegmentedControl)!;
    (toggle.props.onChange as (value: string) => void)("category");
    const html = renderToStaticMarkup(render());
    expect(html).toContain("Categoría compartida");
    expect(html).toContain("Bs 450,00");
  });

  it("shows debtor and clear states, and disables settlement actions with no outstanding debt", () => {
    expect(renderToStaticMarkup(<WorkspaceBalancesView {...props()} viewerUserId="other" />)).toContain("Debes");
    const input = { ...props(), balances: { pairwiseBalances: [], memberNetBalances: [], settlements: [] }, expenses: [] };
    expect(renderToStaticMarkup(<WorkspaceBalancesView {...input} />)).toContain("Todo al día");
    hooks.cursor = 0;
    const buttons = nodes(WorkspaceBalancesView(input)).filter((node) => node.type === Button);
    expect(buttons.every((node) => node.props.disabled)).toBe(true);
  });

  it("validates settlement participants, positive amounts, dates, currency and outstanding maximum", () => {
    const draft = { payerMemberId: "two", receiverMemberId: "one", amount: "125", settlementDate: "2026-10-30", notes: " Pago " };
    expect(buildSettlementRequest(draft, balances, "BOB")).toEqual({ ...draft, amount: 125, notes: "Pago", currency: "BOB" });
    for (const patch of [{ amount: "126" }, { amount: "0" }, { amount: "NaN" }, { amount: "0.001" }, { payerMemberId: "one" }, { receiverMemberId: "two" }, { settlementDate: "2026-02-30" }]) expect(() => buildSettlementRequest({ ...draft, ...patch }, balances, "BOB")).toThrow();
    expect(() => buildSettlementRequest(draft, balances, "USD")).toThrow();
  });

  it("prefills the full debt and submits exactly once with the selected payer and receiver", async () => {
    const settleBalance = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const input = { open: true, members, balances, currency: "BOB", initialBalance: debt, settleBalance, onOpenChange };
    const render = () => { hooks.cursor = 0; return SettleBalanceModal(input); };
    const html = renderToStaticMarkup(<SettleBalanceModal {...input} />);
    expect(html).toContain('value="125"');
    hooks.cursor = 0;
    const form = nodes(render()).find((node) => node.type === "form")!;
    const submit = form.props.onSubmit as (event: unknown) => Promise<void>;
    await Promise.all([submit({ preventDefault: vi.fn() }), submit({ preventDefault: vi.fn() })]);
    expect(settleBalance).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ payerMemberId: "two", receiverMemberId: "one", amount: 125, currency: "BOB" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
