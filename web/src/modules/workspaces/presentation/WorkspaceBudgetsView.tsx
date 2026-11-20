"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { BarChart3, CalendarDays, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import type { SharedBudgetDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { expensePreview, type ExpenseDraft } from "./workspace-expense";
import { WorkspaceMember, workspaceMemberLabel } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";
import { WorkspaceCategory, WorkspaceDonut, WorkspaceProgress, workspacePercentage, workspacePeriodLabel } from "./workspace-view-ui";

interface Props {
  workspace: WorkspaceDetailDto;
  budget: SharedBudgetDto | null;
  year: number;
  month: number;
  viewerUserId?: string;
  onConfigureBudget: () => void;
}
export function WorkspaceBudgetsView({ workspace, budget, year, month, viewerUserId, onConfigureBudget }: Props) {
  const members = workspace.members.filter((member) => member.isActive);
  const [rule, setRule] = useState<ExpenseDraft["rule"]>("EqualParts");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const { findCategory } = useUserCategories();
  const money = (amount: Decimal.Value) => workspaceMoney(amount, budget?.currency ?? workspace.baseCurrency);
  const viewer = members.find((member) => member.userId === viewerUserId);
  const canManage = workspace.isActive && !!viewer && viewer.workspaceRole !== "Member";
  const shares = budget ? expensePreview({ description: "", categoryId: "", date: "", amount: String(budget.amount), paidByMemberId: members[0]?.id ?? "", rule, customMode: "percentage", custom, notes: "" }, members) : [];
  const validShares = rule === "EqualParts" || (rule === "IncomeProportional" ? members.reduce((sum, member) => sum.plus(member.incomeSharePercentage), new Decimal(0)).eq(100) : members.reduce((sum, member) => sum.plus(custom[member.id] || 0), new Decimal(0)).eq(100));
  const nearLimit = budget?.categories.filter((category) => (category.limitAmount === 0 ? category.spentAmount > 0 : workspacePercentage(category.spentAmount, category.limitAmount) >= 90)) ?? [];
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
    <div className="min-w-0 space-y-4">
      <section className={`${workspacePanel} flex flex-col items-center gap-5 bg-gradient-to-br from-chart-4/10 to-card sm:flex-row`}>
        <WorkspaceDonut segments={[budget?.executionPercentage ?? 0]} label="Ejecución del presupuesto mensual"><strong className="text-3xl font-extrabold">{budget ? `${budget.executionPercentage}%` : "—"}</strong></WorkspaceDonut>
        <div className="min-w-0 flex-1"><h1 className="text-lg font-semibold">Presupuesto mensual</h1><p className="my-3 text-3xl font-extrabold tabular-nums">{budget ? money(budget.amount) : "Sin presupuesto"}</p><p className="text-sm"><strong>{budget ? money(budget.spentAmount) : "—"}</strong> gastado <span className="px-1 text-chart-4">•</span> <strong className={budget && budget.remainingAmount < 0 ? "text-destructive" : "text-emerald-500"}>{budget ? money(budget.remainingAmount) : "—"}</strong> disponible</p><p className="mt-4 flex items-center gap-2 text-sm capitalize text-muted-foreground"><CalendarDays className="size-5 text-chart-4" />{workspacePeriodLabel(year, month)}</p></div>
      </section>
      <section className={workspacePanel}>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Presupuesto por categoría</h2><Button aria-label="Configurar presupuesto" disabled={!canManage} onClick={onConfigureBudget}><Plus />{budget ? "Agregar categoría" : "Configurar presupuesto"}</Button></header>
        {budget?.categories.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><caption className="sr-only">Límites y ejecución por categoría</caption><thead><tr className="border-b border-border text-xs text-muted-foreground">{["Categoría", "Presupuesto", "Gastado", "Disponible", "Uso"].map((label) => <th key={label} className="px-2 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{budget.categories.map((category) => {
          const usage = category.limitAmount === 0 && category.spentAmount > 0 ? 100 : workspacePercentage(category.spentAmount, category.limitAmount);
          const usageLabel = category.limitAmount === 0 ? category.spentAmount > 0 ? "Sin asignar" : "—" : `${usage}%`;
          return <tr key={category.categoryId} className="border-b border-border last:border-0"><th className="px-2 py-4 font-medium"><WorkspaceCategory id={category.categoryId} /></th><td className="whitespace-nowrap px-2 py-4 tabular-nums">{money(category.limitAmount)}</td><td className="whitespace-nowrap px-2 py-4 tabular-nums">{money(category.spentAmount)}</td><td className={`whitespace-nowrap px-2 py-4 font-bold tabular-nums ${category.remainingAmount < 0 ? "text-destructive" : "text-emerald-500"}`}>{money(category.remainingAmount)}</td><td className="min-w-36 px-2 py-4"><div className="flex items-center gap-2"><span className={`min-w-12 text-xs font-bold ${usage >= 95 ? "text-destructive" : ""}`}>{usageLabel}</span><div className="flex-1"><WorkspaceProgress value={usage} label={`Uso de ${findCategory(category.categoryId)?.name ?? "categoría compartida"}`} /></div></div></td></tr>;
        })}</tbody></table></div> : <p className="py-10 text-center text-sm text-muted-foreground">{budget ? "Sin categorías configuradas. Agrega límites para controlar tus gastos." : "Sin presupuesto para este período. Configúralo para empezar."}</p>}
        {!canManage && <p className="mt-3 text-xs text-muted-foreground">Solo propietarios y administradores activos pueden configurar el presupuesto.</p>}
      </section>
    </div>
    <aside className="min-w-0 space-y-4">
      <section className={`${workspacePanel} space-y-4`}><h2 className="text-lg font-bold">Regla de aportación</h2>
        <div className="overflow-x-auto"><SegmentedControl aria-label="Simular regla de aportación" value={rule} onChange={setRule} options={[{ value: "EqualParts", label: "Partes iguales" }, { value: "IncomeProportional", label: "Proporcional" }, { value: "CustomPercentage", label: "Personalizado" }]} /></div>
        <p className="text-xs text-muted-foreground">Simulación de aportes al presupuesto; no modifica la regla de los gastos ni guarda una regla del espacio.</p>
        {!workspace.settings.showIndividualContributions ? <p className="text-sm text-muted-foreground">Las aportaciones individuales están ocultas.</p> : <ul className="divide-y divide-border">{members.map((member) => {
          const share = validShares ? shares.find((item) => item.memberId === member.id) : undefined;
          return <li key={member.id} className="flex flex-wrap items-center gap-3 py-3"><WorkspaceMember members={workspace.members} id={member.id} viewerUserId={viewerUserId} />{rule === "CustomPercentage" ? <div className="w-28"><FormField label={`Porcentaje de ${workspaceMemberLabel(workspace.members, member.id, viewerUserId)}`}>{(control) => <MoneyInput {...control} currency="%" value={custom[member.id] ?? ""} onValueChange={(value) => setCustom((current) => ({ ...current, [member.id]: value }))} />}</FormField></div> : <Badge variant="secondary">{share?.percentage ?? "—"}%</Badge>}<strong className="ml-auto text-sm tabular-nums">{share ? money(share.amount) : "—"}</strong></li>;
        })}</ul>}
        {!validShares && <p role="alert" className="text-xs text-destructive">Los porcentajes deben sumar 100%.</p>}
      </section>
      <section className={workspacePanel}><h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><BarChart3 className="size-5 text-chart-4" />Resumen del presupuesto</h2><dl className="divide-y divide-border text-sm">{[{ label: "Presupuesto total", amount: budget?.amount, color: "" }, { label: "Total gastado", amount: budget?.spentAmount, color: "text-destructive" }, { label: "Total disponible", amount: budget?.remainingAmount, color: budget && budget.remainingAmount < 0 ? "text-destructive" : "text-emerald-500" }].map(({ label, amount, color }) => <div key={label} className="flex justify-between gap-3 py-3"><dt className="text-muted-foreground">{label}</dt><dd className={`font-bold tabular-nums ${color}`}>{amount === undefined ? "—" : money(amount)}</dd></div>)}</dl></section>
      <section className={`${workspacePanel} border-chart-4/50 bg-chart-4/5`}><h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Sparkles className="size-5 text-chart-4" />Sugerencias</h2><ul className="list-disc space-y-3 pl-4 text-sm text-muted-foreground">{nearLimit.map((category) => <li key={category.categoryId}>{category.limitAmount === 0 ? "Hay gastos sin asignación presupuestaria en" : "Estás cerca del límite en"} {findCategory(category.categoryId)?.name ?? "una categoría"}{category.limitAmount === 0 ? "." : ` (${workspacePercentage(category.spentAmount, category.limitAmount)}%).`}</li>)}{budget && budget.remainingAmount > 0 && <li>Tienes <strong className="text-foreground">{money(budget.remainingAmount)}</strong> disponibles; considera destinarlos a metas compartidas.</li>}{budget && budget.remainingAmount < 0 && <li>Has superado el presupuesto. Revisa los límites y próximos pagos.</li>}{(!budget || (!nearLimit.length && budget.remainingAmount === 0)) && <li>{budget ? "Revisa tus gastos antes de registrar nuevos movimientos." : "Define un presupuesto mensual y límites por categoría para empezar."}</li>}</ul></section>
    </aside>
  </div>;
}
