"use client";

import React, { memo } from "react";
import {
  LayoutGrid,
  Landmark,
  Wallet,
  Coins,
  Banknote,
  Layers,
  List,
  type LucideIcon,
} from "lucide-react";
import {
  AccountCategoryGroup,
  CategorySummary,
} from "../domain/accounts-overview";
import { Button } from "@/shared/ui/button";
import { accountsPillClassName, accountsToggleVariant } from "./accounts-styles";

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

/** Static tab metadata; counts are the only per-render data. */
const FILTER_TABS: { id: FilterCategory; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "Todas las cuentas", icon: LayoutGrid },
  { id: "bancos", label: "Bancos", icon: Landmark },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "cripto", label: "Cripto", icon: Coins },
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "otros", label: "Otros", icon: Layers },
];

const FilterPill = memo(function FilterPill({
  id,
  label,
  count,
  icon: Icon,
  active,
  onSelect,
}: {
  id: FilterCategory;
  label: string;
  count: number;
  icon: LucideIcon;
  active: boolean;
  onSelect: (category: FilterCategory) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={accountsToggleVariant(active)}
      aria-pressed={active}
      onClick={() => onSelect(id)}
      className={accountsPillClassName}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>
        {label} <span className="opacity-80">({count})</span>
      </span>
    </Button>
  );
});

export function AccountsFilterToolbar({
  selectedCategory,
  onSelectCategory,
  viewMode,
  onViewModeChange,
  totalCount,
  categoryTotals,
}: AccountsFilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <FilterPill
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            count={tab.id === "all" ? totalCount : categoryTotals[tab.id].count}
            active={selectedCategory === tab.id}
            onSelect={onSelectCategory}
          />
        ))}
      </div>

      {/* Grid / List Switcher */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-card/60 border border-border/70 p-1 rounded-xl">
        <Button
          type="button"
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon-sm"
          onClick={() => onViewModeChange("grid")}
          title="Vista en cuadrícula"
          aria-label="Vista en cuadrícula"
          aria-pressed={viewMode === "grid"}
          className="size-8 md:size-8 rounded-lg cursor-pointer"
        >
          <LayoutGrid />
        </Button>
        <Button
          type="button"
          variant={viewMode === "list" ? "default" : "ghost"}
          size="icon-sm"
          onClick={() => onViewModeChange("list")}
          title="Vista en lista"
          aria-label="Vista en lista"
          aria-pressed={viewMode === "list"}
          className="size-8 md:size-8 rounded-lg cursor-pointer"
        >
          <List />
        </Button>
      </div>
    </div>
  );
}
