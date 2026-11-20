"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, BarChart3, CalendarDays, LayoutDashboard, PieChart, Scale, Settings, Target } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import type { IHttpClient } from "@/shared/application/http-client.contract";
import { useWorkspaceDetails } from "../application/useWorkspaceDetails";
import { WorkspacesApiRepository } from "../infrastructure/workspaces-api.repository";
import type { PairwiseBalanceDto, SharedGoalDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { ConfigureWorkspaceBudgetModal } from "./ConfigureWorkspaceBudgetModal";
import { CreateSharedGoalModal } from "./CreateSharedGoalModal";
import { ContributeSharedGoalModal } from "./ContributeSharedGoalModal";
import { CreateSharedEventModal } from "./CreateSharedEventModal";
import { WorkspaceGoalsView } from "./WorkspaceGoalsView";
import { WorkspaceCalendarView } from "./WorkspaceCalendarView";
import { WorkspaceReportsView } from "./WorkspaceReportsView";
import { WorkspaceSettingsView } from "./WorkspaceSettingsView";
import { RegisterWorkspaceExpenseModal } from "./RegisterWorkspaceExpenseModal";
import { RegisterWorkspaceIncomeModal } from "./RegisterWorkspaceIncomeModal";
import { SettleBalanceModal } from "./SettleBalanceModal";
import { WorkspaceBalancesView } from "./WorkspaceBalancesView";
import { WorkspaceBudgetsView } from "./WorkspaceBudgetsView";
import { WorkspaceDashboardView, type WorkspaceSubtab } from "./WorkspaceDashboardView";
import { WorkspaceMovementsView } from "./WorkspaceMovementsView";
import { workspaceTypes } from "./workspace-creation";
import { WorkspaceMember } from "./workspace-members";
import { WorkspaceIcon, workspacePanel } from "./workspace-ui";
import { workspacePeriodKey } from "./workspace-view-ui";
import { useWorkspaceExpenseHistory } from "./useWorkspaceExpenseHistory";

interface Props {
  http: IHttpClient | null;
  workspaceId: string;
  initialTab?: WorkspaceSubtab;
  onBack: () => void;
}
export function WorkspaceShell({ http, workspaceId, initialTab, onBack }: Props) {
  const repository = useMemo(() => http ? new WorkspacesApiRepository(http) : null, [http]);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ source: typeof repository; id: string; workspace: WorkspaceDetailDto | null; error: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    if (!repository) return;
    void repository.getWorkspace(workspaceId).then(
      (workspace) => { if (active) setLoaded({ source: repository, id: workspaceId, workspace, error: false }); },
      () => { if (active) setLoaded({ source: repository, id: workspaceId, workspace: null, error: true }); },
    );
    return () => { active = false; };
  }, [repository, workspaceId, retry]);
  const current = loaded && loaded.source === repository && loaded.id === workspaceId ? loaded : null;
  if (!current?.workspace) return <div className="space-y-4"><Button variant="outline" onClick={onBack}><ArrowLeft />Volver a Mis Espacios</Button>{!repository || current?.error ? <section role="alert" className={workspacePanel}><p className="mb-3 text-sm text-destructive">No se pudo cargar el espacio compartido.</p><Button disabled={!repository} onClick={() => setRetry((value) => value + 1)}>Reintentar</Button></section> : <p role="status" className="py-10 text-center text-muted-foreground">Cargando espacio…</p>}</div>;
  return <WorkspaceShellView key={workspaceId} http={http} workspace={current.workspace} initialTab={initialTab} onBack={onBack} />;
}

const tabs = [
  { value: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { value: "presupuesto", label: "Presupuesto", Icon: PieChart },
  { value: "movimientos", label: "Movimientos", Icon: ArrowLeftRight },
  { value: "balances", label: "Balances", Icon: Scale },
  { value: "metas", label: "Metas", Icon: Target },
  { value: "calendario", label: "Calendario", Icon: CalendarDays },
  { value: "reportes", label: "Reportes", Icon: BarChart3 },
  { value: "configuracion", label: "Configuración", Icon: Settings },
] as const;

export function WorkspaceShellView({ http, workspace: initialWorkspace, initialTab = "dashboard", onBack }: Omit<Props, "workspaceId"> & { workspace: WorkspaceDetailDto }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const repository = useMemo(() => http ? new WorkspacesApiRepository(http) : null, [http]);
  const [goalOpen, setGoalOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<SharedGoalDto | null>(null);
  const [tab, setTab] = useState<WorkspaceSubtab>(initialTab);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return workspacePeriodKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
  });
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [settlement, setSettlement] = useState<PairwiseBalanceDto | null>(null);
  const [year, month] = period.split("-").map(Number);
  const details = useWorkspaceDetails(http, workspace.id, { year, month });
  const history = useWorkspaceExpenseHistory(http, workspace.id);
  const viewerUserId = http?.getUserId();
  const viewer = workspace.members.find((member) => member.userId === viewerUserId);
  const canManage = workspace.isActive && !!viewer && viewer.workspaceRole !== "Member";
  const ready = !!details.dashboard && !!details.balances && !details.loading && !details.error && history.loaded && !history.loading && !history.error;
  const changePeriod = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    const [nextYear, nextMonth] = value.split("-").map(Number);
    if (nextYear < 2 || nextYear > 9998 || nextMonth < 1 || nextMonth > 12) return;
    setPeriod(value);
    setBudgetOpen(false);
    setExpenseOpen(false);
    setIncomeOpen(false);
    setSettlement(null);
    setGoalOpen(false);
    setEventOpen(false);
    setContributionGoal(null);
  };
  return <div className="space-y-5">
    <header className="space-y-4 border-b border-border pb-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><WorkspaceIcon icon={workspace.icon} color={workspace.color} /><div className="min-w-0"><h1 className="break-words text-2xl font-extrabold tracking-tight">{workspace.name}</h1><div className="mt-1 flex items-center gap-2"><Badge variant="outline">{workspaceTypes.find((type) => type.value === workspace.workspaceType)?.label ?? "Otro"}</Badge><p className="text-xs text-muted-foreground">Finanzas compartidas · {workspace.baseCurrency}</p></div></div></div>
        <div className="flex flex-wrap items-center gap-3" aria-label="Integrantes del espacio">{workspace.members.filter((member) => member.isActive).map((member) => <WorkspaceMember key={member.id} members={workspace.members} id={member.id} viewerUserId={viewerUserId} />)}</div>
        <div className="flex flex-wrap items-end gap-3"><div className="w-44"><FormField label="Mes y año">{(control) => <Input {...control} type="month" min="0002-01" max="9998-12" value={period} onChange={(event) => changePeriod(event.target.value)} />}</FormField></div><Button variant="outline" onClick={onBack}><ArrowLeft />Volver a Mis Espacios</Button></div>
      </div>
      <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones del espacio">{tabs.map(({ value, label, Icon }) => <Button key={value} variant={tab === value ? "default" : "ghost"} aria-current={tab === value ? "page" : undefined} className={tab === value ? "bg-gradient-to-r from-chart-4 to-primary text-primary-foreground" : "text-muted-foreground"} onClick={() => setTab(value)}><Icon />{label}</Button>)}</nav>
    </header>
    {tab === "configuracion" ? <WorkspaceSettingsView workspace={workspace} repository={repository} viewerUserId={viewerUserId} onDeactivated={onBack} onUpdated={(updated) => { setWorkspace(updated); void details.refreshAll().catch(() => {}); }} /> : details.error || history.error ? <section role="alert" className={workspacePanel}><p className="mb-3 text-sm text-destructive">No se pudieron actualizar los datos del espacio.</p><Button disabled={details.loading || history.loading} onClick={() => void Promise.all([details.refreshAll(), history.refresh()]).catch(() => {})}>Reintentar</Button></section> : !ready ? <p role="status" className="py-12 text-center text-muted-foreground">Cargando datos del período…</p> : <>
      {tab === "dashboard" && <WorkspaceDashboardView workspace={workspace} dashboard={details.dashboard!} goals={details.goals} calendar={details.calendar} viewerUserId={viewerUserId} onNavigate={setTab} onRegisterExpense={() => setExpenseOpen(true)} />}
      {tab === "presupuesto" && <WorkspaceBudgetsView workspace={workspace} budget={details.budget} year={year} month={month} viewerUserId={viewerUserId} onConfigureBudget={() => setBudgetOpen(true)} />}
      {tab === "movimientos" && <WorkspaceMovementsView key={period} workspace={workspace} dashboard={details.dashboard!} expenses={history.expenses} incomes={details.incomes} goals={details.goals} year={year} month={month} viewerUserId={viewerUserId} onRegisterExpense={() => setExpenseOpen(true)} onRegisterIncome={() => setIncomeOpen(true)} />}
      {tab === "balances" && <WorkspaceBalancesView key={period} members={workspace.members} expenses={history.expenses} balances={details.balances!} currency={workspace.baseCurrency} viewerUserId={viewerUserId} initialPeriod={period} onSettleBalance={setSettlement} />}
      {tab === "metas" && <WorkspaceGoalsView workspace={workspace} goals={details.goals} calendar={details.calendar} viewerUserId={viewerUserId} onCreate={() => setGoalOpen(true)} onContribute={setContributionGoal} />}
      {tab === "calendario" && <WorkspaceCalendarView key={period} workspace={workspace} events={details.calendar} year={year} month={month} viewerUserId={viewerUserId} onCreate={() => setEventOpen(true)} onPeriodChange={changePeriod} />}
      {tab === "reportes" && (details.reports ? <WorkspaceReportsView key={period} report={details.reports} onPeriodChange={changePeriod} /> : <p role="status" className={workspacePanel}>Reporte no disponible para este período.</p>)}
    </>}
    {goalOpen && canManage && <CreateSharedGoalModal currency={workspace.baseCurrency} createGoal={details.createGoal} onClose={() => setGoalOpen(false)} />}
    {contributionGoal && workspace.isActive && viewer?.isActive && <ContributeSharedGoalModal key={contributionGoal.id} goal={contributionGoal} contributeGoal={details.contributeGoal} onClose={() => setContributionGoal(null)} />}
    {eventOpen && workspace.isActive && viewer?.isActive && <CreateSharedEventModal workspace={workspace} date={`${period}-01`} viewerUserId={viewerUserId} createEvent={details.createCalendarEvent} onClose={() => setEventOpen(false)} />}
    {expenseOpen && workspace.isActive && <RegisterWorkspaceExpenseModal key={workspace.id} open onOpenChange={setExpenseOpen} members={workspace.members} currency={workspace.baseCurrency} viewerUserId={viewerUserId} registerExpense={async (request) => {
      try { return await details.registerExpense(request); }
      finally { await history.refresh(); }
    }} />}
    {incomeOpen && workspace.isActive && <RegisterWorkspaceIncomeModal key={workspace.id} open onOpenChange={setIncomeOpen} members={workspace.members} currency={workspace.baseCurrency} viewerUserId={viewerUserId} registerIncome={details.registerIncome} />}
    {budgetOpen && canManage && <ConfigureWorkspaceBudgetModal key={`${workspace.id}-${period}`} budget={details.budget} year={year} month={month} currency={workspace.baseCurrency} onClose={() => setBudgetOpen(false)} setBudget={details.setBudget} />}
    {settlement && details.balances && <SettleBalanceModal key={workspace.id} open onOpenChange={(open) => { if (!open) setSettlement(null); }} members={workspace.members} balances={details.balances} currency={workspace.baseCurrency} viewerUserId={viewerUserId} initialBalance={settlement} settleBalance={details.settleBalance} />}
  </div>;
}
