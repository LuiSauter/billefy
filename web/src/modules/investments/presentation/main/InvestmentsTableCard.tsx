"use client";

import React, { useMemo, useState } from "react";
import { MoreVertical, ExternalLink, RefreshCw, ArrowDownUp, Trash2 } from "lucide-react";
import Decimal from "decimal.js";
import { Investment, InvestmentKind, getKindLabel, investmentCostBasis, investmentVariationPct } from "../../domain/investment.types";
import { convertInvestmentAmount, filterInvestmentsByKind } from "../../domain/portfolio-analytics";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Amount, Percentage, Quantity } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentsTableCardProps {
  investments: Investment[];
  kindCounts: Record<InvestmentKind, number>;
  totalCount: number;
  onSelectInvestment: (id: string) => void;
  onOpenUpdatePrice: (investment: Investment) => void;
  onOpenCashModal: (investment: Investment) => void;
  /** Opens the archive confirmation; the table never deletes by itself. */
  onArchiveInvestment: (investment: Investment) => void;
  onOpenPurchase?: (investment: Investment) => void;
  /** Single display currency for value, cost and gain of every row. */
  currency?: string;
  /** Parallel rate used to convert assets denominated in another currency. */
  p2pRate?: number;
}

const KIND_PILLS: { key: "all" | InvestmentKind; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "crypto", label: "Cripto" },
  { key: "funds", label: "Fondos / ETFs" },
  { key: "stocks", label: "Acciones" },
  { key: "realestate", label: "Bienes raíces" },
  { key: "other", label: "Otros" },
];

export function InvestmentsTableCard({
  investments,
  kindCounts,
  totalCount,
  onSelectInvestment,
  onOpenUpdatePrice,
  onOpenCashModal,
  onArchiveInvestment,
  onOpenPurchase,
  currency = "USD",
  p2pRate = 9.85,
}: InvestmentsTableCardProps) {
  const [selectedKind, setSelectedKind] = useState<"all" | InvestmentKind>("all");
  const displayCurrency: "USD" | "BOB" = currency === "BOB" ? "BOB" : "USD";

  const rows = useMemo(
    () =>
      filterInvestmentsByKind(investments, selectedKind).map((inv) => {
        const toDisplay = (amount: number) => convertInvestmentAmount(amount, inv.currency, displayCurrency, p2pRate);
        const costBasis = investmentCostBasis(inv);
        return {
          inv,
          value: toDisplay(inv.currentValue),
          cost: costBasis === null ? null : toDisplay(costBasis),
          gainLoss: costBasis === null ? 0 : toDisplay(new Decimal(inv.currentValue).minus(costBasis).toNumber()),
          perfPct: investmentVariationPct(inv) ?? 0,
        };
      }),
    [investments, selectedKind, displayCurrency, p2pRate]
  );

  const getPillCount = (key: "all" | InvestmentKind) => {
    if (key === "all") return totalCount;
    return kindCounts[key] || 0;
  };

  return (
    <InvestmentsCard className="min-w-0">
      {/* Header and Filter Pills */}
      <CardHeader className={`${appCardHeaderClassName} gap-3`}>
        <CardTitle className={appCardTitleClassName}>Mis inversiones</CardTitle>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {KIND_PILLS.map((pill) => {
            const isSelected = selectedKind === pill.key;
            const count = getPillCount(pill.key);
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setSelectedKind(pill.key)}
                className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/60 shadow-xs font-bold"
                    : "bg-card/70 hover:bg-muted text-muted-foreground border border-border/70 hover:text-foreground"
                }`}
              >
                <span>{pill.label}</span>
                <span className="opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* Table */}
      <CardContent className={`${appCardContentClassName} overflow-x-auto`}>
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="border-b border-border/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="pb-3 pl-2">Inversión</th>
              <th className="pb-3 px-3">Tipo</th>
              <th className="pb-3 px-3">Valor actual</th>
              <th className="pb-3 px-3">Aporte total</th>
              <th className="pb-3 px-3">Ganancia / Pérdida</th>
              <th className="pb-3 px-3">Rendimiento</th>
              <th className="pb-3 pr-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {rows.map(({ inv, value, cost, gainLoss, perfPct }) => {
              const isPositive = gainLoss >= 0;

              return (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvestment(inv.id)}
                  className="hover:bg-muted/40 transition group cursor-pointer"
                >
                  {/* Inversión */}
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-3">
                      <CategoryIconBadge
                        iconKey={inv.iconKey as CategoryIconKey}
                        colorKey={inv.colorKey as CategoryColorKey}
                        size="md"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-foreground text-xs sm:text-sm group-hover:text-purple-400 transition truncate">
                          {inv.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          <Quantity value={inv.quantity} size="inherit" /> u. • {inv.currency}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted/80 text-foreground/90 border border-border/60">
                      {getKindLabel(inv.kind)}
                    </span>
                  </td>

                  {/* Valor actual */}
                  <td className="py-3.5 px-3 font-bold text-foreground text-xs sm:text-sm">
                    <Amount value={value} currency={displayCurrency} size="inherit" tone="inherit" />
                  </td>

                  {/* Aporte total */}
                  <td className="py-3.5 px-3 text-muted-foreground">
                    {cost === null ? "Costo pendiente" : <Amount value={cost} currency={displayCurrency} size="inherit" tone="inherit" />}
                  </td>

                  {/* Ganancia / Pérdida */}
                  <td className="py-3.5 px-3 font-bold">
                    <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                      {cost === null ? "No disponible" : <Amount value={gainLoss} sign="always" currency={displayCurrency} size="inherit" tone="inherit" />}
                    </span>
                  </td>

                  {/* Rendimiento */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        isPositive
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {cost === null ? "No disponible" : <Percentage value={perfPct} sign="always" size="inherit" tone="inherit" />}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td
                    className="py-3.5 pr-2 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
                            title="Opciones de inversión"
                            aria-label="Opciones de inversión"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onSelectInvestment(inv.id)}>
                          <ExternalLink className="w-4 h-4 text-purple-400" />
                          <span>Ver detalle</span>
                        </DropdownMenuItem>

                        {onOpenPurchase && <DropdownMenuItem onClick={() => onOpenPurchase(inv)}>
                          <ArrowDownUp className="w-4 h-4" /><span>Comprar unidades</span>
                        </DropdownMenuItem>}

                        <DropdownMenuItem onClick={() => onOpenUpdatePrice(inv)}>
                          <RefreshCw className="w-4 h-4 text-cyan-400" />
                          <span>Actualizar precio</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onOpenCashModal(inv)}>
                          <ArrowDownUp className="w-4 h-4 text-emerald-400" />
                          <span>Registrar aporte/retiro</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onArchiveInvestment(inv)}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Archivar activo</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                  No hay inversiones en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </InvestmentsCard>
  );
}
