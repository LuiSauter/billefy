"use client";

import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import type { IHttpClient } from "@/shared/application/http-client.contract";
import { useWorkspaceDetails } from "../application/useWorkspaceDetails";
import type { PairwiseBalanceDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { RegisterWorkspaceExpenseModal } from "./RegisterWorkspaceExpenseModal";
import { WorkspaceBalancesView } from "./WorkspaceBalancesView";
import { SettleBalanceModal } from "./SettleBalanceModal";

interface Props {
  http: IHttpClient | null;
  workspace: WorkspaceDetailDto;
  view: "expense" | "balances" | "settle";
  onClose: () => void;
  onChanged: () => void;
  onSettleBalance?: (id: string) => void;
}
/** Mount keyed by workspace and view, so drafts never leak into another space. */
export function WorkspaceFinancePanel({ http, workspace, view, onClose, onChanged, onSettleBalance }: Props) {
  const details = useWorkspaceDetails(http, workspace.id);
  const [settlement, setSettlement] = useState<PairwiseBalanceDto | null>(null);
  const viewerUserId = http?.getUserId();
  const onOpenChange = (open: boolean) => { if (!open) onClose(); };
  const changed = async <T,>(action: () => Promise<T>) => {
    try { return await action(); }
    finally { onChanged(); }
  };
  if (view === "expense") return <RegisterWorkspaceExpenseModal open onOpenChange={onOpenChange} members={workspace.members} currency={workspace.baseCurrency} viewerUserId={viewerUserId} registerExpense={(request) => changed(() => details.registerExpense(request))} />;
  if (!details.balances || (details.error && !settlement && view !== "settle")) return <ResponsiveDrawer open onOpenChange={onOpenChange} title="Balances y liquidaciones" description={workspace.name} size="xl">{details.error ? <div role="alert" className="space-y-3 text-sm text-destructive"><p>No se pudieron actualizar los saldos. Reintenta antes de registrar un pago.</p><Button disabled={details.loading} onClick={() => void details.refreshAll().catch(() => {})}>Reintentar</Button></div> : <p role="status" className="py-8 text-center text-sm text-muted-foreground">Cargando balances…</p>}</ResponsiveDrawer>;
  if (settlement || view === "settle") return <SettleBalanceModal open onOpenChange={(open) => { if (!open) { if (view === "settle") onClose(); else setSettlement(null); } }} members={workspace.members} balances={details.balances} currency={workspace.baseCurrency} viewerUserId={viewerUserId} initialBalance={settlement ?? undefined} settleBalance={(request) => changed(() => details.settleBalance(request))} />;
  return <ResponsiveDrawer open onOpenChange={onOpenChange} title="Balances y liquidaciones" description={workspace.name} size="xl"><WorkspaceBalancesView members={workspace.members} expenses={details.expenses} balances={details.balances} currency={workspace.baseCurrency} viewerUserId={viewerUserId} onSettleBalance={(balance) => { if (onSettleBalance) onSettleBalance(workspace.id); else setSettlement(balance); }} /></ResponsiveDrawer>;
}
