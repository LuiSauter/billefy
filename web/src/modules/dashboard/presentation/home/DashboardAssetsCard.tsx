"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Plus, Home, Laptop, TrendingUp, Car } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { Button } from "@/shared/ui/button";
import { Amount } from "@/shared/ui/amount";
import { IconTile, type IconTileVariant } from "./IconTile";
import type { AssetSummaryItem } from "../../domain/dashboard-home-analytics";

interface DashboardAssetsCardProps {
  assets: AssetSummaryItem[];
  selectedCurrency: string;
  onOpenPatrimonio?: () => void;
  onAddAsset?: () => void;
}

function getAssetIcon(key: string): { icon: LucideIcon; variant: IconTileVariant } {
  switch (key) {
    case "realestate":
      return { icon: Home, variant: "blue" };
    case "digital":
      return { icon: Laptop, variant: "emerald" };
    case "vehicles":
      return { icon: Car, variant: "purple" };
    default:
      return { icon: TrendingUp, variant: "indigo" };
  }
}

export function DashboardAssetsCard({
  assets,
  selectedCurrency,
  onOpenPatrimonio,
  onAddAsset,
}: DashboardAssetsCardProps) {
  return (
    <DashboardCard className="overflow-hidden h-full">
      <CardHeader className={`${dashboardCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <CardTitle className={dashboardCardTitleClassName}>
          Mis activos (patrimonio)
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAsset || onOpenPatrimonio}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-border bg-background hover:bg-muted text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar</span>
        </Button>
      </CardHeader>

      <CardContent className={`${dashboardCardContentClassName} flex flex-col gap-2.5`}>
        {assets.map((asset) => {
          const { icon, variant } = getAssetIcon(asset.key);
          return (
            <div
              key={asset.key}
              onClick={onOpenPatrimonio}
              className="py-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/20 transition-colors rounded-xl px-1 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconTile icon={icon} variant={variant} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {asset.label}
                  </span>
                  <span className="text-xs text-muted-foreground truncate font-medium">
                    {asset.sublabel}
                  </span>
                </div>
              </div>

              <Amount value={asset.amount} currency={selectedCurrency} size="sm" className="shrink-0" />
            </div>
          );
        })}
      </CardContent>
    </DashboardCard>
  );
}
