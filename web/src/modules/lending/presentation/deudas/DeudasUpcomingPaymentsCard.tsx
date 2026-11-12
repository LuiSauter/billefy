import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { UpcomingLoanPayment } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

export function DeudasUpcomingPaymentsCard({ payments, onOpenPayment }: {
  payments: UpcomingLoanPayment[];
  onOpenPayment: (loanId: string, installmentNumber?: number) => void;
}) {
  const format = useNumberFormat();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? payments : payments.slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Próximos pagos</h2>
        {payments.length > 5 && <Button size="xs" variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Ver menos" : "Ver todos"}<ArrowRight aria-hidden="true" /></Button>}
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? <p className="text-sm text-muted-foreground">No hay cuotas pendientes con fecha disponible.</p> : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {visible.map((payment) => (
              <li key={`${payment.loanId}-${payment.installmentNumber}`} className="flex items-center gap-3 py-2.5">
                <time dateTime={payment.dueDate} className="shrink-0 rounded-lg bg-violet-500/15 px-2 py-1.5 text-xs font-semibold text-violet-500">
                  {new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${payment.dueDate}T00:00:00Z`))}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={payment.name}>{payment.name}</p>
                  <p className="text-xs text-muted-foreground">Cuota {payment.installmentNumber}{payment.isEstimated ? " · Estimada" : ""}</p>
                  {payment.dueDate < today && <Badge variant="destructive" className="mt-1">Vencida{payment.isEstimated ? " (estimada)" : ""}</Badge>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums">{format(payment.amount)} {payment.currency}</p>
                  <Button size="xs" variant="ghost" aria-label={`Pagar ${payment.name}`} onClick={() => onOpenPayment(payment.loanId, payment.installmentNumber)}>Pagar</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
