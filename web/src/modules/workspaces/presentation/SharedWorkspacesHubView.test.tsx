import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedWorkspacesHubView } from "./SharedWorkspacesHubView";
import { WorkspaceHubCard, summarizeWorkspaces } from "./WorkspaceHubCard";
import { WorkspaceInvitationsPanel } from "./WorkspaceInvitationsPanel";
import { Button } from "@/shared/ui/button";
import type { WorkspaceDetailDto, WorkspaceDashboardDto } from "../domain/workspaces.types";

const state = vi.hoisted(() => ({ workspaces: [] as { id: string; name: string; workspaceType: string; baseCurrency: string; role: string; icon: null; color: null }[], pendingInvitations: [] as { id: string; workspaceName: string; status: string }[], loading: false, error: null as string | null }));
vi.mock("../application/useWorkspaces", () => ({ useWorkspaces: () => ({ ...state, loadWorkspaces: vi.fn(), createWorkspace: vi.fn(), acceptInvitation: vi.fn(), rejectInvitation: vi.fn() }) }));

const detail: WorkspaceDetailDto = {
  id: "home", name: "Casa compartida", workspaceType: "Couple", baseCurrency: "BOB", icon: "home", color: "violet", description: null, isActive: true, createdBy: "user", createdAt: "2026-01-01", settings: { hidePersonalPatrimony: true, memberSeesOnlyShared: true, showIndividualContributions: true, allowMovementComments: true, paymentReminders: true, weeklySummary: true, spaceNotifications: true },
  members: [{ id: "member", userId: "user", workspaceRole: "Owner", incomeSharePercentage: 100, joinedAt: "2026-01-01", isActive: true }],
};
const dashboard = { workspaceId: "home", currency: "BOB", budget: { amount: 100, remainingAmount: 75, executionPercentage: 25 }, monthlyExpenses: 25, pendingSettlements: [] } as unknown as WorkspaceDashboardDto;

type Element = React.ReactElement<Record<string, unknown>>;
function elements(tree: React.ReactNode): Element[] {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!React.isValidElement(tree)) return [];
  const element = tree as Element;
  return [element, ...elements(element.props.children as React.ReactNode)];
}

describe("SharedWorkspacesHubView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { state.workspaces = []; state.pendingInvitations = []; state.loading = false; state.error = null; });

  it("renders the hub KPIs, panels, advice and authentic empty state", () => {
    const html = renderToStaticMarkup(<SharedWorkspacesHubView http={null} />);
    for (const text of ["Mis espacios compartidos", "Espacios activos", "Integrantes", "Presupuesto compartido total", "Próximas liquidaciones", "Invitaciones pendientes", "Gastos recientes", "Espacio para acciones", "Selecciona un espacio compartido", "Acciones rápidas", "Consejo compartido", "Crea tu primer espacio compartido"]) expect(html).toContain(text);
    expect(html).not.toContain("Nuestro hogar");
  });

  it("does not present loading or failed requests as an empty account", () => {
    state.loading = true;
    let html = renderToStaticMarkup(<SharedWorkspacesHubView http={null} />);
    expect(html).toContain("Cargando espacios");
    expect(html).not.toContain("Crea tu primer espacio");
    state.loading = false;
    state.error = "No se pudieron cargar los espacios";
    html = renderToStaticMarkup(<SharedWorkspacesHubView http={null} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reintentar");
    expect(html).not.toContain("Crea tu primer espacio");
  });

  it("shows pending invitation actions without invented inviter identities", () => {
    state.pendingInvitations = [{ id: "invite", workspaceName: "Viaje de prueba", status: "Pending" }];
    const html = renderToStaticMarkup(<SharedWorkspacesHubView http={null} />);
    expect(html).toContain("Viaje de prueba");
    expect(html).toContain("Aceptar");
    expect(html).toContain("Rechazar");
  });

  it("renders workspace status, type, real members, budget progress and navigation", () => {
    const html = renderToStaticMarkup(<WorkspaceHubCard workspace={{ ...detail, role: "Owner" }} detail={detail} dashboard={dashboard} onOpen={vi.fn()} onInvite={vi.fn()} />);
    for (const text of ["Casa compartida", "Activo", "Pareja", "1 integrante", "25%", "Ver dashboard", "Ver balances", "Registrar gasto"]) expect(html).toContain(text);
    expect(html).toContain('role="progressbar"');
    expect(html).not.toContain("undefined");
  });

  it("routes invitation acceptance and rejection to the selected invitation only", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const invitation = { id: "pending", workspaceId: "home", workspaceName: "Casa", workspaceRole: "Member" as const, expiresAt: "2026-12-01", status: "Pending" as const };
    const tree = WorkspaceInvitationsPanel({ invitations: [invitation, { ...invitation, id: "accepted", status: "Accepted" }], busy: false, onAccept, onReject });
    const buttons = elements(tree).filter((node) => node.type === Button);
    expect(buttons).toHaveLength(2);
    (buttons[0].props.onClick as () => void)();
    (buttons[1].props.onClick as () => void)();
    expect(onAccept).toHaveBeenCalledExactlyOnceWith("pending");
    expect(onReject).toHaveBeenCalledExactlyOnceWith("pending");
    const busyTree = WorkspaceInvitationsPanel({ invitations: [invitation], busy: true, onAccept, onReject });
    expect(elements(busyTree).filter((node) => node.type === Button).every((node) => node.props.loading || node.props.disabled)).toBe(true);
  });

  it("routes card navigation without falling back to personal expense registration", () => {
    const onOpen = vi.fn();
    const tree = WorkspaceHubCard({ workspace: { ...detail, role: "Owner" }, detail, dashboard, onOpen, onInvite: vi.fn() });
    const buttons = elements(tree).filter((node) => node.type === Button);
    const navigation = buttons.filter((node) => node.props.variant === "outline" && node.props.size !== "icon-sm");
    (navigation[0].props.onClick as () => void)();
    (navigation[1].props.onClick as () => void)();
    expect(onOpen.mock.calls).toEqual([["home", "dashboard"], ["home", "balances"]]);
    expect(buttons.find((node) => node.props.title)?.props.disabled).toBe(true);
  });

  it("never combines different currencies or counts a member twice", () => {
    const result = summarizeWorkspaces([
      { detail, dashboard },
      { detail: { ...detail, id: "trip", baseCurrency: "USD" }, dashboard: { ...dashboard, currency: "USD", budget: { ...dashboard.budget!, amount: 50 } } },
    ]);
    expect(result.members).toBe(1);
    expect(result.budgets).toEqual({ BOB: "100", USD: "50" });
    expect(result.active).toBe(2);
  });
});
