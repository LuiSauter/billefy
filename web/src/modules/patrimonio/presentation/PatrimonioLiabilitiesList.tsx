"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Home, User, CreditCard, MoreHorizontal, Trash2 } from "lucide-react";
import { LiabilityCategorySummary } from "../domain/patrimonio.types";
import { Amount } from "@/shared/ui/amount";

interface PatrimonioLiabilitiesListProps {
  categories: LiabilityCategorySummary[];
  totalLiabilities: number;
  onSelectCategory?: (category: string) => void;
  onDeleteLiability?: (id: string) => void;
  currency?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  user: User,
  "credit-card": CreditCard,
  "more-horizontal": MoreHorizontal,
};

export function PatrimonioLiabilitiesList({
  categories,
  totalLiabilities,
  onDeleteLiability,
  currency = "USD",
}: PatrimonioLiabilitiesListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleExpand = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Mis pasivos
        </h3>
        <span className="text-base sm:text-lg font-black text-foreground">
          <Amount value={totalLiabilities} currency={currency} size="inherit" tone="inherit" />
        </span>
      </div>

      <div className="flex flex-col divide-y divide-border/40">
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || MoreHorizontal;
          const isExpanded = !!expandedCategories[cat.category];

          return (
            <div key={cat.category} className="py-2.5 flex flex-col">
              <div
                onClick={() => toggleExpand(cat.category)}
                className="py-2 flex items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground group-hover:text-purple-400 transition truncate">
                      {cat.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {cat.itemsCount} {cat.itemsCount === 1 ? "compromiso" : "compromisos"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-foreground">
                      <Amount value={cat.totalAmount} currency={currency} size="inherit" tone="inherit" />
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {cat.percentage}%
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-purple-400 transition" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                  )}
                </div>
              </div>

              {/* Sub-items Drilldown */}
              {isExpanded && (
                <div className="mt-2 ml-4 sm:ml-12 pl-3 border-l-2 border-border/80 flex flex-col gap-2 py-1 animate-in fade-in duration-100">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition text-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                          {item.notes && <span>{item.notes}</span>}
                          {item.originalAmount !== undefined && item.currency && item.currency !== currency && (
                            <span className="font-mono text-rose-400">
                              • Orig: <Amount value={item.originalAmount} currency={item.currency} size="inherit" tone="inherit" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-bold text-rose-400">
                          <Amount value={item.amount} currency={currency} size="inherit" tone="inherit" />
                        </span>

                        {!item.isFromModule && onDeleteLiability && (
                          <button
                            type="button"
                            onClick={() => onDeleteLiability(item.id)}
                            title="Eliminar pasivo"
                            className="p-1 text-muted-foreground/60 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tienes deudas ni pasivos registrados.
          </div>
        )}
      </div>
    </div>
  );
}
