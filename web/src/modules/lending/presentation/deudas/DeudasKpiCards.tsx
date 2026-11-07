import React from "react";
import { CalendarDays, Layers, Percent, Scale } from "lucide-react";
import type { DebtMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

export function DeudasKpiCards({ metrics, hasIncome }: { metrics: DebtMetrics; hasIncome: boolean }) {
  const format = useNumberFormat();
  const items = [
    { label: "Deuda total", value: `${format(metrics.totalDebt)} ${metrics.currency}`, icon: Layers },
    { label: "Pago mensual", value: `${format(metrics.monthlyPayment)} ${metrics.currency}`, icon: CalendarDays },
    { label: "Interés promedio", value: `${format(metrics.averageInterestRate)}%`, icon: Percent },
    { label: "Ratio deuda / ingreso", value: hasIncome ? `${format(metrics.dtiRatio)}%` : "Sin ingresos registrados", icon: Scale },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon }, index) => (
        <Card key={label} className="flex items-center gap-4 p-4">
          <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${index === 1 ? "bg-emerald-500/15 text-emerald-500" : "bg-violet-500/15 text-violet-500"}`}>
            <Icon className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p>
            {index === 3 && <Badge className="mt-1" variant={metrics.dtiStatus === "Controlado" ? "success" : metrics.dtiStatus === "Crítico" ? "destructive" : "outline"}>{metrics.dtiStatus}</Badge>}
          </div>
        </Card>
      ))}
    </div>
  );
}
