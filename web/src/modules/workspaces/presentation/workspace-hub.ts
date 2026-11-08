import Decimal from "decimal.js";
import type { IWorkspacesRepository } from "../domain/workspaces.types";
import type { WorkspaceDashboardDto, WorkspaceDetailDto, WorkspaceExpenseDto, WorkspaceSummaryDto } from "../domain/workspaces.types";

export interface WorkspaceHubEntry {
  detail?: WorkspaceDetailDto;
  dashboard?: WorkspaceDashboardDto;
  expenses: WorkspaceExpenseDto[];
  failures: { detail: boolean; dashboard: boolean; expenses: boolean };
}

export async function loadWorkspaceHubEntry(repository: Pick<IWorkspacesRepository, "getWorkspace" | "getDashboard" | "getExpenses">, workspaceId: string): Promise<WorkspaceHubEntry> {
  const [detail, dashboard, expenses] = await Promise.allSettled([
    Promise.resolve().then(() => repository.getWorkspace(workspaceId)),
    Promise.resolve().then(() => repository.getDashboard(workspaceId)),
    Promise.resolve().then(() => repository.getExpenses(workspaceId, { limit: 5 })),
  ]);
  return {
    detail: detail.status === "fulfilled" ? detail.value : undefined,
    dashboard: dashboard.status === "fulfilled" ? dashboard.value : undefined,
    expenses: expenses.status === "fulfilled" ? expenses.value : [],
    failures: { detail: detail.status === "rejected", dashboard: dashboard.status === "rejected", expenses: expenses.status === "rejected" },
  };
}

export function workspaceHubSnapshotMatches<T>(snapshotSource: T, currentSource: T, snapshotListKey: string, currentListKey: string) {
  return snapshotSource === currentSource && snapshotListKey === currentListKey;
}

export function selectQuickActionWorkspace(workspaces: WorkspaceSummaryDto[], selectedId: string | null) {
  return selectedId ? workspaces.find((workspace) => workspace.id === selectedId) : undefined;
}

export function canInviteToWorkspace(workspace: WorkspaceSummaryDto | undefined) {
  return workspace?.role === "Owner" || workspace?.role === "Admin";
}

export function summarizeWorkspaceMetrics(workspaces: WorkspaceSummaryDto[], entries: Record<string, WorkspaceHubEntry>) {
  const members = new Set<string>();
  const budgets: Record<string, string> = {};
  let settlements = 0;
  const membersKnown = workspaces.every(({ id }) => !!entries[id]?.detail);
  const dashboardKnown = workspaces.every(({ id }) => !!entries[id]?.dashboard);
  for (const workspace of workspaces) {
    const entry = entries[workspace.id];
    entry?.detail?.members.filter((member) => member.isActive).forEach((member) => members.add(member.userId));
    if (entry?.dashboard) {
      const { dashboard } = entry;
      if (dashboard.budget) budgets[dashboard.currency] = new Decimal(budgets[dashboard.currency] ?? "0").plus(dashboard.budget.amount).toString();
      settlements += dashboard.pendingSettlements.length;
    }
  }
  return {
    active: workspaces.length,
    members: membersKnown ? members.size : null,
    budgets: dashboardKnown ? budgets : null,
    settlements: dashboardKnown ? settlements : null,
  };
}
