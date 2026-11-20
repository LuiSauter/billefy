import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinancialReport } from "../domain/reports-analytics";
import { exportReportAsCsv, exportReportAsPrintable } from "../application/report-export.service";

// Export-service behavior is covered here (colocated with the presentation tests
// that drive it) using the project's node-only harness: browser globals are stubbed.
const report: FinancialReport = {
  kpis: { totalIncome: 1234.5, incomeGrowthPct: 12.6, totalExpenses: 400, expensesGrowthPct: null,
    savingsAndInvestments: 834.5, savingsGrowthPct: -3.25, netBalance: 834.5, netBalanceGrowthPct: 18.7 },
  cashFlowEvolution: [{ month: "Oct", monthKey: "2026-10", income: 1234.5, expenses: 400, net: 834.5 }],
  categoryExpenses: [
    { category: "Supermercado", amount: 400, percentage: 100 },
    { category: "-Reembolso", amount: 0.5, percentage: 0.1 },
  ],
  netWorthEvolution: [{ month: "Oct", monthKey: "2026-10", netWorth: -1100.126 }],
  periodSummary: { savingsRatio: 67.6, netWorthGrowthPct: null, debtRatio: 0, budgetCompliance: null },
  conclusion: { title: "Conclusión del período", narrative: "Datos de prueba", healthStatus: "good" },
};

let downloaded: Blob | undefined;

/** Minimal CSV parser: honors quoted cells (with "" escapes) for the given delimiter. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\r") continue;
    else if (char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
async function csv(...args: Parameters<typeof exportReportAsCsv> extends [infer A, infer B, infer C, ...infer R] ? [A, B, C, ...R] : never) {
  exportReportAsCsv(...args);
  return (await downloaded!.text()).replace(/^﻿/, "");
}

beforeEach(() => {
  downloaded = undefined;
  vi.stubGlobal("URL", { createObjectURL: vi.fn((blob: Blob) => { downloaded = blob; return "blob:test"; }), revokeObjectURL: vi.fn() });
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({ click: vi.fn(), remove: vi.fn() })),
    body: { appendChild: vi.fn() },
  });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("exportReportAsCsv", () => {
  it("uses ';' as delimiter and the on-screen es-BO number format so the file parses into the right columns", async () => {
    const text = await csv(report, "financial-summary", "BOB");
    expect(text).toContain('"Ingresos totales";"1.234,50";"12,60"');
    const rows = parseCsv(text, ";");
    const kpiRows = rows.filter((row) => row.length === 3 && row[0].endsWith("totales"));
    expect(kpiRows).toEqual([["Ingresos totales", "1.234,50", "12,60"], ["Gastos totales", "400,00", ""]]);
    // Every data row of a section has the same column count as its header.
    const cashHeader = rows.findIndex((row) => row[0] === "Mes" && row.length === 4);
    expect(rows[cashHeader + 1]).toEqual(["2026-10", "1.234,50", "400,00", "834,50"]);
    expect(text).not.toMatch(/1234\.5|1234,5(?!0)/);
  });

  it("keeps negative numbers numeric and rounds like the screen, while neutralizing formula-like labels", async () => {
    const text = await csv(report, "financial-summary", "BOB");
    const rows = parseCsv(text, ";");
    expect(rows).toContainEqual(["2026-10", "-1.100,13"]);
    expect(rows).toContainEqual(["Ahorro / Inversión", "834,50", "-3,25"]);
    expect(rows).toContainEqual(["'-Reembolso", "0,50", "0,10"]);
  });

  it("renders unavailable (null) metrics as empty cells rather than 0", async () => {
    const rows = parseCsv(await csv(report, "financial-summary", "BOB"), ";");
    expect(rows).toContainEqual(["Crecimiento del patrimonio", ""]);
    expect(rows).toContainEqual(["Cumplimiento del presupuesto", ""]);
    expect(rows).toContainEqual(["Ratio de endeudamiento", "0,00"]);
  });

  it("follows the en-US convention (',' delimiter, '.' decimals) and the decimal places preference", async () => {
    const text = await csv(report, "cash-flow", "USD", { convention: "en-US", decimalPlaces: 1 });
    const rows = parseCsv(text, ",");
    expect(rows).toContainEqual(["2026-10", "1,234.5", "400.0", "834.5"]);
  });

  it("honors a zero-decimal es-BO preference", async () => {
    const rows = parseCsv(await csv(report, "net-worth", "BOB", { convention: "es-BO", decimalPlaces: 0 }), ";");
    expect(rows).toContainEqual(["2026-10", "-1.100"]);
  });
});

describe("exportReportAsPrintable", () => {
  function stubPopup() {
    const listeners: Record<string, () => void> = {};
    const popup = {
      opener: {} as unknown, closed: false,
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn(), readyState: "loading" },
      focus: vi.fn(), print: vi.fn(),
      addEventListener: vi.fn((type: string, listener: () => void) => { listeners[type] = listener; }),
    };
    vi.stubGlobal("window", { open: vi.fn(() => popup) });
    return { popup, listeners };
  }

  it("waits for the popup's load event before printing, and prints exactly once", () => {
    const { popup, listeners } = stubPopup();
    exportReportAsPrintable(report, "financial-summary", "BOB");
    expect(popup.document.write).toHaveBeenCalledOnce();
    expect(popup.document.close).toHaveBeenCalledOnce();
    expect(popup.print).not.toHaveBeenCalled();
    expect(popup.opener).toBeNull();
    listeners.load();
    expect(popup.print).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(popup.print).toHaveBeenCalledOnce();
  });

  it("falls back to a timed print if the popup never reports load, but not into a closed popup", () => {
    const first = stubPopup();
    exportReportAsPrintable(report, "financial-summary", "BOB");
    vi.runAllTimers();
    expect(first.popup.print).toHaveBeenCalledOnce();

    const second = stubPopup();
    exportReportAsPrintable(report, "financial-summary", "BOB");
    second.popup.closed = true;
    vi.runAllTimers();
    expect(second.popup.print).not.toHaveBeenCalled();
  });

  it("reports a blocked popup as an error", () => {
    vi.stubGlobal("window", { open: vi.fn(() => null) });
    expect(() => exportReportAsPrintable(report, "financial-summary", "BOB")).toThrow(/ventana/);
  });
});
