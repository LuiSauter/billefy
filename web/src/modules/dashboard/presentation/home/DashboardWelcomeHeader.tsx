"use client";

import React from "react";
import { Calendar as CalendarIcon, ChevronDown, Bell, Settings } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { UserAvatar } from "@/modules/identity/presentation/UserAvatar";
import type { UserDto } from "@/modules/identity/domain/identity.types";

interface DashboardWelcomeHeaderProps {
  user?: UserDto | null;
  currentDate?: Date;
  onSelectMonth?: (year: number, month: number) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function DashboardWelcomeHeader({
  user,
  currentDate = new Date(),
  onSelectMonth,
  onOpenSettings,
  onOpenNotifications,
}: DashboardWelcomeHeaderProps) {
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();

  const monthOptions = [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const d = new Date(currentYear, currentMonthIndex + offset, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    };
  });

  const displayName = user?.fullName || user?.email?.split("@")[0] || "Luis Gabriel";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      {/* User greeting */}
      <div className="flex items-center gap-3.5">
        <div className="relative rounded-full p-0.5 border-2 border-purple-500/40 shadow-xs">
          <UserAvatar user={user} size="md" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background absolute -bottom-0.5 -right-0.5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Hola, {displayName}</span>
            <span className="inline-block animate-pulse">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Así va tu salud financiera este mes
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Month Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl border-border bg-card/70 hover:bg-muted text-xs font-semibold gap-2"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{`${MONTH_NAMES[currentMonthIndex]} ${currentYear}`}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-y-auto">
            {monthOptions.map((opt) => (
              <DropdownMenuItem
                key={`${opt.year}-${opt.month}`}
                onClick={() => onSelectMonth?.(opt.year, opt.month)}
                className={`text-xs ${
                  opt.year === currentYear && opt.month === currentMonthIndex
                    ? "font-bold text-purple-400 bg-purple-500/10"
                    : ""
                }`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenNotifications}
          className="w-9 h-9 rounded-xl border-border bg-card/70 hover:bg-muted relative text-foreground"
          title="Notificaciones"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-2 right-2 ring-2 ring-background" />
        </Button>

        {/* Settings Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-xl border-border bg-card/70 hover:bg-muted text-foreground"
          title="Configuración"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
