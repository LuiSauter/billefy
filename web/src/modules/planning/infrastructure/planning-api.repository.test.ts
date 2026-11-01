import { describe, expect, it, vi } from "vitest";
import { FetchHttpClient } from "../../../shared/infrastructure/fetch-http.client";
import { PlanningApiRepository } from "./planning-api.repository";
import { IHttpClient } from "../../../shared/application/http-client.contract";

describe("planning read DTO transport", () => {
  it("preserves nullable currency-safe health and goal tracking fields from S1", async () => {
    const health = { monthStartUtc: "2026-05-01T00:00:00Z", monthEndUtcExclusive: "2026-06-01T00:00:00Z", currencies: [{ currency: "BTC", monthlyIncome: 0, monthlyExpenses: 2, netCashFlow: -2, savingsRatePercentage: null, currentBalance: 1.23456789, outstandingDebtPrincipal: 0 }] };
    const goals = [{ id: "g", accountId: null, accountName: null, trackingStatus: "unlinked", sharedGoalCount: 0, name: "Test", targetAmount: 10, currency: "BTC", targetDate: null, currentAmount: null, remainingAmount: null, percentageAchieved: null, monthsRemaining: null, monthlyContributionNeeded: null, createdAt: "2026-01-01" }];
    const http = { get: vi.fn().mockResolvedValueOnce(goals).mockResolvedValueOnce(health) } as unknown as IHttpClient;
    const repo = new PlanningApiRepository(http);
    expect(await repo.getGoals()).toEqual(goals);
    expect(await repo.getFinancialHealth()).toEqual(health);
    expect(http.get).toHaveBeenNthCalledWith(1, "/v1/planning/goals");
    expect(http.get).toHaveBeenNthCalledWith(2, "/v1/planning/financial-health");
  });
});

describe("budget update transport", () => {
  it("PUTs only editable fields to the existing budget and accepts an empty 204 response", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const http = new FetchHttpClient({ baseUrl: "https://api.test", fetchFn });
    const repo = new PlanningApiRepository(http);
    const request = { limitAmount: 275.55, alertThreshold: 0.8, currency: "USD", categoryId: "other", period: "yearly" };
    await expect(repo.updateBudget("budget-a", request)).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.test/v1/planning/budgets/budget-a");
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(options?.body as string)).toEqual({ limitAmount: 275.55, alertThreshold: 0.8 });
  });
});
