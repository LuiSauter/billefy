"use client";

import React from "react";
import {
  Wallet,
  LayoutDashboard,
  Landmark,
  Sparkles,
  HandCoins,
  PieChart,
  Repeat,
  LogOut,
} from "lucide-react";

export type NavigationTab = "inicio" | "cuentas" | "borradores" | "prestamos" | "presupuestos" | "recurrentes";

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  draftsCount: number;
  p2pRate: number;
  onLogout?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  draftsCount,
  p2pRate,
  onLogout,
}: SidebarProps) {
  const navItems = [
    { id: "inicio" as NavigationTab, label: "Inicio", icon: LayoutDashboard },
    { id: "cuentas" as NavigationTab, label: "Mis Cuentas", icon: Landmark },
    {
      id: "borradores" as NavigationTab,
      label: "Borradores",
      icon: Sparkles,
      badge: draftsCount > 0 ? draftsCount : undefined,
    },
    { id: "prestamos" as NavigationTab, label: "Préstamos", icon: HandCoins },
    { id: "presupuestos" as NavigationTab, label: "Presupuestos", icon: PieChart },
    { id: "recurrentes" as NavigationTab, label: "Arbitraje P2P", icon: Repeat },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Billefy</span>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar: P2P Ticker & Logout */}
      <div className="p-4 space-y-3 border-t border-slate-100">
        {/* Binance P2P Rate Card */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
          <div className="text-xs font-medium text-slate-500">Binance P2P</div>
          <div className="text-xs font-bold text-emerald-600 font-mono">
            Bs. {p2pRate.toFixed(2)}
          </div>
        </div>

        {/* User / Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
}
