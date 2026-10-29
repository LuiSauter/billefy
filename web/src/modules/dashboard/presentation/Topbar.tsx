"use client";

import React from "react";
import { Search, MessageCircle, ArrowDownUp } from "lucide-react";
import { UserDto, getUserDisplayName } from "@/modules/identity/domain/identity.types";
import { UserAvatar } from "@/modules/identity/presentation/UserAvatar";

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

  const displayName = getUserDisplayName(user);

  return (
    <header className="hidden md:flex h-[72px] px-8 bg-white border-b border-border items-center justify-between gap-4 sticky top-0 z-20">
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

      <div className="flex items-center gap-2.5">
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

        <button
          onClick={onOpenFxTransfer}
          className="h-[40px] px-[14px] rounded-[10px] bg-white border border-border hover:bg-slate-50 text-sm font-semibold text-foreground transition"
        >
          Transferir FX
        </button>

        <button
          onClick={handleNewTxnClick}
          className="h-[40px] px-[16px] rounded-[10px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-sm font-bold text-white transition shadow-xs"
        >
          {accountsCount === 0 ? "+ Crear Cuenta" : "+ Nuevo Movimiento"}
        </button>

        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <UserAvatar user={user} size="md" />
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
