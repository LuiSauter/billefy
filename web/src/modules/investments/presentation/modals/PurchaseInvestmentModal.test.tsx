import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormField } from "@/shared/ui/form-field";
import { PurchaseInvestmentModal } from "./PurchaseInvestmentModal";
import { Investment } from "../../domain/investment.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === "function" ? initial() : initial;
    return [state.slots[index], (value: unknown) => { state.slots[index] = value; }];
  },
  useRef: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: initial };
    return state.slots[index];
  },
  useEffect: () => {},
}));
vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ children, footer, title, description }: { children: React.ReactNode; footer: React.ReactNode; title: string; description: string }) => <div>{title}{description}{children}{footer}</div>,
}));
const investment: Investment = { id: "shares", name: "January shares", kind: "stocks", currency: "BOB", quantity: 20, initialValue: 2000, currentValue: 2000, createdAt: "2027-01-01", history: [], iconKey: "trending-up", colorKey: "blue" };
const accounts = [{ id: "bank", name: "Bank", currency: "BOB" }, { id: "dollars", name: "USD only", currency: "USD" }] as AccountDto[];
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return [];
  const children = tree.type === FormField && typeof tree.props.children === "function" ? tree.props.children({ id: "field" }) : tree.props.children;
  return [{ type: tree.type, props: tree.props }, ...nodes(children), ...nodes(tree.props.footer)];
}
function field(tree: unknown, label: string) {
  const found = nodes(tree).find(n => n.type === FormField && n.props.label === label)!;
  return nodes((found.props.children as (control: unknown) => unknown)({ id: "field" }))[0];
}
function change(tree: unknown, label: string, value: string) {
  const input = field(tree, label);
  if (typeof input.props.onValueChange === "function") input.props.onValueChange(value);
  else (input.props.onChange as (event: unknown) => void)({ target: { value } });
}
function render(onPurchase = vi.fn().mockResolvedValue(undefined), onClose = vi.fn(), selected = investment) {
  state.cursor = 0;
  return PurchaseInvestmentModal({ investment: selected, accounts, isOpen: true, onClose, onPurchase });
}
async function submit(tree: unknown) {
  const form = nodes(tree).find(n => n.type === "form")!;
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}
beforeEach(() => { state.slots = []; state.cursor = 0; });
describe("funded investment purchase form", () => {
  it("uses shared controls, shows same-currency accounts and explains the asset exchange", () => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("Comprar inversión");
    expect(html).toContain("No es un gasto de consumo");
    expect(html).toContain("Bank");
    expect(html).not.toContain("USD only");
    expect(html).toContain('data-slot="money-input"');
  });
  it("submits exact decimal inputs and retries an uncertain response with the same payload and key", async () => {
    const onPurchase = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const onClose = vi.fn();
    let tree = render(onPurchase, onClose);
    change(tree, "Cuenta de origen", "bank");
    change(tree, "Cantidad comprada", "5");
    change(tree, "Precio por unidad", "120");
    change(tree, "Fecha de compra", "2027-01-13");
    tree = render(onPurchase, onClose);
    await submit(tree);
    expect(onClose).not.toHaveBeenCalled();
    expect(onPurchase).toHaveBeenCalledWith("shares", {
      quantity: "5", unitPrice: "120", totalAmount: "600", fees: "0", linkedAccountId: "bank", occurredAt: "2027-01-13T00:00:00.000Z",
    }, expect.any(String));
    tree = render(onPurchase, onClose);
    expect(renderToStaticMarkup(tree)).toContain("Reintentar");
    await submit(tree);
    expect(onPurchase.mock.calls[1]).toEqual(onPurchase.mock.calls[0]);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("keeps the original asset and currency visible while retrying an uncertain purchase", async () => {
    const onPurchase = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const onClose = vi.fn();
    let tree = render(onPurchase, onClose);
    change(tree, "Cuenta de origen", "bank");
    change(tree, "Cantidad comprada", "5");
    change(tree, "Precio por unidad", "120");
    tree = render(onPurchase, onClose);
    await submit(tree);
    tree = render(onPurchase, onClose, { ...investment, id: "different", name: "Different USD asset", currency: "USD" });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("January shares");
    expect(html).not.toContain("Different USD asset");
    expect(field(tree, "Precio por unidad").props.currency).toBe("BOB");
    await submit(tree);
    expect(onPurchase.mock.calls[1]).toEqual(onPurchase.mock.calls[0]);
  });
  it("does not submit without an eligible cash account", async () => {
    const onPurchase = vi.fn();
    let tree = render(onPurchase);
    change(tree, "Cantidad comprada", "5");
    change(tree, "Precio por unidad", "120");
    tree = render(onPurchase);
    await submit(tree);
    expect(onPurchase).not.toHaveBeenCalled();
  });
});
