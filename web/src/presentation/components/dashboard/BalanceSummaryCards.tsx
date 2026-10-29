"use client";

import React from "react";
import { BalanceMetrics } from "@/application/hooks/useFinancialMetrics";

interface BalanceSummaryCardsProps {
  metrics: BalanceMetrics;
  p2pRate?: number;
}

export function BalanceSummaryCards({ metrics }: BalanceSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Patrimonio Total (OpenPencil KCard_0) */}
      <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-[6px] shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-[600] text-[#64748B]">
            Patrimonio Total
          </span>
          <span className="text-[11px] font-[700] text-[#10B981]">
            +5.4%
          </span>
        </div>
        <div className="text-[22px] font-[900] text-[#0F172A] tracking-tight font-mono">
          Bs. {metrics.totalPatrimonioBob}
        </div>
      </div>

      {/* 2. Liquidez en Bancos (OpenPencil KCard_1) */}
      <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-[6px] shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-[600] text-[#64748B]">
            Liquidez en Bancos
          </span>
          <span className="text-[11px] font-[700] text-[#2563EB]">
            Disponible
          </span>
        </div>
        <div className="text-[22px] font-[900] text-[#0F172A] tracking-tight font-mono">
          Bs. {metrics.bankLiquidityBob}
        </div>
      </div>

      {/* 3. Cripto (Binance) (OpenPencil KCard_2) */}
      <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-[6px] shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-[600] text-[#64748B]">
            Cripto (Binance)
          </span>
          <span className="text-[11px] font-[700] text-[#F59E0B]">
            Bs. {metrics.cryptoEquivalentBob}
          </span>
        </div>
        <div className="text-[22px] font-[900] text-[#0F172A] tracking-tight font-mono">
          {metrics.cryptoUsdt} USDT
        </div>
      </div>

      {/* 4. Préstamos Netos (OpenPencil KCard_3) */}
      <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-[6px] shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-[600] text-[#64748B]">
            Préstamos Netos
          </span>
          <span className="text-[11px] font-[700] text-[#8B5CF6]">
            {metrics.isNetLoansPositive ? "A favor" : "Por pagar"}
          </span>
        </div>
        <div
          className={`text-[22px] font-[900] tracking-tight font-mono ${
            metrics.isNetLoansPositive ? "text-[#0F172A]" : "text-rose-600"
          }`}
        >
          {metrics.netLoansBob}
        </div>
      </div>
    </section>
  );
}
