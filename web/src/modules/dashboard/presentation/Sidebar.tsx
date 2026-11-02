"use client";

import React from "react";
import {
  Wallet,
  LayoutDashboard,
  Landmark,
  Sparkles,
  HandCoins,
  PieChart,
  ArrowLeftRight,
  MessageCircle,
  ArrowDownUp,
  Repeat,
  TrendingUp,
  SlidersHorizontal,
  Settings,
} from "lucide-react";

export type NavigationTab =
  | "inicio"
  | "cuentas"
  | "movimientos"
  | "inversiones"
  | "plan"
  | "borradores"
  | "prestamos"
  | "presupuestos"
  | "recurrentes"
  | "configuracion";

interface SidebarProps {
  planEnabled?: boolean;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  draftsCount: number;
  p2pRate: number;
  onOpenFxTransfer: () => void;
  onOpenWhatsApp: () => void;
  onOpenBinance: () => void;
}

export function Sidebar({
  planEnabled = false,
  activeTab,
  onTabChange,
  draftsCount,
  p2pRate,
  onOpenFxTransfer,
  onOpenWhatsApp,
  onOpenBinance,
}: SidebarProps) {
  const navItems = [
    { id: "inicio" as NavigationTab, label: "Inicio", icon: LayoutDashboard },
    { id: "cuentas" as NavigationTab, label: "Mis Cuentas", icon: Landmark },
    { id: "movimientos" as NavigationTab, label: "Movimientos", icon: ArrowLeftRight },
    { id: "inversiones" as NavigationTab, label: "Inversiones", icon: TrendingUp },
    ...(planEnabled
      ? [{ id: "plan" as NavigationTab, label: "Plan de distribución", icon: SlidersHorizontal }]
      : []),
    {
      id: "borradores" as NavigationTab,
      label: "Borradores",
      icon: Sparkles,
      badge: draftsCount > 0 ? draftsCount : undefined,
    },
    { id: "prestamos" as NavigationTab, label: "Préstamos", icon: HandCoins },
    { id: "presupuestos" as NavigationTab, label: "Presupuestos", icon: PieChart },
    { id: "recurrentes" as NavigationTab, label: "Arbitraje P2P", icon: ArrowLeftRight },
    { id: "configuracion" as NavigationTab, label: "Configuración", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-[248px] bg-sidebar border-r border-sidebar-border flex-col justify-between shrink-0 h-dvh sticky top-0 overflow-y-auto py-6 px-4 select-none">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Wallet className="w-[18px] h-[18px]" />
          </div>
          <span className="text-[18px] font-extrabold tracking-tight text-foreground">
            Billefy
          </span>
        </div>

        {/* Primary Navigation */}
        <div className="flex flex-col gap-1.5">
          <span className="px-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Menú Principal
          </span>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full h-[38px] flex items-center justify-between px-[10px] rounded-[10px] text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground font-bold"
                      : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-[10px]">
                    <Icon
                      className={`w-[16px] h-[16px] shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Operations & Integrations moved from Topbar */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-sidebar-border">
          <span className="px-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Operaciones & Conectores
          </span>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onOpenFxTransfer}
              className="w-full h-[38px] flex items-center gap-[10px] px-[10px] rounded-[10px] text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Repeat className="w-[16px] h-[16px] text-primary shrink-0" />
              <span>Transferir FX</span>
            </button>

            <button
              type="button"
              onClick={onOpenWhatsApp}
              className="w-full h-[38px] flex items-center gap-[10px] px-[10px] rounded-[10px] text-sm font-semibold text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
            >
              <MessageCircle className="w-[16px] h-[16px] text-emerald-500 shrink-0" />
              <span>Bot WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onOpenBinance}
              className="w-full h-[38px] flex items-center gap-[10px] px-[10px] rounded-[10px] text-sm font-semibold text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
            >
              <ArrowDownUp className="w-[16px] h-[16px] text-amber-500 shrink-0" />
              <span>Binance P2P</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Parallel FX Indicator */}
      <div className="flex flex-col gap-2">
        <div className="bg-muted/70 border border-border rounded-[12px] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">Tasa P2P</span>
          </div>
          <span className="text-xs font-extrabold text-emerald-500">
            1 USDT = Bs. {p2pRate.toFixed(2)}
          </span>
        </div>
      </div>
    </aside>
  );
}
