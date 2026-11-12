"use client";

import React from "react";
import {
  Calendar as CalendarIcon,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Amount } from "@/shared/ui/amount";
import type { CalendarEvent } from "../../domain/calendar-analytics";

interface CalendarioDayViewProps {
  selectedDate: string; // "YYYY-MM-DD"
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  selectedCurrency: string;
}

export function CalendarioDayView({
  selectedDate,
  events,
  onSelectEvent,
  selectedCurrency,
}: CalendarioDayViewProps) {
  const parts = selectedDate.split("-").map(Number);
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

  const formattedDate = dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dayIncome = events
    .filter((e) => !e.isExpense)
    .reduce((sum, e) => sum + e.amountInSelectedCurrency, 0);

  const dayExpenses = events
    .filter((e) => e.isExpense)
    .reduce((sum, e) => sum + e.amountInSelectedCurrency, 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-5 shadow-xs flex flex-col gap-5">
      {/* Header of the Day */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">
            Vista Diaria
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground capitalize mt-0.5">
            {formattedDate}
          </h2>
        </div>

        {/* Day Totals Summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <Amount value={dayIncome} currency={selectedCurrency} sign="always" size="xs" className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <Amount value={-dayExpenses} currency={selectedCurrency} size="xs" className="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-3">
        {events.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-muted-foreground/40" />
            <p className="font-bold text-sm text-foreground">
              No hay eventos programados para este día
            </p>
            <p className="text-muted-foreground">
              Selecciona otro día o programa un nuevo evento con el botón superior.
            </p>
          </div>
        ) : (
          events.map((ev) => {
            return (
              <Card
                key={ev.id}
                onClick={() => onSelectEvent?.(ev)}
                className="border-border/60 bg-background/60 hover:bg-muted/40 transition-all cursor-pointer rounded-xl overflow-hidden"
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        !ev.isExpense
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : ev.type === "investment"
                          ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                          : ev.type === "debt"
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {!ev.isExpense ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-extrabold text-sm text-foreground truncate">
                        {ev.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-muted-foreground/70" />
                          <span>{ev.categoryName || "General"}</span>
                        </span>
                        <span>•</span>
                        <span className="capitalize">{ev.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Amount
                      value={ev.isExpense ? -ev.amountInSelectedCurrency : ev.amountInSelectedCurrency}
                      currency={selectedCurrency}
                      size="md"
                      className={!ev.isExpense ? "text-emerald-400" : "text-rose-400"}
                    />
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold uppercase tracking-wider"
                    >
                      {ev.status === "completed"
                        ? "Realizado"
                        : ev.status === "due_soon"
                        ? "Próximo"
                        : ev.status === "overdue"
                        ? "Vencido"
                        : "Programado"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
