import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormField } from "@/shared/ui/form-field";
import { UpdatePriceModal } from "./UpdatePriceModal";
import { Investment } from "../../domain/investment.types";
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === "function" ? initial() : initial;
    return [state.slots[index], (value: unknown) => { state.slots[index] = value; }];
  }, useEffect: () => {},
}));
vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <div>{children}{footer}</div> }));
const investment: Investment = { id: "shares", name: "January shares", kind: "stocks", currency: "BOB", quantity: 25, costBasis: 2600, initialValue: 2000, currentValue: 2600, createdAt: "2027-01-01", history: [], iconKey: "trending-up", colorKey: "blue" };
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return [];
  const children = tree.type === FormField && typeof tree.props.children === "function" ? tree.props.children({ id: "field" }) : tree.props.children;
  return [{ type: tree.type, props: tree.props }, ...nodes(children), ...nodes(tree.props.footer)];
}
function control(tree: unknown, label: string) {
  const wrapper = nodes(tree).find(n => n.type === FormField && n.props.label === label)!;
  return nodes((wrapper.props.children as (control: unknown) => unknown)({ id: "field" }))[0];
}
function render(onRecordValuation?: (id: string, input: unknown) => Promise<void>, onUpdateValue = vi.fn().mockResolvedValue(undefined)) {
  state.cursor = 0;
  return UpdatePriceModal({ investment, isOpen: true, onClose: vi.fn(), onUpdateValue, onRecordValuation, currency: "BOB" });
}
beforeEach(() => { state.slots = []; state.cursor = 0; });
describe("dated investment valuation", () => {
  it("records 25 units at 110 on the chosen date without exposing quantity edits or cash", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const legacy = vi.fn();
    let tree = render(record, legacy);
    (control(tree, "Nuevo precio unitario").props.onValueChange as (v: string) => void)("110");
    (control(tree, "Fecha de valoración").props.onChange as (e: unknown) => void)({ target: { value: "2027-01-21" } });
    tree = render(record, legacy);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("No cambia unidades, costo ni efectivo");
    expect(html).not.toContain("Cantidad de unidades");
    const form = nodes(tree).find(n => n.type === "form")!;
    await (form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    expect(record).toHaveBeenCalledWith("shares", { unitPrice: "110", totalAmount: "2750", occurredAt: "2027-01-21T00:00:00.000Z" });
    expect(legacy).not.toHaveBeenCalled();
  });
  it("preserves the existing quantity-edit control when only the legacy callback is supplied", () => {
    expect(renderToStaticMarkup(render())).toContain("Cantidad de unidades");
  });
});
