"use client";

import React from "react";
import Decimal from "decimal.js";
import { ArrowDown, ArrowUpRight, BarChart3, CheckCircle2, PiggyBank, Plus, Scale, Target, Wallet } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { SharedFinancialEventDto, SharedGoalDto, WorkspaceDashboardDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { WorkspaceMember, workspaceMemberLabel } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";
import { WorkspaceCategoryList, WorkspaceDonut, WorkspaceKpi, WorkspaceProgress, workspacePercentage, workspacePeriodKey, workspacePeriodLabel } from "./workspace-view-ui";

export type WorkspaceSubtab = "dashboard" | "presupuesto" | "movimientos" | "balances" | "metas" | "calendario" | "reportes" | "configuracion";
interface Props {
  workspace: WorkspaceDetailDto;
  dashboard: WorkspaceDashboardDto;
  goals: SharedGoalDto[];
  calendar: SharedFinancialEventDto[];
  viewerUserId?: string;
  onNavigate: (tab: WorkspaceSubtab) => void;
  onRegisterExpense: () => void;
}
export function WorkspaceDashboardView({ workspace, dashboard, goals, calendar, viewerUserId, onNavigate, onRegisterExpense }: Props) {
  const money = (amount: Decimal.Value) => workspaceMoney(amount, dashboard.currency);
  const budget = dashboard.budget;
  const viewer = workspace.members.find((member) => member.userId === viewerUserId);
  const net = dashboard.balances.memberNetBalances.find((balance) => balance.memberId === viewer?.id && balance.currency === dashboard.currency);
  const pending = dashboard.balances.pairwiseBalances.filter((balance) => balance.currency === dashboard.currency && new Decimal(balance.amount).gt(0));
  const activeGoals = goals.filter((goal) => goal.status === "Active");
  const payments = calendar.filter((event) => !event.isCompleted && event.financialEventType === "Payment" && event.dueDate.startsWith(workspacePeriodKey(dashboard.year, dashboard.month))).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  const paidTotal = dashboard.memberContributions.reduce((sum, member) => sum.plus(member.paidAmount), new Decimal(0));
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
      <WorkspaceKpi label="Balance del espacio" value={money(dashboard.balance)} Icon={Wallet} featured><p className="text-xs text-muted-foreground">Acumulado de gastos registrados</p></WorkspaceKpi>
      <WorkspaceKpi label="Ingresos del mes" value={money(dashboard.monthlyIncome)} Icon={ArrowDown} tone="text-emerald-500" />
      <WorkspaceKpi label="Gastos del mes" value={money(dashboard.monthlyExpenses)} Icon={ArrowUpRight} tone="text-destructive" />
      <WorkspaceKpi label="Ahorro del mes" value={money(dashboard.savings)} Icon={PiggyBank}><p className="text-xs text-muted-foreground">Aportes reales a metas</p></WorkspaceKpi>
      <WorkspaceKpi label="Ejecución del presupuesto" value={budget ? `${dashboard.budgetExecutionPercentage}%` : "Sin presupuesto"} Icon={BarChart3}><WorkspaceProgress value={dashboard.budgetExecutionPercentage} label="Ejecución del presupuesto" /></WorkspaceKpi>
    </div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 space-y-4">
        <section className={`${workspacePanel} space-y-4`}>
          <header className="flex items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Presupuesto mensual</h2><p className="text-sm capitalize text-muted-foreground">{workspacePeriodLabel(dashboard.year, dashboard.month)}</p></div><Button variant="link" aria-label="Ver presupuesto" onClick={() => onNavigate("presupuesto")}>Ver detalle →</Button></header>
          {budget ? <><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-3xl font-extrabold tabular-nums">{workspaceMoney(budget.amount, budget.currency)}</p><p className="text-xs text-muted-foreground">Presupuesto total</p></div><div className="text-right text-sm"><p><strong>{workspaceMoney(budget.spentAmount, budget.currency)}</strong> gastado</p><p><strong className={budget.remainingAmount < 0 ? "text-destructive" : "text-emerald-500"}>{workspaceMoney(budget.remainingAmount, budget.currency)}</strong> disponible</p></div></div><WorkspaceProgress value={budget.executionPercentage} label="Presupuesto mensual utilizado" /><p className="text-right text-xs font-semibold">{budget.executionPercentage}%</p></> : <p className="text-sm text-muted-foreground">Sin presupuesto para este mes.</p>}
        </section>
        <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Aportaciones del mes</h2>
          <p className="mb-2 text-xs text-muted-foreground">Gastos pagados por integrante y su participación asignada.</p>
          {!workspace.settings.showIndividualContributions ? <p className="py-4 text-sm text-muted-foreground">Las aportaciones individuales están ocultas.</p> : dashboard.memberContributions.length ? <ul className="divide-y divide-border">{dashboard.memberContributions.map((member) => <li key={member.memberId} className="flex flex-wrap items-center gap-3 py-3"><WorkspaceMember members={workspace.members} id={member.memberId} viewerUserId={viewerUserId} /><Badge variant="secondary">{workspacePercentage(member.paidAmount, paidTotal)}%</Badge><strong className="ml-auto text-sm tabular-nums">{money(member.paidAmount)}</strong><Badge variant="outline" className={member.netBalance >= 0 ? "text-emerald-500" : "text-amber-500"}>{member.paidAmount === 0 && member.allocatedAmount === 0 ? "Sin actividad" : member.netBalance >= 0 ? "Al día" : "Pendiente"}</Badge></li>)}</ul> : <p className="py-4 text-sm text-muted-foreground">Sin aportaciones este mes.</p>}
        </section>
        <section className={workspacePanel}><header className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Metas compartidas</h2><Button variant="link" onClick={() => onNavigate("metas")}>Ver todas →</Button></header>
          {activeGoals.length ? <ul className="divide-y divide-border">{activeGoals.slice(0, 3).map((goal) => <li key={goal.id} className="flex items-center gap-3 py-3"><span className="rounded-xl bg-chart-4/15 p-3 text-chart-4"><Target className="size-7" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{goal.title}</h3><p className="my-2 text-xs"><strong className="text-emerald-500">{workspaceMoney(goal.currentAmount, goal.currency)}</strong><span className="text-muted-foreground"> de {workspaceMoney(goal.targetAmount, goal.currency)}</span></p><WorkspaceProgress value={workspacePercentage(goal.currentAmount, goal.targetAmount)} label={`Progreso de ${goal.title}`} /></div><span className="text-xs font-bold">{workspacePercentage(goal.currentAmount, goal.targetAmount)}%</span></li>)}</ul> : <p className="py-4 text-sm text-muted-foreground">Sin metas activas.</p>}
        </section>
      </div>
      <div className="min-w-0 space-y-4">
        <section className={workspacePanel}><header className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Gastos por categoría</h2><Button variant="link" onClick={() => onNavigate("reportes")}>Ver reportes →</Button></header><div className="flex flex-col items-center gap-5 sm:flex-row"><WorkspaceDonut segments={dashboard.categoryBreakdown.map((item) => item.percentage)} label="Distribución de gastos por categoría"><strong className="text-lg tabular-nums">{money(dashboard.monthlyExpenses)}</strong><span className="text-xs text-muted-foreground">Gastos totales</span></WorkspaceDonut><WorkspaceCategoryList items={dashboard.categoryBreakdown} currency={dashboard.currency} /></div></section>
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className={workspacePanel}><header className="mb-2 flex items-center justify-between gap-1"><h2 className="text-lg font-bold">Próximos pagos</h2><Button variant="link" size="sm" onClick={() => onNavigate("calendario")}>Ver calendario →</Button></header>{payments.length ? <ul className="divide-y divide-border">{payments.map((payment) => <li key={payment.id} className="flex flex-wrap items-center gap-2 py-3"><time dateTime={payment.dueDate.slice(0, 10)} className="rounded-lg bg-muted px-2 py-1 text-center text-xs font-bold"><span className="block text-lg">{payment.dueDate.slice(8, 10)}</span>{new Date(`${payment.dueDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es", { month: "short", timeZone: "UTC" })}</time><span className="min-w-0 flex-1 text-sm">{payment.title}</span><strong className="text-xs tabular-nums">{workspaceMoney(payment.amount, payment.currency)}</strong><Badge variant="secondary">{workspaceMemberLabel(workspace.members, payment.responsibleMemberId, viewerUserId)}</Badge></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">Sin próximos pagos en este período.</p>}</section>
          <div className="space-y-4"><section className={`${workspacePanel} text-center`}><h2 className="mb-4 flex items-center justify-center gap-2 font-bold"><Scale className="size-5 text-chart-4" />Balance entre nosotros</h2>{pending.length === 0 ? <><CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" /><strong className="block text-emerald-500">Todo al día</strong><p className="mt-2 text-xs text-muted-foreground">No hay saldos pendientes.</p></> : <><strong className="block text-primary">{net && net.balance !== 0 ? net.balance > 0 ? "Te deben" : "Debes" : "Saldos pendientes"}</strong><p className="mt-2 text-lg font-bold">{net && net.balance !== 0 ? money(new Decimal(net.balance).abs()) : `${pending.length} por liquidar`}</p><Button variant="link" onClick={() => onNavigate("balances")}>Ver balances →</Button></>}</section><Button aria-label="Registrar gasto compartido" className="h-auto w-full flex-col whitespace-normal border border-dashed border-chart-4 bg-chart-4/10 px-4 py-7 text-chart-4 hover:bg-chart-4/20" disabled={!workspace.isActive} onClick={onRegisterExpense}><Plus className="mb-2 size-9 rounded-full bg-chart-4 p-2 text-primary-foreground" />Registrar gasto compartido</Button></div>
        </div>
      </div>
    </div>
  </div>;
}
