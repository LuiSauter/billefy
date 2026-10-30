import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";

export type InvestmentKind = "crypto" | "stocks" | "funds" | "realestate" | "other";

export interface InvestmentValuePoint {
  at: string;
  value: number;
}

export interface Investment {
  id: string;
  name: string;
  kind: InvestmentKind;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
  currency: string;
  quantity: number;
  /** Total value when the asset was registered (cost basis). */
  initialValue: number;
  /** Total current value of the position. */
  currentValue: number;
  history: InvestmentValuePoint[];
  createdAt: string;
}

export interface CreateInvestmentInput {
  name: string;
  kind: InvestmentKind;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
  currency: string;
  quantity: number;
  currentValue: number;
}

export const INVESTMENT_KINDS: {
  value: InvestmentKind;
  label: string;
  icon: CategoryIconKey;
  color: CategoryColorKey;
}[] = [
  { value: "crypto", label: "Crypto", icon: "coins", color: "amber" },
  { value: "stocks", label: "Acciones", icon: "trending-up", color: "blue" },
  { value: "funds", label: "Fondos", icon: "piggy-bank", color: "emerald" },
  { value: "realestate", label: "Bienes raíces", icon: "home", color: "violet" },
  { value: "other", label: "Otro activo", icon: "sparkles", color: "cyan" },
];

export function getKindLabel(kind: InvestmentKind): string {
  return INVESTMENT_KINDS.find((k) => k.value === kind)?.label ?? "Activo";
}

/** Percentage change of an investment versus its cost basis. */
export function investmentVariationPct(inv: Investment): number | null {
  if (inv.initialValue <= 0) return null;
  return ((inv.currentValue - inv.initialValue) / inv.initialValue) * 100;
}

/** Percentage change versus the previous recorded value. */
export function lastChangePct(inv: Investment): number | null {
  if (inv.history.length < 2) return null;
  const prev = inv.history[inv.history.length - 2].value;
  if (prev <= 0) return null;
  return ((inv.currentValue - prev) / prev) * 100;
}
