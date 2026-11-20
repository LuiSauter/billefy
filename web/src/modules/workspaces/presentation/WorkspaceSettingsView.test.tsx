import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import type { IWorkspacesRepository } from "../domain/workspaces.types";
import { WorkspaceSettingsGeneral } from "./WorkspaceSettingsGeneral";
import { InviteWorkspaceMemberModal } from "./InviteWorkspaceMemberModal";
import { WorkspaceMemberActionModal } from "./WorkspaceMemberActionModal";
import { WorkspaceSettingsView } from "./WorkspaceSettingsView";
import { buildWorkspaceInfoRequest, canRemoveWorkspaceMember, workspacePermissions } from "./workspace-settings";
import { viewNodes, workspaceFixture } from "./workspace-view.fixtures";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
  }, useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  } };
});

describe("WorkspaceSettingsView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });
  it("renders all settings sections without inventing security or billing state", () => {
    const html = renderToStaticMarkup(<WorkspaceSettingsView workspace={workspaceFixture} viewerUserId="viewer" repository={null} onUpdated={vi.fn()} onDeactivated={vi.fn()} />);
    for (const text of ["General", "Integrantes", "Roles y permisos", "Plan y facturación", "Integraciones", "Automatizaciones", "Información del espacio", "Marca del espacio", "Recordatorios", "Resumen semanal", "Notificaciones", "Seguridad", "Sesiones activas", "No disponible en esta versión", "Zona de peligro", "desactiva"]) expect(html).toContain(text);
    expect(html).not.toContain("Plan Pro");
  });
  it("matches server permissions: admins manage members, only owners manage roles/admins", () => {
    const [owner, member] = workspaceFixture.members;
    const admin = { ...member, id: "admin", workspaceRole: "Admin" as const };
    expect(canRemoveWorkspaceMember(owner, owner)).toBe(false);
    expect(canRemoveWorkspaceMember(admin, member)).toBe(true);
    expect(canRemoveWorkspaceMember(admin, admin)).toBe(false);
    expect(canRemoveWorkspaceMember(owner, admin)).toBe(true);
    expect(canRemoveWorkspaceMember(member, admin)).toBe(false);
    expect(workspacePermissions.find((row) => row.label === "Cambiar roles")?.roles).toEqual(["Owner"]);
  });
  it("saves real information and switches while preserving all privacy settings", async () => {
    const repository = { updateWorkspace: vi.fn().mockResolvedValue(undefined), updateSettings: vi.fn().mockResolvedValue(undefined), getWorkspace: vi.fn().mockResolvedValue(workspaceFixture) };
    const onUpdated = vi.fn();
    const render = () => { hooks.cursor = 0; return WorkspaceSettingsGeneral({ workspace: workspaceFixture, repository: repository as unknown as IWorkspacesRepository, canManage: true, isOwner: true, onUpdated, onDeactivate: vi.fn() }); };
    const name = viewNodes(render()).find((node) => node.type === Input)!;
    (name.props.onChange as (event: unknown) => void)({ target: { value: " Casa nueva " } });
    const weekly = viewNodes(render()).find((node) => node.type === Switch && node.props.id === "workspace-weeklySummary")!;
    (weekly.props.onCheckedChange as (value: boolean) => void)(false);
    const submit = viewNodes(render()).find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>;
    await Promise.all([submit({ preventDefault: vi.fn() }), submit({ preventDefault: vi.fn() })]);
    expect(repository.updateWorkspace).toHaveBeenCalledExactlyOnceWith("home", { name: "Casa nueva", description: null, color: "violet", icon: "heart" });
    expect(repository.updateSettings).toHaveBeenCalledExactlyOnceWith("home", { ...workspaceFixture.settings, weeklySummary: false });
    expect(onUpdated).toHaveBeenCalledWith(workspaceFixture);
  });
  it("does not repeat a partially completed save until the server state is reloaded", async () => {
    const repository = { updateWorkspace: vi.fn().mockResolvedValue(undefined), updateSettings: vi.fn().mockRejectedValue(new Error("offline")), getWorkspace: vi.fn().mockResolvedValue(workspaceFixture) };
    const render = () => { hooks.cursor = 0; return WorkspaceSettingsGeneral({ workspace: workspaceFixture, repository: repository as unknown as IWorkspacesRepository, canManage: true, isOwner: true, onUpdated: vi.fn(), onDeactivate: vi.fn() }); };
    const submit = () => (viewNodes(render()).find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
    await submit();
    await submit();
    expect(repository.updateWorkspace).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(render())).toContain("No se pudo confirmar el guardado completo");
    const reload = viewNodes(render()).find((node) => node.type === Button && node.props.children === "Actualizar información")!;
    await (reload.props.onClick as () => Promise<void>)();
    expect(repository.getWorkspace).toHaveBeenCalledOnce();
  });
  it("invites and updates member roles through workspace-scoped services", async () => {
    const repository = { inviteMember: vi.fn().mockResolvedValue({}), updateMemberRole: vi.fn().mockResolvedValue(undefined), removeMember: vi.fn().mockResolvedValue(undefined), getWorkspace: vi.fn().mockResolvedValue(workspaceFixture) };
    const render = () => { hooks.cursor = 0; return WorkspaceSettingsView({ workspace: workspaceFixture, viewerUserId: "viewer", repository: repository as unknown as IWorkspacesRepository, onUpdated: vi.fn(), onDeactivated: vi.fn() }); };
    const click = (label: string) => (viewNodes(render()).find((node) => node.type === Button && (node.props.children === label || (Array.isArray(node.props.children) && node.props.children.includes(label))))!.props.onClick as () => void)();
    click("Integrantes");
    click("Invitar integrante");
    const invitation = viewNodes(render()).find((node) => node.type === InviteWorkspaceMemberModal)!;
    await (invitation.props.invite as (request: unknown) => Promise<void>)({ email: "member@example.test", workspaceRole: "Member" });
    expect(repository.inviteMember).toHaveBeenCalledWith("home", { email: "member@example.test", workspaceRole: "Member" });
    click("Cambiar rol");
    let action = viewNodes(render()).find((node) => node.type === WorkspaceMemberActionModal)!;
    await (action.props.apply as (role: string) => Promise<void>)("Admin");
    expect(repository.updateMemberRole).toHaveBeenCalledWith("home", "two", { workspaceRole: "Admin" });
    click("Retirar");
    action = viewNodes(render()).find((node) => node.type === WorkspaceMemberActionModal)!;
    await (action.props.apply as (role: string) => Promise<void>)("Member");
    expect(repository.removeMember).toHaveBeenCalledWith("home", "two");
    click("Plan y facturación");
    expect(renderToStaticMarkup(render())).toContain("No disponible en esta versión");
    click("Roles y permisos");
    expect(renderToStaticMarkup(render())).toContain("Cambiar roles");
  });
  it("validates edited information and preserves supported branding values", () => {
    expect(buildWorkspaceInfoRequest({ name: " Casa ", description: " Nota ", color: "violet", icon: "heart" })).toEqual({ name: "Casa", description: "Nota", color: "violet", icon: "heart" });
    expect(() => buildWorkspaceInfoRequest({ name: " ", description: "", color: "violet", icon: "heart" })).toThrow();
    expect(() => buildWorkspaceInfoRequest({ name: "Casa", description: "x".repeat(201), color: "violet", icon: "heart" })).toThrow();
  });
});
