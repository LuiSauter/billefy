import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Investment } from "../domain/investment.types";
import { calculateInvestmentDetailMetrics } from "../domain/investment-detail";
import { calculatePortfolioOverview } from "../domain/portfolio-analytics";
import { InvestmentDetailKpis } from "./detail/InvestmentDetailKpis";
import { InvestmentInfoCard } from "./detail/InvestmentInfoCard";
import { InvestmentsKpiCards } from "./main/InvestmentsKpiCards";
const position: Investment = { id: "shares", name: "January shares", kind: "stocks", currency: "BOB", quantity: 25, initialValue: 2000, costBasis: 2600, currentValue: 2750, history: [], createdAt: "2027-01-01", iconKey: "trending-up", colorKey: "blue" };
describe("investment cost and gain views", () => {
  it("shows 2600 cost and 150 gain in detail and portfolio instead of 750 opening-snapshot gain", () => {
    const metrics = calculateInvestmentDetailMetrics(position, [position]);
    const detail = renderToStaticMarkup(<InvestmentDetailKpis metrics={metrics} currency="BOB" />);
    expect(detail).toContain("2.600,00");
    expect(detail).toContain("150,00");
    // Anchor the full amount: the legitimate current value 2.750,00 contains the substring 750,00.
    expect(detail).not.toContain(">+Bs 750,00<");
    const overview = renderToStaticMarkup(<InvestmentsKpiCards metrics={calculatePortfolioOverview([position], "BOB")} currency="BOB" />);
    expect(overview).toContain("2.600,00");
    expect(overview).toContain("150,00");
  });
  it("labels unknown legacy acquisition cost instead of showing a fabricated gain", () => {
    const unknown = { ...position, costBasis: null };
    const detail = renderToStaticMarkup(<InvestmentInfoCard investment={unknown} metrics={calculateInvestmentDetailMetrics(unknown, [unknown])} currency="BOB" />);
    expect(detail).toContain("Costo histórico pendiente");
    const overview = renderToStaticMarkup(<InvestmentsKpiCards metrics={calculatePortfolioOverview([unknown], "BOB")} currency="BOB" />);
    expect(overview).toContain("Costo incompleto");
    expect(overview).toContain("No disponible");
  });
});
