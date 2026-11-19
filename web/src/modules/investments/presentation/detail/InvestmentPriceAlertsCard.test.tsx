import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvestmentPriceAlertsCard } from "./InvestmentPriceAlertsCard";

describe("InvestmentPriceAlertsCard", () => {
  it("does not offer to create alerts that nothing would store or evaluate", () => {
    const html = renderToStaticMarkup(<InvestmentPriceAlertsCard investmentId="inv" currency="USD" />);
    expect(html).toContain("Las alertas de precio todavía no están disponibles");
    expect(html).not.toContain("Crear alerta");
    expect(html).not.toContain("No tienes alertas configuradas aún.");
  });

  it("shows the create action and persisted alerts when real handlers are wired", () => {
    const html = renderToStaticMarkup(
      <InvestmentPriceAlertsCard
        investmentId="inv"
        currency="USD"
        alerts={[{ id: "a1", investmentId: "inv", condition: "above", targetPrice: 70000, active: true }]}
        onCreateAlert={vi.fn()}
        onToggleAlert={vi.fn()}
        onRemoveAlert={vi.fn()}
      />
    );
    expect(html).toContain("Crear alerta");
    expect(html).toContain("$ 70.000,00");
    expect(html).not.toContain("Las alertas de precio todavía no están disponibles");
  });
});
