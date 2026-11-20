import Decimal from "decimal.js";
import type { RegisterWorkspaceExpenseRequest, SplitRuleType, WorkspaceMemberDto } from "../domain/workspaces.types";

export interface ExpenseDraft {
  description: string;
  categoryId: string;
  date: string;
  amount: string;
  paidByMemberId: string;
  rule: "EqualParts" | "IncomeProportional" | "CustomPercentage";
  customMode: "percentage" | "amount";
  custom: Record<string, string>;
  notes: string;
}
export const expenseRules = [
  { value: "EqualParts", label: "Partes iguales", description: "50/50 entre dos; igual para cada integrante" },
  { value: "IncomeProportional", label: "Proporcional a ingresos", description: "Según el ingreso de cada uno" },
  { value: "CustomPercentage", label: "Personalizado", description: "Define el porcentaje o monto" },
] as const;

export function validWorkspaceDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "0001-01-01" && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validWorkspaceAmount(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value) && new Decimal(value).gt(0) && new Decimal(value).lte("9999999999.99");
}
export function validWorkspaceNonNegativeAmount(value: string) {
  return validWorkspaceAmount(value) || (/^\d+(\.\d{1,2})?$/.test(value) && new Decimal(value).isZero());
}
export function initialExpenseDraft(members: WorkspaceMemberDto[], viewerUserId?: string): ExpenseDraft {
  return { description: "", categoryId: "", date: new Date().toLocaleDateString("en-CA"), amount: "", paidByMemberId: members.find((member) => member.isActive && member.userId === viewerUserId)?.id ?? members.find((member) => member.isActive)?.id ?? "", rule: "EqualParts", customMode: "percentage", custom: {}, notes: "" };
}

function splitWeights(draft: ExpenseDraft, members: WorkspaceMemberDto[]) {
  return members.map((member) => {
    const value = draft.rule === "EqualParts" ? "1" : draft.rule === "IncomeProportional" ? String(member.incomeSharePercentage) : draft.custom[member.id] ?? "";
    if (!/^\d+(\.\d{1,6})?$/.test(value)) throw new Error("Define una participación válida para cada integrante.");
    return new Decimal(value);
  });
}

/** Client preview only: mirrors the server's floor-to-cents and payer residual policy. */
export function expensePreview(draft: ExpenseDraft, allMembers: WorkspaceMemberDto[]) {
  const members = allMembers.filter((member) => member.isActive);
  if (!members.length || !validWorkspaceAmount(draft.amount)) return [];
  try {
    const weights = splitWeights(draft, members);
    const totalWeight = Decimal.sum(...weights);
    if (totalWeight.lte(0)) return [];
    const total = new Decimal(draft.amount);
    const amounts = weights.map((weight) => total.mul(weight).div(totalWeight).toDecimalPlaces(2, Decimal.ROUND_FLOOR));
    const payer = members.findIndex((member, index) => member.id === draft.paidByMemberId && weights[index].gt(0));
    const recipient = payer < 0 ? weights.findIndex((weight) => weight.gt(0)) : payer;
    amounts[recipient] = amounts[recipient].plus(total.minus(Decimal.sum(...amounts)));
    return members.map((member, index) => ({ memberId: member.id, amount: amounts[index].toFixed(2), percentage: weights[index].div(totalWeight).mul(100).toDecimalPlaces(2).toString() }));
  } catch { return []; }
}

export function buildExpenseRequest(draft: ExpenseDraft, allMembers: WorkspaceMemberDto[], currency: string): RegisterWorkspaceExpenseRequest {
  const members = allMembers.filter((member) => member.isActive);
  if (!draft.description.trim() || draft.description.trim().length > 200) throw new Error("Escribe una descripción de hasta 200 caracteres.");
  if (!draft.categoryId) throw new Error("Selecciona una categoría.");
  if (!validWorkspaceDate(draft.date)) throw new Error("Selecciona una fecha válida.");
  if (!validWorkspaceAmount(draft.amount)) throw new Error("El monto debe ser positivo, con hasta dos decimales y no mayor a 9.999.999.999,99.");
  if (!members.length || !members.some((member) => member.id === draft.paidByMemberId)) throw new Error("Selecciona un pagador activo del espacio.");
  if (draft.notes.length > 300) throw new Error("Las notas no pueden superar 300 caracteres.");
  const weights = splitWeights(draft, members);
  const sum = Decimal.sum(...weights);
  if (draft.rule === "IncomeProportional" && !sum.eq(100)) throw new Error("Los porcentajes de ingresos deben sumar 100%. Revisa la configuración de integrantes.");
  if (draft.rule === "CustomPercentage") {
    if (draft.customMode === "percentage" && !sum.eq(100)) throw new Error("Los porcentajes deben sumar 100%.");
    if (draft.customMode === "amount" && (!sum.eq(draft.amount) || weights.some((weight) => weight.decimalPlaces() > 2))) throw new Error("Los aportes deben sumar el monto total, con hasta dos decimales.");
  }
  let splitRuleType: SplitRuleType = draft.rule;
  // Amount weights preserve exact custom cents without recurring percentage conversion.
  if (draft.rule === "CustomPercentage" && draft.customMode === "amount") splitRuleType = "ByResponsibility";
  return { description: draft.description.trim(), amount: new Decimal(draft.amount).toNumber(), currency, paidByMemberId: draft.paidByMemberId, date: draft.date, splitRuleType, participants: members.map((member, index) => ({ memberId: member.id, ...(draft.rule !== "CustomPercentage" ? {} : draft.customMode === "amount" ? { responsibilityWeight: weights[index].toNumber() } : { customPercentage: weights[index].toNumber() }) })), categoryId: draft.categoryId, notes: draft.notes.trim() || null };
}
