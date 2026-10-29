"use client";

import React from "react";
import { Search, MessageCircle, ArrowDownUp } from "lucide-react";

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
    <header className="h-[72px] px-8 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input with ⌘K Badge (OpenPencil Search) */}
      <div className="relative w-[380px] h-[40px] rounded-[10px] bg-white border border-[#E2E8F0] flex items-center px-[12px] justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-[15px] h-[15px] text-[#94A3B8] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar transacciones, cuentas o préstamos..."
            className="w-full text-[13px] font-[500] text-[#0F172A] placeholder-[#94A3B8] bg-transparent focus:outline-none"
          />
        </div>
        <span className="text-[11px] font-[700] text-[#64748B] ml-2 shrink-0 select-none">
          ⌘K
        </span>
      </div>

      {/* Action Buttons (OpenPencil TActions) */}
      <div className="flex items-center gap-2.5">
        {onOpenWhatsApp && (
          <button
            onClick={onOpenWhatsApp}
            title="Bot de WhatsApp & Ingesta"
            className="h-[40px] px-3 rounded-[10px] text-[#475569] hover:text-[#059669] hover:bg-emerald-50 transition border border-[#E2E8F0] flex items-center gap-1.5 text-[12px] font-semibold"
          >
            <MessageCircle className="w-4 h-4 text-[#059669]" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        )}

        {onOpenBinance && (
          <button
            onClick={onOpenBinance}
            title="Integración Binance P2P"
            className="h-[40px] px-3 rounded-[10px] text-[#475569] hover:text-[#D97706] hover:bg-amber-50 transition border border-[#E2E8F0] flex items-center gap-1.5 text-[12px] font-semibold"
          >
            <ArrowDownUp className="w-4 h-4 text-[#D97706]" />
            <span className="hidden sm:inline">Binance</span>
          </button>
        )}

        {/* Transferir FX (OpenPencil TBtn1) */}
        <button
          onClick={onOpenFxTransfer}
          className="h-[40px] px-[14px] rounded-[10px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[13px] font-[600] text-[#0F172A] transition"
        >
          Transferir FX
        </button>

        {/* + Nuevo Movimiento (OpenPencil TBtn2) */}
        <button
          onClick={onOpenNewTransaction}
          className="h-[40px] px-[16px] rounded-[10px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-[13px] font-[700] text-white transition shadow-sm"
        >
          + Nuevo Movimiento
        </button>
      </div>
    </header>
  );
}
