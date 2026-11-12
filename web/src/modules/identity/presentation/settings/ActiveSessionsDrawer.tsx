"use client";

import React from "react";
import { Monitor } from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

interface ActiveSessionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActiveSessionsDrawer({
  open,
  onOpenChange,
}: ActiveSessionsDrawerProps) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Sesiones Activas"
      description="Dispositivos y navegadores con acceso autorizado a tu cuenta."
      size="sm"
      footer={
        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full"
        >
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-3 py-2">
        <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="size-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                Navegador Web Actual
              </span>
              <span className="text-[11px] text-muted-foreground">
                Esta sesión activa • Conectado ahora
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-none">
            Activo
          </Badge>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
