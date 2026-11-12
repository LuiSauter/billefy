"use client";

import React, { useMemo } from "react";
import Decimal from "decimal.js";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import { cn } from "@/shared/lib/utils";

export interface AmountProps {
  value: string | number | Decimal; currency?: string; sign?: "auto" | "always" | "never";
  tone?: "neutral" | "income" | "expense" | "auto"; currencyDisplay?: "symbol" | "code" | "none";
  size?: "xs" | "sm" | "md" | "lg" | "xl"; compact?: boolean; className?: string;
}
const sizes = { xs: "text-xs", sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" };
export function Amount({ value, currency, sign = "auto", tone = "neutral", currencyDisplay: requestedDisplay = "symbol", size = "md", compact = false, className }: AmountProps) {
  const preferences = useNumberPreferences();
  const currencyDisplay = currency ? requestedDisplay : "none";
  const code = currency ?? "";
  const amount = new Decimal(value);
  const resolvedTone = tone === "auto" ? (amount.isNegative() ? "expense" : amount.isPositive() ? "income" : "neutral") : tone;
  const text = useMemo(() => formatAmountText(value, code, preferences, { sign, currencyDisplay, compact }), [value, code, preferences, sign, currencyDisplay, compact]);
  const title = compact ? formatAmountText(value, code, preferences, { sign, currencyDisplay }) : undefined;
  return <span data-money className={cn("font-sans tabular-nums font-semibold whitespace-nowrap", sizes[size], resolvedTone === "income" && "text-success", resolvedTone === "expense" && "text-destructive", resolvedTone === "neutral" && "text-foreground", className)} title={title}>{text}</span>;
}
export function Money(props: Omit<AmountProps, "currency"> & { currency: string }) { return <Amount {...props} />; }
