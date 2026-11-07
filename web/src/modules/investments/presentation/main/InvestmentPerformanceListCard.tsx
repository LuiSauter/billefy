"use client";

import React from "react";
import { InvestmentPerformanceItem } from "../../domain/portfolio-analytics";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";

interface InvestmentPerformanceListCardProps {
  items: InvestmentPerformanceItem[];
  onSelectInvestment?: (id: string) => void;
  currency?: string;
}

export function InvestmentPerformanceListCard({
  items,
  onSelectInvestment,
  currency = "$",
}: InvestmentPerformanceListCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <h3 className="text-base font-bold text-foreground tracking-tight mb-3">
        Rendimiento por inversión
      </h3>

      <div className="flex flex-col gap-3 my-auto">
        {items.slice(0, 5).map((item) => {
          const isPositive = item.performancePct >= 0;
          return (
            <div
              key={item.id}
              onClick={() => onSelectInvestment?.(item.id)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CategoryIconBadge
                  iconKey={item.iconKey as CategoryIconKey}
                  colorKey={item.colorKey as CategoryColorKey}
                  size="md"
                />
                <span className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-purple-400 transition">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                  {currency} {item.currentValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    isPositive
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {isPositive ? "+" : ""}{item.performancePct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">
            Aún no tienes inversiones registradas.
          </div>
        )}
      </div>
    </div>
  );
}
