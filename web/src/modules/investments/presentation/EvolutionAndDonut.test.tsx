import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PortfolioEvolutionChart } from "./main/PortfolioEvolutionChart";
import { InvestmentValueEvolutionChart } from "./detail/InvestmentValueEvolutionChart";
import { PortfolioDistributionDonutCard } from "./main/PortfolioDistributionDonutCard";
import { InvestmentPortfolioShareDonutCard } from "./detail/InvestmentPortfolioShareDonutCard";
import { Investment } from "../domain/investment.types";

const inv = (id: string, name: string, currentValue: number): Investment => ({
  id, name, kind: "crypto", iconKey: "coins", colorKey: "amber", currency: "USD", quantity: 1,
  initialValue: currentValue, currentValue, history: [], createdAt: "2026-01-01T00:00:00Z",
});

describe("shared evolution + donut cards", () => {
  it("renders both evolution wrappers through the same chart card (title + current value badge)", () => {
    const points = [{ date: "2026-01-15", month: "Ene", value: 100, formattedValue: "" }];
    const portfolio = renderToStaticMarkup(<PortfolioEvolutionChart points={points} currentValue={1234.5} currency="USD" />);
    const asset = renderToStaticMarkup(<InvestmentValueEvolutionChart points={points} currentValue={1234.5} currency="USD" />);
    expect(portfolio).toContain("Evolución del portafolio");
    expect(portfolio).toContain("$ 1.234,50");
    expect(asset).toContain("Evolución del valor");
    expect(asset).toContain("$ 1.234,50");
    expect(asset).toContain("Últimos 6 meses");
    expect(portfolio).not.toContain("Últimos 6 meses");
  });

  it("renders the portfolio donut legend, center total and empty state", () => {
    const html = renderToStaticMarkup(
      <PortfolioDistributionDonutCard
        distribution={[{ kind: "crypto", label: "Criptoactivos", color: "#a855f7", totalValue: 750, percentage: 75, count: 1 },
          { kind: "stocks", label: "Acciones", color: "#f59e0b", totalValue: 250, percentage: 25, count: 1 }]}
        totalValue={1000}
        currency="USD"
      />
    );
    expect(html).toContain("Criptoactivos");
    expect(html).toContain("75,00%");
    expect(html).toContain("$ 1.000,00");
    expect(html).toContain("Total invertido");
    const empty = renderToStaticMarkup(<PortfolioDistributionDonutCard distribution={[]} totalValue={0} currency="USD" />);
    expect(empty).toContain("Sin datos de distribución");
  });

  it("puts the viewed asset first in the share donut and reports its share in the center", () => {
    const a = inv("a", "Alpha", 100);
    const b = inv("b", "Beta", 300);
    const html = renderToStaticMarkup(<InvestmentPortfolioShareDonutCard currentInvestment={a} allInvestments={[b, a]} currency="USD" />);
    expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Beta"));
    expect(html).toContain("25,00%");
    expect(html).toContain("del total");
  });
});
