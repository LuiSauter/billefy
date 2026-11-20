"use client";

import React from "react";
import {
  Mail,
  ShieldCheck,
  KeyRound,
  Wallet,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { UserDto, getUserDisplayName } from "../domain/identity.types";
import { UserAvatar } from "./UserAvatar";
import { Amount } from "@/shared/ui/amount";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserDto | null;
  accountsCount: number;
  p2pRate: number;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  accountsCount,
  p2pRate,
  onOpenSettings,
  onLogout,
}: UserProfileModalProps) {
  const displayName = getUserDisplayName(user);

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Mi Perfil"
      description="Información de tu identidad financiera y estado de seguridad en Billefy."
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {onLogout ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
            >
              Configuraciones
            </Button>
            <Button type="button" onClick={onClose}>
              Listo
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Identity Card */}
        <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-center gap-4">
          <div className="scale-125 ml-1">
            <UserAvatar user={user} size="md" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 ml-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground truncate">
                {displayName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Verificado
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user?.email || "Usuario autenticado"}
            </p>
          </div>
        </div>

        {/* Account Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
            <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-muted-foreground">
                Correo Electrónico
              </span>
              <span className="text-sm font-bold text-foreground truncate mt-0.5">
                {user?.email || "No especificado"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-muted-foreground">
                ID de Usuario
              </span>
              <span className="text-sm font-mono font-semibold text-foreground truncate mt-0.5">
                {user?.id ? `${user.id.slice(0, 12)}...` : "Sesión local"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
            <Wallet className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-muted-foreground">
                Cuentas Activas
              </span>
              <span className="text-sm font-extrabold text-foreground mt-0.5">
                {accountsCount} {accountsCount === 1 ? "cuenta registrada" : "cuentas registradas"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-muted-foreground">
                Tasa P2P Referencial
              </span>
              <span className="text-sm font-extrabold text-emerald-500 mt-0.5">
                1 USDT = <Amount value={p2pRate} currency="BOB" size="inherit" tone="inherit" />
              </span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-accent/50 border border-primary/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-extrabold text-foreground">
              Libro Mayor Inmutable & Privacidad Activa
            </span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              Tus saldos se calculan en tiempo real a partir de transacciones inmutables con precisión decimal exacta. Ningún dato sensible se comparte con terceros sin tu consentimiento.
            </span>
          </div>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
