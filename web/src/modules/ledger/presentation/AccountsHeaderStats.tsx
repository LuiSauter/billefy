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
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { Amount } from "@/shared/ui/amount";
import {
  AccountCategoryGroup,
  AccountsOverviewMetrics,
} from "../domain/accounts-overview";

interface AccountsHeaderStatsProps {
  metrics: AccountsOverviewMetrics;
  currency?: "USD" | "BOB";
  onOpenCreateAccountModal: () => void;
  onOpenCsvModal?: () => void;
}

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

  const categoryIcons: Record<
    AccountCategoryGroup,
    { icon: React.ComponentType<{ className?: string }>; colorClasses: string; badgeClasses: string }
  > = {
    bancos: {
      icon: Landmark,
      colorClasses: "bg-teal-500/15 text-teal-400 border border-teal-500/20",
      badgeClasses: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
    },
    wallets: {
      icon: Wallet,
      colorClasses: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
      badgeClasses: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
    },
    cripto: {
      icon: Coins,
      colorClasses: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
      badgeClasses: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    },
    efectivo: {
      icon: Banknote,
      colorClasses: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
      badgeClasses: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
    },
    otros: {
      icon: Layers,
      colorClasses: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20",
      badgeClasses: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    },
  };

  const changePct = metrics.monthlyChangePct;
  const isPositive = changePct === null || changePct >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Cuentas
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
            Administra todas tus cuentas (bancos, wallets, crypto, efectivo, etc.) en un solo lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCsvModal && (
            <button
              type="button"
              onClick={onOpenCsvModal}
              className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <span>📄 Importar CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCreateAccountModal}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar cuenta</span>
          </button>
        </div>
      </div>

      {/* Row of Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5">
        {/* Hero Card: Saldo total en cuentas */}
        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#26174d] via-[#1d123d] to-[#130d2a] border border-purple-500/25 p-5 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[148px]">
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
              stroke="#a855f7"
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
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
              )}
              {changePct !== null ? `${changePct < 0 ? "−" : changePct > 0 ? "+" : ""}${formatPercent(changePct, preferences)}` : `+${formatPercent(0, preferences)}`}
            </span>
            <span className="text-[11px] font-medium text-purple-200/70">
              vs. mes anterior
            </span>
          </div>
        </div>

        {/* 5 Category Cards */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {metrics.categoryList.map((cat) => {
            const config = categoryIcons[cat.group];
            const Icon = config.icon;
            const displayCatAmount = isUsd
              ? (cat.amountUsd ?? cat.amount)
              : (cat.amountBob ?? cat.amount);

            return (
              <div
                key={cat.group}
                className="rounded-2xl bg-card border border-border/70 p-4 flex flex-col justify-between shadow-2xs hover:border-purple-500/30 transition group"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.colorClasses}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground truncate">
                    {cat.label}
                  </span>
                </div>

                <Amount value={displayCatAmount} currency={displayCurrency} size="md" className="my-2 min-w-0 truncate" />

                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeClasses}`}
                  >
                    {formatPercent(cat.percentage, preferences)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
