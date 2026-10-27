"use client";

import React from "react";
import { Search, ArrowLeftRight, Plus, MessageCircle, ArrowDownUp } from "lucide-react";

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFxTransfer: () => void;
  onOpenNewTransaction: () => void;
  onOpenWhatsApp?: () => void;
  onOpenBinance?: () => void;
}

export function Topbar({
  searchQuery,
  onSearchChange,
  onOpenFxTransfer,
  onOpenNewTransaction,
  onOpenWhatsApp,
  onOpenBinance,
}: TopbarProps) {
  return (
    <header className="h-16 px-6 lg:px-8 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input with ⌘K Badge */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar transacciones, cuentas o préstamos..."
          className="w-full pl-10 pr-12 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs lg:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        {onOpenWhatsApp && (
          <button
            onClick={onOpenWhatsApp}
            title="Bot de WhatsApp & Simulador"
            className="p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition border border-slate-200/80"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}

        {onOpenBinance && (
          <button
            onClick={onOpenBinance}
            title="Integración Binance P2P"
            className="p-2 rounded-xl text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition border border-slate-200/80"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        )}

        {/* Transferir FX */}
        <button
          onClick={onOpenFxTransfer}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs lg:text-sm font-semibold text-slate-700 transition shadow-xs"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
          <span>Transferir FX</span>
        </button>

        {/* + Nuevo Movimiento */}
        <button
          onClick={onOpenNewTransaction}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-sm font-semibold transition shadow-md shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Movimiento</span>
        </button>
      </div>
    </header>
  );
}
