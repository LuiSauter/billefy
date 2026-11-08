import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WorkspaceGoalsView } from "./WorkspaceGoalsView";
import { buildSharedGoalRequest, buildGoalContributionRequest, goalContributionTotals } from "./workspace-goals";
import { Button } from "@/shared/ui/button";
import { goalsFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

describe("WorkspaceGoalsView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  const props = () => ({ workspace: workspaceFixture, goals: goalsFixture, calendar: [], viewerUserId: "viewer", onCreate: vi.fn(), onContribute: vi.fn() });
  it("renders real goal metrics, contributions and empty scheduled payments", () => {
    const html = renderToStaticMarkup(<WorkspaceGoalsView {...props()} />);
    for (const text of ["Metas activas", "Ahorro total", "Meta más cercana", "Progreso promedio", "60%", "Viaje de prueba", "Aportes por integrante", "Distribución de metas", "Próximos aportes", "Sin aportes programados", "Consejos para sus metas compartidas"]) expect(html).toContain(text);
    expect(html).not.toContain("NaN");
  });
  it("opens create and contribute actions and protects permissions/privacy", () => {
    const input = props();
    const buttons = viewNodes(WorkspaceGoalsView(input)).filter((node) => node.type === Button);
    (buttons.find((node) => node.props["aria-label"] === "Nueva meta compartida")!.props.onClick as () => void)();
    (buttons.find((node) => node.props.children === "Aportar")!.props.onClick as () => void)();
    expect(input.onCreate).toHaveBeenCalledOnce();
    expect(input.onContribute).toHaveBeenCalledWith(goalsFixture[0]);
    const workspace = { ...workspaceFixture, settings: { ...workspaceFixture.settings, showIndividualContributions: false } };
    const html = renderToStaticMarkup(<WorkspaceGoalsView {...input} workspace={workspace} viewerUserId="other" goals={[]} />);
    expect(html).toContain("Sin metas compartidas");
    expect(html).toContain("Las aportaciones individuales están ocultas");
    expect(viewNodes(WorkspaceGoalsView({ ...input, viewerUserId: "other" })).find((node) => node.props["aria-label"] === "Nueva meta compartida")!.props.disabled).toBe(true);
  });
  it("validates decimal amounts, optional zero commitment and actual member totals", () => {
    expect(buildSharedGoalRequest({ title: " Viaje ", targetAmount: "100.10", monthlyCommitmentAmount: "0", targetDate: "2028-02-29", category: "Viajes" }, "BOB")).toMatchObject({ title: "Viaje", targetAmount: 100.1, monthlyCommitmentAmount: 0 });
    for (const amount of ["0", "-1", "NaN", "0.001"]) expect(() => buildGoalContributionRequest(amount, "BOB")).toThrow();
    expect(buildGoalContributionRequest("0.10", "BOB")).toEqual({ amount: 0.1, currency: "BOB" });
    expect(() => buildSharedGoalRequest({ title: "X", targetAmount: "1", monthlyCommitmentAmount: "0", targetDate: "2026-02-30", category: "" }, "BOB")).toThrow();
    expect(goalContributionTotals(goalsFixture, "BOB").get("one")?.toString()).toBe("60");
  });
});
