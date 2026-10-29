"use client";

import React from "react";
import { ArrowDownUp, HandCoins, Plus, Sparkles, PlusCircle, Landmark } from "lucide-react";
import { AccountDto } from "@/domain/models/types";
import { BalanceMetrics } from "@/application/hooks/useFinancialMetrics";

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

  const handleFxClick = () => {
    if (!hasAccounts) {
      onOpenCreateAccount();
    } else {
      onOpenFx();
    }
  };

  const handleNewTxnClick = () => {
    if (!hasAccounts) {
      onOpenCreateAccount();
    } else {
      onOpenNewTxn();
    }
  };

  const handleLendingClick = () => {
    if (!hasAccounts) {
      onOpenCreateAccount();
    } else {
      onOpenLending();
    }
  };

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {/* 1. Hero Card: OpenPencil HeroCard n2173 */}
      <div className="p-5 rounded-[24px] bg-linear-to-br from-[#0B0F19] to-slate-800 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">
            Patrimonio Total
          </span>
          <button
            onClick={onToggleCurrency}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            <span>{isBob ? "BOB (Bs.)" : "USD ($)"}</span>
            <span className="text-xs text-slate-500">▼</span>
          </button>
        </div>

        {/* Big Balance */}
        <div className="flex flex-col">
          <div className="text-[32px] font-black tracking-tight font-mono text-white leading-tight">
            {mainAmount}
          </div>
          <div className="text-sm font-semibold text-slate-500 font-mono mt-0.5">
            {subAmount}
          </div>
        </div>

        {/* Footnote details */}
        <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
          <div className="px-2 py-0.5 rounded-[6px] bg-emerald-500/20 text-emerald-400 font-bold text-xs">
            {hasAccounts ? "Activo" : "Sin cuentas"}
          </div>
          <div className="text-xs font-medium text-slate-500 font-mono">
            Bancos Bs. {metrics.bankLiquidityBob} • Cripto {metrics.cryptoUsdt} USDT
          </div>
        </div>
      </div>

      {/* 2. Onboarding Prompt when 0 Accounts */}
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

      {/* 3. Action Dock (OpenPencil Dock n2185) */}
      <div className="grid grid-cols-4 gap-2">
        {/* DB_0: Transferir */}
        <button
          onClick={handleFxClick}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-blue-50 hover:bg-blue-100 transition active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary">
            <ArrowDownUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">Transferir</span>
        </button>

        {/* DB_1: Cobrar / Préstamos */}
        <button
          onClick={handleLendingClick}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-emerald-50 hover:bg-emerald-100 transition active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500">
            <HandCoins className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">Cobrar</span>
        </button>

        {/* DB_2: Nuevo */}
        <button
          onClick={handleNewTxnClick}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[14px] bg-primary hover:bg-blue-700 transition active:scale-95 shadow-md shadow-blue-500/20"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/40 flex items-center justify-center text-white">
            <Plus className="w-4 h-4 stroke-3" />
          </div>
          <span className="text-xs font-bold text-white">
            {hasAccounts ? "Nuevo" : "Cuenta"}
          </span>
        </button>

        {/* DB_3: Borradores */}
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

      {/* 4. Horizontal Accounts Carousel (OpenPencil AccRow n2201) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-foreground">Mis Cuentas</span>
          <button
            onClick={onOpenCreateAccount}
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Vincular</span>
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-4 rounded-[14px] bg-white border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-1.5 py-6">
            <p className="text-sm font-semibold text-muted-foreground">
              No tenés cuentas registradas todavía.
            </p>
            <button
              onClick={onOpenCreateAccount}
              className="text-sm font-extrabold text-primary hover:underline"
            >
              + Vincular tu primera cuenta
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
            {accounts.map((acc) => {
              const isUsdt = acc.currency === "USDT";
              const bal = acc.balance.toNumber();
              const formatted = isUsdt
                ? `${bal.toFixed(0)} USDT`
                : `Bs ${bal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              const dotColor =
                acc.type === "Bank" ? "#004481" : acc.type === "Wallet" ? "#F59E0B" : "#10B981";
              const tag =
                acc.type === "Exchange"
                  ? "USDT P2P"
                  : acc.type === "Cash"
                    ? "Físico"
                    : acc.currency === "BOB"
                      ? "Banco"
                      : "Billetera";

              return (
                <div
                  key={acc.id}
                  className="min-w-[130px] p-3 rounded-[14px] bg-white border border-border shadow-2xs snap-start flex flex-col gap-1.5 shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      {tag}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {acc.name}
                  </div>
                  <div className="text-sm font-extrabold font-mono text-foreground">
                    {formatted}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
