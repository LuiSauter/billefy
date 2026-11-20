import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvestmentsTableCard } from "./InvestmentsTableCard";
import { Investment, getKindLabel } from "../../domain/investment.types";

const usdtAsset: Investment = {
  id: "usdt", name: "Tether", kind: "crypto", iconKey: "coins", colorKey: "amber",
  currency: "USDT", quantity: 640, initialValue: 640, costBasis: 640, currentValue: 650.5,
  history: [], createdAt: "2026-01-01T00:00:00Z",
};
const bobAsset: Investment = {
  id: "bob", name: "Fondo local", kind: "funds", iconKey: "piggy-bank", colorKey: "emerald",
  currency: "BOB", quantity: 1, initialValue: 1000, costBasis: 1000, currentValue: 1200,
  history: [], createdAt: "2026-01-01T00:00:00Z",
};
const baseProps = {
  kindCounts: { crypto: 1, funds: 0, stocks: 0, realestate: 0, other: 0 },
  totalCount: 1,
  onSelectInvestment: vi.fn(),
  onOpenUpdatePrice: vi.fn(),
  onOpenCashModal: vi.fn(),
  onArchiveInvestment: vi.fn(),
};

describe("InvestmentsTableCard", () => {
  it("shows value, cost and gain of a row in one display currency (USDT asset displayed in BOB)", () => {
    const html = renderToStaticMarkup(
      <InvestmentsTableCard {...baseProps} investments={[usdtAsset]} currency="BOB" p2pRate={10} />
    );
    expect(html).toContain("Bs 6.505,00");
    expect(html).toContain("Bs 6.400,00");
    expect(html).toContain("+Bs 105,00");
    // The raw USDT amount must not leak next to the converted cost.
    expect(html).not.toContain("650,50");
  });

  it("converts a BOB asset into USD when USD is the display currency", () => {
    const html = renderToStaticMarkup(
      <InvestmentsTableCard {...baseProps} investments={[bobAsset]} currency="USD" p2pRate={10} />
    );
    expect(html).toContain("$ 120,00");
    expect(html).toContain("$ 100,00");
    expect(html).toContain("+$ 20,00");
  });

  it("keeps amounts untouched when the asset already is in the display currency", () => {
    const html = renderToStaticMarkup(
      <InvestmentsTableCard {...baseProps} investments={[bobAsset]} currency="BOB" p2pRate={10} />
    );
    expect(html).toContain("Bs 1.200,00");
    expect(html).toContain("Bs 1.000,00");
    expect(html).toContain("+Bs 200,00");
  });

  it("labels rows with the shared getKindLabel", () => {
    const html = renderToStaticMarkup(
      <InvestmentsTableCard {...baseProps} investments={[usdtAsset]} currency="BOB" p2pRate={10} />
    );
    expect(html).toContain(`>${getKindLabel("crypto")}</span>`);
    expect(html).not.toContain("Criptoactivo");
  });
});
