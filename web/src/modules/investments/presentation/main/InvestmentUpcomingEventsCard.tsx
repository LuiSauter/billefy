"use client";

import React from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { InvestmentsCard } from "../InvestmentsCard";

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
    <InvestmentsCard>
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <CardTitle className={appCardTitleClassName}>Próximos eventos</CardTitle>
        </div>
        {onAddEvent && (
          <Button type="button" variant="outline" size="xs" onClick={onAddEvent}>
            <Plus aria-hidden="true" />
            <span>Agregar</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className={appCardContentClassName}>
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
                Todavía no hay una fuente de eventos de inversión conectada a esta vista.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </InvestmentsCard>
  );
}
