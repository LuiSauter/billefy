"use client";

import React from "react";
import { ShieldCheck, KeyRound, Monitor, LogOut } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { notify } from "@/shared/lib/notify";

interface SecuritySectionCardProps {
  onOpenPasswordInfo: () => void;
  onOpenSessions: () => void;
}

export function SecuritySectionCard({
  onOpenPasswordInfo,
  onOpenSessions,
}: SecuritySectionCardProps) {
  return (
    <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 bg-card border-border">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground leading-none">
              Seguridad
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Protege tu cuenta y controla el acceso.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
          {/* Contraseña */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-primary" />
                Contraseña
              </span>
              <Badge variant="secondary" className="w-fit text-[10px] mt-1 bg-emerald-500/15 text-emerald-500 border-none">
                Protegida
              </Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPasswordInfo}
              className="h-7 text-xs font-bold rounded-lg border-border"
            >
              Cambiar
            </Button>
          </div>

          {/* Sesiones activas */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Monitor className="size-3.5" />
                Sesiones activas
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                1 sesión activa (esta sesión)
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSessions}
              className="h-7 text-xs font-bold rounded-lg border-border"
            >
              Ver sesiones
            </Button>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          notify.success("Sesiones cerradas", "Se revocaron los accesos en otros navegadores.");
        }}
        className="w-full text-xs font-bold gap-2 rounded-xl border-border hover:bg-muted"
      >
        <LogOut className="size-3.5" />
        Cerrar otras sesiones
      </Button>
    </Card>
  );
}
