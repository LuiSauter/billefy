"use client";

import Decimal from "decimal.js";
import { AccountDto, LoanSummaryDto } from "@/domain/models/types";

interface BalanceSummaryCardsProps {
  bobTotal: Decimal;
  usdTotal: Decimal;
  consolidatedUsd: Decimal;
  accounts: AccountDto[];
  loans: LoanSummaryDto[];
  p2pRate: number;
}

export function BalanceSummaryCards({
  bobTotal,
  usdTotal,
  consolidatedUsd,
  accounts,
  loans,
  p2pRate,
}: BalanceSummaryCardsProps) {
  // Compute bank liquidity (accounts of type Bank or Cash in BOB)
  const bankLiquidityBob = accounts
    .filter((a) => a.currency === "BOB" && a.type !== "Exchange")
    .reduce((acc, a) => acc.plus(new Decimal(a.balance)), new Decimal(0));

  // Compute crypto balances (Exchange accounts or USDT/USD)
  const cryptoUsdt = accounts
    .filter((a) => a.type === "Exchange" || a.currency === "USDT")
    .reduce((acc, a) => acc.plus(new Decimal(a.balance)), new Decimal(0));
  const cryptoEquivalentBob = cryptoUsdt.times(p2pRate);

  // Compute consolidated total in BOB
  const totalPatrimonioBob = bobTotal.plus(usdTotal.times(p2pRate));

  // Compute net loans
  const netLoansBob = loans.reduce((acc, l) => {
    const bal = new Decimal(l.remainingPrincipal || 0);
    return l.type === "Lent" ? acc.plus(bal) : acc.minus(bal);
  }, new Decimal(0));

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
          Bs. {totalPatrimonioBob.toFixed(2)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-mono">
          ≈ ${consolidatedUsd.toFixed(2)} USD (P2P)
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
          Bs. {bankLiquidityBob.toFixed(2)}
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
            Bs. {cryptoEquivalentBob.toFixed(0)}
          </span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
          {cryptoUsdt.toFixed(2)} USDT
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
            {netLoansBob.gte(0) ? "A favor" : "Por pagar"}
          </span>
        </div>
        <div
          className={`text-2xl font-extrabold tracking-tight font-mono ${
            netLoansBob.gte(0) ? "text-slate-900" : "text-rose-600"
          }`}
        >
          {netLoansBob.gte(0) ? "+" : ""}Bs. {netLoansBob.toFixed(2)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {loans.filter((l) => l.status === "Active").length} préstamos activos
        </p>
      </div>
    </section>
  );
}
