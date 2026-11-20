import React from "react";
import type { DebtMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

export function DeudaAvalanchePriorityCard({ priority }: { priority: DebtMetrics["paymentPriority"] }) {
  const format = useNumberFormat();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <h2 className="text-lg font-semibold">Prioridad de pago</h2>
        <p className="text-xs text-muted-foreground">Método Avalancha · Mayor interés primero</p>
      </CardHeader>
      <CardContent>
        <ol className="max-h-80 space-y-2 overflow-y-auto" aria-label="Prioridad por tasa de interés">
          {priority.map((loan) => (
            <li key={loan.id} className="flex items-center gap-3 rounded-lg border border-border p-2 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/25 font-bold text-violet-500">{loan.rank}</span>
              <span className="min-w-0 flex-1">{loan.name}</span>
              <span className="shrink-0 font-semibold tabular-nums">{format(loan.rate)}%</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
