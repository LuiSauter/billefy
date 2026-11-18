import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { WorkspacesApiRepository } from "../infrastructure/workspaces-api.repository";
import { WorkspaceDetailDto, WorkspaceSummaryDto } from "../domain/workspaces.types";
import { createWorkspacesResource } from "./workspaces-resource";
import { createWorkspaceDetailsResource } from "./workspace-details-resource";
import { useWorkspaces } from "./useWorkspaces";
import { useWorkspaceDetails } from "./useWorkspaceDetails";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const summary: WorkspaceSummaryDto = { id: "w", name: "Shared", workspaceType: "Other", baseCurrency: "USD", icon: null, color: null, role: "Owner" };
const detail: WorkspaceDetailDto = {
  id: "w", name: "Shared", description: null, workspaceType: "Other", baseCurrency: "USD", icon: null, color: null,
  isActive: true, createdBy: "user", createdAt: "2026-01-01T00:00:00Z", startDate: "2026-01-01", members: [],
  settings: { hidePersonalPatrimony: true, memberSeesOnlyShared: true, showIndividualContributions: true, allowMovementComments: true, paymentReminders: true, weeklySummary: true, spaceNotifications: true },
};
function setup() {
  const http = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
  const repo = new WorkspacesApiRepository(http as unknown as IHttpClient);
  return { http, resource: createWorkspacesResource(repo), repo };
}

describe("workspace state and hook wiring", () => {
  it("exposes safe initial snapshots through the actual React hooks", () => {
    function Probe() {
      const hub = useWorkspaces(null);
      const details = useWorkspaceDetails(null, null);
      expect(hub.workspaces).toEqual([]);
      expect(hub.activeWorkspace).toBeNull();
      expect(hub.pendingInvitations).toEqual([]);
      expect(details.dashboard).toBeNull();
      expect(details.expenses).toEqual([]);
      expect(details.balances).toBeNull();
      expect(details.budget).toBeNull();
      expect(details.goals).toEqual([]);
      expect(details.calendar).toEqual([]);
      expect(details.reports).toBeNull();
      expect(typeof details.refreshAll).toBe("function");
      return null;
    }
    expect(renderToString(createElement(Probe))).toBe("");
  });

  it("loads workspaces and invitations atomically and publishes loading state", async () => {
    const { http, resource } = setup();
    const pending = deferred<WorkspaceSummaryDto[]>();
    http.get.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([{ id: "i" }]);
    const listener = vi.fn();
    const unsubscribe = resource.subscribe(listener);
    const load = resource.loadWorkspaces();
    expect(resource.getSnapshot().loading).toBe(true);
    pending.resolve([summary]);
    await load;
    expect(resource.getSnapshot()).toMatchObject({ workspaces: [summary], pendingInvitations: [{ id: "i" }], loading: false, error: null });
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("selects only the latest workspace and clears the previous workspace immediately", async () => {
    const { http, resource } = setup();
    http.get.mockResolvedValueOnce(detail);
    await resource.selectWorkspace("w");
    const old = deferred<WorkspaceDetailDto>();
    http.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...detail, id: "new" });
    const first = resource.selectWorkspace("old");
    expect(resource.getSnapshot().activeWorkspace).toBeNull();
    await resource.selectWorkspace("new");
    old.resolve({ ...detail, id: "old" });
    await first;
    expect(resource.getSnapshot().activeWorkspace?.id).toBe("new");
    expect(resource.getSnapshot().loading).toBe(false);
  });

  it("creates then reloads and selects the workspace; settings refresh the active detail", async () => {
    const { http, resource } = setup();
    http.post.mockResolvedValueOnce({ id: "w" });
    http.get.mockResolvedValueOnce([summary]).mockResolvedValueOnce([]).mockResolvedValueOnce(detail);
    await expect(resource.createWorkspace({ name: "Shared", workspaceType: "Other", baseCurrency: "USD" })).resolves.toEqual({ id: "w" });
    expect(resource.getSnapshot().activeWorkspace).toEqual(detail);
    const updated = { ...detail, settings: { ...detail.settings, weeklySummary: false } };
    http.get.mockResolvedValueOnce(updated);
    await resource.updateSettings({ weeklySummary: false });
    expect(http.put).toHaveBeenCalledWith("/v1/workspaces/w/settings", { weeklySummary: false });
    expect(resource.getSnapshot().activeWorkspace).toEqual(updated);
    http.post.mockResolvedValueOnce({ id: "invited" });
    await expect(resource.inviteMember({ email: "member@example.test" })).resolves.toEqual({ id: "invited" });
    expect(http.post).toHaveBeenLastCalledWith("/v1/workspaces/w/invitations", { email: "member@example.test" });
  });

  it("returns the committed create ID when the post-create list refresh fails", async () => {
    const { http, resource } = setup();
    http.post.mockResolvedValueOnce({ id: "committed" });
    http.get.mockRejectedValueOnce(new Error("refresh failed"));
    await expect(resource.createWorkspace({ name: "Shared", workspaceType: "Other", baseCurrency: "USD" })).resolves.toEqual({ id: "committed" });
    expect(http.post).toHaveBeenCalledExactlyOnceWith("/v1/workspaces", expect.anything());
    expect(resource.getSnapshot()).toMatchObject({ error: "refresh failed", loading: false });
  });

  it("refreshes invitation and membership lists after accept and reject", async () => {
    const { http, resource } = setup();
    http.get.mockResolvedValueOnce([summary]).mockResolvedValueOnce([]);
    await resource.acceptInvitation("i");
    expect(http.post).toHaveBeenLastCalledWith("/v1/workspaces/invitations/i/accept", {});
    expect(resource.getSnapshot().workspaces).toEqual([summary]);
    http.get.mockResolvedValueOnce([summary]).mockResolvedValueOnce([]);
    await resource.rejectInvitation("j");
    expect(http.post).toHaveBeenLastCalledWith("/v1/workspaces/invitations/j/reject", {});
    expect(resource.getSnapshot().pendingInvitations).toEqual([]);
  });

  it("reports errors, rejects failed actions, retains loaded lists and recovers on retry", async () => {
    const { http, resource } = setup();
    http.get.mockResolvedValueOnce([summary]).mockResolvedValueOnce([]);
    await resource.loadWorkspaces();
    http.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    await expect(resource.loadWorkspaces()).rejects.toThrow("offline");
    expect(resource.getSnapshot()).toMatchObject({ workspaces: [summary], loading: false, error: "offline" });
    http.get.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await resource.loadWorkspaces();
    expect(resource.getSnapshot().error).toBeNull();
    await expect(resource.updateSettings({})).rejects.toThrow("No workspace selected");
    const missing = createWorkspacesResource(null);
    await expect(missing.loadWorkspaces()).rejects.toThrow("Client not initialized");
    expect(missing.getSnapshot().loading).toBe(false);
  });

  it("ignores stale list responses and keeps loading true while another request is pending", async () => {
    const { http, resource } = setup();
    const old = deferred<WorkspaceSummaryDto[]>();
    http.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce([]).mockResolvedValueOnce([summary]).mockResolvedValueOnce([]);
    const first = resource.loadWorkspaces();
    await resource.loadWorkspaces();
    expect(resource.getSnapshot().loading).toBe(true);
    old.resolve([]);
    await first;
    expect(resource.getSnapshot()).toMatchObject({ workspaces: [summary], loading: false });
  });

  it("does not let a settings refresh replace a newly selected workspace", async () => {
    const { http, resource } = setup();
    http.get.mockResolvedValueOnce(detail);
    await resource.selectWorkspace("w");
    const write = deferred<void>();
    http.put.mockReturnValueOnce(write.promise);
    const updating = resource.updateSettings({ weeklySummary: false });
    http.get.mockResolvedValueOnce({ ...detail, id: "new" });
    await resource.selectWorkspace("new");
    http.get.mockResolvedValueOnce(detail);
    write.resolve();
    await updating;
    expect(resource.getSnapshot().activeWorkspace?.id).toBe("new");
  });

  it("does not let an obsolete selection failure overwrite newer state", async () => {
    const { http, resource } = setup();
    const old = deferred<WorkspaceDetailDto>();
    http.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(detail);
    const failed = resource.selectWorkspace("old");
    const assertion = expect(failed).rejects.toThrow("old failure");
    await resource.selectWorkspace("w");
    old.reject(new Error("old failure"));
    await assertion;
    expect(resource.getSnapshot()).toMatchObject({ activeWorkspace: detail, error: null, loading: false });
  });
});

describe("active workspace subresources", () => {
  it("loads all subresources with a consistent period and calendar range", async () => {
    const { http, repo } = setup();
    const values = [{ workspaceId: "w" }, [{ id: "e" }], [{ id: "i" }], { pairwiseBalances: [] }, null, [{ id: "g" }], [{ id: "c" }], { year: 2026 }];
    for (const value of values) http.get.mockResolvedValueOnce(value);
    const resource = createWorkspaceDetailsResource(repo, "w", { year: 2026, month: 2 });
    await resource.refreshAll();
    expect(resource.getSnapshot()).toMatchObject({ dashboard: values[0], expenses: values[1], incomes: values[2], balances: values[3], budget: null, goals: values[5], calendar: values[6], reports: values[7], loading: false, error: null });
    expect(http.get).toHaveBeenCalledWith("/v1/workspaces/w/calendar?from=2026-02-01&to=2026-02-28");
    expect(http.get).toHaveBeenCalledWith("/v1/workspaces/w/reports?year=2026&month=2");
  });

  it("refreshes dependent resources after each financial action without retrying writes", async () => {
    const { http, repo } = setup();
    http.get.mockResolvedValue([]);
    http.post.mockResolvedValue({ id: "created" });
    const resource = createWorkspaceDetailsResource(repo, "w");
    const actions = [
      () => resource.registerExpense({ description: "Expense", amount: 12, currency: "USD", paidByMemberId: "m", date: "2026-01-01", splitRuleType: "EqualParts", participants: [] }),
      () => resource.registerIncome({ description: "Income", amount: 12, currency: "USD", receivedByMemberId: "m", date: "2026-01-01" }),
      () => resource.settleBalance({ payerMemberId: "m", receiverMemberId: "n", amount: 6, currency: "USD", settlementDate: "2026-01-01" }),
      () => resource.setBudget({ year: 2026, month: 1, amount: 100, currency: "USD", categories: [] }),
      () => resource.createGoal({ title: "Goal", targetAmount: 100, currency: "USD" }),
      () => resource.contributeGoal("g", { amount: 5, currency: "USD" }),
      () => resource.createCalendarEvent({ title: "Payment", financialEventType: "Payment", dueDate: "2026-01-01", amount: 6, currency: "USD", responsibleMemberId: "m" }),
    ];
    for (const action of actions) {
      http.get.mockClear();
      await expect(action()).resolves.toEqual({ id: "created" });
      expect(http.get).toHaveBeenCalledTimes(8);
    }
    http.post.mockRejectedValueOnce(new Error("denied"));
    http.get.mockClear();
    await expect(actions[0]()).rejects.toThrow("denied");
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).toHaveBeenCalledTimes(actions.length + 1);
    expect(resource.getSnapshot()).toMatchObject({ loading: false, error: "denied" });
  });

  it("uses leap-year month bounds and rejects invalid periods before making requests", async () => {
    const { http, repo } = setup();
    http.get.mockResolvedValue([]);
    await createWorkspaceDetailsResource(repo, "w", { year: 2028, month: 2 }).refreshAll();
    expect(http.get).toHaveBeenCalledWith("/v1/workspaces/w/calendar?from=2028-02-01&to=2028-02-29");
    http.get.mockClear();
    const invalid = createWorkspaceDetailsResource(repo, "w", { year: 2026, month: 13 });
    await expect(invalid.refreshAll()).rejects.toThrow("Invalid workspace period");
    expect(http.get).not.toHaveBeenCalled();
    expect(invalid.getSnapshot().loading).toBe(false);
  });

  it("does not let an older details refresh overwrite a newer snapshot", async () => {
    const { http, repo } = setup();
    const old = deferred<unknown>();
    http.get.mockReturnValueOnce(old.promise).mockResolvedValue([]);
    const resource = createWorkspaceDetailsResource(repo, "w");
    const first = resource.refreshAll();
    http.get.mockResolvedValueOnce({ workspaceId: "new" });
    await resource.refreshAll();
    old.resolve({ workspaceId: "old" });
    await first;
    expect(resource.getSnapshot().dashboard?.workspaceId).toBe("new");
  });

  it("does not leak partial refresh data and distinguishes absent workspaces", async () => {
    const { http, repo } = setup();
    http.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValue([]);
    const resource = createWorkspaceDetailsResource(repo, "w");
    await expect(resource.refreshAll()).rejects.toThrow("offline");
    expect(resource.getSnapshot()).toMatchObject({ dashboard: null, expenses: [], error: "offline", loading: false });
    const absent = createWorkspaceDetailsResource(repo, null);
    await absent.refreshAll();
    await expect(absent.contributeGoal("g", { amount: 1, currency: "USD" })).rejects.toThrow("No workspace selected");
  });
});
