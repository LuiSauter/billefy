"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { ArrowDown, ArrowUp, Coins, Download, Eye, Scale } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select-field";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import type { WorkspaceMonthlyReportDto } from "../domain/workspaces.types";
import { shiftWorkspaceMonth } from "./workspace-calendar";
import { downloadWorkspaceReport, reportBalance, reportKinds, reportPayload, type WorkspaceReportKind } from "./workspace-reports";
import { workspaceMoney, workspacePanel } from "./workspace-ui";
import { WorkspaceCategoryList, WorkspaceDonut, WorkspaceKpi, workspacePeriodKey, workspacePeriodLabel } from "./workspace-view-ui";

interface Props { report: WorkspaceMonthlyReportDto; onPeriodChange: (value: string) => void; }
export function WorkspaceReportsView({ report, onPeriodChange }: Props) {
  const [comparison, setComparison] = useState("previous");
  const [selected, setSelected] = useState<WorkspaceReportKind | null>(null);
  const [exportError, setExportError] = useState(false);
  const money = (amount: Decimal.Value) => workspaceMoney(amount, report.currency);
  const previous = shiftWorkspaceMonth(report.year, report.month, -1);
  const [previousYear, previousMonth] = previous.split("-").map(Number);
  const exportReport = (format: "json" | "csv", kind: WorkspaceReportKind) => {
    setExportError(false);
    try { downloadWorkspaceReport(report, format, kind); } catch { setExportError(true); }
  };
  return <div className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold">Reportes</h1><p className="mt-1 text-sm text-muted-foreground">Analiza tus finanzas, identifica tendencias y toma mejores decisiones.</p></div><div className="flex flex-wrap items-end gap-3"><FormField label="Período (mes actual)">{(control) => <Input {...control} type="month" min="0002-01" max="9998-12" value={workspacePeriodKey(report.year, report.month)} onChange={(event) => onPeriodChange(event.target.value)} />}</FormField><FormField label="Comparar con">{(control) => <SelectField {...control} value={comparison} onChange={(event) => setComparison(event.target.value)} options={[{ value: "previous", label: `Mes anterior · ${workspacePeriodLabel(previousYear, previousMonth)}` }, { value: "none", label: "Sin comparación" }]} />}</FormField><Button onClick={() => setSelected("summary")}><Download />Exportar reporte</Button></div></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><WorkspaceKpi label="Ingresos" value={money(report.income)} Icon={ArrowDown} tone="text-emerald-500" /><WorkspaceKpi label="Gastos" value={money(report.expenses)} Icon={ArrowUp} tone="text-destructive">{comparison === "previous" && <p className="text-xs text-muted-foreground">{report.expenseChangePercentage === null ? "Sin base de comparación" : `${new Decimal(report.expenseChangePercentage).toDecimalPlaces(1)}% vs. mes anterior`}</p>}</WorkspaceKpi><WorkspaceKpi label="Aportaciones" value={money(report.savings)} Icon={Coins} /><WorkspaceKpi label="Balance del período" value={money(reportBalance(report))} Icon={Scale} /></div>
    <p className="text-xs text-muted-foreground">Ingresos corresponde a los ingresos compartidos registrados en el espacio. Aportaciones corresponde a aportes a metas; el balance es ingresos menos gastos, no el saldo de cuentas personales.</p>
    <div className="grid items-stretch gap-4 xl:grid-cols-2">
      <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Evolución de ingresos y gastos</h2><WorkspaceReportTrend report={report} compare={comparison === "previous"} /><p className="mt-3 text-xs text-muted-foreground">Se muestran únicamente los meses disponibles en el reporte: período seleccionado{comparison === "previous" ? " y mes anterior" : ""}.</p></section>
      <section className={workspacePanel}><h2 className="mb-5 text-lg font-bold">Gastos por categoría</h2><div className="flex flex-wrap items-center gap-5"><WorkspaceDonut segments={report.categoryBreakdown.map((item) => item.percentage)} label="Gastos por categoría"><strong>{money(report.expenses)}</strong><span className="text-xs text-muted-foreground">Gastos totales</span></WorkspaceDonut><WorkspaceCategoryList items={report.categoryBreakdown} currency={report.currency} /></div></section>
    </div>
    <section className={workspacePanel}><h2 className="text-lg font-bold">Reportes generados</h2><p className="my-3 text-xs text-muted-foreground">Generados al consultar este período. No existe un historial de archivos guardados en esta versión.</p><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><caption className="sr-only">Reportes disponibles para el período seleccionado</caption><thead><tr className="border-b border-border text-xs text-muted-foreground">{["Nombre", "Período", "Tipo", "Acciones"].map((label) => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{reportKinds.map(({ value, label }) => <tr key={value} className="border-b border-border last:border-0"><th className="p-3 font-semibold">{label}</th><td className="p-3 capitalize">{workspacePeriodLabel(report.year, report.month)}</td><td className="p-3"><Badge variant="secondary">{value === "summary" ? "Resumen" : value === "categories" ? "Gastos" : "Comparativo"}</Badge></td><td className="p-3"><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setSelected(value)}><Eye />Ver</Button><Button variant="secondary" size="sm" onClick={() => exportReport("json", value)}><Download />Descargar JSON</Button><Button variant="outline" size="sm" onClick={() => exportReport("csv", value)}>CSV</Button></div></td></tr>)}</tbody></table></div></section>
    {exportError && <p role="alert" className="text-sm text-destructive">No se pudo descargar el reporte. Inténtalo nuevamente.</p>}
    {selected && <ResponsiveDrawer open title={reportKinds.find((kind) => kind.value === selected)!.label} description={workspacePeriodLabel(report.year, report.month)} onOpenChange={(open) => { if (!open) setSelected(null); }} footer={<><Button variant="outline" onClick={() => exportReport("json", selected)}>Descargar JSON</Button><Button onClick={() => exportReport("csv", selected)}>Descargar CSV</Button></>}><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-4 text-xs">{JSON.stringify(reportPayload(report, selected), null, 2)}</pre>{exportError && <p role="alert" className="text-sm text-destructive">No se pudo descargar el reporte.</p>}</ResponsiveDrawer>}
  </div>;
}

function WorkspaceReportTrend({ report, compare }: { report: WorkspaceMonthlyReportDto; compare: boolean }) {
  const previous = shiftWorkspaceMonth(report.year, report.month, -1);
  const points = [...(compare ? [{ label: previous, income: report.previousMonthIncome, expenses: report.previousMonthExpenses }] : []), { label: workspacePeriodKey(report.year, report.month), income: report.income, expenses: report.expenses }];
  const max = Decimal.max(1, ...points.flatMap((point) => [point.income, point.expenses]));
  const y = (amount: number) => 180 - new Decimal(amount).div(max).mul(150).toNumber();
  const x = (index: number) => points.length === 1 ? 270 : 70 + index * 400;
  return <div><svg viewBox="0 0 540 220" className="w-full" role="img" aria-label="Tendencia mensual de ingresos y gastos"><line x1="60" y1="180" x2="500" y2="180" stroke="var(--border)" />{[0, 1, 2, 3].map((tick) => <g key={tick}><line x1="60" y1={30 + tick * 50} x2="500" y2={30 + tick * 50} stroke="var(--border)" /><text x="55" y={34 + tick * 50} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{max.mul(3 - tick).div(3).toDecimalPlaces(0).toString()}</text></g>)}{(["income", "expenses"] as const).map((key) => <g key={key}><polygon points={`${x(0)},180 ${points.map((point, index) => `${x(index)},${y(point[key])}`).join(" ")} ${x(points.length - 1)},180`} fill={key === "income" ? "var(--chart-2)" : "var(--chart-4)"} opacity="0.12" /><polyline points={points.map((point, index) => `${x(index)},${y(point[key])}`).join(" ")} fill="none" stroke={key === "income" ? "var(--chart-2)" : "var(--chart-4)"} strokeWidth="3" />{points.map((point, index) => <circle key={point.label} cx={x(index)} cy={y(point[key])} r="5" fill={key === "income" ? "var(--chart-2)" : "var(--chart-4)"}><title>{`${point.label}: ${key === "income" ? "Ingresos" : "Gastos"} ${workspaceMoney(point[key], report.currency)}`}</title></circle>)}</g>)}{points.map((point, index) => <text key={point.label} x={x(index)} y="205" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">{point.label}</text>)}</svg><div className="flex justify-center gap-5 text-sm"><span className="text-chart-2">● Ingresos</span><span className="text-chart-4">● Gastos</span></div><table className="sr-only"><caption>Valores de la tendencia mensual</caption><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>{points.map((point) => <tr key={point.label}><th>{point.label}</th><td>{workspaceMoney(point.income, report.currency)}</td><td>{workspaceMoney(point.expenses, report.currency)}</td></tr>)}</tbody></table></div>;
}
