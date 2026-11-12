import React, { useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { UpcomingLoanPayment } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { BorrowerAvatar, CollectionDate } from "./DineroPrestadoTableCard";

export function DineroPrestadoUpcomingCollectionsCard({ collections, onOpenPayment }: {
  collections: UpcomingLoanPayment[];
  onOpenPayment: (loanId: string, installmentNumber: number) => void;
}) {
  const format = useNumberFormat();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? collections : collections.slice(0, 3);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card className="h-full min-w-0">
      <CardHeader><h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="size-5 text-violet-500" aria-hidden="true" />Próximos cobros</h2></CardHeader>
      <CardContent>
        {collections.length === 0 ? <p className="text-sm text-muted-foreground">No hay cobros pendientes con fecha disponible.</p> : <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {visible.map((collection) => <li key={`${collection.loanId}-${collection.installmentNumber}`} className="flex items-center gap-2 py-2.5">
            <BorrowerAvatar name={collection.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={collection.name}>{collection.name}</p>
              <p className="mt-1 text-xs text-muted-foreground"><CollectionDate date={collection.dueDate} /></p>
              {collection.isEstimated && <span className="text-xs text-muted-foreground">Cuota estimada</span>}
              {collection.dueDate < today && <Badge variant="destructive" className="mt-1">Vencida{collection.isEstimated ? " (estimada)" : ""}</Badge>}
            </div>
            <div className="shrink-0 text-right">
              <p className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold tabular-nums text-emerald-500">{format(collection.amount)} {collection.currency}</p>
              <Button size="xs" variant="ghost" aria-label={`Registrar cobro de ${collection.name}`} onClick={() => onOpenPayment(collection.loanId, collection.installmentNumber)}>Cobrar</Button>
            </div>
          </li>)}
        </ul>}
        {collections.length > 3 && <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowAll(!showAll)}>{showAll ? "Ver menos cobros" : "Ver todos los cobros"}<ArrowRight aria-hidden="true" /></Button>}
      </CardContent>
    </Card>
  );
}
