"use client";

import React, { useState } from "react";
import { ArrowLeft, RefreshCw, Pencil, Plus, ChevronDown, ShoppingCart, TrendingDown, ArrowDownUp } from "lucide-react";

interface InvestmentDetailHeaderProps {
  onBack: () => void;
  onOpenUpdatePrice: () => void;
  onOpenEditInvestment: () => void;
  onOpenOperation: (type: "buy" | "sell" | "cash") => void;
}

export function InvestmentDetailHeader({
  onBack,
  onOpenUpdatePrice,
  onOpenEditInvestment,
  onOpenOperation,
}: InvestmentDetailHeaderProps) {
  const [opMenuOpen, setOpMenuOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
          title="Volver a mis inversiones"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

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
        {/* Actualizar precio manual */}
        <button
          type="button"
          onClick={onOpenUpdatePrice}
          className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Actualizar precio</span>
        </button>

        {/* Editar inversión */}
        <button
          type="button"
          onClick={onOpenEditInvestment}
          className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
        >
          <Pencil className="w-3.5 h-3.5 text-purple-400" />
          <span>Editar inversión</span>
        </button>

        {/* Dropdown "+ Registrar operación" */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpMenuOpen(!opMenuOpen)}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/25 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar operación</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {opMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-card border border-border shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setOpMenuOpen(false);
                  onOpenOperation("buy");
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-bold">Compra de activo</span>
                  <span className="text-[10px] text-muted-foreground">Aumenta cantidad de unidades</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpMenuOpen(false);
                  onOpenOperation("sell");
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
              >
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <div className="flex flex-col">
                  <span className="font-bold">Venta de activo</span>
                  <span className="text-[10px] text-muted-foreground">Realiza ganancia o pérdida</span>
                </div>
              </button>

              <div className="border-t border-border/60 my-1" />

              <button
                type="button"
                onClick={() => {
                  setOpMenuOpen(false);
                  onOpenOperation("cash");
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
              >
                <ArrowDownUp className="w-4 h-4 text-purple-400" />
                <div className="flex flex-col">
                  <span className="font-bold">Aporte o retiro de caja</span>
                  <span className="text-[10px] text-muted-foreground">Vinculado a cuentas de banco</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
