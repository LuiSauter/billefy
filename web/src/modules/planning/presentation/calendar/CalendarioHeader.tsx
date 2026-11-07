"use client";

import React from "react";
import { Calendar as CalendarIcon, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface CalendarioHeaderProps {
  currentDate: Date;
  onSelectMonth: (year: number, month: number) => void;
  onOpenNewEvent: () => void;
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

export function CalendarioHeader({
  currentDate,
  onSelectMonth,
  onOpenNewEvent,
}: CalendarioHeaderProps) {
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();

  // Generate options for recent & upcoming months (e.g. current year +/- 1)
  const monthOptions = [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const d = new Date(currentYear, currentMonthIndex + offset, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            Calendario financiero
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Visualiza tus próximos pagos, ingresos y eventos financieros en un solo lugar.
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Month Dropdown Selector */}
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
                onClick={() => onSelectMonth(opt.year, opt.month)}
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

        {/* New Event Button */}
        <Button
          onClick={onOpenNewEvent}
          size="sm"
          className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo evento</span>
        </Button>
      </div>
    </div>
  );
}
