"use client";

import React from "react";
import { Search, MessageCircle, ArrowDownUp } from "lucide-react";
import { UserDto } from "@/domain/models/types";

interface TopbarProps {
  user?: UserDto | null;
  accountsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCurrency: "BOB" | "USD";
  onToggleCurrency: () => void;
  onOpenFxTransfer: () => void;
  onOpenNewTransaction: () => void;
  onOpenCreateAccount: () => void;
  onOpenWhatsApp?: () => void;
  onOpenBinance?: () => void;
}

export function Topbar({
  user,
  accountsCount,
  searchQuery,
  onSearchChange,
  selectedCurrency,
  onToggleCurrency,
  onOpenFxTransfer,
  onOpenNewTransaction,
  onOpenCreateAccount,
  onOpenWhatsApp,
  onOpenBinance,
}: TopbarProps) {
  const handleNewTxnClick = () => {
    if (accountsCount === 0) {
      onOpenCreateAccount();
    } else {
      onOpenNewTransaction();
    }
  };

  const handleFxClick = () => {
    if (accountsCount < 2) {
      onOpenFxTransfer(); // The modal will show the guidance to create 2 accounts
    } else {
      onOpenFxTransfer();
    }
  };

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
    <header className="hidden md:flex h-[72px] px-8 bg-white border-b border-border items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input with ⌘K Badge (OpenPencil Search) */}
      <div className="relative w-[320px] lg:w-[360px] h-[40px] rounded-[10px] bg-white border border-border flex items-center px-[12px] justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-[15px] h-[15px] text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar transacciones o cuentas..."
            className="w-full text-sm font-medium text-foreground placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground ml-2 shrink-0 select-none">
          ⌘K
        </span>
      </div>

      {/* Action Buttons & User Profile (OpenPencil TActions) */}
      <div className="flex items-center gap-2.5">
        {/* Currency Switcher on Desktop */}
        <button
          onClick={onToggleCurrency}
          title="Alternar moneda de visualización (BOB / USD)"
          className="h-[40px] px-3 rounded-[10px] bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <span>{selectedCurrency === "BOB" ? "BOB (Bs.)" : "USD ($)"}</span>
          <span className="text-xs text-slate-400">▼</span>
        </button>

        {onOpenWhatsApp && (
          <button
            onClick={onOpenWhatsApp}
            title="Bot de WhatsApp & Ingesta"
            className="h-[40px] px-3 rounded-[10px] text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition border border-border flex items-center gap-1.5 text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden xl:inline">WhatsApp</span>
          </button>
        )}

        {onOpenBinance && (
          <button
            onClick={onOpenBinance}
            title="Integración Binance P2P"
            className="h-[40px] px-3 rounded-[10px] text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition border border-border flex items-center gap-1.5 text-sm font-semibold"
          >
            <ArrowDownUp className="w-4 h-4 text-amber-600" />
            <span className="hidden xl:inline">Binance</span>
          </button>
        )}

        {/* Transferir FX (OpenPencil TBtn1) */}
        <button
          onClick={handleFxClick}
          className="h-[40px] px-[14px] rounded-[10px] bg-white border border-border hover:bg-slate-50 text-sm font-semibold text-foreground transition"
        >
          Transferir FX
        </button>

        {/* + Nuevo Movimiento (OpenPencil TBtn2) */}
        <button
          onClick={handleNewTxnClick}
          className="h-[40px] px-[16px] rounded-[10px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-sm font-bold text-white transition shadow-xs"
        >
          {accountsCount === 0 ? "+ Crear Cuenta" : "+ Nuevo Movimiento"}
        </button>

        {/* User Profile Card on Desktop */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            {user.pictureUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.pictureUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {userInitials}
              </div>
            )}
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-sm font-extrabold text-foreground leading-tight truncate max-w-[130px]">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground font-medium leading-tight truncate max-w-[130px]">
                {user.email}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
