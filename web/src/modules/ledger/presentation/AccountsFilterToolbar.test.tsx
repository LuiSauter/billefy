import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountsFilterToolbar } from "./AccountsFilterToolbar";

const mockCategoryTotals = {
  bancos: { group: "bancos" as const, label: "Bancos", count: 2, amount: 14500, percentage: 58.3, color: "#2dd4bf" },
  wallets: { group: "wallets" as const, label: "Wallets", count: 2, amount: 3260, percentage: 13.1, color: "#a855f7" },
  cripto: { group: "cripto" as const, label: "Cripto", count: 2, amount: 4320, percentage: 17.4, color: "#f59e0b" },
  efectivo: { group: "efectivo" as const, label: "Efectivo", count: 1, amount: 1000, percentage: 4.0, color: "#06b6d4" },
  otros: { group: "otros" as const, label: "Otros", count: 1, amount: 1780, percentage: 7.2, color: "#818cf8" },
};

describe("AccountsFilterToolbar", () => {
  it("renders all category tabs with correct counts", () => {
    const html = renderToStaticMarkup(
      <AccountsFilterToolbar
        selectedCategory="all"
        onSelectCategory={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
        totalCount={8}
        categoryTotals={mockCategoryTotals}
      />
    );

    expect(html).toContain("Todas las cuentas");
    expect(html).toContain("(8)");
    expect(html).toContain("Bancos");
    expect(html).toContain("(2)");
    expect(html).toContain("Wallets");
    expect(html).toContain("Cripto");
    expect(html).toContain("Efectivo");
    expect(html).toContain("(1)");
  });
});
