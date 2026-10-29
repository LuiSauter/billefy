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
  LogOut,
} from "lucide-react";

export type NavigationTab =
  | "inicio"
  | "cuentas"
  | "borradores"
  | "prestamos"
  | "presupuestos"
  | "recurrentes";

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
    { id: "recurrentes" as NavigationTab, label: "Arbitraje P2P", icon: ArrowLeftRight },
  ];

  return (
    <aside className="w-[240px] bg-white border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 min-h-screen py-6 px-4 select-none">
      <div className="flex flex-col gap-6">
        {/* Brand Header (OpenPencil BBrand) */}
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#0F172A] flex items-center justify-center text-white shrink-0">
            <Wallet className="w-[18px] h-[18px]" />
          </div>
          <span className="text-[18px] font-[800] tracking-tight text-[#0F172A]">
            Billefy
          </span>
        </div>

        {/* Navigation Links (OpenPencil Nav) */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full h-[38px] flex items-center justify-between px-[10px] rounded-[10px] text-[13px] transition-colors ${
                  isActive
                    ? "bg-[#EFF6FF] text-[#1D4ED8] font-[700]"
                    : "text-[#334155] font-[500] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-[10px]">
                  <Icon
                    className={`w-[16px] h-[16px] shrink-0 ${
                      isActive ? "text-[#2563EB]" : "text-[#64748B]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-[700] bg-[#EF4444] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer (OpenPencil SBFoot) */}
      <div className="flex flex-col gap-3">
        {/* P2P Live Widget (OpenPencil P2PWidget) */}
        <div className="bg-[#F1F5F9] rounded-[10px] p-[10px] flex items-center justify-between">
          <span className="text-[11px] font-[700] text-[#475569]">Binance P2P</span>
          <span className="text-[11px] font-[800] text-[#059669]">
            Bs. {p2pRate.toFixed(2)}
          </span>
        </div>

        {/* User / Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium text-[#64748B] hover:text-[#EF4444] hover:bg-rose-50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
}
