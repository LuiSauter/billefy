"use client";

import React from "react";
import { ArrowDownUp, Bell, LogOut } from "lucide-react";
import { UserDto, getUserDisplayName } from "@/modules/identity/domain/identity.types";
import { UserAvatar } from "@/modules/identity/presentation/UserAvatar";

interface MobileHeaderProps {
  user?: UserDto | null;
  p2pRate: number;
  draftsCount: number;
  selectedCurrency: "BOB" | "USD";
  onToggleCurrency: () => void;
  onOpenDrafts: () => void;
  onOpenFx: () => void;
  onLogout?: () => void;
}

export function MobileHeader({
  user,
  p2pRate,
  draftsCount,
  selectedCurrency,
  onToggleCurrency,
  onOpenDrafts,
  onOpenFx,
  onLogout,
}: MobileHeaderProps) {
  const displayName = getUserDisplayName(user);

  return (
    <header className="md:hidden bg-white border-b border-border sticky top-0 z-30 px-4 pt-3 pb-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs font-bold">
        <button
          onClick={onOpenFx}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>P2P: 1 USDT = Bs {p2pRate.toFixed(2)}</span>
          <ArrowDownUp className="w-3 h-3 text-primary" />
        </button>

        <button
          onClick={onToggleCurrency}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <span>{selectedCurrency === "BOB" ? "BOB (Bs.)" : "USD ($)"}</span>
          <span className="text-xs text-slate-400">▼</span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar user={user} size="sm" />

          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-extrabold tracking-tight text-foreground leading-tight truncate">
              {displayName}
            </span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {user?.email || "Patrimonio en Tiempo Real"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenFx}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition text-xs sm:text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>1 USDT = Bs {p2pRate.toFixed(2)}</span>
            <ArrowDownUp className="w-3 h-3 text-primary" />
          </button>

          <button
            onClick={onOpenDrafts}
            className="relative p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            title="Bandeja de Borradores"
          >
            <Bell className="w-4 h-4 text-foreground" />
            {draftsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center ring-2 ring-white">
                {draftsCount}
              </span>
            )}
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
