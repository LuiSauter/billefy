"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import {
  MoreVertical,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Scale,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { AccountDto } from "../../domain/ledger.types";
import {
  getAccountSubtitle,
  getAccountVisualProfile,
  getCurrencyConversionLabel,
} from "../../domain/accounts-overview";
import { AccountBrandTile } from "../AccountBrandTile";
import { AccountStatusBadge } from "../AccountStatusBadge";
import { AccountsCard } from "../AccountsCard";
import { useNumberFormat, useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
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

interface AccountHeroCardProps {
  account: AccountDto;
  initialBalance?: Decimal;
  variationPercentage?: number;
  variationNominal?: Decimal;
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  onOpenEdit: () => void;
  onOpenReconcile: () => void;
  onDelete?: () => void;
}

export function AccountHeroCard({
  account,
  initialBalance,
  variationPercentage = 0,
  variationNominal,
  selectedCurrency = "BOB",
  p2pRate = 9.85,
  onOpenEdit,
  onOpenReconcile,
  onDelete,
}: AccountHeroCardProps) {
  const format = useNumberFormat();
  const numberPreferences = useNumberPreferences();
  const [copied, setCopied] = useState(false);

  const profile = getAccountVisualProfile(account);
  const subtitle = getAccountSubtitle(account);
  

  const accountInitial = (account as unknown as { initialBalance?: number | string }).initialBalance;
  const effectiveInitialBalance =
    initialBalance ??
    (accountInitial ? new Decimal(accountInitial) : new Decimal(0));

  const conversionLabel = getCurrencyConversionLabel(
    account.balance || 0,
    account.currency,
    selectedCurrency,
    p2pRate,
    format
  );

  const effectiveNominalVariation =
    variationNominal ?? new Decimal(account.balance || 0).minus(effectiveInitialBalance);

  const isPositiveVariation = effectiveNominalVariation.gte(0);

  const handleCopyId = () => {
    navigator.clipboard.writeText(account.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedOpeningDate = (() => {
    if (!account.createdAt) return "01 ene 2026";
    const d = new Date(account.createdAt);
    if (isNaN(d.getTime())) return "01 ene 2026";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  })();

  return (
    <AccountsCard className="@container relative overflow-hidden p-5">
      {/* Background Accent glow */}
      <div
        className="absolute top-0 right-0 w-80 h-full opacity-10 pointer-events-none blur-3xl rounded-full"
        style={{ backgroundColor: profile.accentColor || "var(--color-chart-4)" }}
      />

      {/* Layout follows the card's own width: identity + KPIs side by side only when there is room. */}
      <div className="relative flex flex-col @4xl:flex-row items-stretch @4xl:items-center justify-between gap-6">
        {/* 1. Identity & Name Block */}
        <div className="flex items-center gap-4 min-w-0 pr-4">
          <AccountBrandTile account={account} size="lg" />

          <div className="min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight truncate">
                {account.name}
              </h2>

              {/* 3-dots menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 md:size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Opciones de cuenta"
                      aria-label="Opciones de cuenta"
                    >
                      <MoreVertical />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={onOpenEdit}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                    <span>Editar cuenta</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenReconcile}>
                    <Scale className="w-4 h-4 text-primary" />
                    <span>Conciliar saldo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyId}>
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>{copied ? "ID copiado" : "Copiar ID"}</span>
                  </DropdownMenuItem>
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={onDelete}>
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar cuenta</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-xs text-muted-foreground truncate font-medium">
              {subtitle} • {account.currency}
            </p>

            <div>
              <AccountStatusBadge />
            </div>
          </div>
        </div>

        {/* Dividers & KPI Metrics Row */}
        <div className="flex flex-wrap @lg:flex-nowrap items-center gap-6 @lg:gap-8 border-t @4xl:border-t-0 @4xl:border-l border-border/70 pt-4 @4xl:pt-0 @4xl:pl-8">
          {/* Metric 1: Saldo actual */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Saldo actual
            </span>
            <Amount value={account.balance || 0} currency={account.currency} size="xl" className="min-w-0 truncate" />
            {conversionLabel && (
              <span className="text-xs font-semibold text-muted-foreground">
                {conversionLabel}
              </span>
            )}
          </div>

          {/* Metric 2: Saldo inicial */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-xs font-semibold text-muted-foreground">
              Saldo inicial
            </span>
            <Amount value={effectiveInitialBalance} currency={account.currency} size="sm" className="min-w-0 truncate" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="w-3 h-3 text-muted-foreground/70" />
              <span>Apertura: {formattedOpeningDate}</span>
            </div>
          </div>

          {/* Metric 3: Variación del período */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-xs font-semibold text-muted-foreground">
              Variación del período
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant={isPositiveVariation ? "success" : "expense"}
                className={isPositiveVariation ? "border-emerald-500/30 font-bold" : "border-rose-500/30 font-bold"}
              >
                {isPositiveVariation ? (
                  <ArrowUpRight className="stroke-[2.5]" />
                ) : (
                  <ArrowDownRight className="stroke-[2.5]" />
                )}
                {variationPercentage >= 0 ? "+" : "-"}{formatPercent(Math.abs(variationPercentage), numberPreferences)}
              </Badge>
            </div>
            <Amount value={effectiveNominalVariation} currency={account.currency} sign="always" tone={isPositiveVariation ? "income" : "expense"} size="xs" className="mt-0.5" />
          </div>
        </div>
      </div>
    </AccountsCard>
  );
}
