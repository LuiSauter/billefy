"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, MoreVertical, Coins } from "lucide-react";
import { InvestmentOperation } from "../../domain/investment-detail";

interface InvestmentOperationsTableProps {
  operations: InvestmentOperation[];
  currencySymbol?: string;
  assetTicker?: string;
  onViewAll?: () => void;
}

export function InvestmentOperationsTable({
  operations,
  currencySymbol = "$",
  assetTicker = "u.",
  onViewAll,
}: InvestmentOperationsTableProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground tracking-tight">
          Operaciones recientes
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer flex items-center gap-1"
          >
            <span>Ver todas</span>
            <span>→</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-left border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-border/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="pb-3 pl-2">Fecha</th>
              <th className="pb-3 px-3">Tipo</th>
              <th className="pb-3 px-3">Cantidad ({assetTicker})</th>
              <th className="pb-3 px-3">Precio unitario</th>
              <th className="pb-3 px-3">Monto</th>
              <th className="pb-3 px-3">Estado</th>
              <th className="pb-3 pr-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {operations.map((op) => {
              const isBuy = op.type === "buy" || op.type === "contribution";
              const isSell = op.type === "sell" || op.type === "withdrawal";

              const formattedDate = new Date(op.date).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              return (
                <tr key={op.id} className="hover:bg-muted/40 transition">
                  {/* Fecha */}
                  <td className="py-3 pl-2 text-foreground font-medium whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Tipo */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {isBuy ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Compra</span>
                      </span>
                    ) : isSell ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Venta</span>
                      </span>
                    ) : op.type === "dividend" ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>Dividendo / Renta</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-cyan-400 font-bold">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Valuación</span>
                      </span>
                    )}
                  </td>

                  {/* Cantidad */}
                  <td className="py-3 px-3 font-mono font-medium text-foreground">
                    {op.quantity.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                  </td>

                  {/* Precio unitario */}
                  <td className="py-3 px-3 font-mono text-muted-foreground">
                    {currencySymbol} {op.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Monto */}
                  <td className="py-3 px-3 font-mono font-bold text-foreground">
                    {currencySymbol} {op.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Estado */}
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Completada
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 pr-2 text-right">
                    <button
                      type="button"
                      title={op.notes || "Detalle de operación"}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {operations.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">
                  No hay operaciones registradas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
