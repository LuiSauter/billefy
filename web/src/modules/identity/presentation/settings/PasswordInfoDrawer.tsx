"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";

interface PasswordInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordInfoDrawer({
  open,
  onOpenChange,
}: PasswordInfoDrawerProps) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Seguridad de Contraseña"
      description="Gestión de credenciales de acceso."
      size="sm"
      footer={
        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full"
        >
          Entendido
        </Button>
      }
    >
      <div className="flex flex-col gap-3 py-3 text-xs leading-relaxed text-muted-foreground">
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground flex items-start gap-3">
          <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-bold text-foreground mb-1">
              Gestión de contraseña
            </strong>
            Si te registraste con correo y contraseña, podés actualizar tu clave cerrando sesión y
            usando la opción de recuperación. Si iniciaste sesión con Google, gestioná tu seguridad
            directamente desde tu cuenta de Google.
          </div>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
