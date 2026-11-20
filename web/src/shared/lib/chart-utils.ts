import * as React from "react";
import Decimal from "decimal.js";
import { formatAmountText } from "@/shared/lib/amount-format";
import { formatNumber, type NumberFormatPreferences } from "@/shared/lib/number-format";

/** Single font size (px, matches Tailwind text-xs) used by every chart axis (Dashboard and Accounts). */
export const CHART_FONT_SIZE = 12;

/** Props shared by every chart axis. */
export const CHART_AXIS_PROPS = {
  fontSize: CHART_FONT_SIZE,
  tickLine: false,
  axisLine: false,
} as const;

const COMPACT_THRESHOLDS = [
  { divisor: 1e9, label: "B" },
  { divisor: 1e6, label: "M" },
  { divisor: 1e3, label: "K" },
] as const;

/** Short axis tick label with no currency symbol, at most 1 decimal, and no trailing ".0", e.g. "12,5K" or "450" — must stay short enough to fit the YAxis width without wrapping. */
export function formatCompactAmount(
  value: number,
  _currency: string,
  preferences: NumberFormatPreferences
): string {
  const amount = new Decimal(value);
  const sign = amount.isNegative() ? "-" : "";
  const absolute = amount.abs();
  const match = COMPACT_THRESHOLDS.find(({ divisor }) => absolute.greaterThanOrEqualTo(divisor));
  const scaled = match ? absolute.div(match.divisor) : absolute;
  const formatted = formatNumber(scaled, preferences.convention, match ? 1 : 0);
  const decimalSeparator = preferences.convention === "es-BO" ? "," : ".";
  const withoutTrailingZero = formatted.replace(`${decimalSeparator}0`, "");
  return `${sign}${withoutTrailingZero}${match ? match.label : ""}`;
}

/** Optional extra text appended to the amount, e.g. a "12,5%" share for donut slices. */
export type AmountTooltipDetail = (payload: Record<string, unknown>) => string | undefined;

/** Tooltip row renderer: color indicator + series label + full formatted amount (+ optional detail). */
export function createAmountTooltipFormatter(
  currency: string,
  preferences: NumberFormatPreferences,
  getDetail?: AmountTooltipDetail
) {
  return function renderAmountTooltipRow(
    value: unknown,
    name: unknown,
    item: { payload?: Record<string, unknown> & { name?: unknown; fill?: unknown }; color?: string }
  ): React.ReactNode {
    const payloadName = item.payload?.name;
    const label = typeof payloadName === "string" ? payloadName : String(name ?? "");
    const payloadFill = item.payload?.fill;
    const indicatorColor = typeof payloadFill === "string" ? payloadFill : item.color;
    const detail = item.payload ? getDetail?.(item.payload) : undefined;
    const amountText = formatAmountText(Number(value), currency, preferences);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement("span", {
        className: "h-2.5 w-2.5 shrink-0 rounded-[2px]",
        style: { backgroundColor: indicatorColor },
      }),
      React.createElement(
        "div",
        { className: "flex min-w-0 flex-1 items-center justify-between gap-3 leading-none" },
        React.createElement("span", { className: "truncate text-muted-foreground" }, label),
        React.createElement(
          "span",
          { className: "shrink-0 font-sans font-medium text-foreground tabular-nums" },
          detail ? `${amountText} (${detail})` : amountText
        )
      )
    );
  };
}

