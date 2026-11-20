"use client";

import React from "react";
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Bell, FileText } from "lucide-react";

export type InvestmentDetailTabKey = "resumen" | "operaciones" | "evolucion" | "alertas" | "documentos";

interface InvestmentDetailTabsProps {
  activeTab: InvestmentDetailTabKey;
  onTabChange: (tab: InvestmentDetailTabKey) => void;
  operationsCount?: number;
  alertsCount?: number;
}

const TABS: { key: InvestmentDetailTabKey; label: string; icon: React.ElementType }[] = [
  { key: "resumen", label: "Resumen", icon: LayoutDashboard },
  { key: "operaciones", label: "Operaciones", icon: ArrowLeftRight },
  { key: "evolucion", label: "Evolución", icon: TrendingUp },
  { key: "alertas", label: "Alertas", icon: Bell },
  { key: "documentos", label: "Documentos", icon: FileText },
];

export function InvestmentDetailTabs({
  activeTab,
  onTabChange,
  operationsCount,
  alertsCount,
}: InvestmentDetailTabsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 pb-2 scrollbar-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              isActive
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.key === "operaciones" && operationsCount !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {operationsCount}
              </span>
            )}
            {tab.key === "alertas" && alertsCount !== undefined && alertsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-300"}`}>
                {alertsCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
