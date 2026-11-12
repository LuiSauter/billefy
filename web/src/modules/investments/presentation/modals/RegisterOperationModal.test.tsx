import { beforeEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Amount, Quantity } from "@/shared/ui/amount";

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = state.cursor++;
      if (!(index in state.slots)) {
        state.slots[index] = typeof initial === "function" ? initial() : initial;
      }
      return [state.slots[index], (next: unknown) => {
        state.slots[index] = typeof next === "function" ? next(state.slots[index]) : next;
      }];
    },
    useEffect: () => {},
    useMemo: (factory: () => unknown) => factory(),
    useCallback: (callback: unknown) => callback,
  };
});

vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ open, title, description, children, footer }: {
    open: boolean;
    title: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => open ? (
    <div data-slot="responsive-drawer">
      <div>{title}</div>
      {description && <div>{description}</div>}
      {children}
      {footer}
    </div>
  ) : null,
}));

vi.mock("../../domain/binance-market.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../domain/binance-market.service")>(),
  fetchCryptoTicker: vi.fn(),
}));

import { RegisterOperationModal } from "./RegisterOperationModal";
import { Investment } from "../../domain/investment.types";
import { fetchCryptoTicker } from "../../domain/binance-market.service";

const mockInvestment: Investment = {
  id: "inv-btc",
  name: "Bitcoin (BTC)",
  kind: "crypto",
  iconKey: "coins",
  colorKey: "amber",
  currency: "USDT",
  quantity: 0.5,
  initialValue: 30000,
  currentValue: 35000,
  history: [],
  createdAt: "2026-01-01",
};

const accounts = [{ id: "cash", name: "Efectivo", currency: "BOB" }] as AccountDto[];
type Props = React.ComponentProps<typeof RegisterOperationModal>;
type Node = { type: unknown; props: Record<string, unknown> };

function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return [];
  const { type, props } = tree;
  const children = type === FormField && typeof props.children === "function"
    ? props.children({ id: "test-field" })
    : props.children;
  return [{ type, props }, ...nodes(children), ...nodes(props.footer)];
}

function find(tree: unknown, predicate: (node: Node) => boolean): Node {
  const node = nodes(tree).find(predicate);
  if (!node) throw new Error("Missing control");
  return node;
}

function field(tree: unknown, label: string): Node {
  const wrapper = find(tree, (node) => node.type === FormField && node.props.label === label);
  return nodes((wrapper.props.children as (control: { id: string }) => unknown)({ id: "test-field" }))[0];
}

function change(node: Node, value: string) {
  if (typeof node.props.onValueChange === "function") node.props.onValueChange(value);
  else (node.props.onChange as (event: unknown) => void)({ target: { value } });
}

function selectType(tree: unknown, value: "buy" | "sell" | "dividend") {
  const control = find(tree, (node) => node.type === SegmentedControl);
  (control.props.onChange as (value: string) => void)(value);
}

function advanced(tree: unknown) {
  const button = find(tree, (node) => typeof node.props["aria-expanded"] === "boolean");
  (button.props.onClick as () => void)();
}

async function submit(tree: unknown) {
  const form = find(tree, (node) => node.type === "form");
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}

function render(overrides: Partial<Props> = {}) {
  state.cursor = 0;
  return RegisterOperationModal({
    investment: mockInvestment,
    accounts,
    isOpen: true,
    onClose: vi.fn(),
    onConfirmOperation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

beforeEach(() => {
  state.slots.splice(0);
  state.cursor = 0;
  vi.clearAllMocks();
});

describe("RegisterOperationModal", () => {
  it("renders labeled shared controls and an exclusive operation choice without filler copy", () => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("Comprar BTC");
    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain("Binance Spot");
    expect(html).toContain("Monto que vas a pagar");
    expect(html).toContain("Cantidad de BTC");
    expect(html).toContain('data-slot="segmented-control"');
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-slot="money-input"');
    expect(html).not.toContain("Conversión bidireccional automática");
    expect(html).not.toContain("Calculado dividiendo");
    expect(html).not.toMatch(/(?:purple|rose|emerald|amber|blue)-\d|font-mono/);
  });

  it("defaults money controls to USD and formats the summary and quick amounts through Amount", () => {
    const tree = render();
    expect(field(tree, "Monto que vas a pagar").type).toBe(MoneyInput);
    expect(field(tree, "Monto que vas a pagar").props.currency).toBe("USD");
    const amounts = nodes(tree).filter((node) => node.type === Amount);
    expect(amounts.map((node) => node.props.value)).toEqual(expect.arrayContaining([0, 50, 100, 250, 500, 1000]));
    expect(amounts.every((node) => node.props.currency === "USD")).toBe(true);
    expect(nodes(tree).some((node) => node.type === Quantity)).toBe(true);
    expect(renderToStaticMarkup(tree)).toContain("$ 0,00");
  });

  it("preserves high-precision prices, linked accounts, notes, date and buy/sell calculations", async () => {
    const onConfirmOperation = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const props = { currency: "BOB", onConfirmOperation, onClose };
    let tree = render(props);
    advanced(tree);
    tree = render(props);
    const price = field(tree, "Precio unitario");
    expect(price.type).toBe(MoneyInput);
    expect(price.props.currency).toBe("BOB");
    const priceInput = MoneyInput(price.props as React.ComponentProps<typeof MoneyInput>);
    const input = find(priceInput, (node) => node.type === "input");
    change(input, "0,123456789");
    tree = render(props);
    expect(field(tree, "Precio unitario").props.value).toBe("0.123456789");
    change(field(tree, "Precio unitario"), "25");
    tree = render(props);
    change(field(tree, "Monto que vas a pagar"), "100");
    tree = render(props);
    change(field(tree, "Comisiones / Tarifa"), "2");
    change(field(tree, "Notas de la operación (opcional)"), "  Compra escalonada  ");
    change(field(tree, "Fecha de la operación"), "2026-05-10");
    const account = field(tree, "Pagar o recibir con cuenta bancaria/wallet (opcional)");
    expect(account.type).toBe(SelectField);
    expect(account.props.options).toEqual([
      { value: "", label: "No vincular con cuentas de efectivo" },
      { value: "cash", label: "Efectivo (BOB)" },
    ]);
    change(account, "cash");
    tree = render(props);
    expect(field(tree, "Monto que vas a pagar").props.value).toBe("102");
    await submit(tree);
    expect(onConfirmOperation).toHaveBeenLastCalledWith({
      investmentId: "inv-btc", type: "buy", quantity: 4, unitPrice: 25,
      totalAmount: 102, fees: 2, date: "2026-05-10T00:00:00.000Z",
      notes: "Compra escalonada", linkedAccountId: "cash",
    });
    expect(onClose).toHaveBeenCalledOnce();
    selectType(tree, "sell");
    tree = render(props);
    expect(field(tree, "Monto en dólares que vas a recibir").props.value).toBe("98");
    await submit(tree);
    expect(onConfirmOperation).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "sell", quantity: 4, totalAmount: 98, fees: 2,
    }));
  });

  it("retains additive quick buys and sell-all quantity", () => {
    let tree = render();
    advanced(tree);
    tree = render();
    change(field(tree, "Precio unitario"), "100");
    tree = render();
    const quickAdd = find(tree, (node) => nodes(node.props.children).some((child) => child.type === Amount && child.props.value === 50) && typeof node.props.onClick === "function");
    (quickAdd.props.onClick as () => void)();
    tree = render();
    (find(tree, (node) => nodes(node.props.children).some((child) => child.type === Amount && child.props.value === 50) && typeof node.props.onClick === "function").props.onClick as () => void)();
    tree = render();
    expect(field(tree, "Monto que vas a pagar").props.value).toBe("100");
    selectType(tree, "sell");
    tree = render();
    const sellAll = find(tree, (node) => Array.isArray(node.props.children) && node.props.children[0] === "Vender todo (" && typeof node.props.onClick === "function");
    (sellAll.props.onClick as () => void)();
    tree = render();
    expect(field(tree, "Cantidad de BTC a vender").props.value).toBe("0.5");
    expect(field(tree, "Monto en dólares que vas a recibir").props.value).toBe("50");
  });

  it.each(["stocks", "realestate"] as const)("keeps the %s dividend/rent payload and optional account choice", async (kind) => {
    const onConfirmOperation = vi.fn().mockResolvedValue(undefined);
    const props = { investment: { ...mockInvestment, kind }, onConfirmOperation };
    let tree = render(props);
    selectType(tree, "dividend");
    tree = render(props);
    const label = kind === "realestate" ? "Monto cobrado por alquiler / renta" : "Monto cobrado en dividendos";
    change(field(tree, label), "250.50");
    tree = render(props);
    expect(field(tree, "Acreditar dinero en cuenta bancaria / billetera").props.options).toEqual([
      { value: "", label: "No acreditar en cuentas de efectivo" },
      { value: "cash", label: "Efectivo (BOB)" },
    ]);
    await submit(tree);
    expect(onConfirmOperation).toHaveBeenCalledWith(expect.objectContaining({
      type: "dividend", quantity: 0, unitPrice: 0, totalAmount: 250.5,
      fees: 0, notes: undefined, linkedAccountId: undefined,
    }));
  });

  it("does not submit invalid values and hides account choices when none exist", async () => {
    const onConfirmOperation = vi.fn();
    let tree = render({ accounts: [], onConfirmOperation });
    await submit(tree);
    expect(onConfirmOperation).not.toHaveBeenCalled();
    expect(find(tree, (node) => node.props.type === "submit").props.disabled).toBe(true);
    advanced(tree);
    tree = render({ accounts: [], onConfirmOperation });
    expect(nodes(tree).some((node) => node.type === SelectField)).toBe(false);
  });

  it("refreshes crypto quotes, formats signed changes and restores the live price", async () => {
    vi.mocked(fetchCryptoTicker).mockResolvedValue({
      symbol: "BTC", pair: "BTCUSDT", price: 1234.56,
      priceChangePercent: -2.5, highPrice: 1300, lowPrice: 1200, volume: 100,
    });
    let tree = render({ currency: "BOB" });
    const quote = find(tree, (node) => node.props.source === "Binance Spot");
    await (quote.props.onRefresh as () => Promise<unknown>)();
    expect(fetchCryptoTicker).toHaveBeenCalledWith("BTC");
    tree = render({ currency: "BOB" });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Bs 1.234,56");
    expect(html).toContain("-2,50%");
    expect(html).toContain("text-destructive");
    advanced(tree);
    tree = render({ currency: "BOB" });
    change(field(tree, "Precio unitario"), "1000");
    tree = render({ currency: "BOB" });
    const restore = find(tree, (node) => node.props.children === "Restaurar en vivo");
    (restore.props.onClick as () => void)();
    tree = render({ currency: "BOB" });
    expect(field(tree, "Precio unitario").props.value).toBe("1234.56");
  });

  it("refreshes stock quotes through the supplied adapter and keeps tiny prices canonical", async () => {
    const investment = { ...mockInvestment, kind: "stocks" as const, ticker: "ACME" };
    const onFetchStockQuote = vi.fn().mockResolvedValue({
      ticker: "ACME", price: 0.00000001, changePercent: 1.25,
      currency: "USD", exchangeName: "NASDAQ", updatedAt: "2026-05-10T00:00:00Z",
    });
    const props = { investment, onFetchStockQuote };
    let tree = render(props);
    await (find(tree, (node) => node.props.source === "Yahoo Finance").props.onRefresh as () => Promise<unknown>)();
    expect(onFetchStockQuote).toHaveBeenCalledWith("ACME");
    tree = render(props);
    advanced(tree);
    tree = render(props);
    expect(field(tree, "Precio unitario").props.value).toBe("0.00000001");
    onFetchStockQuote.mockResolvedValue({
      ticker: "ACME", price: 2100.75, changePercent: 1.25,
      currency: "USD", exchangeName: "NASDAQ", updatedAt: "2026-05-10T00:00:00Z",
    });
    await (find(tree, (node) => node.props.source === "Yahoo Finance").props.onRefresh as () => Promise<unknown>)();
    tree = render(props);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Yahoo Finance");
    expect(html).toContain("$ 2.100,75");
    expect(html).toContain("+1,25%");
    expect(html).toContain("text-success");
  });

  it("does not render when isOpen is false or investment is null", () => {
    expect(renderToStaticMarkup(render({ isOpen: false }))).toBe("");
    expect(renderToStaticMarkup(render({ investment: null }))).toBe("");
  });
});
