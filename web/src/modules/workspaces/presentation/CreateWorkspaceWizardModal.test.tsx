import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceWizardModal, WorkspaceWizardStep } from "./CreateWorkspaceWizardModal";
import { createWorkspaceDraft, validateWorkspaceDraft, saveWorkspaceDraft, workspaceContributionPreview, type CreationCheckpoint } from "./workspace-creation";

// The existing Vitest runner is Node-only. Exercise component event handlers
// with state slots, while keeping real design-system components for markup tests.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial;
      return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
    },
    useRef: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
      return hooks.slots[index];
    },
  };
});

vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ open, children, footer }: { open: boolean; children: React.ReactNode; footer: React.ReactNode }) => open ? <div>{children}{footer}</div> : null,
}));

function services() {
  return {
    createWorkspace: vi.fn().mockResolvedValue({ id: "created" }),
    updateSettings: vi.fn().mockResolvedValue(undefined),
    inviteMember: vi.fn().mockResolvedValue({ id: "invitation" }),
    getSplitConfiguration: vi.fn().mockResolvedValue({ defaultSplitRule: "EqualParts", effectiveSplitRule: "EqualParts", isSplitConfigurationReady: true,
      activeMembers: [{ memberId: "owner", incomeSharePercentage: 100, customSharePercentage: 100, responsibilityWeight: 1 }],
      pendingInvitations: [{ invitationId: "invitation", email: "member@example.test", incomeSharePercentage: 0, customSharePercentage: 0, responsibilityWeight: 1 }] }),
    updateSplitConfiguration: vi.fn().mockResolvedValue({}),
    getWorkspace: vi.fn().mockResolvedValue({ id: "created", createdBy: "owner-user", members: [{ id: "owner", userId: "owner-user", workspaceRole: "Owner", incomeSharePercentage: 100, joinedAt: "2026-01-01", isActive: true }] }),
    setBudget: vi.fn().mockResolvedValue({}),
    deactivateWorkspace: vi.fn().mockResolvedValue(undefined),
  };
}

type Element = React.ReactElement<Record<string, unknown>>;
function elements(tree: React.ReactNode): Element[] {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!React.isValidElement(tree)) return [];
  const node = tree as Element;
  return [node, ...elements(node.props.children as React.ReactNode), ...elements(node.props.footer as React.ReactNode)];
}
function wizardHarness(api = services()) {
  const props = { open: true, onOpenChange: vi.fn(), onCreated: vi.fn(), services: api };
  const render = () => { hooks.cursor = 0; return CreateWorkspaceWizardModal(props); };
  const submit = async () => {
    const form = elements(render()).find((node) => node.type === "form")!;
    await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() });
  };
  const fill = async () => {
    const step = elements(render()).find((node) => node.type === WorkspaceWizardStep)!;
    (step.props.onChange as (patch: { name: string }) => void)({ name: "Casa" });
    await submit(); await submit(); await submit();
  };
  return { props, render, submit, fill };
}

describe("CreateWorkspaceWizardModal", () => {
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  it("renders four steps, live summary and accessible basic fields", () => {
    const html = renderToStaticMarkup(<CreateWorkspaceWizardModal open onOpenChange={vi.fn()} services={services()} onCreated={vi.fn()} />);
    for (const label of ["Información básica", "Integrantes", "Reglas y aportes", "Confirmación", "Nombre del espacio", "Tipo de espacio", "Moneda base", "Descripción", "Resumen del espacio", "Vista previa", "Sugerencias", "Cancelar"]) expect(html).toContain(label);
    expect(html).not.toContain("Luis Gabriel");
  });

  it("renders privacy, invitation, rule and permissions panels", () => {
    const draft = createWorkspaceDraft();
    const renderStep = (step: number) => renderToStaticMarkup(<WorkspaceWizardStep step={step} draft={draft} onChange={vi.fn()} />);
    expect(renderStep(1)).toContain("Ocultar patrimonio personal");
    expect(renderStep(1)).toContain("Invitar por correo");
    expect(renderStep(2)).toContain("Por responsabilidad");
    expect(renderStep(2)).not.toContain("Tu porcentaje de aporte");
    expect(renderStep(2)).toContain("Tú · propietario activo");
    expect(renderStep(2)).toContain("no se comparten ni se consultan ingresos personales");
    expect(renderStep(2)).toContain("la distribución efectiva puede ser partes iguales");
    expect(renderStep(2)).toContain("Presupuesto mensual");
    expect(renderStep(3)).toContain("Permisos del espacio");
  });

  it("rejects blank names, invalid emails, budgets and invalid percentages before writing", async () => {
    const draft = createWorkspaceDraft();
    const api = services();
    await expect(saveWorkspaceDraft(draft, api, null, () => {})).rejects.toThrow("nombre");
    expect(api.createWorkspace).not.toHaveBeenCalled();
    draft.name = "Hogar";
    draft.inviteEmail = "not-an-email";
    expect(validateWorkspaceDraft(draft)).toContain("correo");
    draft.inviteEmail = "";
    draft.budget = "-1";
    expect(validateWorkspaceDraft(draft)).toContain("presupuesto");
    draft.budget = "";
    draft.splitRule = "CustomPercentage";
    draft.ownerCustomSharePercentage = "101";
    expect(validateWorkspaceDraft(draft)).toContain("porcentaje");
  });

  it("creates a real workspace then persists privacy, invitations, budget and inactive status", async () => {
    const api = services();
    const draft = { ...createWorkspaceDraft(), name: " Nuestro hogar ", emails: ["member@example.test"], budget: "4000.25", isActive: false };
    const checkpoints: unknown[] = [];
    await saveWorkspaceDraft(draft, api, null, (checkpoint) => checkpoints.push(checkpoint));
    expect(api.createWorkspace).toHaveBeenCalledWith(expect.objectContaining({ name: "Nuestro hogar", workspaceType: "Couple", baseCurrency: "BOB", defaultSplitRule: "EqualParts" }));
    expect(api.updateSettings).toHaveBeenCalledWith("created", expect.objectContaining({ hidePersonalPatrimony: true, memberSeesOnlyShared: true }));
    expect(api.inviteMember).toHaveBeenCalledWith("created", expect.objectContaining({ email: "member@example.test", workspaceRole: "Member" }));
    expect(api.getSplitConfiguration).toHaveBeenCalledWith("created");
    expect(api.updateSplitConfiguration).toHaveBeenCalledWith("created", expect.objectContaining({ defaultSplitRule: "EqualParts", activeMembers: [{ memberId: "owner", incomeSharePercentage: 50, customSharePercentage: 50, responsibilityWeight: 1 }], pendingInvitations: [expect.objectContaining({ invitationId: "invitation" })] }));
    expect(api.setBudget).toHaveBeenCalledWith("created", expect.objectContaining({ amount: 4000.25, currency: "BOB", categories: [] }));
    expect(api.deactivateWorkspace).toHaveBeenCalledWith("created");
    expect(checkpoints.length).toBeGreaterThan(1);
  });

  it("targets the authoritative owner when an accepted invite is first in active-member order", async () => {
    const api = services();
    api.getSplitConfiguration.mockResolvedValue({ defaultSplitRule: "IncomeProportional", effectiveSplitRule: "IncomeProportional", isSplitConfigurationReady: true,
      activeMembers: [
        { memberId: "invitee-member", incomeSharePercentage: 40, customSharePercentage: 25, responsibilityWeight: 2 },
        { memberId: "owner-member", incomeSharePercentage: 60, customSharePercentage: 75, responsibilityWeight: 3 },
      ], pendingInvitations: [] });
    api.getWorkspace.mockResolvedValue({ id: "created", createdBy: "owner-user", members: [
      { id: "owner-member", userId: "owner-user", workspaceRole: "Owner", incomeSharePercentage: 60, joinedAt: "2026-01-01", isActive: true },
      { id: "invitee-member", userId: "invitee-user", workspaceRole: "Member", incomeSharePercentage: 40, joinedAt: "2026-01-01", isActive: true },
    ] });
    const draft = { ...createWorkspaceDraft(), name: "Casa", emails: ["member@example.test"], splitRule: "IncomeProportional" as const,
      ownerIncomeSharePercentage: "60", invitationShares: { "member@example.test": { incomeSharePercentage: "40" } } };
    await saveWorkspaceDraft(draft, api, { id: "created", settings: true, invited: [{ email: "member@example.test", id: "invitation" }], splitConfiguration: false, budget: false, deactivated: false }, () => {});
    expect(api.getWorkspace).toHaveBeenCalledWith("created");
    expect(api.updateSplitConfiguration).toHaveBeenCalledWith("created", expect.objectContaining({ activeMembers: [
      { memberId: "invitee-member", incomeSharePercentage: 40, customSharePercentage: 25, responsibilityWeight: 2 },
      { memberId: "owner-member", incomeSharePercentage: 60, customSharePercentage: 50, responsibilityWeight: 1 },
    ] }));
    expect(api.createWorkspace).not.toHaveBeenCalled();
    expect(api.inviteMember).not.toHaveBeenCalled();
  });

  it.each(["missing", "ambiguous"] as const)("fails closed for %s owner identity and retries without duplicate POSTs", async (identity) => {
    const api = services();
    api.getSplitConfiguration.mockResolvedValue({ defaultSplitRule: "EqualParts", effectiveSplitRule: "EqualParts", isSplitConfigurationReady: true,
      activeMembers: [{ memberId: "someone-else", incomeSharePercentage: 100, customSharePercentage: 100, responsibilityWeight: 1 }], pendingInvitations: [] });
    api.getWorkspace.mockResolvedValue({ id: "created", createdBy: "owner-user", members: identity === "missing" ? [] : [
      { id: "owner-one", userId: "owner-user", workspaceRole: "Owner", incomeSharePercentage: 50, joinedAt: "2026-01-01", isActive: true },
      { id: "owner-two", userId: "other-user", workspaceRole: "Owner", incomeSharePercentage: 50, joinedAt: "2026-01-01", isActive: true },
    ] });
    const draft = { ...createWorkspaceDraft(), name: "Casa", emails: ["member@example.test"] };
    let checkpoint: CreationCheckpoint | null = null;
    const remember = (value: CreationCheckpoint) => { checkpoint = value; };
    await expect(saveWorkspaceDraft(draft, api, null, remember)).rejects.toThrow("No se pudo identificar");
    expect(checkpoint).toMatchObject({ id: "created", invited: [{ email: "member@example.test", id: "invitation" }], splitConfiguration: false });
    await expect(saveWorkspaceDraft(draft, api, checkpoint, remember)).rejects.toThrow("No se pudo identificar");
    expect(api.updateSplitConfiguration).not.toHaveBeenCalled();
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    expect(api.inviteMember).toHaveBeenCalledTimes(1);
  });

  it("normalizes duplicate invites and omits optional budget writes", async () => {
    const api = services();
    const draft = { ...createWorkspaceDraft(), name: "Amigos", emails: ["MEMBER@example.test"], inviteEmail: " member@example.test " };
    await saveWorkspaceDraft(draft, api, null, () => {});
    expect(api.inviteMember).toHaveBeenCalledExactlyOnceWith("created", expect.objectContaining({ email: "member@example.test", workspaceRole: "Member" }));
    expect(api.setBudget).not.toHaveBeenCalled();
    expect(api.deactivateWorkspace).not.toHaveBeenCalled();
  });

  it("validates all persisted split rule vectors before remote creation", () => {
    const draft = { ...createWorkspaceDraft(), name: "Casa", emails: ["member@example.test"] };
    for (const splitRule of ["IncomeProportional", "CustomPercentage"] as const) {
      expect(validateWorkspaceDraft({ ...draft, splitRule, ownerIncomeSharePercentage: "40", ownerCustomSharePercentage: "40", invitationShares: { "member@example.test": { incomeSharePercentage: "40", customSharePercentage: "40" } } })).toBeTruthy();
    }
    expect(validateWorkspaceDraft(draft)).toBeNull();
    expect(validateWorkspaceDraft({ ...draft, ownerResponsibilityWeight: "-1" })).toBeTruthy();
    expect(validateWorkspaceDraft({ ...draft, splitRule: "ByResponsibility", ownerResponsibilityWeight: "0", invitationShares: { "member@example.test": { incomeSharePercentage: "0", customSharePercentage: "0", responsibilityWeight: "0" } } })).toBeTruthy();
  });

  it("shows exact preview distributions totaling 100 even for three participants", () => {
    const draft = { ...createWorkspaceDraft(), emails: ["first@example.test", "second@example.test"] };
    const preview = workspaceContributionPreview(draft);
    expect(preview.map((member) => member.percentage)).toEqual(["33.333334", "33.333333", "33.333333"]);
    expect(preview.reduce((sum, member) => sum.plus(member.percentage), new Decimal(0)).toString()).toBe("100");
    expect(workspaceContributionPreview({ ...draft, splitRule: "CustomPercentage", ownerCustomSharePercentage: "60" }).map((member) => member.percentage)).toEqual(["60", "20", "20"]);
    expect(workspaceContributionPreview({ ...draft, splitRule: "ByResponsibility" }).map((member) => member.percentage)).toEqual(["1", "1", "1"]);
  });

  it("blocks blind POST retries when creation may have succeeded but the hook reload failed", async () => {
    const api = services();
    api.createWorkspace.mockRejectedValue(new Error("reload failed"));
    const wizard = wizardHarness(api);
    await wizard.fill();
    await wizard.submit();
    await wizard.submit();
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    expect(wizard.props.onCreated).not.toHaveBeenCalled();
    const submitButton = elements(wizard.render()).find((node) => node.props.form === "create-workspace")!;
    expect(submitButton.props.disabled).toBe(true);
  });

  it("retains committed workspace and invitation IDs when list refresh fails, then retries only split configuration", async () => {
    const api = services();
    api.getSplitConfiguration.mockRejectedValueOnce(new Error("configuration offline"));
    const draft = { ...createWorkspaceDraft(), name: "Viaje", emails: ["member@example.test"] };
    let checkpoint: CreationCheckpoint | null = null;
    const remember = (value: CreationCheckpoint) => { checkpoint = value; };
    await expect(saveWorkspaceDraft(draft, api, null, remember)).rejects.toThrow("configuration offline");
    expect(checkpoint).toMatchObject({ id: "created", invited: [{ email: "member@example.test", id: "invitation" }], splitConfiguration: false });
    await saveWorkspaceDraft(draft, api, checkpoint, remember);
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    expect(api.inviteMember).toHaveBeenCalledTimes(1);
    expect(api.getSplitConfiguration).toHaveBeenCalledTimes(2);
  });

  it("retries split PUT failure without repeating successful create or invitation POSTs", async () => {
    const api = services();
    api.updateSplitConfiguration.mockRejectedValueOnce(new Error("configuration write failed"));
    const draft = { ...createWorkspaceDraft(), name: "Casa", emails: ["member@example.test"] };
    let checkpoint: CreationCheckpoint | null = null;
    const remember = (value: CreationCheckpoint) => { checkpoint = value; };
    await expect(saveWorkspaceDraft(draft, api, null, remember)).rejects.toThrow("configuration write failed");
    expect(checkpoint).toMatchObject({ invited: [{ email: "member@example.test", id: "invitation" }], splitConfiguration: false });
    await saveWorkspaceDraft(draft, api, checkpoint, remember);
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    expect(api.inviteMember).toHaveBeenCalledTimes(1);
    expect(api.updateSplitConfiguration).toHaveBeenCalledTimes(2);
  });

  it("retries failed setup from the confirmation screen without recreating the workspace", async () => {
    const api = services();
    api.updateSettings.mockRejectedValueOnce(new Error("offline"));
    const wizard = wizardHarness(api);
    await wizard.fill();
    await wizard.submit();
    expect(wizard.props.onCreated).not.toHaveBeenCalled();
    const lockedFieldset = elements(wizard.render()).find((node) => node.type === "fieldset" && node.props.disabled) ;
    expect(lockedFieldset).toBeTruthy();
    await wizard.submit();
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    expect(api.updateSettings).toHaveBeenCalledTimes(2);
    expect(wizard.props.onCreated).toHaveBeenCalledExactlyOnceWith("created");
    expect(wizard.props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("guards simultaneous submissions while a creation request is in flight", async () => {
    const api = services();
    let resolve!: (value: { id: string }) => void;
    api.createWorkspace.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const wizard = wizardHarness(api);
    await wizard.fill();
    const first = wizard.submit();
    await wizard.submit();
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    resolve({ id: "created" });
    await first;
    expect(wizard.props.onCreated).toHaveBeenCalledExactlyOnceWith("created");
  });

  it("resumes a partial setup without duplicating the workspace or successful invitations", async () => {
    const api = services();
    api.setBudget.mockRejectedValueOnce(new Error("offline"));
    const draft = { ...createWorkspaceDraft(), name: "Viaje", emails: ["member@example.test"], budget: "100" };
    let checkpoint: CreationCheckpoint | null = null;
    const remember = (value: CreationCheckpoint) => { checkpoint = value; };
    await expect(saveWorkspaceDraft(draft, api, checkpoint, remember)).rejects.toThrow("offline");
    await saveWorkspaceDraft(draft, api, checkpoint, remember);
    expect(api.createWorkspace).toHaveBeenCalledTimes(1);
    expect(api.inviteMember).toHaveBeenCalledTimes(1);
    expect(api.updateSplitConfiguration).toHaveBeenCalledTimes(1);
    expect(api.setBudget).toHaveBeenCalledTimes(2);
  });
});
