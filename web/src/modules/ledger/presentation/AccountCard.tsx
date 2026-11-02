"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Pencil,
  Scale,
  ArrowRight,
  Landmark,
  Wallet,
  Coins,
  Banknote,
  Layers,
  TrendingUp,
} from "lucide-react";
import { AccountDto } from "../domain/ledger.types";
import {
  classifyAccountCategory,
  getAccountSubtitle,
  getAccountVisualProfile,
  getCategoryBadge,
} from "../domain/accounts-overview";
import { resolveAccountVisualMeta } from "../domain/account-meta";
import { CategoryIconBadge } from "./CategoryIcon";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

interface AccountCardProps {
  account: AccountDto;
  onEdit: (account: AccountDto) => void;
  onReconcile: (account: AccountDto) => void;
  onSelect?: (account: AccountDto) => void;
}

export function AccountCard({
  account,
  onEdit,
  onReconcile,
  onSelect,
}: AccountCardProps) {
  const format = useNumberFormat();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const category = classifyAccountCategory(account);
  const badge = getCategoryBadge(category);
  const subtitle = getAccountSubtitle(account);
  const profile = getAccountVisualProfile(account);

  const formatBalance = (acc: AccountDto) => {
    return `${acc.currency === "BOB" ? "Bs. " : "$ "}${format(acc.balance)}`;
  };

  const renderBrandIcon = () => {
    switch (profile.brandKey) {
      case "bcp":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#002a8f] text-white flex items-center justify-center font-black text-xs tracking-tighter shrink-0 shadow-sm border border-blue-400/30">
            <span className="text-[#ff7800]">&gt;</span>BCP<span className="text-[#ff7800]">&gt;</span>
          </div>
        );
      case "mercadopago":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#009ee3] text-white flex items-center justify-center shrink-0 shadow-sm border border-cyan-400/30">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        );
      case "binance":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#1e2026] text-[#f0b90b] flex items-center justify-center shrink-0 shadow-sm border border-amber-400/30">
            <Coins className="w-5 h-5 text-[#f0b90b]" />
          </div>
        );
      case "payoneer":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff4800] via-[#ff0070] to-[#7928ca] p-[2px] shrink-0">
            <div className="w-full h-full bg-[#121626] rounded-[10px] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-orange-400" />
            </div>
          </div>
        );
      case "bisa":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#ffd100] text-[#1e293b] flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
            bisa
          </div>
        );
      case "cash":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
        );
      case "broker":
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        );
      default: {
        const meta = resolveAccountVisualMeta(account);
        return (
          <CategoryIconBadge
            iconKey={meta.iconKey}
            colorKey={meta.colorKey}
            size="md"
          />
        );
      }
    }
  };

  const renderCategoryIcon = () => {
    switch (category) {
      case "bancos":
        return <Landmark className="w-3.5 h-3.5" />;
      case "wallets":
        return <Wallet className="w-3.5 h-3.5" />;
      case "cripto":
        return <Coins className="w-3.5 h-3.5" />;
      case "efectivo":
        return <Banknote className="w-3.5 h-3.5" />;
      case "otros":
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      onClick={() => (onSelect ? onSelect(account) : onReconcile(account))}
      className="rounded-2xl bg-card border border-border/70 p-4 relative overflow-hidden flex flex-col justify-between hover:border-purple-500/40 hover:shadow-md transition group cursor-pointer min-h-[160px]"
    >
      {/* Left accent color bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
        style={{ backgroundColor: profile.accentColor }}
      />

      {/* Top row: Icon + Names + 3-dots */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex items-center gap-3 min-w-0">
          {renderBrandIcon()}
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
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
            title="Opciones de cuenta"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 rounded-xl bg-popover border border-border shadow-xl py-1 z-30 flex flex-col text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (onSelect) onSelect(account);
                  else onReconcile(account);
                }}
                className="px-3.5 py-2 text-left text-foreground hover:bg-muted flex items-center gap-2 transition"
              >
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                <span>Ver detalle</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(account);
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
                  onReconcile(account);
                }}
                className="px-3.5 py-2 text-left text-primary hover:bg-primary/10 flex items-center gap-2 transition"
              >
                <Scale className="w-3.5 h-3.5 text-primary" />
                <span>Conciliar saldo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle row: Balance */}
      <div className="my-3 pl-2 flex items-baseline gap-1.5">
        <span className="text-xl font-black text-foreground font-mono tracking-tight">
          {formatBalance(account)}
        </span>
        <span className="text-xs font-bold text-muted-foreground">
          {account.currency}
        </span>
      </div>

      {/* Bottom row: Category badge */}
      <div className="pl-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground border border-border/60">
          <span style={{ color: badge.color }}>
            {renderCategoryIcon()}
          </span>
          <span className="text-foreground/90 font-medium">
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}
