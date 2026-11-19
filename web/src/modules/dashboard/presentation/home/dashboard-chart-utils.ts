export {
  CHART_AXIS_PROPS,
  CHART_FONT_SIZE,
  createAmountTooltipFormatter,
  formatCompactAmount,
} from "@/shared/lib/chart-utils";

export type NetWorthRange = "6m" | "12m" | "all";

export const NET_WORTH_RANGE_OPTIONS: { id: NetWorthRange; label: string; months: number | null }[] = [
  { id: "6m", label: "Últimos 6 meses", months: 6 },
  { id: "12m", label: "Último año", months: 12 },
  { id: "all", label: "Histórico completo", months: null },
];

/** Keeps the most recent N points of a chronologically ordered series ("all" returns it untouched). */
export function sliceNetWorthRange<T>(points: T[], range: NetWorthRange): T[] {
  const months = NET_WORTH_RANGE_OPTIONS.find((opt) => opt.id === range)?.months ?? null;
  return months === null ? points : points.slice(-months);
}
