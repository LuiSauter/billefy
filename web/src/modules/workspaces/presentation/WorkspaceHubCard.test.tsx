import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { WorkspaceHubCard } from "./WorkspaceHubCard";
import type { WorkspaceDashboardDto, WorkspaceDetailDto } from "../domain/workspaces.types";

const detail: WorkspaceDetailDto = {
  id: "home", name: "Casa", workspaceType: "Couple", baseCurrency: "BOB", icon: "home", color: "violet", description: null, isActive: true, createdBy: "user", createdAt: "2026-01-01", startDate: "2026-01-01", settings: { hidePersonalPatrimony: true, memberSeesOnlyShared: true, showIndividualContributions: true, allowMovementComments: true, paymentReminders: true, weeklySummary: true, spaceNotifications: true },
  members: [{ id: "member", userId: "user", workspaceRole: "Owner", incomeSharePercentage: 100, joinedAt: "2026-01-01", isActive: true }],
};
const dashboard = { workspaceId: "home", currency: "BOB", budget: { amount: 100, remainingAmount: 75, executionPercentage: 25 }, monthlyExpenses: 25, pendingSettlements: [] } as unknown as WorkspaceDashboardDto;
const workspace = { ...detail, role: "Owner" as const };
type Element = React.ReactElement<Record<string, unknown>>;
function elements(tree: React.ReactNode): Element[] {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!React.isValidElement(tree)) return [];
  const element = tree as Element;
  return [element, ...elements(element.props.children as React.ReactNode)];
}

describe("WorkspaceHubCard", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("does not present missing dashboard amounts or progress as zero", () => {
    const html = renderToStaticMarkup(<WorkspaceHubCard workspace={workspace} detail={detail} onOpen={vi.fn()} onInvite={vi.fn()} />);
    expect(html).toContain("Integrante");
    expect(html).toContain("Activo");
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("0%");
  });

  it("retains available financial values while warning about independent feed failures", () => {
    const html = renderToStaticMarkup(<WorkspaceHubCard workspace={workspace} detail={detail} dashboard={dashboard} failures={{ detail: false, dashboard: false, expenses: true }} onRetry={vi.fn()} onOpen={vi.fn()} onInvite={vi.fn()} />);
    expect(html).toContain("No se pudieron cargar los gastos recientes.");
    expect(html).toContain("Bs 100,00");
    expect(html).toContain("25%");
  });

  it("routes card actions using the real workspace ID", () => {
    const onOpen = vi.fn();
    const onRegisterExpense = vi.fn();
    const tree = WorkspaceHubCard({ workspace, detail, dashboard, onOpen, onInvite: vi.fn(), onRegisterExpense });
    const buttons = elements(tree).filter((node) => node.type === Button);
    (buttons.find((node) => node.props.children?.toString().includes("Ver dashboard"))?.props.onClick as () => void)();
    (buttons.find((node) => node.props.children?.toString().includes("Ver balances"))?.props.onClick as () => void)();
    (buttons.find((node) => node.props.children?.toString().includes("Registrar gasto"))?.props.onClick as () => void)();
    expect(onOpen.mock.calls).toEqual([["home", "dashboard"], ["home", "balances"]]);
    expect(onRegisterExpense).toHaveBeenCalledExactlyOnceWith("home");
  });
});
