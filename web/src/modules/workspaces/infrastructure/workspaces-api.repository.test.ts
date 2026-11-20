import { describe, expect, it, vi } from "vitest";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import { WorkspacesApiRepository } from "./workspaces-api.repository";

describe("workspaces API transport", () => {
  const setup = () => {
    const http = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
    return { http, repo: new WorkspacesApiRepository(http as unknown as IHttpClient) };
  };

  it("maps every read endpoint and preserves server response shapes", async () => {
    const { http, repo } = setup();
    const calls = [
      [() => repo.getWorkspaces(), "/v1/workspaces"],
      [() => repo.getWorkspace("w"), "/v1/workspaces/w"],
      [() => repo.getSplitConfiguration("w"), "/v1/workspaces/w/split-configuration"],
      [() => repo.getPendingInvitations(), "/v1/workspaces/invitations/pending"],
      [() => repo.getDashboard("w"), "/v1/workspaces/w/dashboard"],
      [() => repo.getExpenses("w"), "/v1/workspaces/w/expenses"],
      [() => repo.getIncomes("w"), "/v1/workspaces/w/incomes"],
      [() => repo.getBalances("w"), "/v1/workspaces/w/balances"],
      [() => repo.getSettlements("w"), "/v1/workspaces/w/settlements"],
      [() => repo.getBudget("w"), "/v1/workspaces/w/budget"],
      [() => repo.getGoals("w"), "/v1/workspaces/w/goals"],
      [() => repo.getCalendar("w"), "/v1/workspaces/w/calendar"],
      [() => repo.getReports("w"), "/v1/workspaces/w/reports"],
    ] as const;
    for (const [call, path] of calls) {
      const response = { serverShape: true };
      http.get.mockResolvedValueOnce(response);
      expect(await call()).toBe(response);
      expect(http.get).toHaveBeenLastCalledWith(path);
    }
  });

  it("serializes periods, date ranges and zero-valued pagination without undefined values", async () => {
    const { http, repo } = setup();
    await repo.getExpenses("w", { from: "2026-01-01", to: "2026-01-31", categoryId: "a&b", paidByMemberId: "m", limit: 0, offset: 0 });
    expect(http.get).toHaveBeenLastCalledWith("/v1/workspaces/w/expenses?from=2026-01-01&to=2026-01-31&categoryId=a%26b&paidByMemberId=m&limit=0&offset=0");
    await repo.getIncomes("w", { from: "2026-01-01", to: "2026-01-31", categoryId: "a&b", receivedByMemberId: "m", limit: 0, offset: 0 });
    expect(http.get).toHaveBeenLastCalledWith("/v1/workspaces/w/incomes?from=2026-01-01&to=2026-01-31&categoryId=a%26b&receivedByMemberId=m&limit=0&offset=0");
    for (const call of [repo.getDashboard.bind(repo), repo.getBudget.bind(repo), repo.getReports.bind(repo)]) {
      await call("w", { year: 2026, month: 1 });
      expect(http.get.mock.lastCall?.[0]).toMatch(/\?year=2026&month=1$/);
    }
    await repo.getCalendar("w", { from: "2026-01-01", to: "2026-01-31" });
    expect(http.get).toHaveBeenLastCalledWith("/v1/workspaces/w/calendar?from=2026-01-01&to=2026-01-31");
  });

  it("maps all mutations to their backend verbs and forwards bodies unchanged", async () => {
    const { http, repo } = setup();
    const create = { name: "Shared", workspaceType: "Other" as const, baseCurrency: "USD" };
    const settings = { hidePersonalPatrimony: true };
    const expense = { description: "Expense", amount: 12, currency: "USD", paidByMemberId: "m", date: "2026-01-01", splitRuleType: "EqualParts" as const, participants: [{ memberId: "m" }] };
    const income = { description: "Income", amount: 12, currency: "USD", receivedByMemberId: "m", date: "2026-01-01" };
    const settlement = { payerMemberId: "m", receiverMemberId: "n", amount: 6, currency: "USD", settlementDate: "2026-01-01" };
    const budget = { year: 2026, month: 1, amount: 100, currency: "USD", categories: [] };
    const goal = { title: "Goal", targetAmount: 100, currency: "USD" };
    const contribution = { amount: 5, currency: "USD" };
    const event = { title: "Payment", financialEventType: "Payment" as const, dueDate: "2026-01-01", amount: 6, currency: "USD", responsibleMemberId: "m" };
    const calls = [
      [() => repo.createWorkspace(create), http.post, "/v1/workspaces", create],
      [() => repo.updateWorkspace("w", { name: "Updated" }), http.put, "/v1/workspaces/w", { name: "Updated" }],
      [() => repo.updateSettings("w", settings), http.put, "/v1/workspaces/w/settings", settings],
      [() => repo.updateSplitConfiguration("w", { defaultSplitRule: "IncomeProportional", activeMembers: [], pendingInvitations: [] }), http.put, "/v1/workspaces/w/split-configuration", { defaultSplitRule: "IncomeProportional", activeMembers: [], pendingInvitations: [] }],
      [() => repo.inviteMember("w", { email: "member@example.test" }), http.post, "/v1/workspaces/w/invitations", { email: "member@example.test" }],
      [() => repo.acceptInvitation("i"), http.post, "/v1/workspaces/invitations/i/accept", {}],
      [() => repo.rejectInvitation("i"), http.post, "/v1/workspaces/invitations/i/reject", {}],
      [() => repo.updateMemberRole("w", "m", { workspaceRole: "Admin" }), http.put, "/v1/workspaces/w/members/m", { workspaceRole: "Admin" }],
      [() => repo.registerExpense("w", expense), http.post, "/v1/workspaces/w/expenses", expense],
      [() => repo.registerIncome("w", income), http.post, "/v1/workspaces/w/incomes", income],
      [() => repo.settleBalance("w", settlement), http.post, "/v1/workspaces/w/settlements", settlement],
      [() => repo.setBudget("w", budget), http.post, "/v1/workspaces/w/budget", budget],
      [() => repo.createGoal("w", goal), http.post, "/v1/workspaces/w/goals", goal],
      [() => repo.contributeGoal("w", "g", contribution), http.post, "/v1/workspaces/w/goals/g/contribute", contribution],
      [() => repo.createCalendarEvent("w", event), http.post, "/v1/workspaces/w/calendar/events", event],
    ] as const;
    for (const [call, method, path, body] of calls) {
      const response = { id: "created" };
      method.mockResolvedValueOnce(response);
      await call();
      expect(method).toHaveBeenLastCalledWith(path, body);
    }
    await repo.deactivateWorkspace("w");
    expect(http.delete).toHaveBeenLastCalledWith("/v1/workspaces/w");
    await repo.removeMember("w", "m");
    expect(http.delete).toHaveBeenLastCalledWith("/v1/workspaces/w/members/m");
  });

  it("maps invitation-link issue, preview, accept, and revoke wire contracts", async () => {
    const { http, repo } = setup();
    const issued = { id: "link", token: "a".repeat(43), expiresAt: "2026-06-01T00:00:00Z" };
    const preview = { workspaceId: "w", workspaceName: "Shared", workspaceRole: "Member", expiresAt: issued.expiresAt, alreadyMember: false };
    const accepted = { workspaceId: "w", membershipId: "member" };
    http.post.mockResolvedValueOnce(issued).mockResolvedValueOnce(preview).mockResolvedValueOnce(accepted);
    http.delete.mockResolvedValueOnce(undefined);
    await expect(repo.issueInvitationLink("w")).resolves.toBe(issued);
    await expect(repo.previewInvitationLink(issued.token)).resolves.toBe(preview);
    await expect(repo.acceptInvitationLink(issued.token)).resolves.toBe(accepted);
    await repo.revokeInvitationLink("w", "link");
    expect(http.post).toHaveBeenNthCalledWith(1, "/v1/workspaces/w/invitation-links", {});
    expect(http.post).toHaveBeenNthCalledWith(2, "/v1/workspaces/invitation-links/preview", { token: issued.token });
    expect(http.post).toHaveBeenNthCalledWith(3, "/v1/workspaces/invitation-links/accept", { token: issued.token });
    expect(http.delete).toHaveBeenCalledWith("/v1/workspaces/w/invitation-links/link");
  });

  it("accepts 204 writes, nullable budgets, and propagates HTTP failures", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const repo = new WorkspacesApiRepository(new FetchHttpClient({ baseUrl: "https://api.test", fetchFn }));
    await expect(repo.updateWorkspace("w", { name: "Updated" })).resolves.toBeUndefined();
    const { http, repo: mocked } = setup();
    http.get.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("Forbidden"));
    await expect(mocked.getBudget("w")).resolves.toBeNull();
    await expect(mocked.getWorkspaces()).rejects.toThrow("Forbidden");
  });
});
