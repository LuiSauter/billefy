"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";

export type CalendarViewMode = "mes" | "semana" | "dia";

interface CalendarioToolbarProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
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

export function CalendarioToolbar({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
}: CalendarioToolbarProps) {
  const monthName = MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-xs">
      {/* Left: Previous, Next & Month Title */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onPrev}
            className="w-8 h-8 rounded-lg border-border bg-background hover:bg-muted text-foreground"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onNext}
            className="w-8 h-8 rounded-lg border-border bg-background hover:bg-muted text-foreground"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-base sm:text-lg font-extrabold text-foreground tracking-tight pl-1">
          {monthName} {year}
        </span>
      </div>

      {/* Center: View Switcher (Mes / Semana / Día) */}
      <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60">
        <button
          type="button"
          onClick={() => onViewModeChange("mes")}
          className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            viewMode === "mes"
              ? "bg-purple-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Mes</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("semana")}
          className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            viewMode === "semana"
              ? "bg-purple-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Semana</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("dia")}
          className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            viewMode === "dia"
              ? "bg-purple-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Día</span>
        </button>
      </div>

      {/* Right: Hoy button and Calendar Picker icon */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToday}
          className="h-8 px-3 rounded-lg border-border bg-background hover:bg-muted text-xs font-semibold text-foreground gap-1.5"
        >
          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
          <span>Hoy</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToday}
          className="w-8 h-8 rounded-lg border-border bg-background hover:bg-muted text-foreground"
          title="Calendario"
        >
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
