import Decimal from "decimal.js";
import { createMoney } from "@/shared/domain/money";
import { BudgetDto, UpdateBudgetRequest } from "./planning.types";

export interface BudgetEditFields { limit: string; alertPercent: string }

// Matches the server Currency scales; all other supported codes default to two.
export const budgetCurrencyDecimals = (currency: string) => currency.toUpperCase() === "BTC" ? 8 : 2;

export function budgetEditFields(budget: BudgetDto): BudgetEditFields {
  return {
    limit: createMoney(budget.limitAmount, budget.currency).amount.toFixed(),
    alertPercent: new Decimal(budget.alertThreshold).times(100).toString(),
  };
}

export function buildBudgetEditRequest(budget: BudgetDto, fields: BudgetEditFields): UpdateBudgetRequest {
  if (!/^\d+(\.\d+)?$/.test(fields.limit)) throw new Error("Ingresá un límite positivo.");
  const amount = createMoney(fields.limit, budget.currency).amount
    .toDecimalPlaces(budgetCurrencyDecimals(budget.currency), Decimal.ROUND_HALF_UP);
  if (!amount.isFinite() || !amount.gt(0)) throw new Error("El límite debe ser positivo después del redondeo.");
  const percent = /^\d+(\.\d+)?$/.test(fields.alertPercent) ? new Decimal(fields.alertPercent) : new Decimal(0);
  if (!percent.isInteger() || percent.lt(1) || percent.gt(100)) {
    throw new Error("Elegí un porcentaje entero entre 1 y 100.");
  }
  return { limitAmount: amount.toNumber(), alertThreshold: percent.dividedBy(100).toNumber() };
}

// One instance per open editor: rejected writes can retry, applied writes cannot.
export function createBudgetEditSubmitter<T extends { applied: true }>(
  update: (id: string, request: UpdateBudgetRequest) => Promise<T>,
) {
  let pending = false;
  let applied = false;
  return async (budget: BudgetDto, fields: BudgetEditFields): Promise<T | undefined> => {
    if (pending || applied) return;
    pending = true;
    try {
      const result = await update(budget.id, buildBudgetEditRequest(budget, fields));
      applied = result.applied;
      return result;
    } finally {
      pending = false;
    }
  };
}
