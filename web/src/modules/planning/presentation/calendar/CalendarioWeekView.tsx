"use client";

import React from "react";
import { Tag } from "lucide-react";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { CalendarMonthCell, CalendarEvent } from "../../domain/calendar-analytics";

interface CalendarioWeekViewProps {
  days: CalendarMonthCell[];
  selectedDate: string;
  onSelectDate: (dateString: string) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  selectedCurrency: string;
}

const WEEKDAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function CalendarioWeekView({
  days,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  selectedCurrency,
}: CalendarioWeekViewProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-border/60">
        {days.map((day, idx) => {
          const isSelected = day.dateString === selectedDate;

          return (
            <div
              key={day.dateString}
              onClick={() => onSelectDate(day.dateString)}
              className={`min-h-[220px] p-3 flex flex-col gap-2 transition-colors cursor-pointer ${
                isSelected
                  ? "bg-purple-500/10 ring-2 ring-purple-500 ring-inset"
                  : "bg-card/40 hover:bg-muted/30"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-xs font-bold text-muted-foreground">
                  {WEEKDAY_NAMES[idx]}
                </span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : day.isToday
                      ? "text-purple-400 bg-purple-500/10"
                      : "text-foreground"
                  }`}
                >
                  {day.day}
                </span>
              </div>

              {/* Events in Day */}
              <div className="flex flex-col gap-2 mt-1 flex-1">
                {day.events.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground/50 italic py-4 text-center">
                    Sin eventos
                  </span>
                ) : (
                  day.events.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(day.dateString);
                        onSelectEvent?.(ev);
                      }}
                      className={`p-2 rounded-xl border flex flex-col gap-1 transition-all hover:brightness-105 ${getEventBadgeStyle(
                        ev
                      )}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs tabular-nums">
                          {ev.isExpense ? "-" : "+"} {currencySymbol} {format(ev.amountInSelectedCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] opacity-90 truncate">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getEventBadgeStyle(ev: CalendarEvent): string {
  if (ev.type === "investment") {
    return "bg-purple-500/15 border-purple-500/30 text-purple-300";
  }
  if (ev.type === "debt") {
    return "bg-amber-500/15 border-amber-500/30 text-amber-300";
  }
  if (!ev.isExpense) {
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  }
  return "bg-rose-500/15 border-rose-500/30 text-rose-300";
}
