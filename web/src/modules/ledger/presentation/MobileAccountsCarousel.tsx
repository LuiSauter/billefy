"use client";

import React from "react";
import { PlusCircle } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { Amount } from "@/shared/ui/amount";

interface MobileAccountsCarouselProps {
  accounts: AccountDto[];
  onOpenCreateAccount: () => void;
}

export function MobileAccountsCarousel({
  accounts,
  onOpenCreateAccount,
}: MobileAccountsCarouselProps) {
  return (
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
        <div className="p-4 rounded-[14px] bg-card border border-dashed border-border text-center flex flex-col items-center justify-center gap-1.5 py-6">
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
            const dotColor =
              acc.type === "Bank"
                ? "#3B82F6"
                : acc.type === "Wallet"
                ? "#F59E0B"
                : "#10B981";
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
                className="min-w-[130px] p-3 rounded-[14px] bg-card border border-border shadow-2xs snap-start flex flex-col gap-1.5 shrink-0"
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
                <Amount value={acc.balance} currency={acc.currency} size="sm" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
