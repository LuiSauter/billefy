import { useCallback } from "react";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";

/** Single chart palette for every Reports chart (donut slices, bars, areas). */
export const REPORT_PALETTE = ["#a855f7", "#0ea5e9", "#34d399", "#fb7185", "#facc15", "#a5b4fc"] as const;

/** Series colors derived from the shared palette so charts never drift apart. */
export const REPORT_SERIES_COLORS = {
  income: REPORT_PALETTE[0],
  expenses: REPORT_PALETTE[3],
  netWorth: REPORT_PALETTE[0],
} as const;

/** Purple call-to-action gradient shared by the header, conclusion banner and generation card. */
export const REPORT_CTA_CLASS =
  "bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500";

/** Initial size (px) used before a report chart is measured, matching its h-56 slot. */
export const REPORT_CHART_INITIAL_DIMENSION = { width: 480, height: 224 } as const;

/** Full-precision currency formatter bound to the report currency and the user's number preferences. */
export function useReportMoney(currency: string): (value: number | string) => string {
  const preferences = useNumberPreferences();
  return useCallback((value: number | string) => formatAmountText(value, currency, preferences), [currency, preferences]);
}
