import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Decimal from "decimal.js";
import { calculatePatrimonioOverview } from "../domain/net-worth-analytics";
import { PatrimonioKpiCards } from "./PatrimonioKpiCards";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";

const iso = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).toISOString();
const borrowed = (overrides: Partial<LoanSummaryDto> = {}): LoanSummaryDto => ({
  id: "loan-1", counterpartyId: "c", counterpartyName: "Familia", type: "Borrowed", template: "Standard", status: "Active",
  principal: new Decimal(1000), currency: "USD", interestRate: 0, annualEffectiveRate: 0, remainingPrincipal: new Decimal(1000),
  disbursementDate: "2026-11-10", firstDueDate: "2026-12-10", totalInstallments: 1, createdAt: iso(2026, 11, 10), ...overrides,
});

/** Markup from a KPI card's title up to the start of the next card. */
function cardMarkup(html: string, title: string): string {
  const index = html.indexOf(`>${title}<`);
  expect(index).toBeGreaterThan(-1);
  const next = html.indexOf('data-slot="card"', index);
  return html.slice(index, next === -1 ? undefined : next);
}

describe("PatrimonioKpiCards trends", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("shows a bad upward trend for liabilities that just appeared, with the absolute change when there is no percentage base", () => {
    const metrics = calculatePatrimonioOverview({ loans: [borrowed()], targetCurrency: "BOB" });
    const html = renderToStaticMarkup(<PatrimonioKpiCards metrics={metrics} currency="BOB" targetCurrency="BOB" />);

    const card = cardMarkup(html, "Pasivos totales");
    expect(card).toContain('data-trend="up"');
    expect(card).toContain('data-tone="bad"');
    expect(card).toContain("+Bs");
    expect(card).not.toContain("0,00%");
  });

  it("shows a good downward trend when liabilities decrease", () => {
    const metrics = calculatePatrimonioOverview({
      loans: [borrowed({ remainingPrincipal: new Decimal(800), createdAt: iso(2026, 1, 1) })],
      transactions: [{
        id: "t", accountId: "gone", direction: "Expense", amount: new Decimal(200), currency: "USD",
        occurredAt: iso(2026, 11, 5), createdAt: iso(2026, 11, 5), loanId: "loan-1", loanCashKind: "Principal",
      }],
    });
    const html = renderToStaticMarkup(<PatrimonioKpiCards metrics={metrics} currency="USD" targetCurrency="USD" />);

    const card = cardMarkup(html, "Pasivos totales");
    expect(card).toContain('data-trend="down"');
    expect(card).toContain('data-tone="good"');
    expect(card).toContain("20,00%");
  });

  it("shows assets and net worth as down/bad when they actually fell", () => {
    const metrics = calculatePatrimonioOverview({
      accounts: [{ id: "a", name: "A", type: "Savings", currency: "USD", balance: new Decimal(500), createdAt: iso(2026, 1, 1) }],
      transactions: [{
        id: "t", accountId: "a", direction: "Expense", amount: new Decimal(500), currency: "USD",
        occurredAt: iso(2026, 11, 5), createdAt: iso(2026, 11, 5),
      }],
    });
    const html = renderToStaticMarkup(<PatrimonioKpiCards metrics={metrics} currency="USD" targetCurrency="USD" />);

    // Oct-end balance 1000 -> now 500
    expect(cardMarkup(html, "Activos totales")).toContain('data-trend="down"');
    expect(cardMarkup(html, "Activos totales")).toContain('data-tone="bad"');
    expect(cardMarkup(html, "Patrimonio Neto")).toContain('data-trend="down"');
    expect(cardMarkup(html, "Patrimonio Neto")).toContain('data-tone="bad"');
  });

  it("is neutral when there is nothing to compare", () => {
    const html = renderToStaticMarkup(<PatrimonioKpiCards metrics={calculatePatrimonioOverview({})} currency="USD" targetCurrency="USD" />);

    expect(cardMarkup(html, "Pasivos totales")).toContain('data-trend="flat"');
    expect(cardMarkup(html, "Activos totales")).toContain('data-tone="neutral"');
  });
});
