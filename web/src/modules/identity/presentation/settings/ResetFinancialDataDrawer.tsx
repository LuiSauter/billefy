"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";

interface ResetFinancialDataDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetting: boolean;
  onConfirm: () => Promise<void>;
}

export function ResetFinancialDataDrawer({
  open,
  onOpenChange,
  resetting,
  onConfirm,
}: ResetFinancialDataDrawerProps) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(next) => !resetting && onOpenChange(next)}
      title="¿Borrar tus datos financieros?"
      description="Se eliminarán tus registros financieros para que puedas empezar de nuevo."
      size="sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            disabled={resetting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={resetting}
            onClick={onConfirm}
          >
            {resetting ? "Borrando..." : "Confirmar borrado"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-2 text-xs text-muted-foreground">
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-foreground font-bold mb-1">Esta acción no se puede deshacer.</strong>
            Se borrarán cuentas, movimientos, datos de importación, préstamos, presupuestos, metas e inversiones.
            <strong className="block text-foreground font-bold mt-2">Tu cuenta, perfil y preferencias no se borrarán.</strong>
            Para eliminar tu cuenta completa, usa por separado la opción “Eliminar cuenta”.
          </div>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
