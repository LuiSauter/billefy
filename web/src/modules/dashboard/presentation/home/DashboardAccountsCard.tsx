"use client";

import React from "react";
import {
  Plus,
  ChevronRight,
  Landmark,
  Wallet,
  Bitcoin,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Amount } from "@/shared/ui/amount";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";

interface DashboardAccountsCardProps {
  accounts: AccountDto[];
  selectedCurrency: string;
  onOpenCreateAccount: () => void;
  onOpenAccountsTab?: () => void;
}

export function DashboardAccountsCard({
  accounts,
  selectedCurrency,
  onOpenCreateAccount,
  onOpenAccountsTab,
}: DashboardAccountsCardProps) {
  void selectedCurrency;
  const getAccountIcon = (name: string, type: string) => {
    const lower = `${name} ${type}`.toLowerCase();
    if (lower.includes("crypto") || lower.includes("binance") || lower.includes("btc")) {
      return { icon: Bitcoin, bg: "bg-amber-500/15 border-amber-500/30 text-amber-400" };
    }
    if (lower.includes("pago") || lower.includes("mercado") || lower.includes("wallet")) {
      return { icon: Wallet, bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" };
    }
    if (lower.includes("efectivo") || lower.includes("cash")) {
      return { icon: Banknote, bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" };
    }
    if (lower.includes("tarjeta") || lower.includes("card") || lower.includes("crédito")) {
      return { icon: CreditCard, bg: "bg-rose-500/15 border-rose-500/30 text-rose-400" };
    }
    return { icon: Landmark, bg: "bg-blue-500/15 border-blue-500/30 text-blue-400" };
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden flex flex-col justify-between h-full">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-extrabold text-foreground">
          Mis cuentas
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCreateAccount}
          className="h-7 px-2.5 rounded-lg text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col divide-y divide-border/50">
        {accounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tienes cuentas vinculadas aún
          </div>
        ) : (
          accounts.slice(0, 5).map((acc) => {
            const { icon: Icon, bg } = getAccountIcon(acc.name, acc.type);
            return (
              <div
                key={acc.id}
                onClick={onOpenAccountsTab}
                className="py-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/30 transition-colors -mx-4 px-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground truncate">
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
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>+ Ver todas ({accounts.length})</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
