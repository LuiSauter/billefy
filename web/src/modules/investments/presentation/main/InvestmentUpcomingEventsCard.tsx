"use client";

import React from "react";
import { Calendar, Plus } from "lucide-react";

export interface InvestmentEventItem {
  id: string;
  title: string;
  date: string;
  tag: string;
  tagColor?: string;
}

interface InvestmentUpcomingEventsCardProps {
  events?: InvestmentEventItem[];
  onAddEvent?: () => void;
}

export function InvestmentUpcomingEventsCard({
  events = [],
  onAddEvent,
}: InvestmentUpcomingEventsCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Próximos eventos
          </h3>
        </div>
        {onAddEvent && (
          <button
            type="button"
            onClick={onAddEvent}
            className="h-7 px-2.5 rounded-lg border border-border/80 bg-muted/60 hover:bg-muted text-foreground text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Agregar</span>
          </button>
        )}
      </div>

      {events.length > 0 ? (
        <div className="flex flex-col gap-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-card border border-border/70 text-purple-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">
                    {evt.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {evt.date}
                  </span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                  evt.tagColor || "bg-muted text-foreground"
                }`}
              >
                {evt.tag}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-5 text-center rounded-xl bg-muted/30 border border-border/50 gap-2">
          <Calendar className="w-6 h-6 text-muted-foreground/60" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">
              Sin eventos programados
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
              No hay aportes ni rebalanceos previstos en el calendario inmediato.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
