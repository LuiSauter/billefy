import Decimal from "decimal.js";
import { CategoryColorKey } from "@/modules/ledger/domain/category.types";

export type TrackingMode = "Expenses" | "TargetOnly";

export interface PlanBucket {
  id: string;
  name: string;
  percent: number;
  colorKey: CategoryColorKey;
  trackingMode?: TrackingMode;
  /** Expense category ids assigned to this bucket (each category belongs to one bucket). */
  categoryIds: string[];
}

export interface DistributionPlan {
  enabled: boolean;
  buckets: PlanBucket[];
}

export interface PlanPreset {
  key: string;
  label: string;
  buckets: { name: string; percent: number; colorKey: CategoryColorKey; trackingMode: TrackingMode }[];
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    key: "50-30-20",
    label: "50 / 30 / 20",
    buckets: [
      { name: "Necesidades", percent: 50, colorKey: "blue", trackingMode: "Expenses" },
      { name: "Deseos", percent: 30, colorKey: "pink", trackingMode: "Expenses" },
      { name: "Ahorro e inversión", percent: 20, colorKey: "emerald", trackingMode: "TargetOnly" },
    ],
  },
  {
    key: "40-30-20-10",
    label: "40 / 30 / 20 / 10",
    buckets: [
      { name: "Necesidades", percent: 40, colorKey: "blue", trackingMode: "Expenses" },
      { name: "Deseos", percent: 30, colorKey: "pink", trackingMode: "Expenses" },
      { name: "Ahorro", percent: 20, colorKey: "emerald", trackingMode: "TargetOnly" },
      { name: "Inversión", percent: 10, colorKey: "amber", trackingMode: "TargetOnly" },
    ],
  },
  {
    key: "70-30",
    label: "70 / 30",
    buckets: [
      { name: "Gastos", percent: 70, colorKey: "blue", trackingMode: "Expenses" },
      { name: "Ahorro", percent: 30, colorKey: "emerald", trackingMode: "TargetOnly" },
    ],
  },
];

export const DEFAULT_PLAN: DistributionPlan = { enabled: false, buckets: [] };

function decimalTotal(buckets: PlanBucket[]): Decimal {
  return buckets.reduce((sum, b) => sum.plus(Number.isFinite(b.percent) ? b.percent : 0), new Decimal(0));
}

export function totalPercent(buckets: PlanBucket[]): number {
  return decimalTotal(buckets).toNumber();
}

export function bucketTrackingMode(bucket: PlanBucket): TrackingMode {
  return bucket.trackingMode === undefined ? "Expenses" : bucket.trackingMode;
}

/** Only an explicit user action may remove assignments when switching purpose. */
export function changeBucketTrackingMode(bucket: PlanBucket, trackingMode: TrackingMode): PlanBucket {
  return { ...bucket, trackingMode, categoryIds: trackingMode === "TargetOnly" ? [] : bucket.categoryIds };
}

/** Activation rules; disabled legacy drafts are not rewritten or blocked by this validator. */
export function validatePlan(buckets: PlanBucket[], expenseCategoryIds: readonly string[]): string[] {
  const errors: string[] = [];
  if (buckets.length < 2 || buckets.length > 8) errors.push("Configurá entre 2 y 8 grupos.");
  if (buckets.some((b) => !b.name.trim() || b.name.trim().length > 60)) errors.push("Cada grupo necesita un nombre de hasta 60 caracteres.");
  if (buckets.some((b) => !Number.isFinite(b.percent) || b.percent <= 0 || b.percent > 100)) errors.push("Usá porcentajes positivos de hasta 100%.");
  if (!decimalTotal(buckets).eq(100)) errors.push("Los porcentajes deben sumar exactamente 100%.");
  const owned = new Set(expenseCategoryIds.map((id) => id.toLowerCase()));
  const assigned = new Set<string>();
  for (const b of buckets) {
    const mode = bucketTrackingMode(b);
    if (mode !== "Expenses" && mode !== "TargetOnly") errors.push("Elegí un tipo de seguimiento válido para cada grupo.");
    if (mode === "TargetOnly" && b.categoryIds.length) errors.push("Los grupos de solo objetivo no admiten categorías.");
    for (const id of b.categoryIds) {
      const key = id.toLowerCase();
      if (!owned.has(key)) errors.push("Quitá o reasigná categorías que ya no sean gastos propios disponibles.");
      if (assigned.has(key)) errors.push("Cada categoría puede asignarse una vez solamente.");
      assigned.add(key);
    }
  }
  return [...new Set(errors)];
}

export function bucketFromPreset(preset: PlanPreset): PlanBucket[] {
  return preset.buckets.map((b, i) => ({
    id: `b-${Date.now()}-${i}`,
    name: b.name,
    percent: b.percent,
    colorKey: b.colorKey,
    trackingMode: b.trackingMode,
    categoryIds: [],
  }));
}
