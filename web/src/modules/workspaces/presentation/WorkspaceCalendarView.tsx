"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { ArrowDown, CalendarDays, ChevronLeft, ChevronRight, Coins, Plus, Sparkles, Target } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { SelectField } from "@/shared/ui/select-field";
import type { FinancialEventType, SharedFinancialEventDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { calendarMonthDays, filterCalendarEvents, sharedEventTypes, shiftWorkspaceMonth } from "./workspace-calendar";
import { workspaceMemberLabel } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";
import { WorkspaceKpi, workspacePeriodLabel } from "./workspace-view-ui";

interface Props { workspace: WorkspaceDetailDto; events: SharedFinancialEventDto[]; year: number; month: number; viewerUserId?: string; onCreate: () => void; onPeriodChange: (value: string) => void; }
export function WorkspaceCalendarView({ workspace, events, year, month, viewerUserId, onCreate, onPeriodChange }: Props) {
  const [type, setType] = useState("all");
  const [responsible, setResponsible] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const visible = filterCalendarEvents(events, year, month, type, responsible);
  const monthly = filterCalendarEvents(events, year, month);
  const sum = (eventType: FinancialEventType) => monthly.filter((event) => event.financialEventType === eventType && event.currency === workspace.baseCurrency && !event.isCompleted).reduce((total, event) => total.plus(event.amount), new Decimal(0));
  const money = (value: Decimal.Value) => workspaceMoney(value, workspace.baseCurrency);
  const responsibleLabel = (event: SharedFinancialEventDto) => event.responsibleMemberId === "00000000-0000-0000-0000-000000000000" ? workspace.members.filter((member) => member.isActive).length === 2 ? "Ambos" : "Todos" : workspaceMemberLabel(workspace.members, event.responsibleMemberId, viewerUserId);
  const pending = visible.filter((event) => !event.isCompleted && (!selectedDay || event.dueDate === selectedDay));
  const canCreate = workspace.isActive && workspace.members.some((member) => member.isActive && member.userId === viewerUserId);
  const eventCard = (event: SharedFinancialEventDto, index: number) => <div key={`${event.id}-${event.dueDate}-${index}`} className={`rounded-lg border p-2 text-xs ${sharedEventTypes.find((item) => item.value === event.financialEventType)?.tone ?? "bg-muted"}`}><p className="font-semibold">{event.title}</p><p className="mt-1 font-bold">{workspaceMoney(event.amount, event.currency)}</p><Badge variant="outline" className="mt-1 text-[10px]">{responsibleLabel(event)}</Badge>{event.isCompleted && <p className="mt-1">Completado</p>}{event.isDerived && <p className="mt-1 opacity-75">Programado automáticamente</p>}</div>;
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Calendario compartido</h1><p className="text-sm text-muted-foreground">Pagos, cobros y aportes del espacio.</p></div><Button disabled={!canCreate} onClick={onCreate}><Plus />Nuevo evento</Button></header>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.5fr)_minmax(300px,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><WorkspaceKpi label="Eventos del mes" value={String(monthly.length)} Icon={CalendarDays} featured /><WorkspaceKpi label="Pagos compartidos" value={money(sum("Payment"))} Icon={Coins} /><WorkspaceKpi label="Aportes programados" value={money(sum("GoalContribution"))} Icon={Target} /><WorkspaceKpi label="Cobros previstos" value={money(sum("Collection"))} Icon={ArrowDown} tone="text-emerald-500" /></div>
        <section className={`${workspacePanel} min-w-0`}>
          <header className="mb-4 flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Mes anterior" disabled={year <= 2 && month === 1} onClick={() => onPeriodChange(shiftWorkspaceMonth(year, month, -1))}><ChevronLeft /></Button><h2 className="flex-1 text-lg font-bold capitalize">{workspacePeriodLabel(year, month)}</h2><Badge variant="secondary">Mes</Badge><Button variant="outline" size="icon" aria-label="Mes siguiente" disabled={year >= 9998 && month === 12} onClick={() => onPeriodChange(shiftWorkspaceMonth(year, month, 1))}><ChevronRight /></Button></header>
          <div className="overflow-x-auto"><div className="min-w-[700px]" role="group" aria-label="Calendario mensual"><div className="grid grid-cols-7 border-b border-border">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day} className="p-2 text-center text-xs text-muted-foreground">{day}</div>)}</div><div className="grid grid-cols-7 border-l border-t border-border">{calendarMonthDays(year, month).map((day) => <div key={day.date} className={`min-h-32 space-y-1 border-b border-r border-border p-1.5 ${!day.inMonth ? "bg-muted/20 text-muted-foreground" : ""} ${selectedDay === day.date ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""}`}><Button variant="ghost" size="sm" className="h-7 px-2" aria-label={`Eventos del ${day.date}`} aria-pressed={selectedDay === day.date} disabled={!day.inMonth} onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}>{day.day}</Button>{day.inMonth && visible.filter((event) => event.dueDate === day.date).map(eventCard)}</div>)}</div></div></div>
          {!visible.length && <p className="pt-4 text-sm text-muted-foreground">Sin eventos para estos filtros.</p>}
        </section>
      </div>
      <aside className="space-y-4">
        <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Próximos eventos</h2>{selectedDay && <Button variant="link" onClick={() => setSelectedDay(null)}>Mostrar todo el mes</Button>}{pending.length ? <ul className="space-y-3">{pending.map((event, index) => <li key={`${event.id}-${index}`} className="flex gap-2"><span className="pt-2 text-xs font-semibold text-chart-4">{event.dueDate.slice(8)}</span><div className="flex-1">{eventCard(event, index)}</div></li>)}</ul> : <p className="text-sm text-muted-foreground">Sin eventos pendientes{selectedDay ? ` el ${selectedDay}` : " en este período"}.</p>}</section>
        <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Resumen del mes</h2><dl className="divide-y divide-border text-sm">{[{ label: "Ingresos previstos", value: sum("Collection") }, { label: "Gastos programados", value: sum("Payment") }, { label: "Aportes a metas", value: sum("GoalContribution") }, { label: "Flujo previsto", value: sum("Collection").minus(sum("Payment")).minus(sum("GoalContribution")) }].map(({ label, value }) => <div key={label} className="flex justify-between gap-3 py-3"><dt className="text-muted-foreground">{label}</dt><dd className={`font-bold ${value.lt(0) ? "text-destructive" : "text-emerald-500"}`}>{money(value)}</dd></div>)}</dl><p className="mt-2 text-xs text-muted-foreground">Eventos pendientes del mes; no son movimientos confirmados.</p></section>
        <section className={`${workspacePanel} space-y-4`}><h2 className="text-lg font-bold">Filtros</h2><FormField label="Tipo">{(control) => <SelectField {...control} value={type} onChange={(event) => setType(event.target.value)} options={[{ value: "all", label: "Todos los tipos" }, ...sharedEventTypes]} />}</FormField><FormField label="Responsable">{(control) => <SelectField {...control} value={responsible} onChange={(event) => setResponsible(event.target.value)} options={[{ value: "all", label: "Todos" }, { value: "00000000-0000-0000-0000-000000000000", label: workspace.members.length === 2 ? "Ambos" : "Todo el espacio" }, ...workspace.members.filter((member) => member.isActive).map((member) => ({ value: member.id, label: workspaceMemberLabel(workspace.members, member.id, viewerUserId) }))]} />}</FormField></section>
      </aside>
    </div>
    <p className={`${workspacePanel} flex items-center gap-3 border-chart-4/50 bg-gradient-to-r from-chart-4/25 to-primary/10 text-sm`}><Sparkles className="size-6 shrink-0 text-chart-4" /><span><strong>Consejo compartido:</strong> Planifiquen sus pagos y revisen el calendario con anticipación para evitar retrasos y mantener el presupuesto en control.</span></p>
  </div>;
}
