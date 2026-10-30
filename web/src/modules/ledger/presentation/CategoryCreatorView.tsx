"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { TransactionDirection } from "../domain/ledger.types";
import {
  CATEGORY_COLOR_LIST,
  CATEGORY_COLOR_THEMES,
  CategoryColorKey,
  CategoryIconGroupKey,
  CategoryIconKey,
  UserCategory,
} from "../domain/category.types";
import {
  CATEGORY_ICON_GROUPS,
  CATEGORY_ICON_LIBRARY,
  CategoryIcon,
  CategoryIconBadge,
} from "./CategoryIcon";
import { useUserCategories } from "../application/CategoriesContext";
import { Input } from "@/shared/ui/input";

interface CategoryCreatorViewProps {
  formId: string;
  direction: TransactionDirection;
  onCancel: () => void;
  onCreated: (category: UserCategory) => void;
  onValidityChange?: (isValid: boolean) => void;
}

export function CategoryCreatorView({
  formId,
  direction,
  onCancel,
  onCreated,
  onValidityChange,
}: CategoryCreatorViewProps) {
  const { createCategory } = useUserCategories();
  const isExpense = direction === "Expense";
  const directionLabel = isExpense ? "gasto" : "ingreso";

  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey>(
    isExpense ? "utensils" : "briefcase"
  );
  const [colorKey, setColorKey] = useState<CategoryColorKey>(
    isExpense ? "rose" : "emerald"
  );
  const [activeGroup, setActiveGroup] = useState<"ALL" | CategoryIconGroupKey>(
    "ALL"
  );

  // Update default icon/color when user switches between Expense and Income tabs
  useEffect(() => {
    setIconKey(isExpense ? "utensils" : "briefcase");
    setColorKey(isExpense ? "rose" : "emerald");
  }, [isExpense]);

  const isValid = name.trim().length > 0;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const selectedIconDef = CATEGORY_ICON_LIBRARY.find((i) => i.key === iconKey);
  const selectedColorTheme = CATEGORY_COLOR_THEMES[colorKey];

  const visibleGroups =
    activeGroup === "ALL"
      ? CATEGORY_ICON_GROUPS
      : CATEGORY_ICON_GROUPS.filter((g) => g.key === activeGroup);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const created = createCategory({
      name: name.trim(),
      direction,
      iconKey,
      colorKey,
    });
    onCreated(created);
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-2 duration-150"
    >
      {/* Top Navigation Bar: Go Back button + Live Category Badge Preview */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-muted border border-border text-xs font-extrabold text-foreground transition active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al movimiento</span>
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-xs font-extrabold text-foreground truncate max-w-[150px]">
              {name.trim() || `Categoría de ${directionLabel}`}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {selectedIconDef?.label || "Ícono"} · {selectedColorTheme.label}
            </span>
          </div>
          <CategoryIconBadge iconKey={iconKey} colorKey={colorKey} size="md" />
        </div>
      </div>

      {/* 1. Category Name Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-foreground">
          Nombre de la categoría de {directionLabel}
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            isExpense
              ? "Ej. Supermercado, Restaurante, Gasolina, Alquiler..."
              : "Ej. Sueldo, Freelance, Venta P2P, Dividendos..."
          }
          autoFocus
        />
      </div>

      {/* 2. Background Color Picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-foreground">
            Color de fondo del ícono
          </label>
          <span className="text-xs font-semibold text-muted-foreground">
            {selectedColorTheme.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {CATEGORY_COLOR_LIST.map((color) => {
            const active = colorKey === color.key;
            return (
              <button
                key={color.key}
                type="button"
                onClick={() => setColorKey(color.key)}
                title={color.label}
                style={{ backgroundColor: color.swatchHex }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition transform ${
                  active
                    ? "scale-110 ring-2 ring-offset-2 ring-offset-card ring-foreground shadow-sm"
                    : "opacity-75 hover:opacity-100 hover:scale-105"
                }`}
              >
                {active && <Check className="w-4 h-4 text-white stroke-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Grouped Icon Library */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-foreground">
            Biblioteca de íconos
          </label>
          <span className="text-xs font-semibold text-primary">
            {selectedIconDef?.label}
          </span>
        </div>

        {/* Group Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveGroup("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
              activeGroup === "ALL"
                ? "bg-primary text-white shadow-2xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({CATEGORY_ICON_LIBRARY.length})
          </button>
          {CATEGORY_ICON_GROUPS.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                activeGroup === group.key
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        {/* Grouped Icons Scroll Area */}
        <div className="max-h-[230px] overflow-y-auto pr-1 flex flex-col gap-4">
          {visibleGroups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {group.icons.length} íconos
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {group.icons.map((item) => {
                  const active = iconKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={`${group.label}: ${item.label}`}
                      onClick={() => setIconKey(item.key)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                        active
                          ? "bg-accent border-primary text-foreground ring-2 ring-primary/30"
                          : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          active
                            ? `${selectedColorTheme.bgClass} ${selectedColorTheme.textClass}`
                            : "bg-muted/60 text-foreground"
                        }`}
                      >
                        <CategoryIcon iconKey={item.key} className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold truncate w-full text-center leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
