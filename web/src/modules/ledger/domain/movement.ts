import Decimal from "decimal.js";
import { toDecimal } from "@/shared/domain/money";

export type MovementKind = "Income" | "Expense" | "Transfer" | "Investment";
export type InvestmentCashKind = "Contribution" | "Disposal";
export interface MovementAllocation { categoryId: string; categoryName?: string; amount: Decimal }
export interface MovementLeg { id: string; accountId: string; accountName: string; amount: Decimal; currency: string; direction: string; appliedRate?: number; rateSource?: string }
export interface Movement { id: string; kind: MovementKind; amount: Decimal; currency: string; direction: string; occurredAt: string; accountId: string; accountName: string; categoryId?: string; categoryName?: string; description?: string; appliedRate?: number; rateSource?: string; isReversal: boolean; reversesId?: string; investmentId?: string; investmentCashKind?: "Contribution" | "Disposal"; legs: MovementLeg[]; allocations: MovementAllocation[] }
export interface MovementSummary { currency: string; income: Decimal; expenses: Decimal; transferOut: Decimal; transferIn: Decimal; contributions: Decimal; disposals: Decimal }
export interface MovementPage { items: Movement[]; page: number; pageSize: number; totalCount: number; summary: MovementSummary[] }
export interface MovementQuery { startUtc?: string; endUtcExclusive?: string; accountId?: string; categoryId?: string; type?: MovementKind; search?: string; mode: "Active" | "Audit"; page: number; pageSize: number }
interface RawMovement { id: string; amount: number | string; legs?: Array<{ id: string; amount: number | string; [key: string]: unknown }>; allocations?: Array<{ categoryId: string; amount: number | string; [key: string]: unknown }>; [key: string]: unknown }
interface RawMovementPage { items?: RawMovement[]; summary?: Array<{ currency: string; income: number | string; expenses: number | string; transferOut?: number | string; transferIn?: number | string; contributions?: number | string; disposals?: number | string }>; page: number; pageSize: number; totalCount: number }
export function parseMovementPage(raw: RawMovementPage): MovementPage {
  const items: Movement[] = (raw.items || []).map((m) => ({
    ...m,
    amount: toDecimal(m.amount),
    legs: (m.legs || []).map((leg) => ({ ...leg, amount: toDecimal(leg.amount) })) as MovementLeg[],
    allocations: (m.allocations || []).map((allocation) => ({ ...allocation, amount: toDecimal(allocation.amount) })) as MovementAllocation[],
  } as Movement));
  return {
    page: raw.page, pageSize: raw.pageSize, totalCount: raw.totalCount, items,
    summary: (raw.summary || []).map((summary) => ({ ...summary, income: toDecimal(summary.income), expenses: toDecimal(summary.expenses), transferOut: toDecimal(summary.transferOut ?? 0), transferIn: toDecimal(summary.transferIn ?? 0), contributions: toDecimal(summary.contributions ?? 0), disposals: toDecimal(summary.disposals ?? 0) })),
  };
}
