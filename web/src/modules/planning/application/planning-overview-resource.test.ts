import { describe, expect, it, vi } from "vitest";
import { createPlanningOverviewResource } from "./planning-overview-resource";
import { IPlanningRepository } from "../domain/planning.types";

const goal = { id: "g", accountId: "a", accountName: "Caja", trackingStatus: "tracked", sharedGoalCount: 1, name: "Viaje", targetAmount: 100, currency: "BOB", currentAmount: 25, remainingAmount: 75, percentageAchieved: 25, monthsRemaining: null, monthlyContributionNeeded: null, createdAt: "2026-01-01" };
const health = { monthStartUtc: "2026-05-01T00:00:00Z", monthEndUtcExclusive: "2026-06-01T00:00:00Z", currencies: [{ currency: "BOB", monthlyIncome: 100, monthlyExpenses: 120, netCashFlow: -20, savingsRatePercentage: -20, currentBalance: 10, outstandingDebtPrincipal: 5 }] };
function repo(overrides: Partial<IPlanningRepository> = {}): IPlanningRepository {
  return { getGoals: vi.fn().mockResolvedValue([goal]), getFinancialHealth: vi.fn().mockResolvedValue(health), createGoal: vi.fn(), updateGoal: vi.fn(), getBudgets: vi.fn(), createBudget: vi.fn(), updateBudget: vi.fn(), deleteBudget: vi.fn(), deleteGoal: vi.fn(), proposeIncomeDistribution: vi.fn(), ...overrides } as unknown as IPlanningRepository;
}

describe("planning overview resource", () => {
  it("publishes goals and health together and preserves last good data on read failure", async () => {
    const api = repo();
    const resource = createPlanningOverviewResource(api);
    await resource.refresh();
    expect(resource.getSnapshot()).toMatchObject({ goals: [goal], health, status: "ready" });
    vi.mocked(api.getFinancialHealth).mockRejectedValueOnce(new Error("offline"));
    const result = await resource.refresh();
    expect(result.status).toBe("failed");
    expect(resource.getSnapshot()).toMatchObject({ goals: [goal], health, status: "stale", error: expect.any(Error) });
  });

  it("does not let an older read overwrite a newer result", async () => {
    let resolveOld!: (value: typeof health) => void;
    const api = repo({ getFinancialHealth: vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue(health) });
    const resource = createPlanningOverviewResource(api);
    const old = resource.refresh();
    await resource.refresh();
    resolveOld({ ...health, currencies: [] });
    expect((await old).status).toBe("superseded");
    expect(resource.getSnapshot().health).toEqual(health);
  });

  it("clears prior identity data when its repository changes", async () => {
    const resource = createPlanningOverviewResource(repo());
    await resource.refresh();
    resource.replaceRepository(repo({ getGoals: vi.fn().mockResolvedValue([]) }));
    expect(resource.getSnapshot()).toMatchObject({ goals: [], health: null, status: "idle" });
  });
});
