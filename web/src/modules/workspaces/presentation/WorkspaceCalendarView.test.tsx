import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { SelectField } from "@/shared/ui/select-field";
import { WorkspaceCalendarView } from "./WorkspaceCalendarView";
import { buildSharedEventRequest, calendarMonthDays, filterCalendarEvents, shiftWorkspaceMonth } from "./workspace-calendar";
import { calendarFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = next; }];
  } };
});

describe("WorkspaceCalendarView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });
  it("renders a complete month, real responsible labels and summaries", () => {
    const html = renderToStaticMarkup(<WorkspaceCalendarView workspace={workspaceFixture} events={calendarFixture} year={2026} month={10} viewerUserId="viewer" onCreate={vi.fn()} onPeriodChange={vi.fn()} />);
    for (const text of ["Eventos del mes", "Pagos compartidos", "Aportes programados", "Cobros previstos", "Internet de prueba", "Integrante 2", "Próximos eventos", "Resumen del mes", "Filtros", "Consejo compartido"]) expect(html).toContain(text);
    expect(html).toContain("Bs 250,00");
  });
  it("navigates months, filters events, selects a day and opens creation", () => {
    const input = { workspace: workspaceFixture, events: calendarFixture, year: 2026, month: 10, viewerUserId: "viewer", onCreate: vi.fn(), onPeriodChange: vi.fn() };
    const render = () => { hooks.cursor = 0; return WorkspaceCalendarView(input); };
    const click = (label: string) => (viewNodes(render()).find((node) => node.type === Button && (node.props["aria-label"] === label || (Array.isArray(node.props.children) && node.props.children.includes(label))))!.props.onClick as () => void)();
    click("Mes anterior");
    expect(input.onPeriodChange).toHaveBeenCalledWith("2026-09");
    click("Mes siguiente");
    expect(input.onPeriodChange).toHaveBeenCalledWith("2026-11");
    click("Nuevo evento");
    expect(input.onCreate).toHaveBeenCalledOnce();
    click("Eventos del 2026-10-24");
    expect(renderToStaticMarkup(render())).toContain("Sin eventos pendientes el 2026-10-24");
    const select = viewNodes(render()).find((node) => node.type === SelectField)!;
    (select.props.onChange as (event: unknown) => void)({ target: { value: "Collection" } });
    const html = renderToStaticMarkup(render());
    expect(html).not.toContain("Internet de prueba");
    expect(html).toContain("Sin eventos para estos filtros");
  });
  it("handles leap years, Monday alignment and year transitions", () => {
    const days = calendarMonthDays(2028, 2);
    expect(days.filter((day) => day.inMonth)).toHaveLength(29);
    expect(days[0].date).toBe("2028-01-31");
    expect(days.length % 7).toBe(0);
    expect(shiftWorkspaceMonth(2026, 12, 1)).toBe("2027-01");
    expect(shiftWorkspaceMonth(2026, 1, -1)).toBe("2025-12");
  });
  it("filters by month, event type and responsible without fabricated shared assignments", () => {
    expect(filterCalendarEvents(calendarFixture, 2026, 10, "Payment", "two")).toHaveLength(1);
    expect(filterCalendarEvents(calendarFixture, 2026, 10, "Collection", "all")).toEqual([]);
    expect(filterCalendarEvents(calendarFixture, 2026, 11, "all", "all")).toEqual([]);
    const draft = { title: " Pago ", financialEventType: "Payment" as const, dueDate: "2026-10-25", amount: "0.10", responsibleMemberId: "two", notes: "" };
    expect(buildSharedEventRequest(draft, workspaceFixture)).toMatchObject({ title: "Pago", amount: 0.1, responsibleMemberId: "two", currency: "BOB" });
    for (const patch of [{ responsibleMemberId: "unknown" }, { dueDate: "2026-02-30" }, { amount: "-1" }, { title: "" }]) expect(() => buildSharedEventRequest({ ...draft, ...patch }, workspaceFixture)).toThrow();
  });
});
