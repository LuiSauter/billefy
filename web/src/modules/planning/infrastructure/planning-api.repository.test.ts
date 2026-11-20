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

describe("goal funding transport", () => {
  it("preserves exact decimal strings and the caller's idempotency key for assign/release and reads history", async () => {
    const http = { post: vi.fn().mockResolvedValue({ id: "entry-a" }), get: vi.fn().mockResolvedValue([]) } as unknown as IHttpClient;
    const repo = new PlanningApiRepository(http);
    const request = { amount: "700.01", currency: "BOB", occurredAt: "2027-01-12T12:00:00.000Z" };
    await repo.recordGoalFunding("goal-a", "assign", request, "stable-key");
    await repo.recordGoalFunding("goal-a", "release", request, "release-key");
    expect(http.post).toHaveBeenNthCalledWith(1, "/v1/planning/goals/goal-a/funding/assign", request, { headers: { "Idempotency-Key": "stable-key" } });
    expect(http.post).toHaveBeenNthCalledWith(2, "/v1/planning/goals/goal-a/funding/release", request, { headers: { "Idempotency-Key": "release-key" } });
    expect(await repo.getGoalFunding("goal-a")).toEqual([]);
    expect(http.get).toHaveBeenCalledWith("/v1/planning/goals/goal-a/funding");
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

describe("recurring payments transport", () => {
  it("queries payments with serialized filters and summary", async () => {
    const payments = [
      { id: "r-1", name: "Netflix", amount: 69, currency: "BOB", frequency: "Monthly", nextDueDate: "2026-10-15", status: "Active" }
    ];
    const summary = {
      activeCount: 1,
      monthlyExpenses: 69,
      monthlyIncome: 0,
      currency: "BOB",
      upcoming7DaysCount: 1,
      upcoming7DaysTotal: 69,
      overdueCount: 0,
      overdueTotal: 0
    };
    const http = {
      get: vi.fn().mockResolvedValueOnce(payments).mockResolvedValueOnce(summary),
      post: vi.fn().mockResolvedValueOnce({ transactionId: "txn-123" })
    } as unknown as IHttpClient;
    const repo = new PlanningApiRepository(http);

    const listResult = await repo.getRecurringPayments({ flowType: "Expense", status: "Active", search: "Net" });
    expect(listResult).toEqual(payments);
    expect(http.get).toHaveBeenNthCalledWith(1, "/v1/planning/recurring?flowType=Expense&status=Active&search=Net");

    const summaryResult = await repo.getRecurringSummary("BOB");
    expect(summaryResult).toEqual(summary);
    expect(http.get).toHaveBeenNthCalledWith(2, "/v1/planning/recurring/summary?currency=BOB");

    const confirmResult = await repo.confirmRecurringPayment("r-1", { accountId: "acc-1", amount: 69 });
    expect(confirmResult).toEqual({ transactionId: "txn-123" });
    expect(http.post).toHaveBeenCalledWith("/v1/planning/recurring/r-1/confirm", { accountId: "acc-1", amount: 69 });
  });

  it("fetches calendar occurrences between dates", async () => {
    const occurrences = [
      { recurringId: "r-1", name: "Netflix", flowType: "Expense", amount: 69, currency: "BOB", frequency: "Monthly", date: "2026-10-15", isDueSoon: true, isOverdue: false }
    ];
    const http = {
      get: vi.fn().mockResolvedValueOnce(occurrences),
    } as unknown as IHttpClient;
    const repo = new PlanningApiRepository(http);

    const result = await repo.getRecurringCalendarOccurrences("2026-10-01", "2026-10-31");
    expect(result).toEqual(occurrences);
    expect(http.get).toHaveBeenCalledWith("/v1/planning/recurring/calendar?start=2026-10-01&end=2026-10-31");
  });

  it("returns empty array gracefully if calendar endpoint is unavailable", async () => {
    const http = {
      get: vi.fn().mockRejectedValueOnce(new Error("404 Not Found")),
    } as unknown as IHttpClient;
    const repo = new PlanningApiRepository(http);

    const result = await repo.getRecurringCalendarOccurrences("2026-10-01", "2026-10-31");
    expect(result).toEqual([]);
  });
});
