import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatrimonioView } from "./PatrimonioView";

describe("PatrimonioView", () => {
  it("renders header, KPI cards, charts, assets/liabilities lists and composition bar", () => {
    const html = renderToStaticMarkup(
      <PatrimonioView
        investments={[]}
        accounts={[]}
        loans={[]}
        onNavigateToInvestments={vi.fn()}
      />
    );

    // Header
    expect(html).toContain("Patrimonio");
    expect(html).toContain("Agregar activo");

    // KPI cards
    expect(html).toContain("Patrimonio Neto");
    expect(html).toContain("Activos totales");
    expect(html).toContain("Pasivos totales");
    expect(html).toContain("Ratio de endeudamiento");

    // Charts
    expect(html).toContain("Evolución del patrimonio neto");
    expect(html).toContain("Distribución del patrimonio (activos)");

    // Lists & side cards
    expect(html).toContain("Mis activos");
    expect(html).toContain("Mis pasivos");
    expect(html).toContain("Composición general");
    expect(html).toContain("Insights");
  });
});
