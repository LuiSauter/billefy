"use client";

import React from "react";
import { InvestmentPerformanceItem, convertInvestmentAmount } from "../../domain/portfolio-analytics";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";
import { Amount, Percentage } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { cn } from "@/shared/lib/utils";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentPerformanceListCardProps {
  items: InvestmentPerformanceItem[];
  onSelectInvestment?: (id: string) => void;
  /** Display currency; each row's value is converted into it. */
  currency?: string;
  /** Parallel rate for assets in another currency. */
  p2pRate?: number;
}

const MAX_ITEMS = 5;

export function InvestmentPerformanceListCard({
  items,
  onSelectInvestment,
  currency = "USD",
  p2pRate = 9.85,
}: InvestmentPerformanceListCardProps) {
  const displayCurrency: "USD" | "BOB" = currency === "BOB" ? "BOB" : "USD";

  return (
    <InvestmentsCard className="@container min-w-0 h-full flex flex-col justify-between">
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Rendimiento por inversión</CardTitle>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col gap-1.5 my-auto`}>
        {items.slice(0, MAX_ITEMS).map((item) => {
          const isPositive = item.performancePct >= 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectInvestment?.(item.id)}
              // Name and figures stack in narrow cards and sit side by side once the card is wide enough.
              className="w-full flex flex-col gap-1.5 @sm:flex-row @sm:items-center @sm:justify-between p-2 rounded-xl text-left hover:bg-muted/60 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CategoryIconBadge
                  iconKey={item.iconKey as CategoryIconKey}
                  colorKey={item.colorKey as CategoryColorKey}
                  size="md"
                />
                <span className="text-sm font-bold text-foreground truncate group-hover:text-purple-400 transition">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pl-12 @sm:pl-0">
                <span className="text-sm font-bold text-foreground">
                  <Amount
                    value={convertInvestmentAmount(item.currentValue, item.currency, displayCurrency, p2pRate)}
                    currency={displayCurrency}
                    size="inherit"
                    tone="inherit"
                  />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border",
                    isPositive
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  )}
                >
                  {item.costKnown === false ? "Costo pendiente" : <Percentage value={item.performancePct} sign="always" size="inherit" tone="inherit" />}
                </span>
              </div>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">
            Aún no tienes inversiones registradas.
          </div>
        )}
      </CardContent>
    </InvestmentsCard>
  );
}
