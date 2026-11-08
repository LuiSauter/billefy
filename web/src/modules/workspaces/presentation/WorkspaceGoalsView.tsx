"use client";

import React from "react";
import Decimal from "decimal.js";
import { BarChart3, Flag, PiggyBank, Plus, Sparkles, Target } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { SharedFinancialEventDto, SharedGoalDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { goalContributionTotals } from "./workspace-goals";
import { WorkspaceMember } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";
import { WorkspaceDonut, WorkspaceKpi, WorkspaceProgress, workspacePercentage } from "./workspace-view-ui";

interface Props {
  workspace: WorkspaceDetailDto;
  goals: SharedGoalDto[];
  calendar: SharedFinancialEventDto[];
  viewerUserId?: string;
  onCreate: () => void;
  onContribute: (goal: SharedGoalDto) => void;
}
export function WorkspaceGoalsView({ workspace, goals, calendar, viewerUserId, onCreate, onContribute }: Props) {
  const active = goals.filter((goal) => goal.status === "Active");
  const currencyGoals = goals.filter((goal) => goal.currency === workspace.baseCurrency);
  const sum = (values: Decimal.Value[]) => values.reduce<Decimal>((total, value) => total.plus(value), new Decimal(0));
  const saved = sum(currencyGoals.map((goal) => goal.currentAmount));
  const target = sum(currencyGoals.map((goal) => goal.targetAmount));
  const progress = active.length ? sum(active.map((goal) => workspacePercentage(goal.currentAmount, goal.targetAmount))).div(active.length).toDecimalPlaces(1).toString() : "0";
  const nearest = [...active].filter((goal) => goal.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!))[0];
  const totals = goalContributionTotals(goals, workspace.baseCurrency);
  const totalContributed = sum([...totals.values()]);
  const contributorIds = [...new Set([...workspace.members.filter((member) => member.isActive).map((member) => member.id), ...totals.keys()])];
  const viewer = workspace.members.find((member) => member.isActive && member.userId === viewerUserId);
  const upcoming = calendar.filter((event) => event.financialEventType === "GoalContribution" && !event.isCompleted).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const groups = new Map<string, Decimal>();
  for (const goal of currencyGoals) groups.set(goal.category || "Sin categoría", (groups.get(goal.category || "Sin categoría") ?? new Decimal(0)).plus(goal.targetAmount));
  const money = (amount: Decimal.Value) => workspaceMoney(amount, workspace.baseCurrency);
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Metas compartidas</h1><p className="text-sm text-muted-foreground">Ahorren juntos para sus próximos objetivos.</p></div><Button aria-label="Nueva meta compartida" disabled={!workspace.isActive || !viewer || viewer.workspaceRole === "Member"} onClick={onCreate}><Plus />Nueva meta compartida</Button></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <WorkspaceKpi label="Metas activas" value={String(active.length)} Icon={Target} featured />
      <WorkspaceKpi label="Ahorro total" value={money(saved)} Icon={PiggyBank} tone="text-emerald-500" />
      <WorkspaceKpi label="Meta más cercana" value={nearest?.title ?? "Sin fecha objetivo"} Icon={Flag}>{nearest && <p className="text-xs text-muted-foreground">{nearest.targetDate}</p>}</WorkspaceKpi>
      <WorkspaceKpi label="Progreso promedio" value={`${progress}%`} Icon={BarChart3}><WorkspaceProgress value={Number(progress)} label="Progreso promedio de metas activas" /></WorkspaceKpi>
    </div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <div className="min-w-0 space-y-4">
        <section className={workspacePanel}><h2 className="mb-4 text-lg font-bold">Mis metas compartidas</h2>
          {goals.length ? <div className="grid gap-3 lg:grid-cols-2">{goals.map((goal) => {
            const percent = workspacePercentage(goal.currentAmount, goal.targetAmount);
            const contributions = goalContributionTotals([goal], goal.currency);
            const contributionTotal = sum([...contributions.values()]);
            return <article key={goal.id} className="space-y-3 rounded-xl border border-border bg-gradient-to-br from-chart-4/5 to-card p-4">
              <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{goal.title}</h3><p className="text-xs text-muted-foreground">{goal.category || "Sin categoría"}</p></div><Badge variant="secondary">{goal.status === "Active" ? "Activa" : goal.status === "Reached" ? "Alcanzada" : "Pausada"}</Badge></div>
              <dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">Objetivo</dt><dd className="mt-1 font-bold">{workspaceMoney(goal.targetAmount, goal.currency)}</dd></div><div><dt className="text-muted-foreground">Ahorrado</dt><dd className="mt-1 font-bold text-emerald-500">{workspaceMoney(goal.currentAmount, goal.currency)}</dd></div><div><dt className="text-muted-foreground">Progreso</dt><dd className="mt-1 font-bold">{percent}%</dd></div></dl>
              <WorkspaceProgress value={percent} label={`Progreso de ${goal.title}`} />
              <dl className="grid grid-cols-2 gap-3 border-b border-border pb-3 text-xs"><div><dt className="text-muted-foreground">Aporte mensual</dt><dd className="mt-1 font-semibold">{workspaceMoney(goal.monthlyCommitmentAmount, goal.currency)}</dd></div><div><dt className="text-muted-foreground">Fecha objetivo</dt><dd className="mt-1">{goal.targetDate ?? "Sin fecha"}</dd></div></dl>
              {workspace.settings.showIndividualContributions && <div className="space-y-2"><p className="text-xs text-muted-foreground">Contribución por integrante</p>{[...contributions].map(([id, amount]) => <div key={id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><WorkspaceMember members={workspace.members} id={id} viewerUserId={viewerUserId} /><Badge variant="secondary">{workspacePercentage(amount, contributionTotal)}%</Badge><span>{workspaceMoney(amount, goal.currency)}</span></div>)}{!contributions.size && <p className="text-xs text-muted-foreground">Sin aportes todavía.</p>}</div>}
              {goal.status === "Active" && <Button variant="outline" disabled={!workspace.isActive || !viewer} onClick={() => onContribute(goal)}>Aportar</Button>}
            </article>;
          })}</div> : <p className="py-10 text-center text-muted-foreground">Sin metas compartidas. Crea su primer objetivo.</p>}
        </section>
        <section className={workspacePanel}><h2 className="text-lg font-bold">Aportes por integrante</h2><p className="mb-4 text-xs text-muted-foreground">Contribución acumulada a todas las metas · {workspace.baseCurrency}</p>
          {workspace.settings.showIndividualContributions ? <div className="space-y-3">{contributorIds.map((id) => <div key={id} className="flex flex-wrap items-center gap-3"><WorkspaceMember members={workspace.members} id={id} viewerUserId={viewerUserId} /><span className="ml-auto text-sm font-bold">{money(totals.get(id) ?? 0)}</span><div className="w-full sm:w-1/3"><WorkspaceProgress value={workspacePercentage(totals.get(id) ?? 0, totalContributed)} label={`Participación acumulada ${id}`} /></div></div>)}<p className="border-t border-border pt-3 font-bold">Total aportado: {money(totalContributed)}</p></div> : <p className="text-sm text-muted-foreground">Las aportaciones individuales están ocultas.</p>}
        </section>
      </div>
      <aside className="min-w-0 space-y-4">
        <section className={workspacePanel}><h2 className="mb-4 text-lg font-bold">Distribución de metas</h2><WorkspaceDonut segments={[...groups.values()].map((amount) => workspacePercentage(amount, target))} label="Distribución del objetivo total"><strong className="text-lg">{money(target)}</strong><span className="text-xs text-muted-foreground">Objetivo total</span></WorkspaceDonut><ul className="mt-4 divide-y divide-border">{[...groups].map(([name, amount]) => <li key={name} className="flex justify-between gap-3 py-2 text-sm"><span>{name}</span><span>{workspacePercentage(amount, target)}%</span><strong>{money(amount)}</strong></li>)}</ul></section>
        <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Próximos aportes</h2>{upcoming.length ? <ul className="divide-y divide-border">{upcoming.map((event, index) => <li key={`${event.id}-${index}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="text-chart-4">{event.dueDate}</span><span>{event.title}</span><strong>{workspaceMoney(event.amount, event.currency)}</strong></li>)}</ul> : <p className="text-sm text-muted-foreground">Sin aportes programados en este período.</p>}</section>
        <section className={`${workspacePanel} border-chart-4/50 bg-chart-4/5`}><h2 className="mb-3 flex gap-2 text-lg font-bold"><Sparkles className="size-5 text-chart-4" />Consejos para sus metas compartidas</h2><ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground"><li>Mantengan los aportes mensuales constantes para no retrasar sus fechas objetivo.</li><li>Revisen el progreso juntos cada mes y ajusten los aportes si es necesario.</li></ul></section>
      </aside>
    </div>
    <p className={`${workspacePanel} border-chart-4/50 bg-gradient-to-r from-chart-4/20 to-primary/10 text-sm`}>Cada aporte cuenta: definan un compromiso mensual y una fecha para sus objetivos.</p>
  </div>;
}
