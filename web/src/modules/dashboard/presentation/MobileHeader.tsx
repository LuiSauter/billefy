"use client";

import React from "react";
import { Bell, Wallet } from "lucide-react";
import { UserDto } from "@/modules/identity/domain/identity.types";
import { UserMenuDropdown } from "@/modules/identity/presentation/UserMenuDropdown";

interface MobileHeaderProps {
  user?: UserDto | null;
  p2pRate: number;
  draftsCount: number;
  onOpenDrafts: () => void;
  onOpenFx: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export function MobileHeader({
  user,
  p2pRate,
  draftsCount,
  onOpenDrafts,
  onOpenFx,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: MobileHeaderProps) {
  return (
    <header className="md:hidden bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-30 px-4 h-[60px] flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-[10px] bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
          <Wallet className="w-4 h-4" />
        </div>
        <span className="text-base font-extrabold tracking-tight text-foreground">
          Billefy
        </span>
        <button
          type="button"
          onClick={onOpenFx}
          className="ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent border border-primary/25 text-accent-foreground text-[11px] font-bold transition"
          title="Transferir FX a tasa P2P"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>P2P Bs {p2pRate.toFixed(2)}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenDrafts}
          className="relative p-2 rounded-xl border border-border bg-secondary/50 text-foreground hover:bg-muted transition"
          title="Bandeja de Borradores"
        >
          <Bell className="w-4 h-4 text-foreground" />
          {draftsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center ring-2 ring-card">
              {draftsCount}
            </span>
          )}
        </button>

        {user && (
          <UserMenuDropdown
            user={user}
            compact
            onOpenProfile={onOpenProfile}
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
          />
        )}
      </div>
    </header>
  );
}
