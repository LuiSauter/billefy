"use client";

import React from "react";
import { Tag } from "lucide-react";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type {
  CalendarMonthCell,
  CalendarEvent,
} from "../../domain/calendar-analytics";

interface CalendarioMonthGridProps {
  cells: CalendarMonthCell[];
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateString: string) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  selectedCurrency: string;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarioMonthGrid({
  cells,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  selectedCurrency,
}: CalendarioMonthGridProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs flex flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border/80 bg-muted/20 text-center py-2 text-xs font-bold text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* 42 Calendar Cells Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
        {cells.map((cell) => {
          const isSelected = cell.dateString === selectedDate;
          const hasEvents = cell.events.length > 0;

          return (
            <div
              key={cell.dateString}
              onClick={() => onSelectDate(cell.dateString)}
              className={`min-h-[75px] sm:min-h-[115px] p-1 sm:p-2 flex flex-col justify-start transition-all cursor-pointer relative group ${
                cell.isCurrentMonth
                  ? "bg-card/40 hover:bg-muted/40 text-foreground"
                  : "bg-muted/10 text-muted-foreground/35 hover:bg-muted/20"
              } ${
                isSelected
                  ? "ring-2 ring-purple-500 ring-inset bg-purple-500/10 z-10"
                  : ""
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    {cell.day}
                  </div>
                ) : (
                  <span
                    className={`text-xs font-semibold pl-0.5 ${
                      cell.isCurrentMonth
                        ? cell.isToday
                          ? "text-purple-400 font-extrabold"
                          : "text-foreground/80"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {cell.day}
                  </span>
                )}

                {/* Day Mini Dot indicator if has events and not current month */}
                {!cell.isCurrentMonth && hasEvents && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                )}
              </div>

              {/* Event Pills */}
              <div className="flex flex-col gap-1 mt-1.5 flex-1 overflow-hidden">
                {cell.events.slice(0, 3).map((ev) => {
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(cell.dateString);
                        onSelectEvent?.(ev);
                      }}
                      className={`px-1.5 py-1 rounded-md text-[10px] sm:text-[11px] border flex flex-col gap-0.5 transition-all truncate hover:brightness-110 ${getEventBadgeStyle(
                        ev
                      )}`}
                      title={`${ev.title}: ${currencySymbol} ${format(ev.amountInSelectedCurrency)}`}
                    >
                      {/* Amount with sign */}
                      <div className="font-extrabold tracking-tight tabular-nums flex items-center gap-1 leading-none truncate">
                        <span className="truncate">
                          {ev.isExpense ? "-" : "+"} {currencySymbol} {format(ev.amountInSelectedCurrency)}
                        </span>
                      </div>
                      {/* Name / Category (shown on sm+ or when space permits) */}
                      <div className="text-[9px] opacity-80 truncate hidden sm:flex items-center gap-1 leading-none">
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Overflow count */}
                {cell.events.length > 3 && (
                  <span className="text-[9px] font-bold text-muted-foreground px-1">
                    +{cell.events.length - 3} más
                  </span>
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
