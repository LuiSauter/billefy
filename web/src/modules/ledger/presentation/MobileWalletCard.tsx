"use client";

import React from "react";
import { ArrowDownUp, HandCoins, Plus, Sparkles, PlusCircle, Landmark } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { BalanceMetrics } from "@/modules/ledger/domain/balance-calculator";
import { MobileAccountsCarousel } from "@/modules/ledger/presentation/MobileAccountsCarousel";

interface MobileWalletCardProps {
  metrics: BalanceMetrics;
  p2pRate: number;
  accounts: AccountDto[];
  draftsCount: number;
  selectedCurrency: "BOB" | "USD";
  onToggleCurrency: () => void;
  onOpenFx: () => void;
  onOpenNewTxn: () => void;
  onOpenLending: () => void;
  onOpenDrafts: () => void;
  onOpenCreateAccount: () => void;
}

export function MobileWalletCard({
  metrics,
  p2pRate,
  accounts,
  draftsCount,
  selectedCurrency,
  onToggleCurrency,
  onOpenFx,
  onOpenNewTxn,
  onOpenLending,
  onOpenDrafts,
  onOpenCreateAccount,
}: MobileWalletCardProps) {
  const isBob = selectedCurrency === "BOB";
  const mainAmount = isBob
    ? `Bs. ${metrics.totalPatrimonioBob}`
    : `$${metrics.consolidatedUsd} USD`;

  const subAmount = isBob
    ? `≈ $${metrics.consolidatedUsd} USD (P2P: Bs. ${p2pRate.toFixed(2)})`
    : `≈ Bs. ${metrics.totalPatrimonioBob} (P2P: Bs. ${p2pRate.toFixed(2)})`;

  const hasAccounts = accounts.length > 0;

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <div className="p-5 rounded-[24px] bg-linear-to-br from-[#0B0F19] to-slate-800 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Patrimonio Total</span>
          <button
            onClick={onToggleCurrency}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            <span>{isBob ? "BOB (Bs.)" : "USD ($)"}</span>
            <span className="text-xs text-slate-500">▼</span>
          </button>
        </div>

        <div className="flex flex-col">
          <div className="text-[32px] font-black tracking-tight font-mono text-white leading-tight">
            {mainAmount}
          </div>
          <div className="text-sm font-semibold text-slate-500 font-mono mt-0.5">
            {subAmount}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
          <div className="px-2 py-0.5 rounded-[6px] bg-emerald-500/20 text-emerald-400 font-bold text-xs">
            {hasAccounts ? "Activo" : "Sin cuentas"}
          </div>
          <div className="text-xs font-medium text-slate-500 font-mono">
            Bancos Bs. {metrics.bankLiquidityBob} • Cripto {metrics.cryptoUsdt} USDT
          </div>
        </div>
      </div>

      {!hasAccounts && (
        <div className="p-4 rounded-[18px] bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <span className="text-[15px] font-extrabold text-foreground">¡Comenzá en Billefy!</span>
          </div>
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            Para registrar gastos, transferir o calcular presupuestos, primero creá tu primera cuenta bancaria o billetera digital.
          </p>
          <button
            onClick={onOpenCreateAccount}
            className="w-full h-[40px] rounded-[10px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear mi primera cuenta</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => (hasAccounts ? onOpenFx() : onOpenCreateAccount())}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-blue-50 hover:bg-blue-100 transition active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary">
            <ArrowDownUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">Transferir</span>
        </button>

        <button
          onClick={() => (hasAccounts ? onOpenLending() : onOpenCreateAccount())}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-emerald-50 hover:bg-emerald-100 transition active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500">
            <HandCoins className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">Cobrar</span>
        </button>

        <button
          onClick={() => (hasAccounts ? onOpenNewTxn() : onOpenCreateAccount())}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-primary hover:bg-blue-700 transition active:scale-95 shadow-md shadow-blue-500/20"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/40 flex items-center justify-center text-white">
            <Plus className="w-4 h-4 stroke-3" />
          </div>
          <span className="text-xs font-bold text-white">
            {hasAccounts ? "Nuevo" : "Cuenta"}
          </span>
        </button>

        <button
          onClick={onOpenDrafts}
          className="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-indigo-50 hover:bg-indigo-100 transition active:scale-95"
        >
          {draftsCount > 0 && (
            <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center ring-2 ring-white">
              {draftsCount}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">Borradores</span>
        </button>
      </div>

      <MobileAccountsCarousel
        accounts={accounts}
        onOpenCreateAccount={onOpenCreateAccount}
      />
    </div>
  );
}
