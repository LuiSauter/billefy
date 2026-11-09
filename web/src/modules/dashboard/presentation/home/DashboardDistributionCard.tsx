"use client";

import React from "react";
import { Info, Home, Heart, TrendingUp, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { CATEGORY_COLOR_THEMES, CategoryColorKey } from "@/modules/ledger/domain/category.types";
import type { RecommendedDistribution } from "../../domain/dashboard-home-analytics";

interface DashboardDistributionCardProps {
  distribution: RecommendedDistribution;
  selectedCurrency: string;
  onOpenPlanTab?: () => void;
}

function getBucketIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("necesidad") || lower.includes("hogar") || lower.includes("fijo")) {
    return Home;
  }
  if (lower.includes("estilo") || lower.includes("deseo") || lower.includes("vida") || lower.includes("personal")) {
    return Heart;
  }
  if (lower.includes("ahorro") || lower.includes("invers") || lower.includes("meta")) {
    return TrendingUp;
  }
  return Layers;
}

export function DashboardDistributionCard({
  distribution,
  selectedCurrency,
  onOpenPlanTab,
}: DashboardDistributionCardProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";
  const title = distribution.isCustom
    ? `Regla de distribución (${distribution.ruleLabel})`
    : `Distribución recomendada (${distribution.ruleLabel || "50/30/20"})`;

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-extrabold text-foreground flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{title}</span>
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
          {onOpenPlanTab && (
            <button
              type="button"
              onClick={onOpenPlanTab}
              className="text-[11px] font-bold text-primary hover:underline transition shrink-0 cursor-pointer ml-2"
            >
              Ajustar regla
            </button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col gap-4">
        {/* Dynamic Multi-Color Segmented Horizontal Progress Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted/40 shadow-inner">
          {distribution.buckets.map((b) => {
            const theme =
              CATEGORY_COLOR_THEMES[b.colorKey as CategoryColorKey] ||
              CATEGORY_COLOR_THEMES.blue;
            return (
              <div
                key={b.id}
                className="h-full transition-all"
                style={{
                  width: `${b.percent}%`,
                  backgroundColor: theme.swatchHex,
                }}
                title={`${b.percent}% ${b.name}`}
              />
            );
          })}
        </div>

        {/* Dynamic Breakdown Items */}
        <div className="flex flex-col gap-2.5">
          {distribution.buckets.map((bucket) => {
            const theme =
              CATEGORY_COLOR_THEMES[bucket.colorKey as CategoryColorKey] ||
              CATEGORY_COLOR_THEMES.blue;
            const IconComp = getBucketIcon(bucket.name);

            return (
              <div
                key={bucket.id}
                className="flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: theme.swatchHex }}
                  />
                  <IconComp
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: theme.swatchHex }}
                  />
                  <span className="font-bold text-foreground truncate">
                    {bucket.percent}%{" "}
                    <span className="font-semibold text-muted-foreground">
                      {bucket.name}
                    </span>
                  </span>
                </div>
                <span className="font-extrabold text-foreground tabular-nums text-xs sm:text-sm shrink-0">
                  {currencySymbol} {format(bucket.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
