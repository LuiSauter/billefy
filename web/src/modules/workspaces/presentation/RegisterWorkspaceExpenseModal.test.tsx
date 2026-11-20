import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterWorkspaceExpenseModal } from "./RegisterWorkspaceExpenseModal";
import { buildExpenseRequest, expensePreview, type ExpenseDraft } from "./workspace-expense";
import type { WorkspaceMemberDto } from "../domain/workspaces.types";

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

vi.mock("@/modules/ledger/application/CategoriesContext", () => ({ useUserCategories: () => ({ getCategoriesByDirection: () => [{ id: "food", name: "Alimentación" }], findCategory: () => undefined }) }));

const members: WorkspaceMemberDto[] = [
  { id: "one", userId: "user-one", workspaceRole: "Owner", incomeSharePercentage: 60, joinedAt: "2026-01-01", isActive: true },
  { id: "two", userId: "user-two", workspaceRole: "Member", incomeSharePercentage: 40, joinedAt: "2026-01-01", isActive: true },
];
const draft: ExpenseDraft = { description: " Compra semanal ", categoryId: "food", date: "2026-10-28", amount: "450", paidByMemberId: "one", rule: "EqualParts", customMode: "percentage", custom: {}, notes: " Recibo " };
type Element = React.ReactElement<Record<string, unknown>>;
function nodes(tree: React.ReactNode): Element[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  const node = tree as Element;
  return [node, ...nodes(node.props.children as React.ReactNode), ...nodes(node.props.footer as React.ReactNode)];
}

describe("RegisterWorkspaceExpenseModal", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });

  it("shows the form, split choices, allocations and live summary without invented members", () => {
    const html = renderToStaticMarkup(<RegisterWorkspaceExpenseModal open members={members} currency="BOB" viewerUserId="user-one" onOpenChange={vi.fn()} registerExpense={vi.fn()} />);
    for (const label of ["Descripción", "Categoría", "Fecha", "Monto total", "Pagado por", "¿Cómo se divide el gasto?", "Partes iguales", "Proporcional a ingresos", "Personalizado", "Participación del gasto", "Notas", "Resumen del gasto", "Aporte por integrante", "Impacto en el presupuesto", "Registrar gasto", "Cancelar", "Tú", "Integrante 2"]) expect(html).toContain(label);
    expect(html).not.toContain("Tu pareja");
  });

  it("previews equal, income and exact cent residuals using the server payer rule", () => {
    expect(expensePreview(draft, members).map((share) => share.amount)).toEqual(["225.00", "225.00"]);
    expect(expensePreview({ ...draft, rule: "IncomeProportional" }, members).map((share) => share.amount)).toEqual(["270.00", "180.00"]);
    const three = [...members, { ...members[1], id: "three", userId: "three" }];
    const shares = expensePreview({ ...draft, amount: "10", paidByMemberId: "two" }, three);
    expect(shares.map((share) => share.amount)).toEqual(["3.33", "3.34", "3.33"]);
    expect(Decimal.sum(...shares.map((share) => share.amount)).toString()).toBe("10");
  });

  it("supports custom percentages and custom amounts without lossy percentage conversion", () => {
    const percentage = buildExpenseRequest({ ...draft, rule: "CustomPercentage", custom: { one: "25", two: "75" } }, members, "BOB");
    expect(percentage.participants).toEqual([{ memberId: "one", customPercentage: 25 }, { memberId: "two", customPercentage: 75 }]);
    const amounts = { ...draft, rule: "CustomPercentage" as const, customMode: "amount" as const, custom: { one: "100.01", two: "349.99" } };
    expect(buildExpenseRequest(amounts, members, "BOB")).toMatchObject({ splitRuleType: "ByResponsibility", description: "Compra semanal", notes: "Recibo", participants: [{ memberId: "one", responsibilityWeight: 100.01 }, { memberId: "two", responsibilityWeight: 349.99 }] });
    expect(expensePreview(amounts, members).map((share) => share.amount)).toEqual(["100.01", "349.99"]);
  });

  it("blocks invalid totals, custom sums, stale payers, missing categories, dates and income shares", () => {
    for (const patch of [{ amount: "0" }, { amount: "NaN" }, { amount: "-1" }, { amount: "1.001" }, { description: " " }, { categoryId: "" }, { date: "2026-02-30" }, { paidByMemberId: "missing" }, { rule: "CustomPercentage" as const, custom: { one: "50", two: "49" } }, { rule: "CustomPercentage" as const, customMode: "amount" as const, custom: { one: "100", two: "349" } }]) {
      expect(() => buildExpenseRequest({ ...draft, ...patch }, members, "BOB")).toThrow();
    }
    expect(() => buildExpenseRequest({ ...draft, rule: "IncomeProportional" }, members.map((member) => ({ ...member, incomeSharePercentage: 0 })), "BOB")).toThrow(/ingresos/);
    expect(() => buildExpenseRequest(draft, members.map((member) => ({ ...member, isActive: false })), "BOB")).toThrow();
  });

  it("submits once, locks duplicate clicks and closes only after success", async () => {
    let resolve!: () => void;
    const registerExpense = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const onOpenChange = vi.fn();
    const props = { open: true, members, currency: "BOB", registerExpense, onOpenChange };
    const render = () => { hooks.cursor = 0; return RegisterWorkspaceExpenseModal(props); };
    render();
    hooks.slots[0] = draft;
    const submit = () => (nodes(render()).find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    const first = submit();
    await submit();
    expect(registerExpense).toHaveBeenCalledTimes(1);
    expect(registerExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 450, categoryId: "food", splitRuleType: "EqualParts" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    resolve(); await first;
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps failed writes open and prevents unsafe retries after uncertain refresh", async () => {
    const registerExpense = vi.fn().mockRejectedValue(new Error("refresh failed"));
    const props = { open: true, members, currency: "BOB", registerExpense, onOpenChange: vi.fn() };
    const render = () => { hooks.cursor = 0; return RegisterWorkspaceExpenseModal(props); };
    render(); hooks.slots[0] = draft;
    const submit = () => (nodes(render()).find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    await submit(); await submit();
    expect(registerExpense).toHaveBeenCalledTimes(1);
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(nodes(render()).some((node) => node.props.role === "alert")).toBe(true);
  });
});
