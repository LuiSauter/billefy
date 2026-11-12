import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FinancialGoalsView } from "./FinancialGoalsView";
import { GoalDto } from "../domain/planning.types";
const tracked: GoalDto = { id: "g", name: "Una meta con un nombre bastante largo", accountId: "a", accountName: "Cuenta familiar", trackingStatus: "tracked", sharedGoalCount: 2, targetAmount: 120, currency: "BOB", targetDate: "2026-10-01", currentAmount: 30, remainingAmount: 90, percentageAchieved: 25, monthsRemaining: 3, monthlyContributionNeeded: 30, createdAt: "2026-01-01" };
describe("financial goals view", () => {
  it("shows valid backend progress, truthful shared disclosure and no contribution action", () => {
    const html = renderToStaticMarkup(<FinancialGoalsView goals={[tracked]} onOpenCreateGoalModal={vi.fn()} onOpenAccounts={vi.fn()} />);
    for (const text of ["Tus metas", tracked.name, "30,00 BOB", "120,00 BOB", "90,00 BOB", "25%", "En 3 meses", "Cuenta familiar", "Compartida con 2 metas"]) expect(html).toContain(text);
    expect(html).toContain('role="progressbar"');
    expect(html).not.toContain("Aportar");
  });
  it.each(["unlinked", "unavailable", "currency_mismatch"] as const)("does not show progress for %s goals", (trackingStatus) => {
    const goal = { ...tracked, trackingStatus, currentAmount: null, remainingAmount: null, percentageAchieved: null, monthlyContributionNeeded: null, monthsRemaining: null } as GoalDto;
    const html = renderToStaticMarkup(<FinancialGoalsView goals={[goal]} onOpenCreateGoalModal={vi.fn()} onOpenAccounts={vi.fn()} />);
    expect(html).not.toContain('role="progressbar"');
    expect(html).toContain("Ver cuentas");
  });
  it("shows read retry and does not collapse failures into empty state", () => {
    const html = renderToStaticMarkup(<FinancialGoalsView goals={[]} error={new Error("offline")} onRetry={vi.fn()} onOpenCreateGoalModal={vi.fn()} onOpenAccounts={vi.fn()} />);
    expect(html).toContain('role="alert"'); expect(html).toContain("Reintentar"); expect(html).not.toContain("Todavía no tienes metas");
  });
});
