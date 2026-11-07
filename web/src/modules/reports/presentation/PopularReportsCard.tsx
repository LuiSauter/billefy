"use client";

import React from "react";
import { ChevronRight, CreditCard, Layers, Scale, Star, TrendingUp } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

interface PopularReportsCardProps {
  onSelectReport?: (id: string) => void;
}

const reports = [
  { id: "monthly-summary", label: "Resumen mensual", description: "Ingresos, gastos y balance", icon: CreditCard, tone: "bg-purple-500/15 text-purple-300" },
  { id: "cash-flow", label: "Flujo de efectivo", description: "Entradas y salidas por período", icon: TrendingUp, tone: "bg-violet-500/15 text-violet-300" },
  { id: "investment-performance", label: "Rendimiento de inversiones", description: "Ganancias, pérdidas y rentabilidad", icon: Scale, tone: "bg-purple-500/15 text-purple-300" },
  { id: "net-worth", label: "Evolución del patrimonio", description: "Activos, pasivos y patrimonio neto", icon: Layers, tone: "bg-violet-500/15 text-violet-300" },
] as const;

export function PopularReportsCard({ onSelectReport }: PopularReportsCardProps) {
  return (
    <Card className="h-full min-w-0 border-border/80">
      <CardHeader>
        <h2 className="flex items-center gap-3 text-lg font-bold tracking-tight"><Star aria-hidden="true" className="size-6 shrink-0 text-purple-300" />Reportes populares</h2>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {reports.map(({ id, label, description, icon: Icon, tone }) => (
            <li key={id}>
              <Button type="button" variant="ghost" disabled={!onSelectReport} onClick={() => onSelectReport?.(id)} className="h-auto w-full justify-start gap-3 whitespace-normal rounded-xl border border-border/60 px-3 py-2 text-left hover:border-purple-500/30 hover:bg-purple-500/10">
                <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
