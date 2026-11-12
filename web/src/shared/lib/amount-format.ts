import Decimal from "decimal.js";
import { formatNumber, type NumberFormatPreferences } from "./number-format";
import { getCurrencyMeta } from "./currency";

export interface AmountFormatOptions { sign?: "auto" | "always" | "never"; currencyDisplay?: "symbol" | "code" | "none"; compact?: boolean }
export function formatAmountText(value: string | number | Decimal, currency: string, preferences: NumberFormatPreferences, options: AmountFormatOptions = {}): string {
  const amount = new Decimal(value);
  const signMode = options.sign ?? "auto";
  const sign = signMode === "never" ? "" : amount.isNegative() ? "-" : signMode === "always" ? "+" : "";
  const display = options.currencyDisplay ?? "symbol";
  const meta = getCurrencyMeta(currency);
  const label = display === "none" ? "" : display === "code" ? meta.code : meta.symbol;
  let number: string;
  let suffix = "";
  if (options.compact) {
    const absolute = amount.abs();
    const thresholds = [{ divisor: 1e9, label: "B" }, { divisor: 1e6, label: "M" }, { divisor: 1e3, label: "K" }];
    const match = thresholds.find(({ divisor }) => absolute.greaterThanOrEqualTo(divisor));
    number = match ? formatNumber(amount.abs().div(match.divisor), preferences.convention, 2) : formatNumber(amount.abs(), preferences.convention, preferences.decimalPlaces);
    suffix = match ? ` ${match.label}` : "";
  } else number = formatNumber(amount.abs(), preferences.convention, preferences.decimalPlaces);
  const currencyPart = !label ? "" : meta.position === "prefix" ? `${label} ` : ` ${label}`;
  return `${sign}${meta.position === "prefix" ? currencyPart : ""}${number}${suffix}${meta.position === "suffix" ? currencyPart : ""}`;
}
export function formatPercent(value: string | number | Decimal, preferences: NumberFormatPreferences): string {
  return `${formatNumber(new Decimal(value).abs(), preferences.convention, preferences.decimalPlaces)}%`;
}
export function formatSignedPercent(value: string | number | Decimal, preferences: NumberFormatPreferences, sign: "auto" | "always" | "never" = "auto"): string {
  const amount = new Decimal(value);
  const prefix = sign === "never" ? "" : amount.isNegative() ? "-" : sign === "always" ? "+" : "";
  return `${prefix}${formatPercent(amount, preferences)}`;
}
export function formatQuantity(value: string | number | Decimal, preferences: NumberFormatPreferences, maxDecimals = 8): string {
  const text = formatNumber(value, preferences.convention, maxDecimals);
  const separator = preferences.convention === "es-BO" ? "," : ".";
  return text.includes(separator) ? text.replace(new RegExp(`\\${separator}?0+$`), "") : text;
}
