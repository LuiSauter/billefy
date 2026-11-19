"use client";

import React from "react";
import { ArrowLeft, Scale, Pencil, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { accountsPageTitleClassName } from "../accounts-styles";

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
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onBack}
          className="shrink-0 cursor-pointer"
          title="Volver a mis cuentas"
          aria-label="Volver a mis cuentas"
        >
          <ArrowLeft className="text-muted-foreground" />
        </Button>
        <div>
          <h1 className={accountsPageTitleClassName}>Detalle de cuenta</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta el saldo, movimientos y estadísticas de tu cuenta.
          </p>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenReconcile}
          className="flex-1 sm:flex-none text-xs font-bold cursor-pointer"
        >
          <Scale className="text-primary" />
          <span>Conciliar saldo</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onOpenEdit}
          className="flex-1 sm:flex-none text-xs font-bold cursor-pointer"
        >
          <Pencil className="text-muted-foreground" />
          <span>Editar cuenta</span>
        </Button>

        <Button
          type="button"
          onClick={onOpenRegisterTxn}
          className="flex-1 sm:flex-none text-xs font-bold cursor-pointer"
        >
          <Plus className="stroke-[2.5]" />
          <span>Registrar movimiento</span>
        </Button>
      </div>
    </div>
  );
}
