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
  it("renders header, hero card, tabs, charts and side cards accurately", () => {
    const html = renderToStaticMarkup(
      <InvestmentDetailView
        investment={mockBtc}
        allInvestments={[mockBtc]}
        onBack={vi.fn()}
        onOpenUpdatePrice={vi.fn()}
        onOpenEditInvestment={vi.fn()}
        onOpenOperation={vi.fn()}
      />
    );

    // Header
    expect(html).toContain("Detalle de inversión");
    expect(html).toContain("Actualizar precio");
    expect(html).toContain("Editar inversión");
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
