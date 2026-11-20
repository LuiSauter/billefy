import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatrimonioDistributionDonut } from "./PatrimonioDistributionDonut";
import type { AssetCategorySummary } from "../domain/patrimonio.types";

const category: AssetCategorySummary = {
  category: "cash", label: "Efectivo y bancos", description: "", totalValue: 100, percentage: 100,
  color: "#06b6d4", icon: "banknote", itemsCount: 1, items: [],
};

describe("PatrimonioDistributionDonut", () => {
  it("renders a real empty state without a chart (so no fabricated 100% slice can be hovered)", () => {
    const html = renderToStaticMarkup(<PatrimonioDistributionDonut categories={[]} totalAssets={0} currency="USD" />);

    expect(html).toContain("Sin datos de activos");
    expect(html).not.toContain("recharts");
    expect(html).not.toContain('data-slot="chart"');
  });

  it("renders the chart and legend when there are categories", () => {
    const html = renderToStaticMarkup(<PatrimonioDistributionDonut categories={[category]} totalAssets={100} currency="USD" />);

    expect(html).toContain('data-slot="chart"');
    expect(html).toContain("Efectivo y bancos");
    expect(html).toContain("100,00%");
  });
});
