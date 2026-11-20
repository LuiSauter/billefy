import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvestmentPerformanceListCard } from "./InvestmentPerformanceListCard";
import { InvestmentUpcomingEventsCard } from "./InvestmentUpcomingEventsCard";
import { InvestmentPerformanceItem } from "../../domain/portfolio-analytics";

const usdtItem: InvestmentPerformanceItem = {
  id: "usdt", name: "Tether", kind: "crypto", currentValue: 650.5, initialValue: 640, gainLoss: 10.5,
  costKnown: true, performancePct: 1.64, iconKey: "coins", colorKey: "amber", currency: "USDT",
};

describe("InvestmentPerformanceListCard", () => {
  it("shows each row's value converted to the display currency instead of a raw native amount", () => {
    const html = renderToStaticMarkup(<InvestmentPerformanceListCard items={[usdtItem]} currency="BOB" p2pRate={10} />);
    expect(html).toContain("Bs 6.505,00");
    expect(html).not.toContain("650,50");
  });

  it("stacks name and figures in narrow cards through container queries", () => {
    const html = renderToStaticMarkup(<InvestmentPerformanceListCard items={[usdtItem]} currency="USD" />);
    expect(html).toContain("@container");
    expect(html).toContain("@sm:flex-row");
  });

  it("renders rows as real buttons that select the investment", () => {
    const html = renderToStaticMarkup(<InvestmentPerformanceListCard items={[usdtItem]} onSelectInvestment={vi.fn()} />);
    expect(html).toMatch(/<button type="button"[^>]*>/);
  });
});

describe("InvestmentUpcomingEventsCard", () => {
  it("shows the empty state and no add control when no handler is wired (nothing swallows clicks)", () => {
    const html = renderToStaticMarkup(<InvestmentUpcomingEventsCard />);
    expect(html).toContain("Sin eventos programados");
    expect(html).not.toContain("Agregar");
  });

  it("offers the add control only when a handler is provided", () => {
    const html = renderToStaticMarkup(<InvestmentUpcomingEventsCard onAddEvent={vi.fn()} />);
    expect(html).toContain("Agregar");
  });
});
