import { beforeEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResponsiveDrawerProps } from "@/shared/ui/responsive-drawer";
import { FormField } from "@/shared/ui/form-field";
import { Amount, Percentage } from "@/shared/ui/amount";
import { fetchCryptoTicker } from "../../domain/binance-market.service";
import { fetchStockQuote } from "../../domain/stock-market.service";
import { CreateInvestmentModal } from "./CreateInvestmentModal";

const state = vi.hoisted(() => ({ active: false, values: [] as unknown[], cursor: 0 }));

// The repository runs these tests in Node. Keep real hooks for static markup,
// and use a small state harness only when exercising the modal's event handlers.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      if (!state.active) return actual.useState(initial);
      const index = state.cursor++;
      if (!(index in state.values)) state.values[index] = initial;
      return [state.values[index], (next: unknown) => {
        state.values[index] = typeof next === "function" ? next(state.values[index]) : next;
      }];
    },
    useEffect: (...args: Parameters<typeof actual.useEffect>) => {
      if (!state.active) actual.useEffect(...args);
    },
    useCallback: (...args: Parameters<typeof actual.useCallback>) =>
      state.active ? args[0] : actual.useCallback(...args),
  };
});

// ResponsiveDrawer intentionally renders nothing during SSR until the viewport
// resolves. This boundary double exposes its body/footer contract to Node tests.
vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ open, title, children, footer, size }: ResponsiveDrawerProps) => open ? (
    <section role="dialog" data-size={size}>
      <h2>{title}</h2>
      <div>{children}</div>
      <div data-slot="responsive-drawer-footer">{footer}</div>
    </section>
  ) : null,
}));

vi.mock("../../domain/binance-market.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../domain/binance-market.service")>(),
  fetchCryptoTicker: vi.fn(),
}));
vi.mock("../../domain/stock-market.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../domain/stock-market.service")>(),
  fetchStockQuote: vi.fn(),
}));

type Node = { type: unknown; props: Record<string, unknown> };

function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(tree)) return [];
  const children = tree.type === FormField && typeof tree.props.children === "function"
    ? tree.props.children({ id: "test-field" })
    : tree.props.children;
  return [{ type: tree.type, props: tree.props }, ...nodes(children), ...nodes(tree.props.footer)];
}

function field(tree: unknown, label: string): Node {
  const wrapper = nodes(tree).find((node) => node.type === FormField && node.props.label === label);
  if (!wrapper) throw new Error(`Missing field: ${label}`);
  const control = nodes((wrapper.props.children as (control: { id: string }) => React.ReactNode)({ id: "test-field" }))
    .find((node) => typeof node.props.onChange === "function" || typeof node.props.onValueChange === "function");
  if (!control) throw new Error(`Missing control: ${label}`);
  return control;
}

function change(tree: unknown, label: string, value: string) {
  const { props } = field(tree, label);
  if (typeof props.onValueChange === "function") props.onValueChange(value);
  else (props.onChange as (event: unknown) => void)({ target: { value } });
}

function choose(tree: unknown, label: string, value: string) {
  const group = nodes(tree).find((node) => node.props.label === label && typeof node.props.onChange === "function");
  if (!group) throw new Error(`Missing choices: ${label}`);
  (group.props.onChange as (value: string) => void)(value);
}

function render(onCreate = vi.fn(async () => {}), onClose = vi.fn()) {
  state.cursor = 0;
  state.active = true;
  try {
    return { tree: CreateInvestmentModal({ isOpen: true, onCreate, onClose }), onCreate, onClose };
  } finally {
    state.active = false;
  }
}

function submit(tree: unknown) {
  const form = nodes(tree).find((node) => node.type === "form");
  if (!form) throw new Error("Missing investment form");
  return (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
}

function markup(tree: React.ReactNode) {
  return renderToStaticMarkup(tree);
}

beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.active = false;
  vi.clearAllMocks();
  vi.mocked(fetchCryptoTicker).mockResolvedValue(null);
  vi.mocked(fetchStockQuote).mockResolvedValue(null);
});

describe("CreateInvestmentModal", () => {
  it("renders labeled crypto inputs and accessible exclusive choices", () => {
    const html = markup(<CreateInvestmentModal isOpen onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(html).toContain("Registrar nueva inversión");
    expect(html).toContain("Cantidad de monedas");
    expect(html).toContain("Valor total");
    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('role="radiogroup" aria-label="Tipo de activo"');
    expect(html).toContain('role="radiogroup" aria-label="Seleccionar Criptomoneda"');
    expect(html).toContain('data-slot="money-input"');
    expect(html).toMatch(/<label for="[^"]+"[^>]*>Buscar criptomoneda/);
    expect(html).not.toMatch(/font-mono|(?:bg|text|border)-(?:purple|rose|emerald|blue)-\d/);
  });

  it("connects the sticky footer submit button to the body form", () => {
    const html = markup(<CreateInvestmentModal isOpen onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(html).toContain('<form id="create-investment-form"');
    expect(html).toMatch(/<\/form>[\s\S]*data-slot="responsive-drawer-footer"/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*form="create-investment-form"[^>]*disabled/);
    expect(html).not.toContain("Selecciona tu criptomoneda y cotiza");
  });

  it("does not render when isOpen is false", () => {
    expect(markup(<CreateInvestmentModal isOpen={false} onClose={vi.fn()} onCreate={vi.fn()} />)).toBe("");
  });

  it("preserves manual asset validation, decimal parsing, and the exact payload", async () => {
    let view = render();
    choose(view.tree, "Tipo de activo", "other");
    view = render(view.onCreate, view.onClose);
    change(view.tree, "Nombre del activo", "  Colección  ");
    change(view.tree, "Cantidad (unidades)", "0");
    change(view.tree, "Valor total (USD)", "123.456");
    view = render(view.onCreate, view.onClose);
    await submit(view.tree);
    expect(view.onCreate).not.toHaveBeenCalled();

    change(view.tree, "Cantidad (unidades)", " 2.5 ");
    view = render(view.onCreate, view.onClose);
    const money = field(view.tree, "Valor total (USD)");
    expect(money.props.currency).toBe("USD");
    expect(money.props.value).toBe("123.456");
    await submit(view.tree);
    expect(view.onCreate).toHaveBeenCalledWith({
      name: "Colección", ticker: undefined, kind: "other", iconKey: "sparkles",
      colorKey: "cyan", currency: "USD", quantity: 2.5, currentValue: 123.456,
    });
    expect(view.onClose).toHaveBeenCalledOnce();
  });

  it("allows saving the default crypto asset without touching any radio button", async () => {
    let view = render();
    change(view.tree, "Cantidad de monedas (BTC)", "0.01");
    view = render(view.onCreate, view.onClose);
    change(view.tree, "Valor total (USDT)", "647.28");
    view = render(view.onCreate, view.onClose);
    await submit(view.tree);
    expect(view.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: "Bitcoin (BTC)", quantity: 0.01, currentValue: 647.28,
    }));
    expect(view.onClose).toHaveBeenCalledOnce();
  });

  it("keeps the selected valuation currency on the money input and payload", async () => {
    let view = render();
    choose(view.tree, "Tipo de activo", "other");
    view = render(view.onCreate, view.onClose);
    change(view.tree, "Nombre del activo", "Activo");
    change(view.tree, "Moneda de valuación", "BOB");
    view = render(view.onCreate, view.onClose);
    change(view.tree, "Cantidad (unidades)", "1");
    change(view.tree, "Valor total (BOB)", "25.50");
    view = render(view.onCreate, view.onClose);
    expect(field(view.tree, "Valor total (BOB)").props.currency).toBe("BOB");
    await submit(view.tree);
    expect(view.onCreate).toHaveBeenCalledWith(expect.objectContaining({ currency: "BOB", currentValue: 25.5 }));
  });

  it("preserves crypto conversion in both directions and shared quote formatting", async () => {
    vi.mocked(fetchCryptoTicker).mockResolvedValue({
      symbol: "BTC", pair: "BTCUSDT", price: 20000, priceChangePercent: -2.5,
      highPrice: 21000, lowPrice: 19000, volume: 1,
    });
    let view = render();
    choose(view.tree, "Seleccionar Criptomoneda", "BTC");
    await Promise.resolve();
    await Promise.resolve();
    view = render(view.onCreate, view.onClose);
    change(view.tree, "Cantidad de monedas (BTC)", "0.25");
    view = render(view.onCreate, view.onClose);
    expect(field(view.tree, "Valor total (USDT)").props.value).toBe("5000");
    change(view.tree, "Valor total (USDT)", "2500");
    view = render(view.onCreate, view.onClose);
    expect(field(view.tree, "Cantidad de monedas (BTC)").props.value).toBe("0.125");
    const html = markup(view.tree);
    expect(html).toContain(markup(<Amount value={20000} currency="USD" size="sm" tone="inherit" />));
    expect(html).toContain(markup(<Percentage value={-2.5} sign="always" size="inherit" tone="auto" />));
    await submit(view.tree);
    expect(view.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: "Bitcoin (BTC)", ticker: "BTC", kind: "crypto", currency: "USDT",
      quantity: 0.125, currentValue: 2500,
    }));
  });

  it.each([
    ["stocks", "Acciones populares", "AAPL", "Cantidad de acciones o títulos", "trending-up", "blue"],
    ["funds", "ETFs / Fondos populares", "SPY", "Cantidad de cuotapartes", "piggy-bank", "emerald"],
  ])("preserves %s presets, quotes, conversions, and refresh", async (kind, label, symbol, quantityLabel, iconKey, colorKey) => {
    vi.mocked(fetchStockQuote).mockResolvedValue({
      ticker: symbol, price: 125, changePercent: 1.25, currency: "USD", exchangeName: "NASDAQ", updatedAt: "2026-01-01",
    });
    let view = render();
    choose(view.tree, "Tipo de activo", kind);
    view = render(view.onCreate, view.onClose);
    choose(view.tree, label, symbol);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    view = render(view.onCreate, view.onClose);
    change(view.tree, quantityLabel, "2");
    view = render(view.onCreate, view.onClose);
    expect(field(view.tree, "Valor total (USD)").props.value).toBe("250");
    change(view.tree, "Valor total (USD)", "125");
    view = render(view.onCreate, view.onClose);
    expect(field(view.tree, quantityLabel).props.value).toBe("1");
    const html = markup(view.tree);
    expect(html).toContain(markup(<Amount value={125} currency="USD" size="sm" tone="inherit" />));
    expect(html).toContain(markup(<Percentage value={1.25} sign="always" size="inherit" tone="auto" />));
    expect(html).toContain('aria-label="Refrescar cotización"');
    const quote = nodes(view.tree).find((node) => typeof node.props.onRefresh === "function");
    expect(quote).toBeDefined();
    (quote!.props.onRefresh as () => void)();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchStockQuote).toHaveBeenLastCalledWith(symbol);
    view = render(view.onCreate, view.onClose);
    await submit(view.tree);
    expect(view.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      ticker: symbol, kind, iconKey, colorKey, currency: "USD", quantity: 1, currentValue: 125,
    }));
  });

  it("keeps real-estate presets and accessible color/icon choices", async () => {
    let view = render();
    choose(view.tree, "Tipo de activo", "realestate");
    view = render(view.onCreate, view.onClose);
    choose(view.tree, "Tipo de propiedad", "Departamento");
    view = render(view.onCreate, view.onClose);
    expect(field(view.tree, "Nombre o ubicación del inmueble").props.value).toBe("Departamento ");
    change(view.tree, "Nombre o ubicación del inmueble", "Departamento Centro");
    change(view.tree, "Superficie (m²) o Unidades", "80");
    change(view.tree, "Valor total (USD)", "60000");
    const pickers = nodes(view.tree).filter((node) => node.props["aria-pressed"] !== undefined);
    expect(pickers.length).toBeGreaterThan(7);
    expect(pickers.every((node) => typeof node.props["aria-label"] === "string")).toBe(true);
    (pickers[0].props.onClick as () => void)();
    (pickers[7].props.onClick as () => void)();
    view = render(view.onCreate, view.onClose);
    const selected = nodes(view.tree).filter((node) => node.props["aria-pressed"] === true);
    expect(selected).toHaveLength(2);
    await submit(view.tree);
    expect(view.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: "Departamento Centro", kind: "realestate", quantity: 80, currentValue: 60000,
    }));
  });

  it("retains entered values on failure, disables pending actions, and resets after success", async () => {
    let reject!: (error: Error) => void;
    const onCreate = vi.fn(() => new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; }));
    const onClose = vi.fn();
    let view = render(onCreate, onClose);
    choose(view.tree, "Tipo de activo", "other");
    view = render(onCreate, onClose);
    change(view.tree, "Nombre del activo", "Activo");
    change(view.tree, "Cantidad (unidades)", "1");
    change(view.tree, "Valor total (USD)", "50");
    view = render(onCreate, onClose);
    const pending = submit(view.tree);
    const rejection = expect(pending).rejects.toThrow("offline");
    view = render(onCreate, onClose);
    const actions = nodes(view.tree).filter((node) => node.props.disabled === true);
    expect(actions).toHaveLength(2);
    expect(markup(view.tree)).toContain("Guardando...");
    reject(new Error("offline"));
    await rejection;
    view = render(onCreate, onClose);
    expect(field(view.tree, "Nombre del activo").props.value).toBe("Activo");
    expect(field(view.tree, "Valor total (USD)").props.value).toBe("50");
    expect(onClose).not.toHaveBeenCalled();
    onCreate.mockResolvedValueOnce();
    await submit(view.tree);
    view = render(onCreate, onClose);
    expect(field(view.tree, "Nombre del activo").props.value).toBe("");
    expect(field(view.tree, "Cantidad (unidades)").props.value).toBe("");
    expect(field(view.tree, "Valor total (USD)").props.value).toBe("");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps crypto search filtering and the ten-choice limit", () => {
    let view = render();
    let choices = nodes(view.tree).find((node) => node.props.label === "Seleccionar Criptomoneda");
    expect(choices?.props.options).toHaveLength(10);
    change(view.tree, "Buscar criptomoneda", "ethereum");
    view = render(view.onCreate, view.onClose);
    choices = nodes(view.tree).find((node) => node.props.label === "Seleccionar Criptomoneda");
    expect(choices?.props.options).toEqual([{ value: "ETH", label: "Ξ ETH" }]);
    change(view.tree, "Buscar criptomoneda", "no-match");
    view = render(view.onCreate, view.onClose);
    choices = nodes(view.tree).find((node) => node.props.label === "Seleccionar Criptomoneda");
    expect(choices?.props.options).toEqual([]);
  });
});
