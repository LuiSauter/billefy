import Decimal from "decimal.js";
import type { RegisterWorkspaceIncomeRequest, WorkspaceMemberDto } from "../domain/workspaces.types";
import { validWorkspaceAmount, validWorkspaceDate } from "./workspace-expense";

export interface IncomeDraft {
  description: string;
  categoryId: string;
  date: string;
  amount: string;
  receivedByMemberId: string;
  notes: string;
}

export function initialIncomeDraft(members: WorkspaceMemberDto[], viewerUserId?: string): IncomeDraft {
  return { description: "", categoryId: "", date: new Date().toLocaleDateString("en-CA"), amount: "",
    receivedByMemberId: members.find((member) => member.isActive && member.userId === viewerUserId)?.id ?? members.find((member) => member.isActive)?.id ?? "", notes: "" };
}

export function buildIncomeRequest(draft: IncomeDraft, allMembers: WorkspaceMemberDto[], currency: string): RegisterWorkspaceIncomeRequest {
  const members = allMembers.filter((member) => member.isActive);
  if (!draft.description.trim() || draft.description.trim().length > 200) throw new Error("Escribe una descripción de hasta 200 caracteres.");
  if (!draft.categoryId) throw new Error("Selecciona una categoría.");
  if (!validWorkspaceDate(draft.date)) throw new Error("Selecciona una fecha válida.");
  if (!validWorkspaceAmount(draft.amount)) throw new Error("El monto debe ser positivo, con hasta dos decimales y no mayor a 9.999.999.999,99.");
  if (!members.length || !members.some((member) => member.id === draft.receivedByMemberId)) throw new Error("Selecciona un integrante activo que recibió el ingreso.");
  if (draft.notes.length > 300) throw new Error("Las notas no pueden superar 300 caracteres.");
  return { description: draft.description.trim(), amount: new Decimal(draft.amount).toNumber(), currency,
    receivedByMemberId: draft.receivedByMemberId, date: draft.date, categoryId: draft.categoryId, notes: draft.notes.trim() || null };
}
