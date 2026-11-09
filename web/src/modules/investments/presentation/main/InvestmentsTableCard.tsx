"use client";

import React, { useState } from "react";
import { MoreVertical, ExternalLink, RefreshCw, ArrowDownUp, Trash2 } from "lucide-react";
import { Investment, InvestmentKind } from "../../domain/investment.types";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface InvestmentsTableCardProps {
  investments: Investment[];
  kindCounts: Record<InvestmentKind, number>;
  totalCount: number;
  onSelectInvestment: (id: string) => void;
  onOpenUpdatePrice: (investment: Investment) => void;
  onOpenCashModal: (investment: Investment) => void;
  onDeleteInvestment: (id: string) => void;
  currency?: string;
  formatter?: (val: number) => string;
}

const KIND_PILLS: { key: "all" | InvestmentKind; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "crypto", label: "Cripto" },
  { key: "funds", label: "Fondos / ETFs" },
  { key: "stocks", label: "Acciones" },
  { key: "realestate", label: "Bienes raíces" },
  { key: "other", label: "Otros" },
];

const KIND_LABELS: Record<InvestmentKind, string> = {
  crypto: "Criptoactivo",
  funds: "Fondo / ETF",
  stocks: "Acción",
  realestate: "Bienes raíces",
  other: "Otros",
};

export function InvestmentsTableCard({
  investments,
  kindCounts,
  totalCount,
  onSelectInvestment,
  onOpenUpdatePrice,
  onOpenCashModal,
  onDeleteInvestment,
  currency = "$",
  formatter,
}: InvestmentsTableCardProps) {
  const [selectedKind, setSelectedKind] = useState<"all" | InvestmentKind>("all");

  const filteredInvestments =
    selectedKind === "all"
      ? investments
      : investments.filter((i) => i.kind === selectedKind);

  const getPillCount = (key: "all" | InvestmentKind) => {
    if (key === "all") return totalCount;
    return kindCounts[key] || 0;
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-5">
      {/* Header and Filter Pills */}
      <div className="flex flex-col gap-3">
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Mis inversiones
        </h3>

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
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 px-5">
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
            {filteredInvestments.map((inv) => {
              const gainLoss = inv.currentValue - inv.initialValue;
              const isPositive = gainLoss >= 0;
              const perfPct =
                inv.initialValue > 0 ? (gainLoss / inv.initialValue) * 100 : 0;

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
                          {inv.quantity.toLocaleString("en-US")} u. • {inv.currency}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted/80 text-foreground/90 border border-border/60">
                      {KIND_LABELS[inv.kind] || "Otro"}
                    </span>
                  </td>

                  {/* Valor actual */}
                  <td className="py-3.5 px-3 font-mono font-bold text-foreground text-xs sm:text-sm">
                    {formatter
                      ? `${formatter(inv.currentValue)} ${inv.currency}`
                      : `${currency} ${inv.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>

                  {/* Aporte total */}
                  <td className="py-3.5 px-3 font-mono text-muted-foreground">
                    {currency} {inv.initialValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Ganancia / Pérdida */}
                  <td className="py-3.5 px-3 font-mono font-bold">
                    <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                      {isPositive ? "+ " : "- "}
                      {currency} {Math.abs(gainLoss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      {isPositive ? "+" : ""}{perfPct.toFixed(1)}%
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
                          onClick={() => onDeleteInvestment(inv.id)}
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

            {filteredInvestments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                  No hay inversiones en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
