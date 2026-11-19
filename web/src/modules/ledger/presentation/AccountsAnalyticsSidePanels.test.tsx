import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountsAnalyticsSidePanels } from "./AccountsAnalyticsSidePanels";
import { AccountsOverviewMetrics } from "../domain/accounts-overview";
import { AccountDto } from "../domain/ledger.types";
import { formatCompactAmount } from "@/shared/lib/chart-utils";
import { DEFAULT_NUMBER_FORMAT_PREFERENCES } from "@/shared/lib/number-format";

type CapturedAxisProps = { tickFormatter?: (value: number) => string };
const capturedYAxes: CapturedAxisProps[] = [];

// Recharts only renders its children after a client-side layout pass, so SSR output has no axes.
// Render the chart element tree ourselves and capture the YAxis props instead.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AreaChart: ({ children }: { children: React.ReactNode }) => {
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === actual.YAxis) {
          capturedYAxes.push(child.props as CapturedAxisProps);
        }
      });
      return null;
    },
  };
});

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

const mockAccounts: AccountDto[] = [
  {
    id: "acc-1",
    name: "Banco BCP",
    type: "Savings",
    currency: "USD",
    balance: new Decimal(24860),
    createdAt: new Date().toISOString(),
  },
];

describe("AccountsAnalyticsSidePanels", () => {
  it("renders distribution title, legend items and evolution title", () => {
    const html = renderToStaticMarkup(
      <AccountsAnalyticsSidePanels
        metrics={mockMetrics}
        accounts={mockAccounts}
        currency="USD"
      />
    );

    expect(html).toContain("Distribución del saldo");
    expect(html).toContain("Evolución del saldo en cuentas");
    expect(html).toContain("$ 24.860,00");
    expect(html).toContain("Bancos");
    expect(html).toContain("58,30%");
    expect(html).toContain("Wallets digitales");
    expect(html).toContain("13,10%");
  });

  it("labels the balance-evolution pill with the selected display currency, converting the USD series", () => {
    const usdAccounts: AccountDto[] = [
      {
        id: "acc-usd",
        name: "Cuenta USD",
        type: "Savings",
        currency: "USD",
        balance: new Decimal(1000),
        createdAt: new Date().toISOString(),
      },
    ];

    const html = renderToStaticMarkup(
      <AccountsAnalyticsSidePanels
        metrics={mockMetrics}
        accounts={usdAccounts}
        p2pRate={10}
        currency="BOB"
      />
    );

    // 1.000 USD at a 10 Bs/USD rate is 10.000 Bs: one currency for pill, axis and tooltip.
    expect(html).toContain("Bs 10.000,00");
    expect(html).not.toContain("$ 1.000,00");
  });

  it("formats the Y axis ticks with the shared compact formatter (no symbol, no wrapping)", () => {
    capturedYAxes.length = 0;

    renderToStaticMarkup(
      <AccountsAnalyticsSidePanels
        metrics={mockMetrics}
        accounts={mockAccounts}
        currency="BOB"
      />
    );

    const tickFormatter = capturedYAxes[0]?.tickFormatter;
    expect(tickFormatter).toBeTypeOf("function");
    for (const value of [0, 450, 1200, 6000, 12500]) {
      const tick = tickFormatter!(value);
      expect(tick).toBe(formatCompactAmount(value, "BOB", DEFAULT_NUMBER_FORMAT_PREFERENCES));
      expect(tick).not.toMatch(/Bs|\$|\s/);
    }
  });

  it("colors the donut legend from the same category map as the stat cards (theme chart tokens)", () => {
    const html = renderToStaticMarkup(
      <AccountsAnalyticsSidePanels
        metrics={mockMetrics}
        accounts={mockAccounts}
        currency="USD"
      />
    );

    expect(html).toContain("background-color:var(--color-chart-1)"); // bancos
    expect(html).toContain("background-color:var(--color-chart-4)"); // wallets
    expect(html).not.toMatch(/#3b82f6|#10b981|#64748b|#a855f7/i);
  });
});
