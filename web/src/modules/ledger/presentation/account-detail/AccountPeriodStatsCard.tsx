"use client";

import React, { useMemo } from "react";
import { ArrowLeftRight, TrendingUp, TrendingDown, Tag } from "lucide-react";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import { calculateAccountPeriodStats } from "../../domain/account-detail";
import { Amount } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { IconTile } from "@/modules/dashboard/presentation/home/IconTile";
import { AccountsCard } from "../AccountsCard";

interface AccountPeriodStatsCardProps {
  account: AccountDto;
  transactions: TransactionDto[];
}

export function AccountPeriodStatsCard({
  account,
  transactions,
}: AccountPeriodStatsCardProps) {

  const stats = useMemo(() => {
    return calculateAccountPeriodStats(account, transactions, "all");
  }, [account, transactions]);

  return (
    <AccountsCard>
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Estadísticas del período</CardTitle>
      </CardHeader>

      <CardContent className={appCardContentClassName}>
        <div className="flex flex-col divide-y divide-border/60 text-xs font-medium">
          {/* Movimientos totales */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <IconTile icon={ArrowLeftRight} variant="cyan" size="sm" />
              <span>Movimientos totales</span>
            </div>
            <span className="font-bold text-foreground text-sm">
              {stats.totalMovements}
            </span>
          </div>

          {/* Ingresos */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <IconTile icon={TrendingUp} variant="emerald" size="sm" />
              <span>Ingresos</span>
            </div>
            <Amount value={stats.income} currency={account.currency} tone="income" size="sm" />
          </div>

          {/* Gastos */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <IconTile icon={TrendingDown} variant="rose" size="sm" />
              <span>Gastos</span>
            </div>
            <Amount value={stats.expenses} currency={account.currency} tone="expense" size="sm" />
          </div>

          {/* Ticket promedio (gasto) */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <IconTile icon={Tag} variant="purple" size="sm" />
              <span>Ticket promedio (gasto)</span>
            </div>
            <Amount value={stats.averageExpenseTicket} currency={account.currency} size="sm" />
          </div>
        </div>
      </CardContent>
    </AccountsCard>
  );
}
