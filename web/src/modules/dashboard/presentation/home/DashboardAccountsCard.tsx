"use client";

import React, { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  ChevronRight,
  Landmark,
  Wallet,
  Bitcoin,
  CreditCard,
  Banknote,
} from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { IconTile, type IconTileVariant } from "./IconTile";
import { Button } from "@/shared/ui/button";
import { Amount } from "@/shared/ui/amount";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";

interface DashboardAccountsCardProps {
  accounts: AccountDto[];
  selectedCurrency: string;
  onOpenCreateAccount: () => void;
  onOpenAccountsTab?: () => void;
}

function getAccountIcon(name: string, type: string): { icon: LucideIcon; variant: IconTileVariant } {
  const lower = `${name} ${type}`.toLowerCase();
  if (lower.includes("crypto") || lower.includes("binance") || lower.includes("btc")) {
    return { icon: Bitcoin, variant: "amber" };
  }
  if (lower.includes("pago") || lower.includes("mercado") || lower.includes("wallet")) {
    return { icon: Wallet, variant: "cyan" };
  }
  if (lower.includes("efectivo") || lower.includes("cash")) {
    return { icon: Banknote, variant: "emerald" };
  }
  if (lower.includes("tarjeta") || lower.includes("card") || lower.includes("crédito")) {
    return { icon: CreditCard, variant: "rose" };
  }
  return { icon: Landmark, variant: "blue" };
}

export function DashboardAccountsCard({
  accounts,
  selectedCurrency,
  onOpenCreateAccount,
  onOpenAccountsTab,
}: DashboardAccountsCardProps) {
  void selectedCurrency;
  const visibleAccounts = useMemo(() => accounts.slice(0, 5), [accounts]);

  return (
    <DashboardCard className="overflow-hidden flex flex-col justify-between h-full">
      <CardHeader className={`${dashboardCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <CardTitle className={dashboardCardTitleClassName}>
          Mis cuentas
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCreateAccount}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-border bg-background hover:bg-muted text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar</span>
        </Button>
      </CardHeader>

      <CardContent className={`${dashboardCardContentClassName} flex flex-col divide-y divide-border/50`}>
        {accounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tienes cuentas vinculadas aún
          </div>
        ) : (
          visibleAccounts.map((acc) => {
            const { icon, variant } = getAccountIcon(acc.name, acc.type);
            return (
              <div
                key={acc.id}
                onClick={onOpenAccountsTab}
                className="py-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/30 transition-colors -mx-4 px-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconTile icon={icon} variant={variant} size="sm" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {acc.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Amount value={acc.balance} currency={acc.currency} size="xs" className="min-w-0 truncate" />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}

        {/* Footer Link: Ver todas */}
        <div className="pt-3 -mx-4 px-4 flex items-center">
          <button
            type="button"
            onClick={onOpenAccountsTab}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>+ Ver todas ({accounts.length})</span>
          </button>
        </div>
      </CardContent>
    </DashboardCard>
  );
}
