"use client";

import React from "react";
import { ArrowLeftRight, BarChart3, CreditCard, Layers, SlidersHorizontal, TrendingUp } from "lucide-react";
import { SegmentedControl } from "@/shared/ui/segmented-control";

export type ReportsTab = "overview" | "income-expenses" | "accounts" | "investments" | "net-worth" | "custom";

interface ReportsNavTabsProps {
  activeTab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
}

const tabs = [
  { value: "overview", label: "Vista general", icon: BarChart3 },
  { value: "income-expenses", label: "Ingresos y gastos", icon: ArrowLeftRight },
  { value: "accounts", label: "Cuentas", icon: CreditCard },
  { value: "investments", label: "Inversiones", icon: TrendingUp },
  { value: "net-worth", label: "Patrimonio", icon: Layers },
  { value: "custom", label: "Personalizado", icon: SlidersHorizontal },
] as const;

export function ReportsNavTabs({ activeTab, onTabChange }: ReportsNavTabsProps) {
  return (
    <nav aria-label="Secciones de reportes" className="min-w-0 overflow-x-auto pb-1">
      <SegmentedControl<ReportsTab>
        aria-label="Vista del reporte"
        value={activeTab}
        onChange={onTabChange}
        options={tabs.map(({ value, label, icon: Icon }) => ({
          value,
          label: <><Icon aria-hidden="true" className="size-5" /><span>{label}</span></>,
        }))}
        className="gap-2 bg-transparent p-0 [&_button]:min-h-11 [&_button]:gap-2 [&_button]:rounded-xl [&_button]:border [&_button]:border-border [&_button]:bg-card [&_[aria-checked=true]]:border-purple-400/50 [&_[aria-checked=true]]:bg-gradient-to-r [&_[aria-checked=true]]:from-purple-600 [&_[aria-checked=true]]:to-violet-600 [&_[aria-checked=true]]:text-white"
      />
    </nav>
  );
}
