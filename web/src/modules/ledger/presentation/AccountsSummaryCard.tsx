"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";

/**
 * Month-over-month change pill. Shared with the investments summary card.
 * (The former `AccountsSummaryCard` component in this file had no importers and was removed.)
 */
export function ChangeBadge({ pct }: { pct: number | null }) {
  const preferences = useNumberPreferences();
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground">
        <Minus className="w-3 h-3" /> Sin base
      </span>
    );
  }
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-extrabold ${
        up ? "text-emerald-500" : "text-rose-500"
      }`}
    >
      <Icon className="w-3 h-3" />
      {pct < 0 ? "-" : up && pct !== 0 ? "+" : ""}
      {formatPercent(pct, preferences)}
    </span>
  );
}
