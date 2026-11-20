"use client";

import React, { memo } from "react";
import {
  MoreVertical,
  Pencil,
  Scale,
  Trash2,
  ArrowRight,
  Landmark,
  Wallet,
  Coins,
  Banknote,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { AccountDto } from "../domain/ledger.types";
import {
  AccountCategoryGroup,
  classifyAccountCategory,
  getAccountSubtitle,
  getAccountVisualProfile,
  getCategoryBadge,
  getCurrencyConversionLabel,
} from "../domain/accounts-overview";
import { ACCOUNT_CATEGORY_COLORS } from "../domain/account-category-colors";
import { AccountBrandTile } from "./AccountBrandTile";
import { AccountsCard } from "./AccountsCard";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Amount } from "@/shared/ui/amount";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const CATEGORY_ICONS: Record<AccountCategoryGroup, LucideIcon> = {
  bancos: Landmark,
  wallets: Wallet,
  cripto: Coins,
  efectivo: Banknote,
  otros: Layers,
};

interface AccountCardProps {
  account: AccountDto;
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  onEdit: (account: AccountDto) => void;
  onReconcile: (account: AccountDto) => void;
  onDelete?: (account: AccountDto) => void;
  onSelect?: (account: AccountDto) => void;
}

export const AccountCard = memo(function AccountCard({
  account,
  selectedCurrency = "BOB",
  p2pRate = 9.85,
  onEdit,
  onReconcile,
  onDelete,
  onSelect,
}: AccountCardProps) {
  const format = useNumberFormat();

  const category = classifyAccountCategory(account);
  const badge = getCategoryBadge(category);
  const subtitle = getAccountSubtitle(account);
  const profile = getAccountVisualProfile(account);
  const CategoryIcon = CATEGORY_ICONS[category] ?? Layers;

  const conversionLabel = getCurrencyConversionLabel(
    account.balance,
    account.currency,
    selectedCurrency,
    p2pRate,
    format
  );

  return (
    <AccountsCard
      onClick={() => (onSelect ? onSelect(account) : onReconcile(account))}
      className="p-4 relative flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition group cursor-pointer min-h-[160px]"
    >
      {/* Left accent color bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
        style={{ backgroundColor: profile.accentColor }}
      />

      {/* Top row: Icon + Names + 3-dots */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex items-center gap-3 min-w-0">
          <AccountBrandTile account={account} size="md" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">
              {account.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* 3-dots action menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 md:size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Opciones de cuenta"
                  aria-label="Opciones de cuenta"
                >
                  <MoreVertical />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  if (onSelect) onSelect(account);
                  else onReconcile(account);
                }}
              >
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Ver detalle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
                <span>Editar cuenta</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReconcile(account)}>
                <Scale className="w-4 h-4 text-primary" />
                <span>Conciliar saldo</span>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(account)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar cuenta</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Middle row: Balance & Conversion */}
      <div className="my-3 pl-2 flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5">
          <Amount value={account.balance} currency={account.currency} size="lg" className="min-w-0 truncate" />
          {account.currency !== "BOB" && account.currency !== "USD" && (
            <span className="text-xs font-bold text-muted-foreground">
              {account.currency}
            </span>
          )}
        </div>
        {conversionLabel && (
          <span className="text-xs font-semibold text-muted-foreground/90">
            {conversionLabel}
          </span>
        )}
      </div>

      {/* Bottom row: Category badge */}
      <div className="pl-2">
        <Badge variant="outline" className="rounded-lg bg-muted/60 border-border/60">
          <span style={{ color: ACCOUNT_CATEGORY_COLORS[category]?.chartColor ?? badge.color }}>
            <CategoryIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-foreground/90 font-medium">{badge.label}</span>
        </Badge>
      </div>
    </AccountsCard>
  );
});
