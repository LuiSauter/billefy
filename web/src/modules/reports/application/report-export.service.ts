import type { FinancialReport } from "../domain/reports-analytics";

export type ReportType = "financial-summary" | "cash-flow" | "category-expenses" | "net-worth";

const reportNames: Record<ReportType, { title: string; filename: string }> = {
  "financial-summary": { title: "Resumen financiero", filename: "reporte-financiero" },
  "cash-flow": { title: "Flujo de efectivo", filename: "flujo-de-efectivo" },
  "category-expenses": { title: "Gastos por categoría", filename: "gastos-por-categoria" },
  "net-worth": { title: "Evolución del patrimonio", filename: "evolucion-del-patrimonio" },
};

type Cell = string | number;
type Section = { title: string; headers: string[]; rows: Cell[][] };

function prepare(reportData: FinancialReport, reportType: ReportType, currency: string) {
  // Use the data's reporting months, never the browser's current month.
  const months = [...reportData.cashFlowEvolution, ...reportData.netWorthEvolution]
    .map(({ monthKey }) => monthKey).filter((key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key)).sort();
  const period = { from: months[0] ?? null, to: months.at(-1) ?? null };
  let data: Partial<FinancialReport>;
  switch (reportType) {
    case "cash-flow": data = { cashFlowEvolution: reportData.cashFlowEvolution }; break;
    case "category-expenses": data = { categoryExpenses: reportData.categoryExpenses }; break;
    case "net-worth": data = { netWorthEvolution: reportData.netWorthEvolution }; break;
    default: data = reportData;
  }
  return { reportType, currency, period, data };
}

function sections(data: Partial<FinancialReport>, currency: string): Section[] {
  const result: Section[] = [];
  if (data.kpis) {
    const kpis = data.kpis;
    result.push({ title: "Indicadores del período", headers: ["Indicador", `Monto (${currency})`, "Variación (%)"], rows: [
      ["Ingresos totales", kpis.totalIncome, kpis.incomeGrowthPct],
      ["Gastos totales", kpis.totalExpenses, kpis.expensesGrowthPct],
      ["Ahorro / Inversión", kpis.savingsAndInvestments, kpis.savingsGrowthPct],
      ["Balance neto", kpis.netBalance, kpis.netBalanceGrowthPct],
    ] });
  }
  if (data.cashFlowEvolution) result.push({
    title: "Flujo de efectivo", headers: ["Mes", `Ingresos (${currency})`, `Gastos (${currency})`, `Balance neto (${currency})`],
    rows: data.cashFlowEvolution.map((point) => [point.monthKey, point.income, point.expenses, point.net]),
  });
  if (data.categoryExpenses) result.push({
    title: "Gastos por categoría", headers: ["Categoría", `Monto (${currency})`, "Porcentaje (%)"],
    rows: data.categoryExpenses.map((point) => [point.category, point.amount, point.percentage]),
  });
  if (data.netWorthEvolution) result.push({
    title: "Evolución del patrimonio", headers: ["Mes", `Patrimonio neto (${currency})`],
    rows: data.netWorthEvolution.map((point) => [point.monthKey, point.netWorth]),
  });
  if (data.periodSummary) {
    const summary = data.periodSummary;
    result.push({ title: "Resumen del período", headers: ["Métrica", "Porcentaje (%)"], rows: [
      ["Ratio de ahorro", summary.savingsRatio], ["Crecimiento del patrimonio", summary.netWorthGrowthPct],
      ["Ratio de endeudamiento", summary.debtRatio], ["Cumplimiento del presupuesto", summary.budgetCompliance],
    ] });
  }
  if (data.conclusion) result.push({ title: data.conclusion.title, headers: ["Estado", "Conclusión"],
    rows: [[data.conclusion.healthStatus, data.conclusion.narrative]],
  });
  return result;
}

function download(text: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  let anchor: HTMLAnchorElement | undefined;
  try {
    anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    // Let the browser start reading the Blob before releasing the URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function csvCell(value: Cell): string {
  // Untrusted labels must not become spreadsheet formulas. Numeric negatives
  // remain numeric, and no monetary arithmetic/rounding is performed here.
  const text = typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportReportAsCsv(reportData: FinancialReport, reportType: ReportType, currency: string): void {
  const report = prepare(reportData, reportType, currency);
  const name = reportNames[reportType];
  const rows: Cell[][] = [["Reporte", name.title], ["Moneda", currency],
    ["Desde", report.period.from ?? "Sin período"], ["Hasta", report.period.to ?? "Sin período"]];
  for (const section of sections(report.data, currency)) {
    rows.push([], [section.title], section.headers, ...section.rows);
  }
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  download(csv, "text/csv;charset=utf-8", `${name.filename}-${report.period.to ?? "sin-periodo"}.csv`);
}

export function exportReportAsJson(reportData: FinancialReport, reportType: ReportType, currency: string): void {
  const report = prepare(reportData, reportType, currency);
  download(JSON.stringify(report, null, 2), "application/json;charset=utf-8",
    `${reportNames[reportType].filename}-${report.period.to ?? "sin-periodo"}.json`);
}

function escapeHtml(value: Cell): string {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

/** Opens the browser print dialog, where the user can choose Save as PDF. */
export function exportReportAsPrintable(reportData: FinancialReport, reportType: ReportType, currency: string): void {
  const report = prepare(reportData, reportType, currency);
  const title = reportNames[reportType].title;
  const tables = sections(report.data, currency).map((section) => `
    <section><h2>${escapeHtml(section.title)}</h2>${section.rows.length ? `
      <table><thead><tr>${section.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${section.rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : "<p>Sin datos en este período</p>"}</section>`).join("");
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("No se pudo abrir la ventana de impresión. Permite las ventanas emergentes e intenta de nuevo.");
  popup.opener = null;
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>${escapeHtml(title)}</title><style>
      body { font-family: system-ui, sans-serif; color: #111; margin: 2rem; }
      h1 { font-size: 1.6rem; } h2 { font-size: 1.1rem; margin-top: 1.5rem; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
      th, td { border: 1px solid #ccc; padding: .5rem; text-align: left; overflow-wrap: anywhere; }
      th { background: #f3f3f3; } tr { break-inside: avoid; }
      @page { margin: 15mm; } @media print { body { margin: 0; } thead { display: table-header-group; } }
    </style></head><body><h1>${escapeHtml(title)}</h1>
    <p>Moneda: ${escapeHtml(currency)} · Período: ${escapeHtml(report.period.from ?? "Sin período")} — ${escapeHtml(report.period.to ?? "Sin período")}</p>
    ${tables}</body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}
