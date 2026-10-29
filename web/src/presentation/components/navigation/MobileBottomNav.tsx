"use client";

import React from "react";
import { LayoutDashboard, Landmark, Plus, PieChart, ArrowLeftRight } from "lucide-react";
import { NavigationTab } from "./Sidebar";

interface MobileBottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenQuickTxn: () => void;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenQuickTxn,
}: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-3 py-2 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* 1. Inicio */}
      <button
        onClick={() => onTabChange("inicio")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "inicio" ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] font-bold">Inicio</span>
      </button>

      {/* 2. Cuentas */}
      <button
        onClick={() => onTabChange("cuentas")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "cuentas" ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        <Landmark className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] font-bold">Cuentas</span>
      </button>

      {/* 3. Center FAB: 1-Tap Movimiento */}
      <button
        onClick={onOpenQuickTxn}
        className="w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center -mt-5 shadow-lg shadow-blue-500/30 active:scale-95 transition"
        title="Nuevo Movimiento (1-Tap)"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* 4. Presupuestos & Metas */}
      <button
        onClick={() => onTabChange("presupuestos")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "presupuestos" ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        <PieChart className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] font-bold">Metas</span>
      </button>

      {/* 5. Recurrentes / P2P */}
      <button
        onClick={() => onTabChange("recurrentes")}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
          activeTab === "recurrentes" ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] font-bold">Fijos & FX</span>
      </button>
    </nav>
  );
}
