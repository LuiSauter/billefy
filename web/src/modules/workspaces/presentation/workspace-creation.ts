import Decimal from "decimal.js";
import type { CreateWorkspaceRequest, IWorkspacesRepository, SplitRuleType, WorkspaceSettings, WorkspaceType } from "../domain/workspaces.types";
import { validWorkspaceDate } from "./workspace-expense";

export const workspaceTypes: { value: WorkspaceType; label: string }[] = [
  { value: "Couple", label: "Pareja" }, { value: "Roommates", label: "Roommates" },
  { value: "Trip", label: "Viaje" }, { value: "Friends", label: "Amigos" }, { value: "Other", label: "Otro" },
];
export const splitRules: { value: SplitRuleType; label: string; description: string }[] = [
  { value: "EqualParts", label: "50/50", description: "Aportes iguales entre todos" },
  { value: "IncomeProportional", label: "Proporcional a ingresos", description: "Porcentajes manuales acordados según ingresos" },
  { value: "CustomPercentage", label: "Porcentaje personalizado", description: "Define el porcentaje de cada integrante" },
  { value: "ByResponsibility", label: "Por responsabilidad", description: "Cada uno cubre categorías específicas" },
];
export interface PlannedShare { incomeSharePercentage: string; customSharePercentage: string; responsibilityWeight: string; }
export interface WorkspaceDraft {
  name: string; description: string; workspaceType: WorkspaceType; baseCurrency: string; icon: string; color: string; startDate: string;
  isActive: boolean; settings: WorkspaceSettings; emails: string[]; inviteEmail: string; splitRule: SplitRuleType;
  ownerIncomeSharePercentage: string; ownerCustomSharePercentage: string; ownerResponsibilityWeight: string;
  invitationShares: Record<string, Partial<PlannedShare>>; invitationRoles: Record<string, "Member" | "Admin">; budget: string; categories: string[];
}
export function localCalendarDate(date = new Date()): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function createWorkspaceDraft(): WorkspaceDraft {
  return {
    name: "", description: "", workspaceType: "Couple", baseCurrency: "BOB", icon: "home", color: "violet", startDate: localCalendarDate(), isActive: true,
    settings: { hidePersonalPatrimony: true, memberSeesOnlyShared: true, showIndividualContributions: true, allowMovementComments: true, paymentReminders: true, weeklySummary: true, spaceNotifications: true },
    emails: [], inviteEmail: "", splitRule: "EqualParts", ownerIncomeSharePercentage: "", ownerCustomSharePercentage: "", ownerResponsibilityWeight: "1",
    invitationShares: {}, invitationRoles: {}, budget: "", categories: ["Alquiler", "Alimentación", "Servicios", "Transporte", "Ocio"],
  };
}
export const isInviteEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const emailsFor = (draft: WorkspaceDraft) => [...new Set([...draft.emails, ...(draft.inviteEmail.trim() ? [draft.inviteEmail] : [])].map((email) => email.trim().toLowerCase()).filter(Boolean))];
const decimalInput = (value: string, max: Decimal.Value) => /^\d+(\.\d{1,6})?$/.test(value) && new Decimal(value).lte(max);
function plannedShares(draft: WorkspaceDraft) {
  const emails = emailsFor(draft);
  const equalShare = emails.length ? new Decimal(100).div(emails.length + 1).toDecimalPlaces(6, Decimal.ROUND_DOWN) : new Decimal(100);
  const defaultOwner = new Decimal(100).minus(equalShare.times(emails.length));
  const owner = {
    incomeSharePercentage: draft.ownerIncomeSharePercentage || defaultOwner.toString(),
    customSharePercentage: draft.ownerCustomSharePercentage || defaultOwner.toString(),
    responsibilityWeight: draft.ownerResponsibilityWeight,
  };
  const distribute = (ownerValue: string, index: number) => {
    const safeOwner = decimalInput(ownerValue, 100) ? new Decimal(ownerValue) : defaultOwner;
    const remainder = new Decimal(100).minus(safeOwner);
    const each = emails.length ? remainder.div(emails.length).toDecimalPlaces(6, Decimal.ROUND_DOWN) : new Decimal(0);
    return (index === emails.length - 1 ? remainder.minus(each.times(emails.length - 1)) : each).toString();
  };
  const invites = emails.map((email, index) => {
    const existing = draft.invitationShares[email] ?? {};
    return { email, incomeSharePercentage: existing.incomeSharePercentage ?? distribute(owner.incomeSharePercentage, index),
      customSharePercentage: existing.customSharePercentage ?? distribute(owner.customSharePercentage, index), responsibilityWeight: existing.responsibilityWeight ?? "1" };
  });
  return { owner, invites };
}
export function validateWorkspaceDraft(draft: WorkspaceDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 120) return "Escribe un nombre de hasta 120 caracteres.";
  if (draft.description.length > 200) return "La descripción debe tener como máximo 200 caracteres.";
  if (!validWorkspaceDate(draft.startDate)) return "Selecciona una fecha de inicio válida.";
  if (Object.entries(draft.invitationRoles ?? {}).some(([email, role]) => !isInviteEmail(email) || (role !== "Member" && role !== "Admin"))) return "Revisa los roles de las invitaciones.";
  if ([...draft.emails, ...(draft.inviteEmail.trim() ? [draft.inviteEmail] : [])].some((email) => !isInviteEmail(email))) return "Revisa el correo de cada invitación.";
  if (draft.budget && (!/^\d+(\.\d{1,2})?$/.test(draft.budget) || new Decimal(draft.budget).lte(0) || new Decimal(draft.budget).gt("99999999999999.99"))) return "El presupuesto debe ser un importe positivo válido.";
  const shares = plannedShares(draft);
  const all = [shares.owner, ...shares.invites];
  if (all.some((share) => !decimalInput(share.incomeSharePercentage, 100) || !decimalInput(share.customSharePercentage, 100) ||
      !decimalInput(share.responsibilityWeight, "99999999999999.999999"))) return "Los porcentajes y pesos deben estar dentro de los límites y usar como máximo 6 decimales.";
  const selectedPercentages = draft.splitRule === "IncomeProportional" ? all.map((share) => share.incomeSharePercentage)
    : draft.splitRule === "CustomPercentage" ? all.map((share) => share.customSharePercentage) : [];
  if (selectedPercentages.length && !Decimal.sum(...selectedPercentages).eq(100)) return "Los porcentajes de cada integrante deben sumar exactamente 100%.";
  if (draft.splitRule === "ByResponsibility" && !Decimal.sum(...all.map((share) => share.responsibilityWeight)).gt(0)) return "Los pesos de responsabilidad deben sumar más de cero.";
  return null;
}
export function workspaceContributionPreview(draft: WorkspaceDraft) {
  const shares = plannedShares(draft);
  const chosen = draft.splitRule === "IncomeProportional" ? "incomeSharePercentage" : "customSharePercentage";
  if (draft.splitRule === "ByResponsibility") return [
    { label: "Tú", percentage: shares.owner.responsibilityWeight },
    ...shares.invites.map((share) => ({ label: share.email, percentage: share.responsibilityWeight })),
  ];
  return [{ label: "Tú", percentage: shares.owner[chosen] }, ...shares.invites.map((share) => ({ label: share.email, percentage: share[chosen] }))];
}
export interface WorkspaceCreationServices {
  createWorkspace: (request: CreateWorkspaceRequest) => Promise<{ id: string }>;
  updateSettings: IWorkspacesRepository["updateSettings"];
  inviteMember: IWorkspacesRepository["inviteMember"];
  getSplitConfiguration: IWorkspacesRepository["getSplitConfiguration"];
  getWorkspace: IWorkspacesRepository["getWorkspace"];
  updateSplitConfiguration: IWorkspacesRepository["updateSplitConfiguration"];
  setBudget: IWorkspacesRepository["setBudget"];
  deactivateWorkspace: IWorkspacesRepository["deactivateWorkspace"];
}
export interface CreationCheckpoint { id: string; settings: boolean; invited: { email: string; id: string }[]; splitConfiguration: boolean; budget: boolean; deactivated: boolean; }

/** Resume each committed creation step independently; IDs are captured before any later request. */
export async function saveWorkspaceDraft(draft: WorkspaceDraft, services: WorkspaceCreationServices, previous: CreationCheckpoint | null, remember: (checkpoint: CreationCheckpoint) => void, onFirstCheckpoint?: () => void) {
  const error = validateWorkspaceDraft(draft);
  if (error) throw new Error(error);
  let checkpoint = previous;
  if (!checkpoint) {
    const created = await services.createWorkspace({ name: draft.name.trim(), description: draft.description.trim() || null,
      workspaceType: draft.workspaceType, baseCurrency: draft.baseCurrency, icon: draft.icon, color: draft.color, defaultSplitRule: draft.splitRule, startDate: draft.startDate });
    checkpoint = { id: created.id, settings: false, invited: [], splitConfiguration: false, budget: false, deactivated: false };
    remember(checkpoint);
    onFirstCheckpoint?.();
  }
  const advance = (patch: Partial<CreationCheckpoint>) => { checkpoint = { ...checkpoint!, ...patch }; remember(checkpoint); };
  const id = checkpoint.id;
  if (!checkpoint.settings) { await services.updateSettings(id, draft.settings); advance({ settings: true }); }
  const shares = plannedShares(draft);
  for (const share of shares.invites) {
    if (!checkpoint.invited.some((invite) => invite.email === share.email)) {
      const role = draft.invitationRoles[share.email] ?? "Member";
      if (role !== "Member" && role !== "Admin") throw new Error("El rol de invitación no es válido.");
      const invitation = await services.inviteMember(id, { email: share.email, workspaceRole: role,
        plannedIncomeSharePercentage: Number(share.incomeSharePercentage), plannedCustomSharePercentage: Number(share.customSharePercentage), plannedResponsibilityWeight: Number(share.responsibilityWeight) });
      advance({ invited: [...checkpoint.invited, { email: share.email, id: invitation.id }] });
    }
  }
  if (!checkpoint.splitConfiguration) {
    const latest = await services.getSplitConfiguration(id);
    const details = await services.getWorkspace(id);
    const activeDetails = details.members.filter((member) => member.isActive);
    const owners = activeDetails.filter((member) => member.userId === details.createdBy && member.workspaceRole === "Owner");
    const ownerRoles = activeDetails.filter((member) => member.workspaceRole === "Owner");
    if (owners.length !== 1 || ownerRoles.length !== 1 ||
        activeDetails.filter((member) => member.userId === details.createdBy).length !== 1 || details.id !== id ||
        latest.activeMembers.length !== activeDetails.length ||
        activeDetails.some((member) => latest.activeMembers.filter((configured) => configured.memberId === member.id).length !== 1)) {
      throw new Error("No se pudo identificar de forma segura al propietario y la lista activa del espacio. Reintenta para actualizar los datos.");
    }
    const ownerMemberId = owners[0].id;
    const ownerConfiguration = latest.activeMembers.filter((member) => member.memberId === ownerMemberId);
    if (ownerConfiguration.length !== 1) {
      throw new Error("No se pudo identificar de forma segura al propietario activo. Reintenta para actualizar los datos.");
    }
    const owner = shares.owner;
    const activeMembers = latest.activeMembers.map((member) => member.memberId === ownerMemberId ? {
      ...member, incomeSharePercentage: Number(owner.incomeSharePercentage), customSharePercentage: Number(owner.customSharePercentage), responsibilityWeight: Number(owner.responsibilityWeight),
    } : member);
    const pendingInvitations = latest.pendingInvitations.map((invitation) => {
      const planned = checkpoint!.invited.some((saved) => saved.id === invitation.invitationId)
        ? shares.invites.find((share) => share.email === invitation.email.trim().toLowerCase()) : undefined;
      return planned ? { invitationId: invitation.invitationId, incomeSharePercentage: Number(planned.incomeSharePercentage),
        customSharePercentage: Number(planned.customSharePercentage), responsibilityWeight: Number(planned.responsibilityWeight) } : {
        invitationId: invitation.invitationId, incomeSharePercentage: invitation.incomeSharePercentage,
        customSharePercentage: invitation.customSharePercentage, responsibilityWeight: invitation.responsibilityWeight,
      };
    });
    await services.updateSplitConfiguration(id, { defaultSplitRule: draft.splitRule, activeMembers, pendingInvitations });
    advance({ splitConfiguration: true });
  }
  if (draft.budget && !checkpoint.budget) {
    const now = new Date();
    await services.setBudget(id, { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, amount: new Decimal(draft.budget).toNumber(), currency: draft.baseCurrency, categories: [] });
    advance({ budget: true });
  }
  if (!draft.isActive && !checkpoint.deactivated) { await services.deactivateWorkspace(id); advance({ deactivated: true }); }
  return id;
}
