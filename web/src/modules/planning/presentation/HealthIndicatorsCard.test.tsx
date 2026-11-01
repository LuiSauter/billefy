import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HealthIndicatorsCard } from "./HealthIndicatorsCard";
import { FinancialHealthDto } from "../domain/planning.types";

const health: FinancialHealthDto = { monthStartUtc: "2026-05-01T00:00:00Z", monthEndUtcExclusive: "2026-06-01T00:00:00Z", currencies: [
  { currency: "BOB", monthlyIncome: 100, monthlyExpenses: 130, netCashFlow: -30, savingsRatePercentage: -30, currentBalance: 500, outstandingDebtPrincipal: 50 },
  { currency: "BTC", monthlyIncome: 0, monthlyExpenses: 0, netCashFlow: 0, savingsRatePercentage: null, currentBalance: 0.12345678, outstandingDebtPrincipal: 0 },
] };
describe("financial health summary", () => {
  it("renders the returned UTC month and separate real currency amounts without fixed thresholds", () => {
    const html = renderToStaticMarkup(<HealthIndicatorsCard health={health} />);
    for (const text of ["mayo de 2026", "BOB", "BTC", "Ingresos del mes", "Gastos del mes", "Déficit del mes", "Tasa de ahorro", "No disponible", "500.00 BOB", "0.12345678 BTC", "Capital de deuda pendiente", "Gastaste más de lo que ingresó."]) expect(html).toContain(text);
    expect(html).not.toMatch(/50\s*\/\s*30\s*\/\s*20|emergencia|12 meses|54321|32109|21098/);
    expect(html).toContain("text-rose-600");
  });
  it("distinguishes missing, loading, and failed health instead of rendering fake zeroes", () => {
    expect(renderToStaticMarkup(<HealthIndicatorsCard health={null} loading />)).toContain("Cargando resumen");
    expect(renderToStaticMarkup(<HealthIndicatorsCard health={null} error={new Error("offline")} onRetry={vi.fn()} />)).toContain("No se pudo cargar");
    expect(renderToStaticMarkup(<HealthIndicatorsCard health={null} />)).toContain("No hay datos");
  });
});
