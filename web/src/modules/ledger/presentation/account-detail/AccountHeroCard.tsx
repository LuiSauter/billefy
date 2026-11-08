"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Wallet,
  Coins,
  Banknote,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { AccountDto } from "../../domain/ledger.types";
import {
  formatNativeBalance,
  getAccountSubtitle,
  getAccountVisualProfile,
  getCurrencyConversionLabel,
} from "../../domain/accounts-overview";
import { resolveAccountVisualMeta } from "../../domain/account-meta";
import { CategoryIconBadge } from "../CategoryIcon";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const profile = getAccountVisualProfile(account);
  const subtitle = getAccountSubtitle(account);
  const currencySymbol = account.currency === "BOB" ? "Bs" : "$";

  const formattedCurrentBalance = formatNativeBalance(
    account.balance || 0,
    account.currency,
    format
  );

  const accountInitial = (account as unknown as { initialBalance?: number | string }).initialBalance;
  const effectiveInitialBalance =
    initialBalance ??
    (accountInitial ? new Decimal(accountInitial) : new Decimal(0));

  const formattedInitialBalance = formatNativeBalance(
    effectiveInitialBalance,
    account.currency,
    format
  );

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

  const renderBrandIcon = () => {
    switch (profile.brandKey) {
      case "bcp":
        return (
          <div className="w-12 h-12 rounded-2xl bg-[#002a8f] text-white flex items-center justify-center font-black text-xs tracking-tighter shrink-0 shadow-sm border border-blue-400/30">
            <span className="text-[#ff7800]">&gt;</span>BCP<span className="text-[#ff7800]">&gt;</span>
          </div>
        );
      case "mercadopago":
        return (
          <div className="w-12 h-12 rounded-2xl bg-[#009ee3] text-white flex items-center justify-center shrink-0 shadow-sm border border-cyan-400/30">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        );
      case "binance":
        return (
          <div className="w-12 h-12 rounded-2xl bg-[#1e2026] text-[#f0b90b] flex items-center justify-center shrink-0 shadow-sm border border-amber-400/30">
            <Coins className="w-6 h-6 text-[#f0b90b]" />
          </div>
        );
      case "cash":
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
        );
      case "broker":
        return (
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        );
      default: {
        const meta = resolveAccountVisualMeta(account);
        return (
          <CategoryIconBadge
            iconKey={meta.iconKey}
            colorKey={meta.colorKey}
            size="lg"
          />
        );
      }
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
      {/* Background Accent glow */}
      <div
        className="absolute top-0 right-0 w-80 h-full opacity-10 pointer-events-none blur-3xl rounded-full"
        style={{ backgroundColor: profile.accentColor || "#8B5CF6" }}
      />

      {/* 1. Identity & Name Block */}
      <div className="flex items-center gap-4 min-w-0 pr-4">
        {renderBrandIcon()}

        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
              {account.name}
            </h2>

            {/* 3-dots menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
                title="Opciones de cuenta"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute left-0 top-8 w-44 rounded-xl bg-popover border border-border shadow-xl py-1 z-30 flex flex-col text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenEdit();
                    }}
                    className="px-3.5 py-2 text-left text-foreground hover:bg-muted flex items-center gap-2 transition"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Editar cuenta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenReconcile();
                    }}
                    className="px-3.5 py-2 text-left text-primary hover:bg-primary/10 flex items-center gap-2 transition"
                  >
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    <span>Conciliar saldo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyId();
                      setMenuOpen(false);
                    }}
                    className="px-3.5 py-2 text-left text-muted-foreground hover:bg-muted flex items-center gap-2 transition"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? "ID copiado" : "Copiar ID"}</span>
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                      className="px-3.5 py-2 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition border-t border-border/60"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Eliminar cuenta</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground truncate font-medium">
            {subtitle} • {account.currency}
          </p>

          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Activa
            </span>
          </div>
        </div>
      </div>

      {/* Dividers & KPI Metrics Row */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 sm:gap-8 border-t lg:border-t-0 lg:border-l border-border/70 pt-4 lg:pt-0 lg:pl-8">
        {/* Metric 1: Saldo actual */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Saldo actual
          </span>
          <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono">
            {formattedCurrentBalance}
          </span>
          {conversionLabel && (
            <span className="text-xs font-semibold text-muted-foreground font-mono">
              {conversionLabel}
            </span>
          )}
        </div>

        {/* Metric 2: Saldo inicial */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-xs font-semibold text-muted-foreground">
            Saldo inicial
          </span>
          <span className="text-sm sm:text-base font-bold text-foreground">
            {formattedInitialBalance}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
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
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                isPositiveVariation
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              }`}
            >
              {isPositiveVariation ? (
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              {variationPercentage >= 0 ? "+" : ""}
              {variationPercentage.toFixed(2)}%
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground mt-0.5">
            {effectiveNominalVariation.gte(0) ? "+ " : "- "}
            {currencySymbol} {format(effectiveNominalVariation.abs())}
          </span>
        </div>
      </div>
    </div>
  );
}
