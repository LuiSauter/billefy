import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountsHeaderStats } from "./AccountsHeaderStats";
import { AccountsOverviewMetrics } from "../domain/accounts-overview";

const mockMetrics: AccountsOverviewMetrics = {
  totalUsd: 24860,
  totalBob: 244871,
  monthlyChangePct: 6.8,
  categoryTotals: {
    bancos: { group: "bancos", label: "Bancos", count: 2, amount: 14500, percentage: 58.3, color: "#2dd4bf" },
    wallets: { group: "wallets", label: "Wallets digitales", count: 2, amount: 3260, percentage: 13.1, color: "#a855f7" },
    cripto: { group: "cripto", label: "Cripto", count: 2, amount: 4320, percentage: 17.4, color: "#f59e0b" },
    efectivo: { group: "efectivo", label: "Efectivo", count: 1, amount: 1000, percentage: 4.0, color: "#06b6d4" },
    otros: { group: "otros", label: "Otros", count: 1, amount: 1780, percentage: 7.2, color: "#818cf8" },
  },
  categoryList: [
    { group: "bancos", label: "Bancos", count: 2, amount: 14500, percentage: 58.3, color: "#2dd4bf" },
    { group: "wallets", label: "Wallets digitales", count: 2, amount: 3260, percentage: 13.1, color: "#a855f7" },
    { group: "cripto", label: "Cripto", count: 2, amount: 4320, percentage: 17.4, color: "#f59e0b" },
    { group: "efectivo", label: "Efectivo", count: 1, amount: 1000, percentage: 4.0, color: "#06b6d4" },
    { group: "otros", label: "Otros", count: 1, amount: 1780, percentage: 7.2, color: "#818cf8" },
  ],
};

describe("AccountsHeaderStats", () => {
  it("renders header and main metrics correctly", () => {
    const html = renderToStaticMarkup(
      <AccountsHeaderStats
        metrics={mockMetrics}
        currency="USD"
        onOpenCreateAccountModal={() => {}}
      />
    );

    expect(html).toContain("Cuentas");
    expect(html).toContain("Saldo total en cuentas");
    expect(html).toContain("$ 24.860,00");
    expect(html).toContain("+6,80%");
    expect(html).toContain("Bancos");
    expect(html).toContain("Wallets digitales");
    expect(html).toContain("Cripto");
    expect(html).toContain("Efectivo");
    expect(html).toContain("Otros");
  });
});
