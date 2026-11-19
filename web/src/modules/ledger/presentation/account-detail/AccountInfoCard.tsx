"use client";

import React from "react";
import {
  Landmark,
  Briefcase,
  Banknote,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { AccountDto } from "../../domain/ledger.types";
import { getAccountSubtitle } from "../../domain/accounts-overview";
import { AccountsCard } from "../AccountsCard";
import { AccountStatusBadge } from "../AccountStatusBadge";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";

interface AccountInfoCardProps {
  account: AccountDto;
}

export function AccountInfoCard({ account }: AccountInfoCardProps) {
  const accountTypeSpanish = getAccountSubtitle(account);

  const currencyFull =
    account.currency === "BOB"
      ? "Bolivianos (BOB)"
      : account.currency === "USD"
      ? "Dólares (USD)"
      : account.currency === "USDT"
      ? "Tether (USDT)"
      : account.currency;

  const maskedNumber = `**** ${account.id.replace(/-/g, "").slice(-4).toUpperCase()}`;

  return (
    <AccountsCard>
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Información de la cuenta</CardTitle>
      </CardHeader>

      <CardContent className={appCardContentClassName}>
        <div className="flex flex-col divide-y divide-border/60 text-xs font-medium">
          {/* Institución */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Landmark className="w-4 h-4 text-muted-foreground/80" />
              <span>Institución</span>
            </div>
            <span className="font-bold text-foreground text-right truncate">
              {account.name}
            </span>
          </div>

          {/* Tipo */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Briefcase className="w-4 h-4 text-muted-foreground/80" />
              <span>Tipo</span>
            </div>
            <span className="font-bold text-foreground text-right truncate">
              {accountTypeSpanish}
            </span>
          </div>

          {/* Moneda */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Banknote className="w-4 h-4 text-muted-foreground/80" />
              <span>Moneda</span>
            </div>
            <span className="font-bold text-foreground text-right truncate">
              {currencyFull}
            </span>
          </div>

          {/* Número */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <CreditCard className="w-4 h-4 text-muted-foreground/80" />
              <span>Número</span>
            </div>
            <span className="font-bold text-foreground tracking-wider">
              {maskedNumber}
            </span>
          </div>

          {/* Estado */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-muted-foreground/80" />
              <span>Estado</span>
            </div>
            <AccountStatusBadge />
          </div>
        </div>
      </CardContent>
    </AccountsCard>
  );
}
