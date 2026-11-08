"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { ArrowDown, ArrowLeftRight, ArrowUpRight, Coins, Filter, Plus } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select-field";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import type { SharedGoalDto, WorkspaceDashboardDto, WorkspaceDetailDto, WorkspaceExpenseDto } from "../domain/workspaces.types";
import { WorkspaceMember } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";
import { WorkspaceCategory, WorkspaceCategoryList, WorkspaceKpi, WorkspaceProgress, workspacePercentage, workspacePeriodKey } from "./workspace-view-ui";

interface Props {
  workspace: WorkspaceDetailDto;
  dashboard: WorkspaceDashboardDto;
  expenses: WorkspaceExpenseDto[];
  goals: SharedGoalDto[];
  year: number;
  month: number;
  viewerUserId?: string;
  onRegisterExpense: () => void;
}
type MovementType = "all" | "income" | "expense" | "contribution" | "transfer";
interface Movement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "expense" | "contribution";
  categoryId: string | null;
  memberId: string;
  shared: boolean;
}
export function WorkspaceMovementsView({ workspace, dashboard, expenses, goals, year, month, viewerUserId, onRegisterExpense }: Props) {
  const [type, setType] = useState<MovementType>("all");
  const [categoryId, setCategoryId] = useState("");
  const [participation, setParticipation] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { findCategory } = useUserCategories();
  const prefix = workspacePeriodKey(year, month);
  const currency = workspace.baseCurrency;
  const money = (amount: Decimal.Value) => workspaceMoney(amount, currency);
  const viewer = workspace.members.find((member) => member.userId === viewerUserId);
  const monthExpenses = expenses.filter((expense) => expense.workspaceId === workspace.id && expense.currency === currency && expense.date.startsWith(prefix));
  const contributions = goals.filter((goal) => goal.currency === currency).flatMap((goal) => goal.memberContributions.filter((entry) => entry.contributedAt.startsWith(prefix)).map((entry, index): Movement => ({ id: `goal-${goal.id}-${index}`, date: entry.contributedAt, description: `Aporte a meta: ${goal.title}`, amount: entry.amount, type: "contribution", categoryId: "__goals__", memberId: entry.memberId, shared: false })));
  const rows: Movement[] = [
    ...monthExpenses.map((expense): Movement => ({ id: expense.id, date: expense.date, description: expense.description, amount: expense.amount, type: "expense", categoryId: expense.categoryId, memberId: expense.paidByMemberId, shared: expense.allocations.filter((allocation) => new Decimal(allocation.amount).gt(0)).length > 1 })),
    ...(workspace.settings.showIndividualContributions ? contributions : []),
  ];
  const invalidRange = dateRange === "custom" && !!from && !!to && from > to;
  const filtered = rows.filter((row) => !invalidRange && (!categoryId || (row.categoryId ?? "__none__") === categoryId) && (participation === "all" || (participation === "shared" ? row.shared : !row.shared && row.memberId === viewer?.id)) && (dateRange !== "custom" || ((!from || row.date.slice(0, 10) >= from) && (!to || row.date.slice(0, 10) <= to))));
  const visible = filtered.filter((row) => type === "all" || row.type === type).sort((a, b) => b.date.localeCompare(a.date));
  const filteredExpenses = filtered.filter((row) => row.type === "expense");
  const totalExpenses = filteredExpenses.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
  const totalContributions = contributions.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
  const categories = [...new Set(monthExpenses.map((expense) => expense.categoryId))];
  const breakdown = [...new Set(filteredExpenses.map((row) => row.categoryId))].map((id) => {
    const amount = filteredExpenses.filter((row) => row.categoryId === id).reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
    return { categoryId: id, amount: amount.toNumber(), percentage: workspacePercentage(amount, totalExpenses) };
  });
  const reset = () => { setType("all"); setCategoryId(""); setParticipation("all"); setDateRange("month"); setFrom(""); setTo(""); };
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold tracking-tight">Movimientos compartidos</h1><p className="mt-1 text-sm text-muted-foreground">Gastos y aportes a metas registrados en el espacio.</p></div><Button aria-label="Registrar movimiento" disabled={!workspace.isActive} onClick={onRegisterExpense}><Plus />Registrar movimiento</Button></header>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <WorkspaceKpi label="Total de movimientos" value={String(rows.length)} Icon={ArrowLeftRight} featured />
        <WorkspaceKpi label="Ingresos" value={workspaceMoney(dashboard.monthlyIncome, dashboard.currency)} Icon={ArrowDown} tone="text-emerald-500" />
        <WorkspaceKpi label="Gastos" value={money(monthExpenses.reduce((sum, expense) => sum.plus(expense.amount), new Decimal(0)))} Icon={ArrowUpRight} tone="text-destructive" />
        <WorkspaceKpi label="Aportaciones" value={money(totalContributions)} Icon={Coins}><p className="text-xs text-muted-foreground">Aportes reales a metas</p></WorkspaceKpi>
      </div>
      <p className="text-xs text-muted-foreground">Indicadores del mes completo. Los filtros se aplican al detalle y a los gráficos de gastos.</p>
      <div className="overflow-x-auto"><SegmentedControl aria-label="Tipo de movimiento" value={type} onChange={setType} options={[{ value: "all", label: "Todos" }, { value: "income", label: "Ingresos", tone: "income" }, { value: "expense", label: "Gastos", tone: "expense" }, { value: "contribution", label: "Aportaciones" }, { value: "transfer", label: "Transferencias" }]} /></div>
      <section className={`${workspacePanel} overflow-x-auto p-0`}>
        <table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">Movimientos del espacio seleccionado</caption><thead><tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">{["Fecha", "Descripción", "Categoría", "Monto", "Participación"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><time dateTime={row.date.slice(0, 10)} className="inline-block rounded-lg bg-muted px-2 py-1 text-center text-xs font-semibold"><span className="block text-lg">{row.date.slice(8, 10)}</span>{new Date(`${row.date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es", { month: "short", timeZone: "UTC" })}</time></td><td className="px-4 py-3 font-medium">{row.description}</td><td className="px-4 py-3">{row.type === "contribution" ? <span className="inline-flex items-center gap-2"><Coins className="size-5 text-chart-4" />Aportación a meta</span> : <WorkspaceCategory id={row.categoryId} />}</td><td className={`whitespace-nowrap px-4 py-3 font-bold tabular-nums ${row.type === "expense" ? "text-destructive" : "text-emerald-500"}`}>{row.type === "expense" ? "−" : "+"} {money(row.amount)}</td><td className="px-4 py-3"><Badge variant="secondary">{row.shared ? "Compartido" : row.memberId === viewer?.id ? "Tú" : `Integrante ${workspace.members.findIndex((member) => member.id === row.memberId) + 1 || "anterior"}`}</Badge></td></tr>)}
          {!visible.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{type === "income" ? "El servicio no expone el detalle de ingresos del espacio." : type === "transfer" ? "El servicio no expone transferencias del espacio. Las liquidaciones se consultan en Balances." : "No hay movimientos con estos filtros."}</td></tr>}
        </tbody></table>
      </section>
      {!workspace.settings.showIndividualContributions && <p className="text-xs text-muted-foreground">El detalle de aportaciones individuales está oculto por la configuración del espacio.</p>}
    </div>
    <aside className="min-w-0 space-y-4">
      <section className={`${workspacePanel} space-y-3`}><header className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold"><Filter className="size-5 text-chart-4" />Filtros</h2><Button variant="link" size="sm" onClick={reset}>Limpiar</Button></header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <FormField label="Categoría">{(control) => <SelectField {...control} aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Todas" }, ...categories.map((id) => ({ value: id ?? "__none__", label: id ? findCategory(id)?.name ?? "Categoría compartida" : "Sin categoría" })), { value: "__goals__", label: "Aportación a meta" }]} />}</FormField>
          <FormField label="Participación">{(control) => <SelectField {...control} aria-label="Participación" value={participation} onChange={(event) => setParticipation(event.target.value)} options={[{ value: "all", label: "Todas" }, { value: "shared", label: "Compartido" }, { value: "mine", label: "Tú" }]} />}</FormField>
          <FormField label="Cuenta" hint="El espacio no expone cuentas personales.">{(control) => <SelectField {...control} disabled value="all" options={[{ value: "all", label: "Todas" }]} />}</FormField>
          <FormField label="Rango de fechas">{(control) => <SelectField {...control} aria-label="Rango de fechas" value={dateRange} onChange={(event) => setDateRange(event.target.value)} options={[{ value: "month", label: "Todo el mes" }, { value: "custom", label: "Personalizado" }]} />}</FormField>
        </div>
        {dateRange === "custom" && <div className="grid grid-cols-2 gap-3"><FormField label="Desde">{(control) => <Input {...control} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />}</FormField><FormField label="Hasta">{(control) => <Input {...control} type="date" value={to} onChange={(event) => setTo(event.target.value)} />}</FormField></div>}
        {invalidRange && <p role="alert" className="text-xs text-destructive">La fecha inicial debe ser anterior a la final.</p>}
      </section>
      <section className={workspacePanel}><h2 className="mb-4 text-lg font-bold">Gastos por integrante</h2>{workspace.settings.showIndividualContributions ? <ul className="space-y-4">{workspace.members.filter((member) => member.isActive || filteredExpenses.some((expense) => expense.memberId === member.id)).map((member) => {
        const paid = filteredExpenses.filter((expense) => expense.memberId === member.id).reduce((sum, expense) => sum.plus(expense.amount), new Decimal(0));
        const percentage = workspacePercentage(paid, totalExpenses);
        return <li key={member.id} className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><WorkspaceMember members={workspace.members} id={member.id} viewerUserId={viewerUserId} /><strong className="text-sm tabular-nums">{money(paid)}</strong></div><div className="flex items-center gap-3"><div className="flex-1"><WorkspaceProgress value={percentage} label={`Gastos pagados por integrante ${workspace.members.indexOf(member) + 1}`} /></div><span className="text-xs font-bold">{percentage}%</span></div></li>;
      })}</ul> : <p className="text-sm text-muted-foreground">Las aportaciones individuales están ocultas.</p>}</section>
      <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Por categoría (gastos)</h2><WorkspaceCategoryList items={breakdown} currency={currency} /></section>
    </aside>
  </div>;
}
