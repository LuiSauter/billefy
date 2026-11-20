import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoanSummaryDto } from "../../domain/lending.types";
const { state } = vi.hoisted(() => ({ state: { cursor: 0, slots: [] as unknown[], effects: [] as (() => void)[] } }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === "function" ? initial() : initial;
    return [state.slots[index], (next: unknown) => { state.slots[index] = typeof next === "function" ? next(state.slots[index]) : next; }];
  }, useRef: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: initial };
    return state.slots[index];
  }, useEffect: (effect: () => void, deps: unknown[]) => {
    const index = state.cursor++;
    const previous = state.slots[index] as unknown[] | undefined;
    if (!previous || deps.some((value, offset) => !Object.is(value, previous[offset]))) {
      state.slots[index] = deps; state.effects.push(effect);
    }
  } };
});
import { RegisterCardPurchaseModal, type RegisterCardPurchaseModalProps } from "./RegisterCardPurchaseModal";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
type Node = { type?: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object" || !("props" in tree)) return [];
  const node = tree as Node;
  const children = typeof node.props.children === "function" ? node.props.children({ id: node.props.htmlFor }) : node.props.children;
  return [node, ...nodes(children), ...nodes(node.props.footer)];
}
const loan: LoanSummaryDto = { id: "card", counterpartyId: "issuer", counterpartyName: "Synthetic card", type: "Borrowed", template: "NoInterest",
  status: "Active", principal: new Decimal(600), remainingPrincipal: new Decimal(600), currency: "BOB", interestRate: 0,
  annualEffectiveRate: 0, disbursementDate: "2027-01-01", firstDueDate: "2027-02-01", totalInstallments: 1, createdAt: "2027-01-01", loanKind: "CreditCard" };
let props: RegisterCardPurchaseModalProps;
function render(overrides: Partial<RegisterCardPurchaseModalProps> = {}) {
  props = { ...props, ...overrides }; state.cursor = 0;
  const tree = RegisterCardPurchaseModal(props);
  state.effects.splice(0).forEach(effect => effect());
  return tree;
}
function fill() {
  let tree = render(); tree = render();
  const amount = nodes(tree).find(node => node.props.id === "card-purchase-amount")!;
  (amount.props.onValueChange as (value: string) => void)("350.00");
  const date = nodes(tree).find(node => node.props.id === "card-purchase-date")!;
  (date.props.onChange as (event: unknown) => void)({ target: { value: "2027-01-07" } });
  const picker = nodes(tree).find(node => node.type === CategoryPickerField)!;
  (picker.props.onSelectCategory as (category: unknown) => void)({ id: "food" });
  return render();
}
async function submit(tree: unknown) {
  await (nodes(tree).find(node => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} });
}
beforeEach(() => {
  state.cursor = 0; state.slots.length = 0; state.effects.length = 0;
  props = { isOpen: true, loan, onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue({ id: "purchase" }) };
});
describe("RegisterCardPurchaseModal", () => {
  it("uses existing drawer and category components and submits exact noncash purchase data once", async () => {
    const tree = fill();
    expect(tree?.type).toBe(ResponsiveDrawer);
    await submit(tree); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith("card", { amount: "350.00", currency: "BOB", categoryId: "food",
      occurredAt: "2027-01-07T00:00:00Z", description: undefined });
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(nodes(tree).some(node => node.props.id === "card-purchase-account")).toBe(false);
  });
  it("keeps rejected purchase inputs and permits a retry without changing its financial payload", async () => {
    props.onSubmit = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ id: "purchase" });
    let tree = fill(); await submit(tree); tree = render(); await submit(tree);
    expect(props.onSubmit).toHaveBeenCalledTimes(2);
    expect(vi.mocked(props.onSubmit).mock.calls[0]).toEqual(vi.mocked(props.onSubmit).mock.calls[1]);
    expect(props.onClose).toHaveBeenCalledOnce();
  });
  it.each(["0", "-1", "350.001", "NaN"])("rejects invalid amount %s without calling the API", async value => {
    let tree = fill();
    (nodes(tree).find(node => node.props.id === "card-purchase-amount")!.props.onValueChange as (value: string) => void)(value);
    tree = render(); await submit(tree);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
  it("offers inline category creation through the existing creator", () => {
    let tree = fill();
    (nodes(tree).find(node => node.type === CategoryPickerField)!.props.onRequestCreateCategory as () => void)();
    tree = render();
    expect(nodes(tree).some(node => node.type === CategoryCreatorView)).toBe(true);
  });
  it("does not record a purchase for an ordinary loan", async () => {
    const tree = fill(); render({ loan: { ...loan, loanKind: "Loan" } });
    await submit(render());
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(tree).not.toBeNull();
  });
});
