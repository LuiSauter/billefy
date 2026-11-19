"use client";

import React from "react";
import { Bitcoin, TrendingUp, Layers, type LucideIcon } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { Badge } from "@/shared/ui/badge";
import { Amount } from "@/shared/ui/amount";
import { IconTile, type IconTileVariant } from "./IconTile";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import type { TopInvestmentItem } from "../../domain/dashboard-home-analytics";

interface DashboardTopInvestmentsCardProps {
  investments: TopInvestmentItem[];
  selectedCurrency: string;
  onOpenInvestmentsTab?: () => void;
}

function getIcon(type: string, name: string): { icon: LucideIcon; variant: IconTileVariant } {
  const lower = `${type} ${name}`.toLowerCase();
  if (lower.includes("crypto") || lower.includes("btc") || lower.includes("bitcoin")) {
    return { icon: Bitcoin, variant: "amber" };
  }
  if (lower.includes("fondo") || lower.includes("fund") || lower.includes("layer")) {
    return { icon: Layers, variant: "blue" };
  }
  return { icon: TrendingUp, variant: "purple" };
}

export function DashboardTopInvestmentsCard({
  investments,
  selectedCurrency,
  onOpenInvestmentsTab,
}: DashboardTopInvestmentsCardProps) {
  const numberPreferences = useNumberPreferences();

  return (
    <DashboardCard className="overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className={dashboardCardHeaderClassName}>
        <CardTitle className={dashboardCardTitleClassName}>
          Principales inversiones
        </CardTitle>
      </CardHeader>

      <CardContent className={`${dashboardCardContentClassName} flex flex-col justify-between flex-1`}>
        {investments.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 flex-1">
            <IconTile icon={TrendingUp} variant="muted" />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-xs">Sin inversiones activas</span>
              <span className="text-xs text-muted-foreground">
                Comienza registrando tus posiciones en cripto, fondos o acciones.
              </span>
            </div>
            {onOpenInvestmentsTab && (
              <button
                type="button"
                onClick={onOpenInvestmentsTab}
                className="mt-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                + Ir a Inversiones
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/50">
            {investments.map((inv) => {
              const { icon, variant } = getIcon(inv.type, inv.name);
              return (
                <div
                  key={inv.id}
                  onClick={onOpenInvestmentsTab}
                  className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors -mx-4 px-4 group"
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <IconTile icon={icon} variant={variant} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {inv.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Amount value={inv.balance} currency={selectedCurrency} size="sm" className="shrink-0" />
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full"
                    >
                      {inv.yieldRate >= 0 ? "+" : "-"}{formatPercent(Math.abs(inv.yieldRate), numberPreferences)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </DashboardCard>
  );
}
