"use client";

import React from "react";
import { ArrowDownUp, HandCoins, Plus, Sparkles, PlusCircle, Landmark } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { BalanceMetrics } from "@/modules/ledger/domain/balance-calculator";
import { MobileAccountsCarousel } from "@/modules/ledger/presentation/MobileAccountsCarousel";
import { AccountBalanceDisplay } from "./AccountBalanceDisplay";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

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
  const hasAccounts = accounts.length > 0;

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 text-foreground shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Patrimonio Total</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onToggleCurrency}
            aria-label="Cambiar moneda de visualización"
          >
            <span>{isBob ? "BOB" : "USD"}</span>
          </Button>
        </div>

        <AccountBalanceDisplay
          bobAmount={metrics.totalPatrimonioBob}
          usdAmount={metrics.consolidatedUsd}
          p2pRate={p2pRate}
          selectedCurrency={selectedCurrency}
          size="xl"
          className="flex flex-col"
        />

        <div className="flex items-center justify-between border-t border-border pt-2">
          <Badge variant={hasAccounts ? "success" : "outline"} className="text-xs">
            {hasAccounts ? "Activo" : "Sin cuentas"}
          </Badge>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <span>Bancos</span>
            <Amount value={metrics.bankLiquidityBob} currency="BOB" size="xs" />
            <span>• Cripto</span>
            <Amount value={metrics.cryptoUsdt} currency="USDT" size="xs" />
          </div>
        </div>
      </div>

      {!hasAccounts && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Landmark className="size-5 text-primary" />
            <span className="text-sm font-bold text-foreground">¡Comenzá en Billefy!</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Para registrar gastos, transferir o calcular presupuestos, creá tu primera cuenta bancaria o billetera digital.
          </p>
          <Button
            type="button"
            onClick={onOpenCreateAccount}
            className="w-full"
          >
            <PlusCircle className="size-4" />
            <span>Crear mi primera cuenta</span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => (hasAccounts ? onOpenFx() : onOpenCreateAccount())}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 transition hover:bg-muted active:scale-95"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowDownUp className="size-4" />
          </div>
          <span className="text-xs font-semibold text-foreground">Transferir</span>
        </button>

        <button
          type="button"
          onClick={() => (hasAccounts ? onOpenLending() : onOpenCreateAccount())}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 transition hover:bg-muted active:scale-95"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
            <HandCoins className="size-4" />
          </div>
          <span className="text-xs font-semibold text-foreground">Cobrar</span>
        </button>

        <button
          type="button"
          onClick={() => (hasAccounts ? onOpenNewTxn() : onOpenCreateAccount())}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-95"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground">
            <Plus className="size-4 stroke-[3]" />
          </div>
          <span className="text-xs font-semibold">
            {hasAccounts ? "Nuevo" : "Cuenta"}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenDrafts}
          className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 transition hover:bg-muted active:scale-95"
        >
          {draftsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-1.5 right-2 flex size-4 items-center justify-center rounded-full p-0 text-[10px] font-black"
            >
              {draftsCount}
            </Badge>
          )}
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="text-xs font-semibold text-foreground">Borradores</span>
        </button>
      </div>

      <MobileAccountsCarousel
        accounts={accounts}
        onOpenCreateAccount={onOpenCreateAccount}
      />
    </div>
  );
}
