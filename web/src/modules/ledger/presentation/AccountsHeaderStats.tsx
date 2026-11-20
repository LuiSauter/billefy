"use client";

import React from "react";
import {
  Plus,
  Info,
  Landmark,
  Wallet,
  Coins,
  Banknote,
  Layers,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { Amount } from "@/shared/ui/amount";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { IconTile } from "@/modules/dashboard/presentation/home/IconTile";
import {
  AccountCategoryGroup,
  AccountsOverviewMetrics,
} from "../domain/accounts-overview";
import {
  ACCOUNT_CATEGORY_COLORS,
  AccountCategoryTone,
} from "../domain/account-category-colors";
import { AccountsCard } from "./AccountsCard";
import { accountsPageTitleClassName } from "./accounts-styles";

interface AccountsHeaderStatsProps {
  metrics: AccountsOverviewMetrics;
  currency?: "USD" | "BOB";
  onOpenCreateAccountModal: () => void;
  onOpenCsvModal?: () => void;
}

const CATEGORY_ICONS: Record<AccountCategoryGroup, LucideIcon> = {
  bancos: Landmark,
  wallets: Wallet,
  cripto: Coins,
  efectivo: Banknote,
  otros: Layers,
};

/** Percentage pill classes per tone (tones come from the single ACCOUNT_CATEGORY_COLORS map). */
const TONE_BADGE_CLASSES: Record<AccountCategoryTone, string> = {
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  muted: "bg-muted/60 text-muted-foreground border-border",
};

export function AccountsHeaderStats({
  metrics,
  currency = "USD",
  onOpenCreateAccountModal,
  onOpenCsvModal,
}: AccountsHeaderStatsProps) {
  const preferences = useNumberPreferences();
  const isUsd = currency === "USD";
  const displayCurrency = isUsd ? "USD" : "BOB";
  const displayTotal = isUsd ? metrics.totalUsd : metrics.totalBob;

  const changePct = metrics.monthlyChangePct;
  const isPositive = changePct === null || changePct >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={accountsPageTitleClassName}>Cuentas</h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
            Administra todas tus cuentas (bancos, wallets, crypto, efectivo, etc.) en un solo lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCsvModal && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenCsvModal}
              className="text-xs font-semibold cursor-pointer"
            >
              <FileText />
              <span>Importar CSV</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onOpenCreateAccountModal}
            className="font-bold shadow-lg shadow-primary/20 cursor-pointer active:scale-95"
          >
            <Plus className="stroke-[2.5]" />
            <span>Agregar cuenta</span>
          </Button>
        </div>
      </div>

      {/* Row of Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5">
        {/* Hero Card: Saldo total en cuentas */}
        <Card className="xl:col-span-4 bg-gradient-to-br from-[#26174d] via-[#1d123d] to-[#130d2a] border-purple-500/25 p-5 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[148px]">
          {/* Subtle glow / wave effect */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
          <svg
            className="absolute bottom-0 right-0 w-36 h-20 text-purple-400/25 pointer-events-none"
            viewBox="0 0 144 80"
            fill="none"
          >
            <path
              d="M0 60 C30 65, 50 30, 80 40 C110 50, 125 15, 144 20 L144 80 L0 80 Z"
              fill="currentColor"
              fillOpacity="0.3"
            />
            <path
              d="M0 60 C30 65, 50 30, 80 40 C110 50, 125 15, 144 20"
              stroke="var(--color-chart-4)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-500/20 text-purple-300">
                <Layers className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-purple-200">
                Saldo total en cuentas
              </span>
              <div
                title="Consolidado de todas las cuentas y billeteras valorado en moneda seleccionada"
                className="cursor-help"
              >
                <Info className="w-3.5 h-3.5 text-purple-300/60 hover:text-purple-200 transition" />
              </div>
            </div>
          </div>

          <div className="my-2 relative z-10">
            <Amount value={displayTotal} currency={displayCurrency} size="xl" className="text-white" />
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <Badge
              variant={isPositive ? "success" : "expense"}
              className={isPositive ? "border-emerald-500/30 font-bold" : "border-rose-500/30 font-bold"}
            >
              {isPositive ? (
                <ArrowUpRight className="stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="stroke-[2.5]" />
              )}
              {changePct !== null ? `${changePct < 0 ? "-" : changePct > 0 ? "+" : ""}${formatPercent(changePct, preferences)}` : `+${formatPercent(0, preferences)}`}
            </Badge>
            <span className="text-xs font-medium text-purple-200/70">
              vs. mes anterior
            </span>
          </div>
        </Card>

        {/* 5 Category Cards: the grid follows its own column width, not the viewport. */}
        <div className="@container xl:col-span-8">
          <div className="grid grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-5 gap-3">
            {metrics.categoryList.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.group];
              const { tone } = ACCOUNT_CATEGORY_COLORS[cat.group];
              const displayCatAmount = isUsd
                ? (cat.amountUsd ?? cat.amount)
                : (cat.amountBob ?? cat.amount);

              return (
                <AccountsCard
                  key={cat.group}
                  className="p-4 flex flex-col justify-between hover:border-primary/30 transition group"
                >
                  <div className="flex items-center gap-2">
                    <IconTile icon={Icon} variant={tone} size="sm" />
                    <span className="text-xs font-semibold text-muted-foreground truncate">
                      {cat.label}
                    </span>
                  </div>

                  <Amount value={displayCatAmount} currency={displayCurrency} size="md" className="my-2 min-w-0 truncate" />

                  <div>
                    <Badge variant="outline" className={`font-bold ${TONE_BADGE_CLASSES[tone]}`}>
                      {formatPercent(cat.percentage, preferences)}
                    </Badge>
                  </div>
                </AccountsCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
