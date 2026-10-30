"use client";

import React from "react";
import { Search } from "lucide-react";
import { UserDto } from "@/modules/identity/domain/identity.types";
import { UserMenuDropdown } from "@/modules/identity/presentation/UserMenuDropdown";

interface TopbarProps {
  user?: UserDto | null;
  accountsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCurrency: "BOB" | "USD";
  onToggleCurrency: () => void;
  onOpenNewTransaction: () => void;
  onOpenCreateAccount: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export function Topbar({
  user,
  accountsCount,
  searchQuery,
  onSearchChange,
  selectedCurrency,
  onToggleCurrency,
  onOpenNewTransaction,
  onOpenCreateAccount,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: TopbarProps) {
  const handleNewTxnClick = () => {
    if (accountsCount === 0) {
      onOpenCreateAccount();
    } else {
      onOpenNewTransaction();
    }
  };

  return (
    <header className="hidden md:flex h-[72px] px-8 bg-card/90 backdrop-blur-md border-b border-border items-center justify-between gap-4 sticky top-0 z-20">
      <div className="relative w-[320px] lg:w-[380px] h-[40px] rounded-[10px] bg-background border border-border flex items-center px-[12px] justify-between focus-within:border-primary/60 transition">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-[15px] h-[15px] text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar transacciones o cuentas..."
            className="w-full text-sm font-medium text-foreground placeholder-muted-foreground bg-transparent focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground ml-2 shrink-0 select-none">
          ⌘K
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleCurrency}
          title="Alternar moneda de visualización (BOB / USD)"
          className="h-[40px] px-3 rounded-[10px] bg-secondary hover:bg-secondary/80 border border-border text-foreground text-sm font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <span>{selectedCurrency === "BOB" ? "BOB (Bs.)" : "USD ($)"}</span>
          <span className="text-xs text-muted-foreground">▼</span>
        </button>

        <button
          onClick={handleNewTxnClick}
          className="h-[40px] px-[16px] rounded-[10px] bg-primary hover:bg-blue-600 active:scale-[0.99] text-sm font-bold text-white transition shadow-xs"
        >
          {accountsCount === 0 ? "+ Crear Cuenta" : "+ Nuevo Movimiento"}
        </button>

        {user && (
          <div className="pl-2 border-l border-border">
            <UserMenuDropdown
              user={user}
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onLogout={onLogout}
            />
          </div>
        )}
      </div>
    </header>
  );
}
