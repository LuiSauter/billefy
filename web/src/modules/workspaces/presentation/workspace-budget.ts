import Decimal from "decimal.js";
import type { SetSharedBudgetRequest } from "../domain/workspaces.types";
import { validWorkspaceAmount } from "./workspace-expense";

export interface WorkspaceBudgetDraft {
  amount: string;
  categories: { categoryId: string; limitAmount: string }[];
}
export function buildWorkspaceBudgetRequest(draft: WorkspaceBudgetDraft, year: number, month: number, currency: string): SetSharedBudgetRequest {
  if (!Number.isInteger(year) || year < 1 || year > 9998 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("Selecciona un período válido.");
  if (!validWorkspaceAmount(draft.amount)) throw new Error("El presupuesto debe ser positivo, con hasta dos decimales y no mayor a 9.999.999.999,99.");
  const seen = new Set<string>();
  let total = new Decimal(0);
  const categories = draft.categories.map((category) => {
    if (!category.categoryId || seen.has(category.categoryId)) throw new Error("Selecciona categorías sin repetir.");
    const zeroLimit = /^0+(\.0{1,2})?$/.test(category.limitAmount);
    if (!zeroLimit && !validWorkspaceAmount(category.limitAmount)) throw new Error("Cada categoría necesita un límite no negativo de hasta dos decimales.");
    seen.add(category.categoryId);
    total = total.plus(category.limitAmount);
    return { categoryId: category.categoryId, limitAmount: new Decimal(category.limitAmount).toNumber() };
  });
  if (total.gt(draft.amount)) throw new Error("Los límites por categoría no pueden superar el presupuesto total.");
  return { year, month, currency, amount: new Decimal(draft.amount).toNumber(), categories };
}
