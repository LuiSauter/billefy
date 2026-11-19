"use client";

import React, { useState } from "react";
import { Sparkles, Trash2, ExternalLink } from "lucide-react";
import { AssetCategorySummary } from "../domain/patrimonio.types";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { PatrimonioCard } from "./PatrimonioCard";
import { PatrimonioCategoryRow } from "./PatrimonioCategoryRow";
import { ConfirmDeleteItemDrawer, type PendingDeletion } from "./ConfirmDeleteItemDrawer";
import { PATRIMONIO_CATEGORY_ICONS } from "./category-icons";

interface PatrimonioAssetsListProps {
  categories: AssetCategorySummary[];
  totalAssets: number;
  onSelectCategory?: (category: string) => void;
  onDeleteAsset?: (id: string) => void | Promise<void>;
  currency?: string;
}

export function PatrimonioAssetsList({
  categories,
  totalAssets,
  onSelectCategory,
  onDeleteAsset,
  currency = "USD",
}: PatrimonioAssetsListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const toggleExpand = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  return (
    <PatrimonioCard>
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <CardTitle className={appCardTitleClassName}>Mis activos</CardTitle>
        <span className="text-base font-black text-foreground">
          <Amount value={totalAssets} currency={currency} size="inherit" tone="inherit" />
        </span>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col divide-y divide-border/40`}>
        {categories.map((cat) => (
          <PatrimonioCategoryRow
            key={cat.category}
            icon={PATRIMONIO_CATEGORY_ICONS[cat.icon] || Sparkles}
            color={cat.color}
            title={cat.label}
            subtitle={`${cat.description} (${cat.itemsCount} ${cat.itemsCount === 1 ? "activo" : "activos"})`}
            totalAmount={cat.totalValue}
            percentage={cat.percentage}
            currency={currency}
            expanded={!!expandedCategories[cat.category]}
            onToggle={() => toggleExpand(cat.category)}
          >
            {cat.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition text-xs"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-foreground truncate">{item.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                    {item.notes && <span>{item.notes}</span>}
                    {item.originalValue !== undefined && item.currency && item.currency !== currency && (
                      <span className="text-purple-400">
                        • Orig: <Amount value={item.originalValue} currency={item.currency} size="inherit" tone="inherit" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-bold text-foreground">
                    <Amount value={item.value} currency={currency} size="inherit" tone="inherit" />
                  </span>

                  {item.isFromModule && cat.category === "investments" && onSelectCategory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onSelectCategory("investments")}
                      title="Ver en módulo de Inversiones"
                      aria-label="Ver en módulo de Inversiones"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink aria-hidden="true" />
                    </Button>
                  )}

                  {!item.isFromModule && onDeleteAsset && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setPendingDeletion({ id: item.id, name: item.name })}
                      title="Eliminar activo"
                      aria-label={`Eliminar activo ${item.name}`}
                      className="text-muted-foreground/60 hover:text-rose-400"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </PatrimonioCategoryRow>
        ))}

        {categories.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tienes activos registrados todavía. Tocá «+ Agregar activo».
          </div>
        )}
      </CardContent>

      {onDeleteAsset && (
        <ConfirmDeleteItemDrawer
          item={pendingDeletion}
          noun="activo"
          onConfirm={onDeleteAsset}
          onClose={() => setPendingDeletion(null)}
        />
      )}
    </PatrimonioCard>
  );
}
