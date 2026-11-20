"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";

interface DeleteAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountDrawer({
  open,
  onOpenChange,
  deleting,
  onConfirm,
}: DeleteAccountDrawerProps) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="¿Eliminar cuenta?"
      description="Esta acción iniciará un período de gracia de 30 días según la política de privacidad."
      size="sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Procesando..." : "Confirmar eliminación"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-2 text-xs text-muted-foreground">
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-foreground font-bold mb-1">
              Período de gracia de 30 días (Regla AUTH-06)
            </strong>
            Tus datos financieros serán programados para eliminación permanente. Si inicias sesión
            nuevamente dentro de los próximos 30 días, podrás cancelar la solicitud de baja.
          </div>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
