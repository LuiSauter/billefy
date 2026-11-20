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
  it("does not present an unavailable reserved account as backed or zero funded", () => {
    const goal = { ...mockGoal, fundingMode: "ReservedFunds" as const, reservationStatus: "unavailable" as const, accountId: "missing", currentAmount: 700, percentageAchieved: 35 };
    const html = renderToStaticMarkup(<GoalsTabView goals={[goal]} onOpenCreateGoalModal={vi.fn()} />);
    expect(html).toContain("Respaldo no disponible");
    expect(html).toContain("700,00");
  });

  it("shows a shared account shortfall once and keeps legacy goals on account tracking", () => {
    const reserved = { ...mockGoal, accountId: "account-a", fundingMode: "ReservedFunds" as const, currentAmount: 700, percentageAchieved: 35, accountReservedAmount: 1000, accountFundingShortfall: 200, reservationStatus: "underfunded" as const };
    const html = renderToStaticMarkup(<GoalsTabView goals={[reserved, { ...reserved, id: "goal-2" }, { ...mockGoal, id: "legacy" }]} onOpenCreateGoalModal={vi.fn()} onRecordGoalFunding={vi.fn()} />);
    expect(html.match(/Faltante de respaldo/g)).toHaveLength(1);
    expect(html).toContain("compartido por las metas de esta cuenta");
    expect(html).toContain("Administrar reserva");
    expect(html).toContain("Seguimiento del saldo");
    expect(html).not.toContain("Conversión automática");
  });

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
