"use client";

import React from "react";
import { Plus, Home, Laptop, TrendingUp, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { AssetSummaryItem } from "../../domain/dashboard-home-analytics";

interface DashboardAssetsCardProps {
  assets: AssetSummaryItem[];
  selectedCurrency: string;
  onOpenPatrimonio?: () => void;
  onAddAsset?: () => void;
}

export function DashboardAssetsCard({
  assets,
  selectedCurrency,
  onOpenPatrimonio,
  onAddAsset,
}: DashboardAssetsCardProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  const getAssetIcon = (key: string) => {
    switch (key) {
      case "realestate":
        return { icon: Home, bg: "bg-blue-500/15 border-blue-500/30 text-blue-400" };
      case "digital":
        return { icon: Laptop, bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" };
      case "vehicles":
        return { icon: Car, bg: "bg-purple-500/15 border-purple-500/30 text-purple-400" };
      default:
        return { icon: TrendingUp, bg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400" };
    }
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-extrabold text-foreground">
          Mis activos (patrimonio)
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAsset || onOpenPatrimonio}
          className="h-7 px-2.5 rounded-lg text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col gap-2.5">
        {assets.map((asset) => {
          const { icon: Icon, bg } = getAssetIcon(asset.key);
          return (
            <div
              key={asset.key}
              onClick={onOpenPatrimonio}
              className="py-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/20 transition-colors rounded-xl px-1 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">
                    {asset.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-medium">
                    {asset.sublabel}
                  </span>
                </div>
              </div>

              <span className="text-xs sm:text-sm font-extrabold tabular-nums text-foreground shrink-0">
                {currencySymbol} {format(asset.amount)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
