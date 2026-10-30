"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Landmark,
  Plus,
  PieChart,
  ArrowLeftRight,
  Ellipsis,
  TrendingUp,
  HandCoins,
  SlidersHorizontal,
} from "lucide-react";
import { NavigationTab } from "./Sidebar";

interface MobileBottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenQuickTxn: () => void;
  planEnabled?: boolean;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenQuickTxn,
  planEnabled = false,
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems: { id: NavigationTab; label: string; icon: typeof TrendingUp }[] = [
    { id: "inversiones", label: "Inversiones", icon: TrendingUp },
    { id: "prestamos", label: "Préstamos", icon: HandCoins },
    ...(planEnabled
      ? [{ id: "plan" as NavigationTab, label: "Plan de distribución", icon: SlidersHorizontal }]
      : []),
    { id: "recurrentes", label: "Fijos & FX", icon: ArrowLeftRight },
  ];
  const moreActive = moreItems.some((i) => i.id === activeTab);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-3 py-2 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.4)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* 1. Inicio */}
      <button
        onClick={() => onTabChange("inicio")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "inicio" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
        <span className="text-xs font-bold">Inicio</span>
      </button>

      {/* 2. Cuentas */}
      <button
        onClick={() => onTabChange("cuentas")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "cuentas" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Landmark className="w-5 h-5 stroke-[2.2]" />
        <span className="text-xs font-bold">Cuentas</span>
      </button>

      {/* 3. Center FAB: 1-Tap Movimiento */}
      <button
        onClick={onOpenQuickTxn}
        className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center -mt-5 shadow-lg shadow-blue-500/30 active:scale-95 transition"
        title="Nuevo Movimiento (1-Tap)"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* 4. Presupuestos & Metas */}
      <button
        onClick={() => onTabChange("presupuestos")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "presupuestos" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <PieChart className="w-5 h-5 stroke-[2.2]" />
        <span className="text-xs font-bold">Metas</span>
      </button>

      {/* 5. More */}
      <div className="relative">
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-full right-0 mb-3 z-50 w-56 rounded-2xl bg-card border border-border shadow-xl p-1.5 flex flex-col">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMoreOpen(false);
                      onTabChange(item.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-semibold transition ${
                      activeTab === item.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={`relative z-50 flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            moreActive || moreOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ellipsis className="w-5 h-5 stroke-[2.2]" />
          <span className="text-xs font-bold">Más</span>
        </button>
      </div>
    </nav>
  );
}
