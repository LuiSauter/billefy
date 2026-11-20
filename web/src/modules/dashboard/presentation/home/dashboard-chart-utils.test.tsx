import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_NUMBER_FORMAT_PREFERENCES } from "@/shared/lib/number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import {
  CHART_AXIS_PROPS,
  CHART_FONT_SIZE,
  createAmountTooltipFormatter,
  formatCompactAmount,
  NET_WORTH_RANGE_OPTIONS,
  sliceNetWorthRange,
} from "./dashboard-chart-utils";

const prefs = DEFAULT_NUMBER_FORMAT_PREFERENCES;

describe("dashboard-chart-utils", () => {
  it("uses a single 12px font size for every chart axis", () => {
    expect(CHART_FONT_SIZE).toBe(12);
    expect(CHART_AXIS_PROPS).toEqual({ fontSize: 12, tickLine: false, axisLine: false });
  });

  it("formats a short axis tick with no currency symbol, so it fits the YAxis width without wrapping", () => {
    expect(formatCompactAmount(12500, "USD", prefs)).toBe("12,5K");
    expect(formatCompactAmount(6000, "BOB", prefs)).toBe("6K");
    expect(formatCompactAmount(450, "BOB", prefs)).toBe("450");
    expect(formatCompactAmount(12500, "USD", prefs)).not.toContain("$");
    expect(formatCompactAmount(6000, "BOB", prefs)).not.toContain("Bs");
  });

  it("keeps a meaningful single decimal and handles negatives and million-scale values", () => {
    expect(formatCompactAmount(1250000, "BOB", prefs)).toBe("1,3M");
    expect(formatCompactAmount(-6000, "BOB", prefs)).toBe("-6K");
    expect(formatCompactAmount(0, "BOB", prefs)).toBe("0");
  });

  it("renders tooltip rows with indicator color, payload name and full amount", () => {
    const formatter = createAmountTooltipFormatter("USD", prefs);
    const html = renderToStaticMarkup(
      <div>{formatter(1234.5, "amount", { payload: { name: "Ingresos", fill: "red" }, color: "blue" })}</div>
    );

    expect(html).toContain("Ingresos");
    expect(html).toContain(formatAmountText(1234.5, "USD", prefs));
    expect(html).toContain("background-color:red");
  });

  it("falls back to the series name and item color when the payload has none", () => {
    const formatter = createAmountTooltipFormatter("BOB", prefs);
    const html = renderToStaticMarkup(
      <div>{formatter(10, "Patrimonio neto", { payload: {}, color: "blue" })}</div>
    );

    expect(html).toContain("Patrimonio neto");
    expect(html).toContain("background-color:blue");
    expect(html).toContain(formatAmountText(10, "BOB", prefs));
  });

  it("appends the optional detail (e.g. a donut share) to the full amount", () => {
    const formatter = createAmountTooltipFormatter("USD", prefs, (payload) => `${payload.share}%`);
    const html = renderToStaticMarkup(
      <div>{formatter(10, "x", { payload: { name: "Gastos", share: 40 }, color: "blue" })}</div>
    );

    expect(html).toContain(`${formatAmountText(10, "USD", prefs)} (40%)`);
  });

  it("slices the net worth series to the selected range", () => {
    const points = Array.from({ length: 12 }, (_, i) => ({ month: `m${i + 1}`, value: i }));

    expect(sliceNetWorthRange(points, "6m").map((p) => p.month)).toEqual([
      "m7", "m8", "m9", "m10", "m11", "m12",
    ]);
    expect(sliceNetWorthRange(points, "12m")).toHaveLength(12);
    expect(sliceNetWorthRange(points, "all")).toBe(points);
    expect(sliceNetWorthRange(points.slice(0, 3), "6m")).toHaveLength(3);
  });

  it("keeps the existing range labels", () => {
    expect(NET_WORTH_RANGE_OPTIONS.map((o) => o.label)).toEqual([
      "Últimos 6 meses",
      "Último año",
      "Histórico completo",
    ]);
  });
});
