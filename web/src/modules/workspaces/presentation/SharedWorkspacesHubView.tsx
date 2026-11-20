"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowLeftRight, CalendarClock, Lightbulb, Plus, UserPlus, Users, Wallet, Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select-field";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import type { IHttpClient } from "@/shared/application/http-client.contract";
import { useWorkspaces } from "../application/useWorkspaces";
import { WorkspacesApiRepository } from "../infrastructure/workspaces-api.repository";
import { CreateWorkspaceWizardModal } from "./CreateWorkspaceWizardModal";
import { WorkspaceInvitationsPanel } from "./WorkspaceInvitationsPanel";
import { WorkspaceFinancePanel } from "./WorkspaceFinancePanel";
import { WorkspaceShell } from "./WorkspaceShell";
import { isInviteEmail } from "./workspace-creation";
import { canInviteToWorkspace, loadWorkspaceHubEntry, selectQuickActionWorkspace, summarizeWorkspaceMetrics, workspaceHubSnapshotMatches, type WorkspaceHubEntry } from "./workspace-hub";
import { WorkspaceHubCard } from "./WorkspaceHubCard";
import { workspaceMoney, workspacePanel } from "./workspace-ui";

interface Props {
  http: IHttpClient | null;
  onRegisterExpense?: (workspaceId: string) => void;
  onSettleBalance?: (workspaceId: string) => void;
  onOpenWorkspace?: (workspaceId: string, tab: "dashboard" | "balances") => void;
  onOpenPersonal?: () => void;
  userId?: string | null;
}
type Selection = { id: string; view: "dashboard" | "balances" | "invite" | "expense" | "settle" };

export function SharedWorkspacesHubView({ http, onRegisterExpense, onSettleBalance, onOpenWorkspace, onOpenPersonal, userId }: Props) {
  const controller = useWorkspaces(http);
  const { workspaces, pendingInvitations, loading, error } = controller;
  const repository = useMemo(() => http ? new WorkspacesApiRepository(http) : null, [http]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [metadata, setMetadata] = useState<{ source: typeof repository; listKey: string; entries: Record<string, WorkspaceHubEntry>; loaded: boolean }>({ source: null, listKey: "", entries: {}, loaded: false });
  const [quickWorkspaceId, setQuickWorkspaceId] = useState("");
  const [quickSource, setQuickSource] = useState<typeof repository>(repository);
  const [retry, setRetry] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState(false);

  const listKey = workspaces.map((workspace) => workspace.id).join("|");
  useEffect(() => {
    let cancelled = false;
    if (!repository || loading || error) return;
    if (workspaces.length === 0) {
      setMetadata({ source: repository, listKey, entries: {}, loaded: true });
      return;
    }
    void Promise.all(workspaces.map(async (workspace) => [workspace.id, await loadWorkspaceHubEntry(repository, workspace.id)] as const)).then((results) => {
      if (!cancelled) setMetadata({ source: repository, listKey, entries: Object.fromEntries(results), loaded: true });
    });
    return () => { cancelled = true; };
  }, [repository, workspaces, listKey, loading, error, retry]);

  const contextReady = !!repository && !loading && !error;
  const metadataMatches = workspaceHubSnapshotMatches(metadata.source, repository, metadata.listKey, listKey) && contextReady;
  const entries = metadataMatches ? metadata.entries : {};
  const metrics = summarizeWorkspaceMetrics(workspaces, entries);
  const activities = workspaces.flatMap((workspace) => (entries[workspace.id]?.expenses ?? []).map((expense) => ({ ...expense, workspaceName: workspace.name }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const selected = selection && workspaces.some((workspace) => workspace.id === selection.id) ? entries[selection.id] : null;
  const selectedSummary = workspaces.find((workspace) => workspace.id === selection?.id);
  const quickWorkspace = quickSource === repository && contextReady ? selectQuickActionWorkspace(workspaces, quickWorkspaceId) : undefined;
  const quickCanInvite = canInviteToWorkspace(quickWorkspace);
  const activityFailures = workspaces.some((workspace) => entries[workspace.id]?.failures.expenses);
  useEffect(() => { if (quickSource !== repository) { setQuickWorkspaceId(""); setQuickSource(repository); } }, [quickSource, repository]);
  useEffect(() => {
    if (contextReady && selection && !workspaces.some((workspace) => workspace.id === selection.id)) setSelection(null);
  }, [contextReady, selection, workspaces]);
  const memberLabel = (id: string) => {
    const index = selected?.detail?.members.findIndex((member) => member.id === id) ?? -1;
    return index < 0 ? "Integrante anterior" : `Integrante ${index + 1}`;
  };
  const runAction = async (action: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setActionError(null);
    try { await action(); } catch { setActionError("No se pudo completar la acción. Inténtalo de nuevo."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const open = (id: string, view: Selection["view"]) => {
    if (!contextReady || !repository) return;
    const workspace = workspaces.find((item) => item.id === id);
    if (!workspace || (view === "invite" && !canInviteToWorkspace(workspace))) return;
    if (onOpenWorkspace && (view === "dashboard" || view === "balances")) {
      onOpenWorkspace(id, view);
      return;
    }
    setSelection({ id, view }); setEmail(""); setInvited(false); setActionError(null);
  };
  const quickSelect = (view: Selection["view"]) => { if (quickWorkspace) open(quickWorkspace.id, view); };
  const register = (id: string) => { if (!contextReady || !repository || !workspaces.some((item) => item.id === id)) return; if (onRegisterExpense) onRegisterExpense(id); else open(id, "expense"); };
  const settle = (id: string) => { if (!contextReady || !repository || !workspaces.some((item) => item.id === id)) return; if (onSettleBalance) onSettleBalance(id); else open(id, "settle"); };
  const financeView = selection?.view === "expense" || selection?.view === "balances" || selection?.view === "settle" ? selection.view : null;
  const creationServices = repository ? {
    createWorkspace: repository.createWorkspace.bind(repository),
    updateSettings: repository.updateSettings.bind(repository),
    inviteMember: repository.inviteMember.bind(repository),
    getSplitConfiguration: repository.getSplitConfiguration.bind(repository),
    getWorkspace: repository.getWorkspace.bind(repository),
    updateSplitConfiguration: repository.updateSplitConfiguration.bind(repository),
    setBudget: repository.setBudget.bind(repository),
    deactivateWorkspace: repository.deactivateWorkspace.bind(repository),
  } : null;
  const kpis = [
    { label: "Espacios activos", value: contextReady ? String(metrics.active) : "—", Icon: Users, description: "Tus espacios compartidos", featured: true },
    { label: "Integrantes", value: !contextReady || metrics.members === null ? "—" : String(metrics.members), Icon: UserPlus, description: "Personas únicas entre tus espacios" },
    { label: "Presupuesto compartido total", value: !contextReady || metrics.budgets === null ? "—" : Object.entries(metrics.budgets).map(([currency, amount]) => workspaceMoney(amount, currency)).join(" · ") || "Sin presupuesto", Icon: Wallet, description: "Mes actual · separado por moneda" },
    { label: "Próximas liquidaciones", value: !contextReady || metrics.settlements === null ? "—" : String(metrics.settlements), Icon: CalendarClock, description: "Saldos pendientes, sin fecha programada" },
  ];

  if (selection?.view === "dashboard" || selection?.view === "balances") {
    return <WorkspaceShell key={selection.id} http={http} workspaceId={selection.id} initialTab={selection.view} onBack={() => { setSelection(null); setRetry((value) => value + 1); }} />;
  }

  return <div className="space-y-5">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-extrabold tracking-tight">Mis espacios compartidos</h1><p className="mt-1 text-sm text-muted-foreground">Administra tus finanzas en pareja, familia o grupos sin mezclar tu patrimonio personal.</p></div><Button onClick={() => setWizardOpen(true)} disabled={!repository}><Plus />Crear espacio compartido</Button></header>
    <div className={`${workspacePanel} flex flex-wrap items-center gap-3 py-3 text-sm`}><span className="text-muted-foreground">Entrada:</span><Button variant="outline" size="sm" onClick={onOpenPersonal} disabled={!onOpenPersonal}><Wallet className="size-3" />Personal</Button><span className="border-l border-border pl-3"><Badge className="gap-2"><Users className="size-4" />Espacios compartidos</Badge></span></div>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">No se pudieron cargar los espacios. <Button variant="outline" size="sm" onClick={() => void runAction(controller.loadWorkspaces)} disabled={busy}>Reintentar</Button></div>}
    {actionError && !selection && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{kpis.map(({ label, value, Icon, description, featured }) => <section key={label} className={`${workspacePanel} ${featured ? "border-primary/40 bg-gradient-to-br from-primary/30 to-card" : ""}`}><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="size-5" /></span><div><h2 className="text-xs font-medium text-muted-foreground">{label}</h2><p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{description}</p></section>)}</div>
        {loading && <p role="status" className="p-6 text-center text-sm text-muted-foreground">Cargando espacios…</p>}
        {!loading && !error && workspaces.length === 0 && <section className={`${workspacePanel} flex flex-col items-center gap-3 py-14 text-center`}><span className="rounded-2xl bg-primary/10 p-4 text-primary"><Users className="size-10" /></span><h2 className="text-xl font-bold">Crea tu primer espacio compartido</h2><p className="max-w-md text-sm text-muted-foreground">Organiza gastos, aportes y metas con las personas que elijas. Tus finanzas personales seguirán siendo privadas.</p><Button disabled={!repository} onClick={() => setWizardOpen(true)}><Plus />Crear mi primer espacio</Button></section>}
        <div className="grid gap-4 2xl:grid-cols-2">{workspaces.map((workspace) => <WorkspaceHubCard key={workspace.id} workspace={workspace} detail={entries[workspace.id]?.detail} dashboard={entries[workspace.id]?.dashboard} failures={entries[workspace.id]?.failures} onRetry={() => setRetry((value) => value + 1)} onOpen={open} onInvite={repository ? (id) => open(id, "invite") : undefined} onRegisterExpense={repository ? register : undefined} actionsReady={contextReady} />)}</div>
      </div>
      <aside className="space-y-4">
        <WorkspaceInvitationsPanel
          invitations={pendingInvitations}
          busy={busy}
          onAccept={(id) => { if (contextReady && repository) void runAction(() => controller.acceptInvitation(id)); }}
          onReject={(id) => { if (contextReady && repository) void runAction(() => controller.rejectInvitation(id)); }}
        />
        <section className={workspacePanel}><h2 className="mb-3 flex items-center gap-2 font-bold"><Activity className="size-5 text-primary" />Gastos recientes</h2>{activityFailures && <p role="alert" className="mb-2 text-xs text-destructive">Algunos gastos recientes no están disponibles. <Button variant="link" size="xs" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button></p>}<div className="divide-y divide-border">{activities.map((expense) => <article key={expense.id} className="py-3"><div className="flex justify-between gap-2 text-sm"><span className="min-w-0 break-words font-medium">{expense.description}</span><span className="shrink-0 font-semibold">{workspaceMoney(expense.amount, expense.currency)}</span></div><p className="mt-1 text-xs text-muted-foreground">en «{expense.workspaceName}» · {expense.date.slice(0, 10)}</p></article>)}{activities.length === 0 && <p className="py-3 text-xs text-muted-foreground">{error ? "No se pudo verificar la actividad porque falló la lista de espacios." : workspaces.length > 0 && (!metadataMatches || !metadata.loaded) ? "Cargando gastos recientes…" : activityFailures ? "Gastos recientes no disponibles." : "Aún no hay gastos compartidos registrados."}</p>}</div></section>
        <section className={workspacePanel}><h2 className="mb-3 flex items-center gap-2 font-bold"><Zap className="size-5 text-amber-500" />Acciones rápidas</h2><FormField label="Espacio para acciones">{(control) => <SelectField {...control} value={quickWorkspace?.id ?? ""} placeholder="Selecciona un espacio compartido" disabled={!repository || loading || !!error || workspaces.length === 0} options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))} onChange={(event) => { setQuickWorkspaceId(event.target.value); setQuickSource(repository); }} />}</FormField><div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-auto flex-col items-start whitespace-normal p-3 text-left" disabled={!repository} onClick={() => setWizardOpen(true)}><UserPlus className="text-primary" /><span>Crear espacio</span><span className="text-xs font-normal text-muted-foreground">Pareja, familia, amigos…</span></Button>
          <Button variant="outline" className="h-auto flex-col items-start whitespace-normal p-3 text-left" disabled={!contextReady || !repository || !quickWorkspace} onClick={() => quickWorkspace && register(quickWorkspace.id)}><Wallet className="text-primary" /><span>Registrar gasto compartido</span><span className="text-xs font-normal text-muted-foreground">Agrega un gasto al espacio</span></Button>
          <Button variant="outline" className="h-auto flex-col items-start whitespace-normal p-3 text-left" disabled={!contextReady || !repository || !quickWorkspace} onClick={() => contextReady && quickSelect("balances")}><ArrowLeftRight className="text-primary" /><span>Liquidar saldo</span><span className="text-xs font-normal text-muted-foreground">Revisa los saldos pendientes</span></Button>
          <Button variant="outline" className="h-auto flex-col items-start whitespace-normal p-3 text-left" disabled={!contextReady || !quickCanInvite} onClick={() => contextReady && quickSelect("invite")}><UserPlus className="text-primary" /><span>Invitar integrante</span><span className="text-xs font-normal text-muted-foreground">Envía una invitación</span></Button>
        </div><p className="mt-3 text-xs text-muted-foreground">Las acciones se realizan en el espacio compartido seleccionado.</p></section>
      </aside>
    </div>
    <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-card to-primary/20 p-4 text-sm"><Lightbulb className="size-6 shrink-0 text-primary" /><p><strong className="text-primary">Consejo compartido:</strong> Definan una regla de aportes clara para evitar desbalances al cierre del mes.</p></div>
    {wizardOpen && creationServices && <CreateWorkspaceWizardModal open onOpenChange={(value) => {
      setWizardOpen(value);
      if (!value) void controller.loadWorkspaces().catch(() => {});
    }} services={creationServices} userId={userId} onCreated={() => setRetry((value) => value + 1)} />}
    {selection && financeView && selected?.detail && <WorkspaceFinancePanel key={`${selection.id}-${financeView}`} http={http} workspace={selected.detail} view={financeView} onClose={() => { setSelection(null); setRetry((value) => value + 1); }} onChanged={() => setRetry((value) => value + 1)} onSettleBalance={onSettleBalance} />}
    <ResponsiveDrawer open={!!selection && !(financeView && selected?.detail)} onOpenChange={(value) => { if (!value && !busyRef.current) setSelection(null); }} title={selection?.view === "invite" ? "Invitar integrante" : "Cargando espacio compartido"} description={selectedSummary?.name} size="lg">
      {selection && <div className="space-y-4">
        <FormField label="Espacio compartido">{(control) => <SelectField {...control} value={selection.id} disabled={busy} options={workspaces.filter((workspace) => selection.view !== "invite" || workspace.role !== "Member").map((workspace) => ({ value: workspace.id, label: workspace.name }))} onChange={(event) => open(event.target.value, selection.view)} />}</FormField>
        {selection.view === "invite" ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!repository || !isInviteEmail(email)) { setActionError("Escribe un correo válido."); return; } void runAction(async () => { await repository.inviteMember(selection.id, { email: email.trim(), workspaceRole: "Member" }); setInvited(true); setEmail(""); }); }}><FormField label="Correo del integrante" required>{(control) => <Input {...control} type="email" required value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setInvited(false); }} />}</FormField><Button type="submit" loading={busy} disabled={selectedSummary?.role === "Member"}>Enviar invitación</Button>{invited && <p role="status" className="text-sm text-emerald-500">Invitación enviada.</p>}</form> : selected?.detail ? <>
          {selected.dashboard ? <><h3 className="font-bold">Saldos pendientes</h3>{selected.dashboard.pendingSettlements.length === 0 ? <p className="text-sm text-muted-foreground">No hay saldos por liquidar.</p> : selected.dashboard.pendingSettlements.map((balance, index) => <p key={index} className="rounded-xl border border-border p-3 text-sm">{memberLabel(balance.debtorMemberId)} → {memberLabel(balance.creditorMemberId)}<strong className="ml-3">{workspaceMoney(balance.amount, balance.currency)}</strong></p>)}<Button disabled={!repository || !selected.dashboard.pendingSettlements.length} onClick={() => settle(selection.id)}>Liquidar saldo</Button></> : <p role="alert" className="text-sm text-destructive">No se pudieron cargar los saldos. Reintenta desde la tarjeta.</p>}
          <Button disabled={!repository || !selected.detail.isActive} onClick={() => register(selection.id)}>Registrar gasto compartido</Button>
        </> : <p role="status" className="text-sm text-muted-foreground">{metadataMatches && metadata.entries[selection.id]?.failures.detail ? "No se pudieron cargar los detalles. Cierra y reintenta desde la tarjeta." : "Cargando detalles…"}</p>}
        {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
      </div>}
    </ResponsiveDrawer>
  </div>;
}
