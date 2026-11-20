"use client";

import React from "react";
import { ArrowLeft, RefreshCw, Archive, Plus, ChevronDown, ShoppingCart, TrendingDown, ArrowDownUp } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface InvestmentDetailHeaderProps {
  onBack: () => void;
  onOpenUpdatePrice: () => void;
  /** Opens the archive confirmation (the only destructive action this screen offers). */
  onOpenArchiveInvestment: () => void;
  onOpenOperation: (type: "buy" | "sell" | "cash") => void;
}

export function InvestmentDetailHeader({
  onBack,
  onOpenUpdatePrice,
  onOpenArchiveInvestment,
  onOpenOperation,
}: InvestmentDetailHeaderProps) {
  return (
    <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={onBack}
          title="Volver a mis inversiones"
          aria-label="Volver a mis inversiones"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Detalle de inversión
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
            Consulta el desempeño, operaciones y evolución de tu inversión.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Button type="button" variant="outline" className="h-10 text-xs" onClick={onOpenUpdatePrice}>
          <RefreshCw className="text-cyan-400" aria-hidden="true" />
          <span>Actualizar precio</span>
        </Button>

        <Button type="button" variant="outline" className="h-10 text-xs" onClick={onOpenArchiveInvestment}>
          <Archive className="text-purple-400" aria-hidden="true" />
          <span>Archivar inversión</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/25">
                <Plus className="stroke-[2.5]" aria-hidden="true" />
                <span>Registrar operación</span>
                <ChevronDown aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem className="gap-2.5 py-2" onClick={() => onOpenOperation("buy")}>
              <ShoppingCart className="text-emerald-400" />
              <div className="flex flex-col">
                <span className="font-bold text-xs">Compra de activo</span>
                <span className="text-[10px] text-muted-foreground">Aumenta cantidad de unidades</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2.5 py-2" onClick={() => onOpenOperation("sell")}>
              <TrendingDown className="text-rose-400" />
              <div className="flex flex-col">
                <span className="font-bold text-xs">Venta de activo</span>
                <span className="text-[10px] text-muted-foreground">Realiza ganancia o pérdida</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="gap-2.5 py-2" onClick={() => onOpenOperation("cash")}>
              <ArrowDownUp className="text-purple-400" />
              <div className="flex flex-col">
                <span className="font-bold text-xs">Aporte o retiro de caja</span>
                <span className="text-[10px] text-muted-foreground">Vinculado a cuentas de banco</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
