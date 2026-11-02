"use client";

import React from "react";
import { ArrowLeft, Scale, Pencil, Plus } from "lucide-react";

interface AccountDetailHeaderProps {
  onBack: () => void;
  onOpenReconcile: () => void;
  onOpenEdit: () => void;
  onOpenRegisterTxn: () => void;
}

export function AccountDetailHeader({
  onBack,
  onOpenReconcile,
  onOpenEdit,
  onOpenRegisterTxn,
}: AccountDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
      {/* Left: Back button + Title & Subtitle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-card hover:bg-muted/80 border border-border text-foreground flex items-center justify-center transition shadow-2xs cursor-pointer shrink-0"
          title="Volver a mis cuentas"
          aria-label="Volver a mis cuentas"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Detalle de cuenta
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta el saldo, movimientos y estadísticas de tu cuenta.
          </p>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
        <button
          type="button"
          onClick={onOpenReconcile}
          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-card hover:bg-muted/80 border border-border text-foreground text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
        >
          <Scale className="w-4 h-4 text-purple-400" />
          <span>Conciliar saldo</span>
        </button>

        <button
          type="button"
          onClick={onOpenEdit}
          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-card hover:bg-muted/80 border border-border text-foreground text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
          <span>Editar cuenta</span>
        </button>

        <button
          type="button"
          onClick={onOpenRegisterTxn}
          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar movimiento</span>
        </button>
      </div>
    </div>
  );
}
