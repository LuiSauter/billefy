"use client";

import React from "react";
import {
  LayoutGrid,
  Landmark,
  Wallet,
  Coins,
  Banknote,
  Layers,
  List,
} from "lucide-react";
import {
  AccountCategoryGroup,
  CategorySummary,
} from "../domain/accounts-overview";

export type FilterCategory = "all" | AccountCategoryGroup;
export type ViewMode = "grid" | "list";

interface AccountsFilterToolbarProps {
  selectedCategory: FilterCategory;
  onSelectCategory: (category: FilterCategory) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  categoryTotals: Record<AccountCategoryGroup, CategorySummary>;
}

export function AccountsFilterToolbar({
  selectedCategory,
  onSelectCategory,
  viewMode,
  onViewModeChange,
  totalCount,
  categoryTotals,
}: AccountsFilterToolbarProps) {
  const tabs: {
    id: FilterCategory;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "all",
      label: "Todas las cuentas",
      count: totalCount,
      icon: LayoutGrid,
    },
    {
      id: "bancos",
      label: "Bancos",
      count: categoryTotals.bancos.count,
      icon: Landmark,
    },
    {
      id: "wallets",
      label: "Wallets",
      count: categoryTotals.wallets.count,
      icon: Wallet,
    },
    {
      id: "cripto",
      label: "Cripto",
      count: categoryTotals.cripto.count,
      icon: Coins,
    },
    {
      id: "efectivo",
      label: "Efectivo",
      count: categoryTotals.efectivo.count,
      icon: Banknote,
    },
    {
      id: "otros",
      label: "Otros",
      count: categoryTotals.otros.count,
      icon: Layers,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectCategory(tab.id)}
              className={`h-9 px-3.5 rounded-xl text-xs flex items-center gap-2 font-semibold transition shrink-0 cursor-pointer ${
                isActive
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/60 shadow-sm shadow-purple-600/10 font-bold"
                  : "bg-card/70 hover:bg-muted text-muted-foreground border border-border/70 hover:text-foreground"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-purple-400" : "text-muted-foreground"}`} />
              <span>
                {tab.label} <span className="opacity-80">({tab.count})</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid / List Switcher */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-card/60 border border-border/80 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          title="Vista en cuadrícula"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
            viewMode === "grid"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          title="Vista en lista"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
            viewMode === "list"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
