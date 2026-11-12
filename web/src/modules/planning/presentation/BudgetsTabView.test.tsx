import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BudgetsTabView,
  BudgetsLoadStatus,
  resolveBudgetsLoadState,
} from "./BudgetsTabView";

describe("resolveBudgetsLoadState", () => {
  it("reports initial loading when there is no data yet", () => {
    expect(resolveBudgetsLoadState(0, true, null)).toBe("loading");
  });

  it("reports a blocking error when loading failed without data", () => {
    expect(resolveBudgetsLoadState(0, false, new Error("boom"))).toBe("error");
  });

  it("keeps existing data as stale when a refresh failed", () => {
    expect(resolveBudgetsLoadState(2, false, new Error("boom"))).toBe("stale");
  });

  it("keeps existing data while refreshing", () => {
    expect(resolveBudgetsLoadState(2, true, null)).toBe("refreshing");
  });

  it("is ready for loaded data or a genuinely empty list", () => {
    expect(resolveBudgetsLoadState(2, false, null)).toBe("ready");
    expect(resolveBudgetsLoadState(0, false, null)).toBe("ready");
  });
});

describe("BudgetsLoadStatus", () => {
  it("renders a loading status instead of an empty state", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="loading" onRetry={vi.fn()} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando presupuestos");
    expect(html).not.toContain("Reintentar");
  });

  it("renders an actionable error without data", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="error" onRetry={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("No se pudieron cargar los presupuestos");
    expect(html).toContain("Reintentar");
  });

  it("warns that existing data may be outdated and offers retry", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="stale" onRetry={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("pueden estar desactualizados");
    expect(html).toContain("Reintentar");
  });

  it("shows a small refreshing indicator while keeping data", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="refreshing" onRetry={vi.fn()} />);
    expect(html).toContain("Actualizando");
    expect(html).not.toContain("Reintentar");
  });

  it("renders nothing when ready", () => {
    expect(renderToStaticMarkup(<BudgetsLoadStatus state="ready" onRetry={vi.fn()} />)).toBe("");
  });
});

describe("BudgetsTabView unified redesign", () => {
  it("renders the unified layout headers, KPIs, and redesign sections", () => {
    const html = renderToStaticMarkup(
      <BudgetsTabView
        budgets={[]}
        onUpdateBudget={vi.fn()}
        onOpenCreateBudgetModal={vi.fn()}
      />
    );
    expect(html).toContain("Presupuesto");
    expect(html).toContain("Planifica, controla y optimiza tus ingresos y gastos mensuales");
    expect(html).toContain("Ingreso mensual");
    expect(html).toContain("Gasto mensual");
    expect(html).toContain("Ahorro / Inversión");
    expect(html).toContain("Disponible");
    expect(html).toContain("Distribución del presupuesto");
    expect(html).toContain("Ajustar regla");
    expect(html).toContain("Gastos por categoría");
    expect(html).toContain("Progreso del presupuesto");
    expect(html).toContain("Proyección del mes");
    expect(html).toContain("Insights y recomendaciones");
  });

  it("renders overrun indicator when category budgets exceed the distribution rule", () => {
    const plan = {
      enabled: true,
      buckets: [
        {
          id: "b-1",
          name: "Necesidades",
          percent: 50,
          colorKey: "emerald",
          trackingMode: "Expenses" as const,
          categoryIds: ["cat-wifi", "cat-rent", "cat-food"],
        },
      ],
    };
    const budgets = [
      {
        id: "b-wifi",
        categoryId: "cat-wifi",
        limitAmount: 180,
        spentAmount: 0,
        currency: "BOB",
        period: "monthly",
        isActive: true,
        alertThreshold: 0.8,
        remainingAmount: 180,
        percentageUsed: 0,
        isAlertTriggered: false,
        isExceeded: false,
        createdAt: "2026-01-01",
      },
      {
        id: "b-rent",
        categoryId: "cat-rent",
        limitAmount: 800,
        spentAmount: 0,
        currency: "BOB",
        period: "monthly",
        isActive: true,
        alertThreshold: 0.8,
        remainingAmount: 800,
        percentageUsed: 0,
        isAlertTriggered: false,
        isExceeded: false,
        createdAt: "2026-01-01",
      },
      {
        id: "b-food",
        categoryId: "cat-food",
        limitAmount: 200,
        spentAmount: 0,
        currency: "BOB",
        period: "monthly",
        isActive: true,
        alertThreshold: 0.8,
        remainingAmount: 200,
        percentageUsed: 0,
        isAlertTriggered: false,
        isExceeded: false,
        createdAt: "2026-01-01",
      },
    ];

    const html = renderToStaticMarkup(
      <BudgetsTabView
        plan={plan}
        budgets={budgets}
        transactions={[
          {
            id: "tx-inc",
            accountId: "acc-1",
            amount: "2000",
            currency: "BOB",
            direction: "Income",
            occurredAt: new Date().toISOString(),
          },
        ]}
        selectedCurrency="BOB"
        onUpdateBudget={vi.fn()}
        onOpenCreateBudgetModal={vi.fn()}
      />
    );

    // 50% of 2000 = 1000 Bs cupo. Sum = 1180 Bs -> Excedido en Bs. 180
    expect(html).toContain("Bs 180,00");
  });
});
