import React from "react";
import { CalendarDays, ChartNoAxesCombined, ChevronRight, HandCoins, Plus, TriangleAlert, Zap } from "lucide-react";
import type { LentMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

export function DineroPrestadoSideSummaryCard({ metrics, collectionLoanId, onOpenCreateLent, onOpenPayment }: {
  metrics: LentMetrics;
  collectionLoanId?: string;
  onOpenCreateLent: () => void;
  onOpenPayment: (loanId: string) => void;
}) {
  const format = useNumberFormat();
  const items = [
    { label: "Cobrado este mes", value: metrics.monthSummary.collectedThisMonth, icon: HandCoins, tone: "text-emerald-500" },
    { label: "Por cobrar este mes", value: metrics.monthSummary.pendingThisMonth, icon: CalendarDays, tone: "text-amber-500" },
    { label: "Vencido", value: metrics.monthSummary.overdueAmount, icon: TriangleAlert, tone: "text-destructive" },
  ];
  return (
    <aside className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader><h2 className="flex items-center gap-2 text-lg font-semibold"><ChartNoAxesCombined className="size-5 text-violet-500" aria-hidden="true" />Resumen</h2></CardHeader>
        <CardContent>
          <dl className="divide-y divide-border text-sm">
            {items.map(({ label, value, icon: Icon, tone }) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <dt className="flex items-center gap-2"><Icon className={`size-4 ${tone}`} aria-hidden="true" />{label}</dt>
              <dd className={`font-semibold tabular-nums ${tone}`}>{format(value)} {metrics.currency}</dd>
            </div>)}
          </dl>
          {metrics.hasEstimates && <p className="mt-2 text-xs text-muted-foreground">Por cobrar y vencido pueden incluir cuotas estimadas.</p>}
          {!metrics.collectionHistoryComplete && <p className="mt-2 text-xs text-muted-foreground">Cobrado este mes solo incluye pagos con fecha confirmada.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Vencido puede incluir cuotas de este mes.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="flex items-center gap-2 text-lg font-semibold"><Zap className="size-5 text-violet-500" aria-hidden="true" />Acciones rápidas</h2></CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" className="justify-start" aria-label="Registrar préstamo" onClick={onOpenCreateLent}><Plus aria-hidden="true" />Registrar préstamo<ChevronRight className="ml-auto" aria-hidden="true" /></Button>
          <Button variant="outline" className="justify-start" aria-label="Registrar cobro" disabled={!collectionLoanId} onClick={() => { if (collectionLoanId) onOpenPayment(collectionLoanId); }}><HandCoins aria-hidden="true" />Registrar cobro<ChevronRight className="ml-auto" aria-hidden="true" /></Button>
          {!collectionLoanId && <p className="text-xs text-muted-foreground">No hay préstamos pendientes de cobro.</p>}
        </CardContent>
      </Card>
    </aside>
  );
}
