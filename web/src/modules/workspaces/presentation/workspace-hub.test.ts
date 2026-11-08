import { describe, expect, it, vi } from "vitest";
import { canInviteToWorkspace, loadWorkspaceHubEntry, selectQuickActionWorkspace, summarizeWorkspaceMetrics, workspaceHubSnapshotMatches } from "./workspace-hub";
import type { WorkspaceDashboardDto, WorkspaceDetailDto, WorkspaceExpenseDto, WorkspaceSummaryDto } from "../domain/workspaces.types";

const home: WorkspaceSummaryDto = { id: "home", name: "Casa", workspaceType: "Couple", baseCurrency: "BOB", icon: null, color: null, role: "Owner" };
const trip: WorkspaceSummaryDto = { ...home, id: "trip", name: "Viaje", baseCurrency: "USD", role: "Member" };
const detail: WorkspaceDetailDto = {
  id: "home", name: "Casa", workspaceType: "Couple", baseCurrency: "BOB", icon: null, color: null, description: null, isActive: true, createdBy: "owner", createdAt: "2026-01-01", settings: { hidePersonalPatrimony: true, memberSeesOnlyShared: true, showIndividualContributions: true, allowMovementComments: true, paymentReminders: true, weeklySummary: true, spaceNotifications: true },
  members: [{ id: "m1", userId: "user1", workspaceRole: "Owner", incomeSharePercentage: 100, joinedAt: "2026-01-01", isActive: true }],
};
const dashboard = { workspaceId: "home", currency: "BOB", budget: { amount: 100, remainingAmount: 75, executionPercentage: 25 }, monthlyExpenses: 25, pendingSettlements: [] } as unknown as WorkspaceDashboardDto;
const expense = { id: "expense-1", workspaceId: "home", description: "Mercado", amount: 25, currency: "BOB", paidByMemberId: "m1", date: "2026-01-02", splitRuleType: "EqualParts", allocations: [], categoryId: null, notes: null } as WorkspaceExpenseDto;

 describe("shared workspace hub data", () => {
  it("requires an explicitly selected existing workspace and never falls back to the first", () => {
    expect(selectQuickActionWorkspace([home, trip], "trip")?.id).toBe("trip");
    expect(selectQuickActionWorkspace([home, trip], "removed")).toBeUndefined();
    expect(selectQuickActionWorkspace([home, trip], null)).toBeUndefined();
  });

  it("allows invitations only for the explicitly selected owner or admin workspace", () => {
    expect(canInviteToWorkspace(home)).toBe(true);
    expect(canInviteToWorkspace({ ...trip, role: "Admin" })).toBe(true);
    expect(canInviteToWorkspace(trip)).toBe(false);
    expect(canInviteToWorkspace(undefined)).toBe(false);
  });

  it("ignores metadata after list or authenticated source identity changes", () => {
    const accountA = {};
    const accountB = {};
    expect(workspaceHubSnapshotMatches(accountA, accountA, "home|trip", "home|trip")).toBe(true);
    expect(workspaceHubSnapshotMatches(accountA, accountA, "home", "home|trip")).toBe(false);
    expect(workspaceHubSnapshotMatches(accountA, accountB, "home", "home")).toBe(false);
  });

  it("retains successful requests when expenses fail", async () => {
    const result = await loadWorkspaceHubEntry({
      getWorkspace: vi.fn().mockResolvedValue(detail), getDashboard: vi.fn().mockResolvedValue(dashboard), getExpenses: vi.fn().mockRejectedValue(new Error("offline")),
    }, "home");
    expect(result).toMatchObject({ detail, dashboard, expenses: [], failures: { detail: false, dashboard: false, expenses: true } });
    expect(summarizeWorkspaceMetrics([home], { home: result })).toEqual({ active: 1, members: 1, budgets: { BOB: "100" }, settlements: 0 });
  });

  it("keeps dashboard and activity when detail fails and reports only known metrics", async () => {
    const result = await loadWorkspaceHubEntry({
      getWorkspace: vi.fn().mockRejectedValue(new Error("offline")), getDashboard: vi.fn().mockResolvedValue(dashboard), getExpenses: vi.fn().mockResolvedValue([expense]),
    }, "home");
    expect(result).toMatchObject({ detail: undefined, dashboard, expenses: [expense], failures: { detail: true, dashboard: false, expenses: false } });
    expect(summarizeWorkspaceMetrics([home, trip], { home: result, trip: { detail: { ...detail, id: "trip" }, dashboard: undefined, expenses: [], failures: { detail: false, dashboard: true, expenses: false } } })).toEqual({ active: 2, members: null, budgets: null, settlements: null });
  });

  it("keeps detail and activity when dashboard fails and independently exposes known metrics", async () => {
    const result = await loadWorkspaceHubEntry({
      getWorkspace: vi.fn().mockResolvedValue(detail), getDashboard: vi.fn().mockRejectedValue(new Error("offline")), getExpenses: vi.fn().mockResolvedValue([expense]),
    }, "home");
    expect(result).toMatchObject({ detail, dashboard: undefined, expenses: [expense], failures: { detail: false, dashboard: true, expenses: false } });
    expect(summarizeWorkspaceMetrics([home], { home: result })).toEqual({ active: 1, members: 1, budgets: null, settlements: null });
  });

  it("keeps metric completeness independent and deduplicates users", () => {
    const duplicate = { ...detail, id: "trip", members: detail.members.map((member) => ({ ...member, id: "m2" })) };
    expect(summarizeWorkspaceMetrics([home, trip], {
      home: { detail, dashboard, expenses: [], failures: { detail: false, dashboard: false, expenses: true } },
      trip: { detail: duplicate, dashboard: { ...dashboard, currency: "USD", budget: null }, expenses: [], failures: { detail: false, dashboard: false, expenses: false } },
    })).toEqual({ active: 2, members: 1, budgets: { BOB: "100" }, settlements: 0 });
  });
});
