import Decimal from "decimal.js";
import type { CreateSharedGoalRequest, SharedGoalDto } from "../domain/workspaces.types";
import { validWorkspaceAmount, validWorkspaceDate, validWorkspaceNonNegativeAmount } from "./workspace-expense";

export interface SharedGoalDraft { title: string; targetAmount: string; monthlyCommitmentAmount: string; targetDate: string; category: string; }
export function buildSharedGoalRequest(draft: SharedGoalDraft, currency: string): CreateSharedGoalRequest {
  if (!draft.title.trim() || draft.title.trim().length > 150) throw new Error("Escribe un título de hasta 150 caracteres.");
  if (!validWorkspaceAmount(draft.targetAmount)) throw new Error("El objetivo debe ser un monto positivo con hasta dos decimales.");
  const commitment = draft.monthlyCommitmentAmount || "0";
  if (!validWorkspaceNonNegativeAmount(commitment)) throw new Error("Revisa el aporte mensual; usa cero si no hay compromiso.");
  if (draft.targetDate && !validWorkspaceDate(draft.targetDate)) throw new Error("Selecciona una fecha objetivo válida.");
  return { title: draft.title.trim(), targetAmount: new Decimal(draft.targetAmount).toNumber(), monthlyCommitmentAmount: new Decimal(commitment).toNumber(), currency, targetDate: draft.targetDate || null, category: draft.category.trim() || null };
}
export function buildGoalContributionRequest(amount: string, currency: string) {
  if (!validWorkspaceAmount(amount)) throw new Error("El aporte debe ser positivo, con hasta dos decimales.");
  return { amount: new Decimal(amount).toNumber(), currency };
}
export function goalContributionTotals(goals: SharedGoalDto[], currency: string) {
  const totals = new Map<string, Decimal>();
  for (const goal of goals.filter((item) => item.currency === currency)) for (const contribution of goal.memberContributions) {
    totals.set(contribution.memberId, (totals.get(contribution.memberId) ?? new Decimal(0)).plus(contribution.amount));
  }
  return totals;
}
