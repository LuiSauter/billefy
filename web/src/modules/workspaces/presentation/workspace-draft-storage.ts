import { localCalendarDate, type WorkspaceDraft } from "./workspace-creation";
import { validWorkspaceDate } from "./workspace-expense";

export interface DraftStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
export interface StoredWorkspaceDraft { version: number; userId: string; draft: WorkspaceDraft; step: number; consumed?: string; }
const PREFIX = "billefy:workspace-create-draft";
const workspaceTypes = ["Couple", "Roommates", "Trip", "Friends", "Other"];
const splitRules = ["EqualParts", "IncomeProportional", "CustomPercentage", "ByResponsibility"];
const settingKeys = ["hidePersonalPatrimony", "memberSeesOnlyShared", "showIndividualContributions", "allowMovementComments", "paymentReminders", "weeklySummary", "spaceNotifications"] as const;
const shareKeys = ["incomeSharePercentage", "customSharePercentage", "responsibilityWeight"] as const;
const boundedString = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key));
function validDraft(value: unknown): value is WorkspaceDraft {
  if (!object(value)) return false;
  const d = value;
  const fields = ["name", "description", "workspaceType", "baseCurrency", "icon", "color", "startDate", "isActive", "settings", "emails", "inviteEmail", "splitRule", "ownerIncomeSharePercentage", "ownerCustomSharePercentage", "ownerResponsibilityWeight", "invitationShares", "invitationRoles", "budget", "categories"];
  if (!onlyKeys(d, fields)) return false;
  if (!boundedString(d.name, 120) || !boundedString(d.description, 200) || !boundedString(d.baseCurrency, 3) || !boundedString(d.icon, 40) || !boundedString(d.color, 40) || !boundedString(d.inviteEmail, 254) || !boundedString(d.budget, 64)) return false;
  if (!workspaceTypes.includes(d.workspaceType as string) || !splitRules.includes(d.splitRule as string) || typeof d.isActive !== "boolean") return false;
  if (d.startDate !== undefined && (typeof d.startDate !== "string" || (d.startDate !== "" && !validWorkspaceDate(d.startDate)))) return false;
  if (!Array.isArray(d.emails) || d.emails.length > 100 || !d.emails.every((e) => boundedString(e, 254)) || !Array.isArray(d.categories) || d.categories.length > 100 || !d.categories.every((e) => boundedString(e, 80))) return false;
  if (!boundedString(d.ownerIncomeSharePercentage, 64) || !boundedString(d.ownerCustomSharePercentage, 64) || !boundedString(d.ownerResponsibilityWeight, 64)) return false;
  const settings = d.settings;
  if (!object(settings) || !onlyKeys(settings, settingKeys) || settingKeys.some((key) => typeof settings[key] !== "boolean")) return false;
  if (!object(d.invitationShares) || Object.keys(d.invitationShares).length > 100) return false;
  for (const [email, share] of Object.entries(d.invitationShares)) if (!boundedString(email, 254) || !object(share) || !onlyKeys(share, shareKeys) || Object.values(share).some((v) => !boundedString(v, 64))) return false;
  if (d.invitationRoles !== undefined) {
    if (!object(d.invitationRoles) || Object.keys(d.invitationRoles).length > 100) return false;
    for (const [email, role] of Object.entries(d.invitationRoles)) if (!boundedString(email, 254) || (role !== "Member" && role !== "Admin")) return false;
  }
  return true;
}
const keyFor = (userId: string, version: number) => `${PREFIX}:v${version}:${encodeURIComponent(userId)}`;
export function getBrowserDraftStorage(): DraftStorage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
export function readWorkspaceDraft(storage: DraftStorage, userId: string, version: number): { draft: WorkspaceDraft | null; step: number; notice: string | null; consumedId?: string } {
  if (!userId) return { draft: null, step: 0, notice: null };
  try {
    const raw = storage.getItem(keyFor(userId, version));
    if (!raw) return { draft: null, step: 0, notice: null };
    const data: unknown = JSON.parse(raw);
    if (!object(data)) return { draft: null, step: 0, notice: "El borrador local no es válido y se ignoró." };
    if (data.version !== version || data.userId !== userId) return { draft: null, step: 0, notice: "El borrador local no es válido para esta cuenta y se ignoró." };
    if (data.consumed !== undefined) {
      if (!boundedString(data.consumed, 128) || !data.consumed) return { draft: null, step: 0, notice: "El borrador local no es válido para esta cuenta y se ignoró." };
      return { draft: null, step: 0, notice: "Este borrador corresponde a un espacio ya creado y se ignoró.", consumedId: data.consumed };
    }
    if (!validDraft(data.draft) || !Number.isInteger(data.step) || Number(data.step) < 0 || Number(data.step) > 3) return { draft: null, step: 0, notice: "El borrador local no es válido para esta cuenta y se ignoró." };
    const rawDraft = data.draft;
    const draft: WorkspaceDraft = { name: rawDraft.name, description: rawDraft.description, workspaceType: rawDraft.workspaceType, baseCurrency: rawDraft.baseCurrency, icon: rawDraft.icon, color: rawDraft.color, startDate: rawDraft.startDate ?? localCalendarDate(), isActive: rawDraft.isActive, settings: { hidePersonalPatrimony: rawDraft.settings.hidePersonalPatrimony, memberSeesOnlyShared: rawDraft.settings.memberSeesOnlyShared, showIndividualContributions: rawDraft.settings.showIndividualContributions, allowMovementComments: rawDraft.settings.allowMovementComments, paymentReminders: rawDraft.settings.paymentReminders, weeklySummary: rawDraft.settings.weeklySummary, spaceNotifications: rawDraft.settings.spaceNotifications }, emails: [...rawDraft.emails], inviteEmail: rawDraft.inviteEmail, splitRule: rawDraft.splitRule, ownerIncomeSharePercentage: rawDraft.ownerIncomeSharePercentage, ownerCustomSharePercentage: rawDraft.ownerCustomSharePercentage, ownerResponsibilityWeight: rawDraft.ownerResponsibilityWeight, invitationShares: Object.fromEntries(Object.entries(rawDraft.invitationShares).map(([email, share]) => [email, { ...share }])), invitationRoles: Object.fromEntries(Object.entries(rawDraft.invitationRoles ?? {})), budget: rawDraft.budget, categories: [...rawDraft.categories] };
    return { draft, step: Number(data.step), notice: null };
  } catch { return { draft: null, step: 0, notice: "No se pudo leer el borrador local del navegador." }; }
}
export function writeWorkspaceDraft(storage: DraftStorage, userId: string, draft: WorkspaceDraft, step: number, version = 1): boolean {
  if (!userId || !validDraft(draft) || !Number.isInteger(step) || step < 0 || step > 3) return false;
  try { storage.setItem(keyFor(userId, version), JSON.stringify({ version, userId, draft, step } satisfies StoredWorkspaceDraft)); return true; } catch { return false; }
}
export function markWorkspaceDraftConsumed(storage: DraftStorage, userId: string, workspaceId: string, version = 1): boolean {
  if (!userId || !boundedString(workspaceId, 128) || !workspaceId) return false;
  try { storage.setItem(keyFor(userId, version), JSON.stringify({ version, userId, consumed: workspaceId })); return true; } catch { return false; }
}
export function removeWorkspaceDraft(storage: DraftStorage, userId: string, version = 1): boolean {
  if (!userId) return false;
  try { storage.removeItem(keyFor(userId, version)); return true; } catch { return false; }
}
