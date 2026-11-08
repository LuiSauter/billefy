import React from "react";
import Decimal from "decimal.js";
import { BarChart3, Plus, Scale, UserPlus, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Progress } from "@/shared/ui/progress";
import type { WorkspaceDashboardDto, WorkspaceDetailDto, WorkspaceSummaryDto } from "../domain/workspaces.types";
import { workspaceTypes } from "./workspace-creation";
import { WorkspaceIcon, workspaceMoney, workspacePanel } from "./workspace-ui";

export interface WorkspaceHubData { detail: WorkspaceDetailDto; dashboard: WorkspaceDashboardDto; }
export function summarizeWorkspaces(data: WorkspaceHubData[]) {
  const users = new Set<string>();
  const budgets: Record<string, string> = {};
  let active = 0;
  let settlements = 0;
  for (const { detail, dashboard } of data) {
    if (detail.isActive) active++;
    detail.members.filter((member) => member.isActive).forEach((member) => users.add(member.userId));
    if (dashboard.budget) budgets[dashboard.currency] = new Decimal(budgets[dashboard.currency] ?? "0").plus(dashboard.budget.amount).toString();
    settlements += dashboard.pendingSettlements.length;
  }
  return { active, members: users.size, budgets, settlements };
}

interface Props {
  workspace: WorkspaceSummaryDto;
  detail?: WorkspaceDetailDto;
  dashboard?: WorkspaceDashboardDto;
  failures?: { detail: boolean; dashboard: boolean; expenses: boolean };
  onRetry?: () => void;
  onOpen: (id: string, view: "dashboard" | "balances") => void;
  onInvite?: (id: string) => void;
  onRegisterExpense?: (id: string) => void;
  actionsReady?: boolean;
}
export function WorkspaceHubCard({ workspace, detail, dashboard, failures, onRetry, onOpen, onInvite, onRegisterExpense, actionsReady = true }: Props) {
  const members = detail?.members.filter((member) => member.isActive) ?? [];
  const budget = dashboard?.budget;
  const progress = budget?.executionPercentage;
  const hasFailures = failures && Object.values(failures).some(Boolean);
  return <article className={`${workspacePanel} flex cursor-pointer flex-col gap-4 transition-colors hover:border-primary/40`} aria-label={workspace.name} onClick={(event) => {
    if (actionsReady && !(event.target as HTMLElement).closest("button, a, input, select, textarea")) onOpen(workspace.id, "dashboard");
  }}>
    <header className="flex items-start gap-3"><WorkspaceIcon icon={workspace.icon} color={workspace.color} /><div className="min-w-0 flex-1"><h2><Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left text-lg font-bold text-foreground" onClick={() => { if (actionsReady) onOpen(workspace.id, "dashboard"); }}>{workspace.name}</Button></h2><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline">{workspaceTypes.find((type) => type.value === workspace.workspaceType)?.label ?? "Otro"}</Badge><span className="flex items-center gap-1"><Users className="size-3" />{detail ? `${members.length} integrante${members.length === 1 ? "" : "s"}` : failures?.detail ? "Integrantes no disponibles" : "Cargando integrantes…"}</span></div></div><Badge variant="outline" className="border-emerald-500/30 text-emerald-500">{detail ? detail.isActive ? "Activo" : "Inactivo" : "Estado no disponible"}</Badge></header>
    {hasFailures && <div role="alert" className="text-sm text-destructive">{[
      failures.detail && "No se pudieron cargar los integrantes.",
      failures.dashboard && "No se pudieron cargar los datos financieros.",
      failures.expenses && "No se pudieron cargar los gastos recientes.",
    ].filter(Boolean).join(" ")} <Button variant="link" size="xs" onClick={onRetry}>Reintentar</Button></div>}
    <div className="flex flex-wrap items-center gap-4"><div className="flex -space-x-2">{members.slice(0, 4).map((member, index) => <Avatar key={member.id} className="size-9 border-2 border-card" title={`Integrante ${index + 1} · ${member.workspaceRole}`}><AvatarFallback className="bg-primary/15 text-xs text-primary">{index + 1}</AvatarFallback></Avatar>)}{workspace.role !== "Member" && <Button variant="outline" size="icon-sm" className="rounded-full" aria-label={`Invitar a ${workspace.name}`} disabled={!actionsReady || !onInvite} onClick={() => { if (actionsReady) onInvite?.(workspace.id); }}><UserPlus /></Button>}</div><div className="border-l border-border pl-4"><p className="text-xs text-muted-foreground">Presupuesto mensual compartido</p><p className="text-xl font-bold tabular-nums">{dashboard ? budget ? workspaceMoney(budget.amount, dashboard.currency) : "Sin presupuesto" : "—"}</p></div></div>
    <div className="flex items-center gap-3">{progress !== undefined ? <Progress value={Math.min(Math.max(progress, 0), 100)} aria-label={`Presupuesto utilizado en ${workspace.name}`} className={progress > 90 ? "[&_[data-slot=progress-indicator]]:bg-amber-500" : "[&_[data-slot=progress-indicator]]:bg-emerald-500"} /> : <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden="true" />}<span className="text-xs font-bold tabular-nums">{progress === undefined ? "—" : `${progress}%`}</span></div>
    <div className="grid grid-cols-3 divide-x divide-border text-xs"><div><p className="text-muted-foreground">Gastado</p><p className="mt-1 font-bold">{dashboard ? workspaceMoney(dashboard.monthlyExpenses, dashboard.currency) : "—"}</p></div><div className="pl-3"><p className="text-muted-foreground">Disponible</p><p className="mt-1 font-bold text-emerald-500">{budget && dashboard ? workspaceMoney(budget.remainingAmount, dashboard.currency) : dashboard ? "Sin presupuesto" : "—"}</p></div><div className="pl-3"><p className="text-muted-foreground">Saldos por liquidar</p><p className="mt-1 font-bold">{dashboard?.pendingSettlements.length ?? "—"}</p></div></div>
    <div className="mt-auto grid gap-2 sm:grid-cols-2"><Button variant="outline" disabled={!actionsReady} onClick={() => { if (actionsReady) onOpen(workspace.id, "dashboard"); }}><BarChart3 />Ver dashboard</Button><Button disabled={!actionsReady || !onRegisterExpense || detail?.isActive === false} title={!onRegisterExpense ? "El registro de gastos compartidos estará disponible en la siguiente etapa." : undefined} onClick={() => { if (actionsReady) onRegisterExpense?.(workspace.id); }}><Plus />Registrar gasto</Button><Button variant="outline" className="sm:col-span-2" disabled={!actionsReady} onClick={() => { if (actionsReady) onOpen(workspace.id, "balances"); }}><Scale />Ver balances</Button></div>
  </article>;
}
