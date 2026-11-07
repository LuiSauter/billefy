import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvestmentsView } from "./InvestmentsView";
import { InvestmentsController } from "../application/useInvestments";
import { Investment } from "../domain/investment.types";

const investment: Investment = {
  id: "inv-1", name: "Fondo", kind: "funds", iconKey: "coins", colorKey: "blue",
  currency: "USD", quantity: 1, initialValue: 1200, currentValue: 1234.56,
  history: [], createdAt: "2026-01-01T00:00:00Z",
};

describe("InvestmentsView number formatting", () => {
  it("formats displayed investment values with the default Spanish grouping", () => {
    const controller = {
      investments: [investment], createInvestment: vi.fn(), updateInvestmentValue: vi.fn(),
      deleteInvestment: vi.fn(), refreshAfterCash: vi.fn(), recordCash: vi.fn(), reverseCash: vi.fn(),
      syncBinancePortfolio: vi.fn(),
    } as unknown as InvestmentsController;
    const html = renderToStaticMarkup(
      <InvestmentsView controller={controller} p2pRate={9.85} accounts={[]} onCashComplete={vi.fn()} />
    );
    expect(html).toContain("1.234,56 USD");
  });

  it("renders full investments dashboard with header, KPIs, charts, table and side cards", () => {
    const controller = {
      investments: [investment],
      createInvestment: vi.fn(),
      updateInvestmentValue: vi.fn(),
      deleteInvestment: vi.fn(),
      refreshAfterCash: vi.fn(),
      recordCash: vi.fn(),
      reverseCash: vi.fn(),
      syncBinancePortfolio: vi.fn(),
    } as unknown as InvestmentsController;

    const html = renderToStaticMarkup(
      <InvestmentsView
        controller={controller}
        p2pRate={9.85}
        accounts={[]}
        onCashComplete={vi.fn()}
      />
    );

    // Header
    expect(html).toContain("Inversiones");
    expect(html).toContain("Registrar inversión");
    expect(html).toContain("Aporte o retiro");
    expect(html).toContain("Sincronizar Binance");

    // Top KPIs
    expect(html).toContain("Valor de inversiones");
    expect(html).toContain("Ganancia / Pérdida");
    expect(html).toContain("Aporte total");
    expect(html).toContain("Rendimiento anual (YTD)");

    // Middle panels
    expect(html).toContain("Evolución del portafolio");
    expect(html).toContain("Distribución por tipo de inversión");
    expect(html).toContain("Rendimiento por inversión");

    // Table
    expect(html).toContain("Mis inversiones");
    expect(html).toContain("Todas");
    expect(html).toContain("Fondos / ETFs");

    // Side cards
    expect(html).toContain("Metas de inversión");
    expect(html).toContain("Próximos eventos");
  });
});
