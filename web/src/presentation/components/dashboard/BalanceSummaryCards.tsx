"use client";

import React from "react";
import { BalanceMetrics } from "@/application/hooks/useFinancialMetrics";

interface BalanceSummaryCardsProps {
  metrics: BalanceMetrics;
  p2pRate: number;
}

export function BalanceSummaryCards({ metrics, p2pRate }: BalanceSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Patrimonio Total */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Patrimonio Total
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            +5.4%
          </span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
          Bs. {metrics.totalPatrimonioBob}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-mono">
          ≈ ${metrics.consolidatedUsd} USD (P2P)
        </p>
      </div>

      {/* 2. Liquidez en Bancos */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Liquidez en Bancos
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
            Disponible
          </span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
          Bs. {metrics.bankLiquidityBob}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Cuentas corrientes & caja de ahorro</p>
      </div>

      {/* 3. Cripto (Binance) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Cripto (Binance)
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
            Bs. {metrics.cryptoEquivalentBob}
          </span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
          {metrics.cryptoUsdt} USDT
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-mono">
          Tasa P2P: Bs. {p2pRate.toFixed(2)}
        </p>
      </div>

      {/* 4. Préstamos Netos */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Préstamos Netos
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200">
            {metrics.isNetLoansPositive ? "A favor" : "Por pagar"}
          </span>
        </div>
        <div
          className={`text-2xl font-extrabold tracking-tight font-mono ${
            metrics.isNetLoansPositive ? "text-slate-900" : "text-rose-600"
          }`}
        >
          {metrics.netLoansBob}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {metrics.activeLoansCount} préstamos activos
        </p>
      </div>
    </section>
  );
}
