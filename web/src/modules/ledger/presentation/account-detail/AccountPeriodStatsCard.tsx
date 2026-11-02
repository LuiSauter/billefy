"use client";

import React, { useMemo } from "react";
import { ArrowLeftRight, TrendingUp, TrendingDown, Tag } from "lucide-react";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import { calculateAccountPeriodStats } from "../../domain/account-detail";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

interface AccountPeriodStatsCardProps {
  account: AccountDto;
  transactions: TransactionDto[];
}

export function AccountPeriodStatsCard({
  account,
  transactions,
}: AccountPeriodStatsCardProps) {
  const format = useNumberFormat();
  const currencySymbol = account.currency === "BOB" ? "Bs" : "$";

  const stats = useMemo(() => {
    return calculateAccountPeriodStats(account, transactions, "all");
  }, [account, transactions]);

  const formattedIncome = `${currencySymbol} ${format(stats.income)}`;
  const formattedExpenses = `${currencySymbol} ${format(stats.expenses)}`;
  const formattedAvgTicket = `${currencySymbol} ${format(stats.averageExpenseTicket)}`;

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 flex flex-col gap-4 shadow-sm">
      <h3 className="text-base font-bold text-foreground tracking-tight">
        Estadísticas del período
      </h3>

      <div className="flex flex-col divide-y divide-border/60 text-xs font-medium">
        {/* Movimientos totales */}
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
            <span>Movimientos totales</span>
          </div>
          <span className="font-bold text-foreground text-sm">
            {stats.totalMovements}
          </span>
        </div>

        {/* Ingresos */}
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>Ingresos</span>
          </div>
          <span className="font-black text-emerald-400 text-sm">
            {formattedIncome}
          </span>
        </div>

        {/* Gastos */}
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>Gastos</span>
          </div>
          <span className="font-black text-rose-400 text-sm">
            {formattedExpenses}
          </span>
        </div>

        {/* Ticket promedio (gasto) */}
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <span>Ticket promedio (gasto)</span>
          </div>
          <span className="font-bold text-foreground text-sm">
            {formattedAvgTicket}
          </span>
        </div>
      </div>
    </div>
  );
}
