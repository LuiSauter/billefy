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
import { UserDto } from "@/domain/models/types";

export type NavigationTab =
  | "inicio"
  | "cuentas"
  | "borradores"
  | "prestamos"
  | "presupuestos"
  | "recurrentes";

interface SidebarProps {
  user?: UserDto | null;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  draftsCount: number;
  p2pRate: number;
  onLogout?: () => void;
}

export function Sidebar({
  user,
  activeTab,
  onTabChange,
  draftsCount,
  p2pRate,
  onLogout,
}: SidebarProps) {
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Mi Usuario";
  const userInitials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";

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
    <aside className="hidden md:flex w-[240px] bg-white border-r border-border flex-col justify-between shrink-0 min-h-screen py-6 px-4 select-none">
      <div className="flex flex-col gap-6">
        {/* Brand Header (OpenPencil BBrand) */}
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-slate-900 flex items-center justify-center text-white shrink-0">
            <Wallet className="w-[18px] h-[18px]" />
          </div>
          <span className="text-[18px] font-extrabold tracking-tight text-foreground">
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
                className={`w-full h-[38px] flex items-center justify-between px-[10px] rounded-[10px] text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-700 font-medium hover:bg-slate-50"
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
                  <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold bg-red-500 text-white">
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
        <div className="bg-slate-100 rounded-[10px] p-[10px] flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Binance P2P</span>
          <span className="text-xs font-extrabold text-emerald-600">
            Bs. {p2pRate.toFixed(2)}
          </span>
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="p-2 rounded-[12px] bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            {user.pictureUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.pictureUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {userInitials}
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold text-foreground truncate leading-tight">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate leading-tight">
                {user.email}
              </span>
            </div>
          </div>
        )}

        {/* User / Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-rose-50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
}
