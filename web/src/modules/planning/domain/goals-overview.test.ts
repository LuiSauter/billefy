import { describe, expect, it } from "vitest";
import { buildGoalOverview, eligibleGoalAccounts } from "./goals-overview";
import { GoalDto } from "./planning.types";
const base: GoalDto = { id: "g", name: "Viaje largo", accountId: "a", accountName: "Ahorro", trackingStatus: "tracked", sharedGoalCount: 2, targetAmount: 0.00000123, currency: "BTC", currentAmount: 0.0000004, remainingAmount: 0.00000083, percentageAchieved: 32.52, monthsRemaining: 5, monthlyContributionNeeded: 0.000000166, createdAt: "2026-01-01" };
describe("goal overview model", () => {
  it("only makes same-currency accounts eligible for a new link", () => {
    const accounts = [{ id: "bob", currency: "BOB" }, { id: "usd", currency: "USD" }] as never[];
    expect(eligibleGoalAccounts(accounts, "USD").map((account) => account.id)).toEqual(["usd"]);
  });
  it("uses tracked backend values and currency precision without floating point", () => {
    expect(buildGoalOverview(base)).toMatchObject({ tracked: true, current: "0,00000040 BTC", target: "0,00000123 BTC", remaining: "0,00000083 BTC", percentage: 32.52, monthly: "0,00000017 BTC", shared: true });
  });
  it.each(["unlinked", "unavailable", "currency_mismatch"] as const)("never presents invalid %s data as progress", (trackingStatus) => {
    const view = buildGoalOverview({ ...base, trackingStatus, currentAmount: null, remainingAmount: null, percentageAchieved: null, monthsRemaining: null, monthlyContributionNeeded: null });
    expect(view.tracked).toBe(false);
    expect(view.current).toBeNull();
    expect(view.percentage).toBeNull();
    expect(view.monthly).toBeNull();
  });
});
