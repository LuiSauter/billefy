import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField as FormFieldForTest } from "@/shared/ui/form-field";
import { WorkspaceShellView } from "./WorkspaceShell";
import { WorkspaceDashboardView } from "./WorkspaceDashboardView";
import { WorkspaceBudgetsView } from "./WorkspaceBudgetsView";
import { WorkspaceMovementsView } from "./WorkspaceMovementsView";
import { WorkspaceBalancesView } from "./WorkspaceBalancesView";
import { WorkspaceGoalsView } from "./WorkspaceGoalsView";
import { WorkspaceCalendarView } from "./WorkspaceCalendarView";
import { WorkspaceReportsView } from "./WorkspaceReportsView";
import { WorkspaceSettingsView } from "./WorkspaceSettingsView";
import { CreateSharedGoalModal } from "./CreateSharedGoalModal";
import { ContributeSharedGoalModal } from "./ContributeSharedGoalModal";
import { CreateSharedEventModal } from "./CreateSharedEventModal";
import { SharedWorkspacesHubView } from "./SharedWorkspacesHubView";
import { WorkspaceHubCard } from "./WorkspaceHubCard";
import { ConfigureWorkspaceBudgetModal } from "./ConfigureWorkspaceBudgetModal";
import { RegisterWorkspaceExpenseModal } from "./RegisterWorkspaceExpenseModal";
import type { IHttpClient } from "@/shared/application/http-client.contract";
import { budgetFixture, calendarFixture, dashboardFixture, expensesFixture, goalsFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], error: null as string | null, loading: false, detailsHook: vi.fn() }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
  }, useMemo: (factory: () => unknown) => factory(), useEffect: () => {}, useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  } };
});
vi.mock("../application/useWorkspaceDetails", () => ({ useWorkspaceDetails: (...args: unknown[]) => {
  hooks.detailsHook(...args);
  return { reports: { year: 2026, month: 10, currency: "BOB", income: 0, expenses: 725, savings: 60, previousMonthIncome: 0, previousMonthExpenses: 0, expenseChangePercentage: null, categoryBreakdown: [] }, dashboard: dashboardFixture, balances: dashboardFixture.balances, budget: budgetFixture, expenses: expensesFixture, goals: goalsFixture, calendar: calendarFixture, loading: hooks.loading, error: hooks.error, refreshAll: vi.fn(), setBudget: vi.fn(), registerExpense: vi.fn(), settleBalance: vi.fn() };
} }));
vi.mock("./useWorkspaceExpenseHistory", () => ({ useWorkspaceExpenseHistory: () => ({ expenses: expensesFixture, loaded: true, loading: false, error: null, refresh: vi.fn() }) }));
vi.mock("../application/useWorkspaces", () => ({ useWorkspaces: () => ({ workspaces: [{ ...workspaceFixture, role: "Owner" }], pendingInvitations: [], loading: false, error: null }) }));
vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <div>{children}{footer}</div> }));
const http = { getUserId: () => "viewer" } as IHttpClient;

describe("Workspace shell navigation", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; hooks.error = null; hooks.loading = false; vi.clearAllMocks(); });
  it("renders identity, all eight sections, period selection and a return action", () => {
    const html = renderToStaticMarkup(<WorkspaceShellView http={http} workspace={workspaceFixture} onBack={vi.fn()} />);
    for (const text of ["Casa de prueba", "Pareja", "Dashboard", "Presupuesto", "Movimientos", "Balances", "Metas", "Calendario", "Reportes", "Configuración", "Mes y año", "Volver a Mis Espacios"]) expect(html).toContain(text);
  });
  it("switches views, scopes the service by period, opens workspace modals and returns to the hub", () => {
    const onBack = vi.fn();
    const render = () => { hooks.cursor = 0; return WorkspaceShellView({ http, workspace: workspaceFixture, onBack }); };
    const click = (label: string) => (viewNodes(render()).find((node) => node.type === Button && (node.props.children === label || (Array.isArray(node.props.children) && node.props.children.includes(label))))!.props.onClick as () => void)();
    expect(viewNodes(render()).some((node) => node.type === WorkspaceDashboardView)).toBe(true);
    click("Presupuesto");
    const budgetView = viewNodes(render()).find((node) => node.type === WorkspaceBudgetsView)!;
    (budgetView.props.onConfigureBudget as () => void)();
    expect(viewNodes(render()).some((node) => node.type === ConfigureWorkspaceBudgetModal)).toBe(true);
    click("Movimientos");
    const movements = viewNodes(render()).find((node) => node.type === WorkspaceMovementsView)!;
    (movements.props.onRegisterExpense as () => void)();
    expect(viewNodes(render()).some((node) => node.type === RegisterWorkspaceExpenseModal)).toBe(true);
    click("Balances");
    expect(viewNodes(render()).some((node) => node.type === WorkspaceBalancesView)).toBe(true);
    const field = viewNodes(render()).find((node) => node.type === FormFieldForTest)!;
    const control = (field.props.children as (props: object) => React.ReactElement)({});
    expect(control.type).toBe(Input);
    (control.props as { onChange: (event: unknown) => void }).onChange({ target: { value: "2026-09" } });
    render();
    expect(hooks.detailsHook).toHaveBeenLastCalledWith(http, "home", { year: 2026, month: 9 });
    expect(viewNodes(render()).some((node) => node.type === RegisterWorkspaceExpenseModal || node.type === ConfigureWorkspaceBudgetModal)).toBe(false);
    click("Volver a Mis Espacios");
    expect(onBack).toHaveBeenCalledOnce();
  });
  it("wires goals, contributions, calendar, reports and settings to their tabs and scopes modals", () => {
    const render = () => { hooks.cursor = 0; return WorkspaceShellView({ http, workspace: workspaceFixture, onBack: vi.fn() }); };
    const choose = (label: string) => (viewNodes(render()).find((node) => node.type === Button && Array.isArray(node.props.children) && node.props.children.includes(label))!.props.onClick as () => void)();
    choose("Metas");
    let nodes = viewNodes(render());
    const goals = nodes.find((node) => node.type === WorkspaceGoalsView)!;
    (goals.props.onCreate as () => void)();
    (goals.props.onContribute as (goal: unknown) => void)(goalsFixture[0]);
    nodes = viewNodes(render());
    expect(nodes.some((node) => node.type === CreateSharedGoalModal)).toBe(true);
    expect(nodes.find((node) => node.type === ContributeSharedGoalModal)!.props.goal).toBe(goalsFixture[0]);
    choose("Calendario");
    const calendar = viewNodes(render()).find((node) => node.type === WorkspaceCalendarView)!;
    (calendar.props.onCreate as () => void)();
    expect(viewNodes(render()).some((node) => node.type === CreateSharedEventModal)).toBe(true);
    (calendar.props.onPeriodChange as (value: string) => void)("2026-09");
    expect(viewNodes(render()).some((node) => [CreateSharedGoalModal, ContributeSharedGoalModal, CreateSharedEventModal].includes(node.type as typeof CreateSharedGoalModal))).toBe(false);
    choose("Reportes");
    expect(viewNodes(render()).some((node) => node.type === WorkspaceReportsView)).toBe(true);
    choose("Configuración");
    hooks.error = "financial service failed";
    expect(viewNodes(render()).some((node) => node.type === WorkspaceSettingsView)).toBe(true);
  });
  it("does not display stale financial data when refreshing fails", () => {
    hooks.error = "failed";
    const html = renderToStaticMarkup(<WorkspaceShellView http={http} workspace={workspaceFixture} onBack={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reintentar");
    expect(html).not.toContain("Bs 875,00");
  });
  it("submits budget limits once, preserving the selected period and currency", async () => {
    const setBudget = vi.fn().mockResolvedValue(budgetFixture);
    const onClose = vi.fn();
    const render = () => { hooks.cursor = 0; return ConfigureWorkspaceBudgetModal({ budget: budgetFixture, year: 2026, month: 10, currency: "BOB", onClose, setBudget }); };
    const form = viewNodes(render()).find((node) => node.type === "form" && node.props.id === "workspace-budget")!;
    const submit = form.props.onSubmit as (event: unknown) => Promise<void>;
    await Promise.all([submit({ preventDefault: vi.fn() }), submit({ preventDefault: vi.fn() })]);
    expect(setBudget).toHaveBeenCalledExactlyOnceWith({ year: 2026, month: 10, currency: "BOB", amount: 1000, categories: [{ categoryId: "food", limitAmount: 750 }] });
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("retains an uncertain budget save and prevents blind retries after a service failure", async () => {
    const setBudget = vi.fn().mockRejectedValue(new Error("refresh failed"));
    const onClose = vi.fn();
    const render = () => { hooks.cursor = 0; return ConfigureWorkspaceBudgetModal({ budget: budgetFixture, year: 2026, month: 10, currency: "BOB", onClose, setBudget }); };
    const submit = () => (viewNodes(render()).find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    await submit();
    expect(renderToStaticMarkup(render())).toContain("Cierra y actualiza los datos");
    await submit();
    expect(setBudget).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });
  it("routes the chosen hub card through the workspace callback only with confirmed context", () => {
    const onOpenWorkspace = vi.fn();
    const tree = SharedWorkspacesHubView({ http, onOpenWorkspace });
    const card = viewNodes(tree).find((node) => node.type === WorkspaceHubCard)!;
    (card.props.onOpen as (id: string, tab: string) => void)("home", "dashboard");
    (card.props.onOpen as (id: string, tab: string) => void)("home", "balances");
    expect(onOpenWorkspace.mock.calls).toEqual([["home", "dashboard"], ["home", "balances"]]);

    const withoutSource = vi.fn();
    const unreadyTree = SharedWorkspacesHubView({ http: null, onOpenWorkspace: withoutSource });
    const unreadyCard = viewNodes(unreadyTree).find((node) => node.type === WorkspaceHubCard)!;
    (unreadyCard.props.onOpen as (id: string, tab: string) => void)("home", "dashboard");
    (unreadyCard.props.onOpen as (id: string, tab: string) => void)("home", "balances");
    expect(withoutSource).not.toHaveBeenCalled();
  });
});
