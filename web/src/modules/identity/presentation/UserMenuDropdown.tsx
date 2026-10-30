"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  User,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { UserDto, getUserDisplayName } from "../domain/identity.types";
import { UserAvatar } from "./UserAvatar";
import { useTheme } from "@/shared/lib/theme-context";

interface UserMenuDropdownProps {
  user?: UserDto | null;
  compact?: boolean;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export function UserMenuDropdown({
  user,
  compact = false,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: UserMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const displayName = getUserDisplayName(user);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Menú de usuario"
        className={`flex items-center gap-2.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/60 transition p-1.5 focus:outline-hidden ${
          isOpen ? "bg-muted/80 border-border" : ""
        }`}
      >
        <UserAvatar user={user} size={compact ? "sm" : "md"} />

        {!compact && (
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-sm font-extrabold text-foreground leading-tight truncate max-w-[135px]">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground font-medium leading-tight truncate max-w-[135px]">
              {user?.email || "Cuenta activa"}
            </span>
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-68 rounded-2xl bg-popover border border-border shadow-xl shadow-black/25 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Identity Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-extrabold text-foreground truncate">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email || "Sesión verificada"}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                <ShieldCheck className="w-3 h-3" />
                Sesión segura
              </span>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="py-1.5 px-1.5 flex flex-col gap-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition text-left"
            >
              <User className="w-4 h-4 text-primary shrink-0" />
              <div className="flex flex-col">
                <span>Mi Perfil</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Datos de tu cuenta y seguridad
                </span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition text-left"
            >
              <Settings className="w-4 h-4 text-primary shrink-0" />
              <div className="flex flex-col">
                <span>Configuraciones</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Preferencias, moneda e integraciones
                </span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition text-left"
            >
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span>{isDark ? "Modo Oscuro" : "Modo Claro"}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Cambiar a {isDark ? "modo claro" : "modo oscuro"}
                  </span>
                </div>
              </div>

              <span
                className={`w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center ${
                  isDark ? "bg-primary justify-end" : "bg-input justify-start"
                }`}
              >
                <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform" />
              </span>
            </button>
          </div>

          {/* Logout */}
          {onLogout && (
            <div className="pt-1.5 mt-1 px-1.5 border-t border-border">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
