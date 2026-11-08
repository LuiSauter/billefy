import Decimal from "decimal.js";
import type { WorkspaceMonthlyReportDto } from "../domain/workspaces.types";
import { workspacePeriodKey } from "./workspace-view-ui";

export type WorkspaceReportKind = "summary" | "categories" | "comparison";
export const reportKinds: { value: WorkspaceReportKind; label: string }[] = [{ value: "summary", label: "Reporte mensual" }, { value: "categories", label: "Gastos por categoría" }, { value: "comparison", label: "Comparativa de períodos" }];
export function reportBalance(report: WorkspaceMonthlyReportDto) { return new Decimal(report.income).minus(report.expenses); }
export function reportPayload(report: WorkspaceMonthlyReportDto, kind: WorkspaceReportKind) {
  const period = workspacePeriodKey(report.year, report.month);
  if (kind === "categories") return { period, currency: report.currency, expenses: report.expenses, categories: report.categoryBreakdown };
  if (kind === "comparison") return { period, currency: report.currency, income: report.income, expenses: report.expenses, previousMonthIncome: report.previousMonthIncome, previousMonthExpenses: report.previousMonthExpenses, expenseChangePercentage: report.expenseChangePercentage };
  return { ...report, balance: reportBalance(report).toString() };
}
function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(report: WorkspaceMonthlyReportDto, kind: WorkspaceReportKind = "summary") {
  const rows: unknown[][] = [["period", workspacePeriodKey(report.year, report.month)], ["currency", report.currency]];
  if (kind !== "categories") rows.push(["income", report.income], ["expenses", report.expenses], ["contributions", report.savings], ["balance", reportBalance(report).toString()]);
  if (kind === "comparison") rows.push(["previousMonthIncome", report.previousMonthIncome], ["previousMonthExpenses", report.previousMonthExpenses], ["expenseChangePercentage", report.expenseChangePercentage]);
  if (kind !== "comparison") rows.push([], ["categoryId", "amount", "percentage"], ...report.categoryBreakdown.map((item) => [item.categoryId ?? "Sin categoría", item.amount, item.percentage]));
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function downloadWorkspaceReport(report: WorkspaceMonthlyReportDto, format: "json" | "csv", kind: WorkspaceReportKind = "summary") {
  const content = format === "json" ? JSON.stringify(reportPayload(report, kind), null, 2) : `\uFEFF${reportCsv(report, kind)}`;
  const blob = new Blob([content], { type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `workspace-${kind}-${workspacePeriodKey(report.year, report.month)}.${format}`;
    anchor.click();
  } finally { URL.revokeObjectURL(url); }
}
