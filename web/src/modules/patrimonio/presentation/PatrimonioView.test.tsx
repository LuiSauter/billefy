import { beforeEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatrimonioView } from "./PatrimonioView";

// shared/ui/skeleton.tsx uses JSX without importing React; the Next compiler injects it, vitest's transform does not.
vi.stubGlobal("React", React);

const patrimonio = vi.hoisted(() => ({ loaded: true }));
vi.mock("../application/usePatrimonio", () => ({
  usePatrimonio: () => ({
    manualAssets: [],
    manualLiabilities: [],
    addAsset: vi.fn(),
    deleteAsset: vi.fn(),
    addLiability: vi.fn(),
    deleteLiability: vi.fn(),
    loaded: patrimonio.loaded,
  }),
}));

describe("PatrimonioView", () => {
  beforeEach(() => {
    patrimonio.loaded = true;
  });

  it("shows a loading state instead of the empty-state copy and zero KPIs before manual data hydrates", () => {
    patrimonio.loaded = false;
    const html = renderToStaticMarkup(<PatrimonioView investments={[]} accounts={[]} loans={[]} />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).not.toContain("No tienes activos");
    expect(html).not.toContain("No tienes deudas");
  });

  it("renders the empty-state copy once hydrated with no records", () => {
    const html = renderToStaticMarkup(<PatrimonioView investments={[]} accounts={[]} loans={[]} />);

    expect(html).not.toContain('aria-busy="true"');
    expect(html).toContain("No tienes activos");
  });

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
