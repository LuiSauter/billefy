import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalsTabView } from "./GoalsTabView";
import { GoalDto } from "../domain/planning.types";

const mockGoal: GoalDto = {
  id: "goal-1",
  name: "Viaje a Europa",
  targetAmount: 3000,
  currentAmount: 1950,
  remainingAmount: 1050,
  currency: "USD",
  percentageAchieved: 65,
  monthsRemaining: 4,
  monthlyContributionNeeded: 680,
  trackingStatus: "tracked",
  accountName: "Ahorros Banco",
  targetDate: "2027-01-31",
  sharedGoalCount: 1,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("GoalsTabView redesign", () => {
  it("renders the Metas header, KPIs, filter toolbar, cards and summary panel", () => {
    const html = renderToStaticMarkup(
      <GoalsTabView
        goals={[mockGoal]}
        onOpenCreateGoalModal={vi.fn()}
        onDeleteGoal={vi.fn()}
      />
    );

    // Header
    expect(html).toContain("Metas");
    expect(html).toContain("Define tus objetivos financieros y da seguimiento a tu progreso");
    expect(html).toContain("Crear meta");

    // KPI Cards
    expect(html).toContain("Metas activas");
    expect(html).toContain("Progreso promedio");
    expect(html).toContain("Ahorro mensual total");
    expect(html).toContain("Meta más cercana");

    // Filter Toolbar
    expect(html).toContain("Buscar metas...");
    expect(html).toContain("Todas");
    expect(html).toContain("En progreso");
    expect(html).toContain("Completadas");
    expect(html).toContain("Pausadas");

    // Goal Card
    expect(html).toContain("Viaje a Europa");
    expect(html).toContain("65%");
    expect(html).toContain("4 meses restantes");

    // Summary Panel
    expect(html).toContain("Resumen de metas");
    expect(html).toContain("Distribución de ahorro");
    expect(html).toContain("Recomendación");
  });
});
