import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InvestmentDetailView } from "./InvestmentDetailView";
import { Investment } from "../../domain/investment.types";

const mockBtc: Investment = {
  id: "inv-btc",
  name: "Bitcoin (BTC)",
  kind: "crypto",
  iconKey: "coins",
  colorKey: "amber",
  currency: "USD",
  quantity: 0.42,
  initialValue: 55000,
  currentValue: 67420,
  history: [
    { at: "2026-05-15T00:00:00Z", value: 55000 },
    { at: "2026-10-15T00:00:00Z", value: 67420 },
  ],
  createdAt: "2026-01-15T00:00:00Z",
};

describe("InvestmentDetailView", () => {
  it("does not fabricate opening purchases from current units when the server history list is empty", () => {
    const html = renderToStaticMarkup(<InvestmentDetailView investment={mockBtc} allInvestments={[mockBtc]} transactions={[]}
      onBack={vi.fn()} onOpenUpdatePrice={vi.fn()} onOpenArchiveInvestment={vi.fn()} onOpenOperation={vi.fn()} />);
    expect(html).toContain("No hay operaciones registradas aún.");
    expect(html).not.toContain("Compra inicial registrada al dar de alta el activo.");
  });
  it("renders header, hero card, tabs, charts and side cards accurately", () => {
    const html = renderToStaticMarkup(
      <InvestmentDetailView
        investment={mockBtc}
        allInvestments={[mockBtc]}
        onBack={vi.fn()}
        onOpenUpdatePrice={vi.fn()}
        onOpenArchiveInvestment={vi.fn()}
        onOpenOperation={vi.fn()}
      />
    );

    // Header
    expect(html).toContain("Detalle de inversión");
    expect(html).toContain("Actualizar precio");
    expect(html).toContain("Archivar inversión");
    expect(html).toContain("Registrar operación");

    // Hero card
    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain("67.420,00");
    expect(html).toContain("Rentabilidad (ROI)");

    // Tabs
    expect(html).toContain("Resumen");
    expect(html).toContain("Operaciones");
    expect(html).toContain("Evolución");
    expect(html).toContain("Alertas");
    expect(html).toContain("Documentos");

    // Charts & tables
    expect(html).toContain("Evolución del valor");
    expect(html).toContain("Distribución en mi portafolio");
    expect(html).toContain("Inversión total");
    expect(html).toContain("Operaciones recientes");

    // Side cards
    expect(html).toContain("Información de la inversión");
    expect(html).toContain("Notas");
    expect(html).toContain("Alertas de precio");
  });
});

describe("InvestmentDetailView honesty (no fabricated data or labels)", () => {
  const stock: Investment = { ...mockBtc, id: "inv-stock", name: "Acme", kind: "stocks", ticker: "ACME", currency: "USD" };
  const renderDetail = (investment: Investment, transactions?: Parameters<typeof InvestmentDetailView>[0]["transactions"]) =>
    renderToStaticMarkup(<InvestmentDetailView investment={investment} allInvestments={[investment]} transactions={transactions}
      onBack={vi.fn()} onOpenUpdatePrice={vi.fn()} onOpenArchiveInvestment={vi.fn()} onOpenOperation={vi.fn()} />);

  it("labels the destructive header action for what it does instead of 'Editar inversión'", () => {
    const html = renderDetail(mockBtc);
    expect(html).not.toContain("Editar inversión");
    expect(html).toContain("Archivar inversión");
  });

  it("does not show a hardcoded platform or zero fee for a non-crypto asset", () => {
    const html = renderDetail(stock);
    expect(html).not.toContain("Binance");
    expect(html).not.toContain("Plataforma");
    expect(html).not.toContain("Comisiones");
  });

  it("shows real fees summed from the server operations when they exist", () => {
    const html = renderDetail(stock, [
      { id: "t1", investmentId: "inv-stock", type: "Buy", quantity: 1, unitPrice: 10, totalAmount: 10, fees: 1.5, occurredAt: "2026-02-01T00:00:00Z", createdAt: "2026-02-01T00:00:00Z" },
      { id: "t2", investmentId: "inv-stock", type: "Sell", quantity: 1, unitPrice: 12, totalAmount: 12, fees: 0.5, occurredAt: "2026-03-01T00:00:00Z", createdAt: "2026-03-01T00:00:00Z" },
    ]);
    expect(html).toContain("Comisiones");
    expect(html).toContain("$ 2,00");
  });

  it("does not show a fabricated alert count badge on the Alertas tab", () => {
    const html = renderDetail(mockBtc);
    expect(html).not.toMatch(/Alertas<\/span><span[^>]*>\s*2\s*<\/span>/);
    expect(html).not.toMatch(/Alertas<\/span><span[^>]*>\s*\d+\s*<\/span>/);
  });
});
