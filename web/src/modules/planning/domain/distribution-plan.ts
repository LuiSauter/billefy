import { CategoryColorKey } from "@/modules/ledger/domain/category.types";

export interface PlanBucket {
  id: string;
  name: string;
  percent: number;
  colorKey: CategoryColorKey;
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
  buckets: { name: string; percent: number; colorKey: CategoryColorKey }[];
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    key: "50-30-20",
    label: "50 / 30 / 20",
    buckets: [
      { name: "Necesidades", percent: 50, colorKey: "blue" },
      { name: "Deseos", percent: 30, colorKey: "pink" },
      { name: "Ahorro e inversión", percent: 20, colorKey: "emerald" },
    ],
  },
  {
    key: "40-30-20-10",
    label: "40 / 30 / 20 / 10",
    buckets: [
      { name: "Necesidades", percent: 40, colorKey: "blue" },
      { name: "Deseos", percent: 30, colorKey: "pink" },
      { name: "Ahorro", percent: 20, colorKey: "emerald" },
      { name: "Inversión", percent: 10, colorKey: "amber" },
    ],
  },
  {
    key: "70-30",
    label: "70 / 30",
    buckets: [
      { name: "Gastos", percent: 70, colorKey: "blue" },
      { name: "Ahorro", percent: 30, colorKey: "emerald" },
    ],
  },
];

export const DEFAULT_PLAN: DistributionPlan = { enabled: false, buckets: [] };

export function totalPercent(buckets: PlanBucket[]): number {
  return buckets.reduce((a, b) => a + (Number(b.percent) || 0), 0);
}

export function bucketFromPreset(preset: PlanPreset): PlanBucket[] {
  return preset.buckets.map((b, i) => ({
    id: `b-${Date.now()}-${i}`,
    name: b.name,
    percent: b.percent,
    colorKey: b.colorKey,
    categoryIds: [],
  }));
}
