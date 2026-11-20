import Decimal from "decimal.js";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";

export type InvestmentKind = "crypto" | "stocks" | "funds" | "realestate" | "other";

export interface InvestmentValuePoint {
  at: string;
  value: number;
}

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  kind: InvestmentKind;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
  currency: string;
  quantity: number;
  /** Original registration snapshot; not accumulated purchase cost. */
  initialValue: number;
  /** Absent on older servers; explicit null means historical cost is unknown. */
  costBasis?: number | null;
  unrealizedGain?: number | null;
  /** Total current value of the position. */
  currentValue: number;
  history: InvestmentValuePoint[];
  createdAt: string;
  archivedAt?: string | null;
}

export interface CreateInvestmentInput {
  name: string;
  ticker?: string;
  kind: InvestmentKind;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
  currency: string;
  quantity: number;
  currentValue: number;
}

export type InvestmentTransactionType = "Buy" | "Sell" | "Dividend" | "Fee" | "Revaluation";

export interface InvestmentTransactionDto {
  id: string;
  investmentId: string;
  type: InvestmentTransactionType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fees: number;
  occurredAt: string;
  notes?: string;
  ledgerTransactionId?: string;
  createdAt: string;
}

export interface RegisterInvestmentOperationInput {
  type: InvestmentTransactionType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fees?: number;
  occurredAt?: string;
  notes?: string;
  linkedAccountId?: string;
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

export interface InvestmentPurchaseInput {
  quantity: string;
  unitPrice: string;
  /** Gross purchase amount; fees are sent separately and capitalized by the server. */
  totalAmount: string;
  fees: string;
  linkedAccountId: string;
  occurredAt: string;
  notes?: string;
}

export interface InvestmentDividendInput {
  totalAmount: string;
  linkedAccountId: string;
  occurredAt: string;
  notes?: string;
}

export interface InvestmentValuationInput {
  unitPrice: string;
  totalAmount: string;
  occurredAt: string;
  notes?: string;
}

export function investmentCostBasis(inv: Investment): number | null {
  return inv.costBasis === undefined ? inv.initialValue : inv.costBasis;
}

/** Percentage change versus known acquisition cost, never contributed capital. */
export function investmentVariationPct(inv: Investment): number | null {
  const cost = investmentCostBasis(inv);
  if (cost === null || cost <= 0) return null;
  return new Decimal(inv.currentValue).minus(cost).div(cost).times(100).toNumber();
}

/** Percentage change versus the previous recorded value. */
export function lastChangePct(inv: Investment): number | null {
  if (inv.history.length < 2) return null;
  const prev = inv.history[inv.history.length - 2].value;
  if (prev <= 0) return null;
  return ((inv.currentValue - prev) / prev) * 100;
}
