"use client";

import React, { useMemo } from "react";
import { PlusCircle } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import {
  classifyAccountCategory,
  getCategoryBadge,
} from "@/modules/ledger/domain/accounts-overview";
import { ACCOUNT_CATEGORY_COLORS } from "@/modules/ledger/domain/account-category-colors";
import { AccountsCard } from "./AccountsCard";
import { accountsSectionTitleClassName } from "./accounts-styles";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";

interface MobileAccountsCarouselProps {
  accounts: AccountDto[];
  onOpenCreateAccount: () => void;
}

export function MobileAccountsCarousel({
  accounts,
  onOpenCreateAccount,
}: MobileAccountsCarouselProps) {
  // Same domain helpers as AccountCard / AccountsMainView (no parallel type -> color/tag logic).
  const items = useMemo(
    () =>
      accounts.map((account) => {
        const category = classifyAccountCategory(account);
        return {
          account,
          dotColor: ACCOUNT_CATEGORY_COLORS[category].chartColor,
          tag: getCategoryBadge(category).label,
        };
      }),
    [accounts]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={accountsSectionTitleClassName}>Mis Cuentas</span>
        <Button
          type="button"
          variant="link"
          onClick={onOpenCreateAccount}
          className="h-auto p-0 text-sm font-bold gap-1"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Vincular</span>
        </Button>
      </div>

      {items.length === 0 ? (
        <AccountsCard className="border-dashed border-border bg-card p-4 text-center flex flex-col items-center justify-center gap-1.5 py-6">
          <p className="text-sm font-semibold text-muted-foreground">
            No tenés cuentas registradas todavía.
          </p>
          <Button
            type="button"
            variant="link"
            onClick={onOpenCreateAccount}
            className="h-auto p-0 text-sm font-extrabold"
          >
            + Vincular tu primera cuenta
          </Button>
        </AccountsCard>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
          {items.map(({ account, dotColor, tag }) => (
            <AccountsCard
              key={account.id}
              className="min-w-[130px] p-3 snap-start flex flex-col gap-1.5 shrink-0"
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
                {account.name}
              </div>
              <Amount value={account.balance} currency={account.currency} size="sm" />
            </AccountsCard>
          ))}
        </div>
      )}
    </div>
  );
}
