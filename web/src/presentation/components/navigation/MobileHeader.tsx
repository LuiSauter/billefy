"use client";

import React from "react";
import { ArrowDownUp, Bell, LogOut } from "lucide-react";
import { UserDto } from "@/domain/models/types";

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
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Mi Usuario";
  const userInitials = user?.fullName
    ? user.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : "U";

  return (
    <header className="md:hidden bg-white border-b border-[#E2E8F0] sticky top-0 z-30 px-4 pt-3 pb-3 flex flex-col gap-2.5">
      {/* Top Dynamic Ticker (OpenPencil Island n2161) */}
      <div className="flex items-center justify-between text-[11px] font-bold">
        <button
          onClick={onOpenFx}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-blue-100 text-[#1D4ED8] hover:bg-blue-100 transition"
        >
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>P2P: 1 USDT = Bs {p2pRate.toFixed(2)}</span>
          <ArrowDownUp className="w-3 h-3 text-[#2563EB]" />
        </button>

        <button
          onClick={onToggleCurrency}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0F172A] text-white hover:bg-slate-800 transition"
        >
          <span>{selectedCurrency === "BOB" ? "BOB (Bs.)" : "USD ($)"}</span>
          <span className="text-[9px] text-slate-400">▼</span>
        </button>
      </div>

      {/* User Bar (OpenPencil UBar n2166) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {user?.pictureUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.pictureUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-[34px] h-[34px] rounded-full object-cover shrink-0 ring-1 ring-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-[34px] h-[34px] rounded-full bg-[#0F172A] text-white font-[800] text-[13px] flex items-center justify-center shrink-0 shadow-xs">
              {userInitials}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-[800] tracking-tight text-[#0F172A] leading-tight truncate">
              {displayName}
            </span>
            <span className="text-[10px] font-semibold text-[#10B981] flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              {user?.email || "Patrimonio en Tiempo Real"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenFx}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-blue-100 text-[#1D4ED8] hover:bg-blue-100 transition text-xs sm:text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>1 USDT = Bs {p2pRate.toFixed(2)}</span>
            <ArrowDownUp className="w-3 h-3 text-[#2563EB]" />
          </button>
          {/* Drafts Alert Button */}
          <button
            onClick={onOpenDrafts}
            className="relative p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            title="Bandeja de Borradores"
          >
            <Bell className="w-4 h-4 text-[#0F172A]" />
            {draftsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                {draftsCount}
              </span>
            )}
          </button>

          {/* Logout Button */}
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
