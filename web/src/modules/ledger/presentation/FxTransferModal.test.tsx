import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDto } from "../domain/ledger.types";

const { slots } = vi.hoisted(() => ({ slots: [] as unknown[] }));
let cursor = 0;
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => { slots[index] = value; }];
    },
    useEffect: () => {},
    useCallback: (callback: () => unknown) => callback,
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
  };
});

import { FxTransferModal } from "./FxTransferModal";

const accounts = [
  { id: "bob", name: "BOB", type: "Cash", currency: "BOB", balance: 100, createdAt: "2026-01-01" },
  { id: "usd", name: "USD", type: "Bank", currency: "USD", balance: 20, createdAt: "2026-01-01" },
] as unknown as AccountDto[];

function render(onConfirmTransfer = vi.fn().mockResolvedValue(undefined)) {
  cursor = 0;
  if (slots.length === 0) slots.push("bob", "usd");
  return FxTransferModal({ isOpen: true, onClose: vi.fn(), accounts, p2pRate: 10, onConfirmTransfer });
}
function nodes(tree: unknown): Array<{ type?: unknown; props: Record<string, unknown> }> {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  const element = tree as { type?: unknown; props?: Record<string, unknown> };
  const props = element.props || {};
  return [{ type: element.type, props }, ...nodes(props.children), ...nodes(props.footer)];
}
function find(tree: unknown, predicate: (node: { type?: unknown; props: Record<string, unknown> }) => boolean) {
  const match = nodes(tree).find(predicate);
  if (!match) throw new Error("Expected element not found");
  return match;
}
function enterAmount(tree: unknown, value: string) {
  const field = find(tree, (node) => node.props.label === "Monto a convertir");
  const control = (field.props.children as (props: { id: string }) => { props: Record<string, unknown> })({ id: "amount" });
  (control.props.onValueChange as (amount: string) => void)(value);
}
function selectAccount(tree: unknown, label: string, value: string) {
  const field = find(tree, (node) => node.props.label === label);
  const control = (field.props.children as (props: { id: string }) => { props: Record<string, unknown> })({ id: label });
  (control.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}
function submit(tree: unknown) {
  const form = find(tree, (node) => node.type === "form");
  return (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
}

beforeEach(() => slots.splice(0));

describe("FxTransferModal source funds validation", () => {
  it("shows insufficiency immediately, disables submit, and allows exact balance", () => {
    let tree = render();
    enterAmount(tree, "100.01");
    tree = render();
    expect(nodes(tree).some((node) => node.props.error === "El saldo de la cuenta de origen es insuficiente.")).toBe(true);
    expect(find(tree, (node) => node.props.form === "fx-transfer-form").props.disabled).toBe(true);

    enterAmount(tree, "100.00");
    tree = render();
    expect(nodes(tree).some((node) => node.props.error === "El saldo de la cuenta de origen es insuficiente.")).toBe(false);
    expect(find(tree, (node) => node.props.form === "fx-transfer-form").props.disabled).toBe(false);
  });

  it("guards submit and sends the exact source amount string", async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    let tree = render(confirm);
    enterAmount(tree, "100.01");
    tree = render(confirm);
    await submit(tree);
    expect(confirm).not.toHaveBeenCalled();

    enterAmount(tree, "100.00");
    tree = render(confirm);
    await submit(tree);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ amount: "100.00" }));
  });

  it("rejects selecting the same account and enables a distinct destination", () => {
    let tree = render();
    enterAmount(tree, "10");
    tree = render();
    selectAccount(tree, "Cuenta destino", "bob");
    tree = render();
    expect(nodes(tree).some((node) => node.props.error === "La cuenta de origen y destino deben ser distintas.")).toBe(true);
    expect(find(tree, (node) => node.props.form === "fx-transfer-form").props.disabled).toBe(true);

    selectAccount(tree, "Cuenta destino", "usd");
    tree = render();
    expect(find(tree, (node) => node.props.form === "fx-transfer-form").props.disabled).toBe(false);
  });
});
