export type TrendDirection = "up" | "down" | "flat";
/** Whether the movement is favourable for the user, independent of its arrow direction. */
export type TrendTone = "good" | "bad" | "neutral";

interface ResolveTrendInput {
  /** Month-over-month percentage, `null` when there is no comparable (positive) base. */
  pct: number | null;
  current: number;
  previous: number;
  /** Direction that benefits the user: "up" for assets/net worth, "down" for liabilities. */
  goodWhen: "up" | "down";
}

/** Reads the real sign of the change; without a percentage base it falls back to the absolute change. */
export function resolveTrend({ pct, current, previous, goodWhen }: ResolveTrendInput): { direction: TrendDirection; tone: TrendTone } {
  const change = pct !== null ? pct : current - previous;
  const direction: TrendDirection = change > 0 ? "up" : change < 0 ? "down" : "flat";
  if (direction === "flat") return { direction, tone: "neutral" };
  return { direction, tone: direction === goodWhen ? "good" : "bad" };
}
