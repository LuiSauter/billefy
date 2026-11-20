import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatrimonioAssetsList } from "./PatrimonioAssetsList";
import { PatrimonioLiabilitiesList } from "./PatrimonioLiabilitiesList";
import type { AssetCategorySummary, LiabilityCategorySummary } from "../domain/patrimonio.types";

const assets: AssetCategorySummary[] = [{
  category: "vehicles", label: "Vehículos", description: "Auto, moto, etc.", totalValue: 1500, percentage: 100,
  color: "#ec4899", icon: "car", itemsCount: 1,
  items: [{ id: "a1", name: "Auto", value: 1500, category: "vehicles", currency: "USD" }],
}];
const liabilities: LiabilityCategorySummary[] = [{
  category: "loan", label: "Préstamo personal", totalAmount: 400, percentage: 100, color: "#8b5cf6", icon: "user", itemsCount: 1,
  items: [{ id: "l1", name: "Banco", amount: 400, category: "loan", currency: "USD" }],
}];

describe("Patrimonio lists", () => {
  it("renders asset category rows as collapsed, keyboard-operable disclosure buttons", () => {
    const html = renderToStaticMarkup(<PatrimonioAssetsList categories={assets} totalAssets={1500} onDeleteAsset={vi.fn()} currency="USD" />);

    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>/);
    expect(html).toContain("Vehículos");
    expect(html).toContain("100,00%");
  });

  it("renders liability category rows as collapsed, keyboard-operable disclosure buttons", () => {
    const html = renderToStaticMarkup(<PatrimonioLiabilitiesList categories={liabilities} totalLiabilities={400} onDeleteLiability={vi.fn()} currency="USD" />);

    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>/);
    expect(html).toContain("Préstamo personal");
  });

  it("does not delete anything on render and keeps the delete confirmation closed", () => {
    const onDeleteAsset = vi.fn();
    const onDeleteLiability = vi.fn();
    renderToStaticMarkup(<PatrimonioAssetsList categories={assets} totalAssets={1500} onDeleteAsset={onDeleteAsset} currency="USD" />);
    renderToStaticMarkup(<PatrimonioLiabilitiesList categories={liabilities} totalLiabilities={400} onDeleteLiability={onDeleteLiability} currency="USD" />);

    expect(onDeleteAsset).not.toHaveBeenCalled();
    expect(onDeleteLiability).not.toHaveBeenCalled();
  });
});
