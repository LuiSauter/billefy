"use client";

import React from "react";
import { HandCoins, Plus } from "lucide-react";
import { calculateLentMetrics, type LentMetrics } from "../../domain/lending-analytics";
import type { LoanDetailDto, LoanSummaryDto } from "../../domain/lending.types";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { DineroPrestadoHeader } from "./DineroPrestadoHeader";
import { DineroPrestadoKpiCards } from "./DineroPrestadoKpiCards";
import { DineroPrestadoEvolutionChartCard } from "./DineroPrestadoEvolutionChartCard";
import { DineroPrestadoHealthDonutCard } from "./DineroPrestadoHealthDonutCard";
import { DineroPrestadoUpcomingCollectionsCard } from "./DineroPrestadoUpcomingCollectionsCard";
import { DineroPrestadoTableCard, type LentTableRow } from "./DineroPrestadoTableCard";
import { DineroPrestadoSideSummaryCard } from "./DineroPrestadoSideSummaryCard";

export interface DineroPrestadoViewProps {
  loans: LoanSummaryDto[];
  loanDetails?: Record<string, LoanDetailDto>;
  loading?: boolean;
  selectedCurrency?: string;
  p2pRate?: number;
  onOpenCreateLent: () => void;
  onOpenPayment: (loanId: string) => void;
  onOpenLoanDetails?: (loanId: string) => void;
}

export function DineroPrestadoView({ loans, loanDetails, loading = false, selectedCurrency = "USD", p2pRate,
  onOpenCreateLent, onOpenPayment, onOpenLoanDetails }: DineroPrestadoViewProps) {
  const header = <DineroPrestadoHeader onOpenCreateLent={onOpenCreateLent} />;
  if (loading) {
    return <section className="flex flex-col gap-5">{header}<div role="status" aria-busy="true" aria-label="Cargando préstamos">
      <span className="sr-only">Cargando préstamos</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="mt-5 h-80 rounded-2xl" />
    </div></section>;
  }

  const lent = loans.filter((loan) => loan.type === "Lent" && loan.status !== "Cancelled");
  if (lent.length === 0) {
    return <section className="flex flex-col gap-5">{header}<Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="rounded-full bg-violet-500/15 p-4 text-violet-500"><HandCoins className="size-8" aria-hidden="true" /></span>
      <h2 className="text-xl font-semibold">Aún no has registrado préstamos</h2>
      <p className="max-w-md text-sm text-muted-foreground">Registra el dinero que has prestado para seguir tus cobros y conocer el saldo pendiente.</p>
      <Button onClick={onOpenCreateLent}><Plus aria-hidden="true" />Registrar mi primer préstamo</Button>
    </Card></section>;
  }

  let metrics: LentMetrics;
  let rows: LentTableRow[];
  try {
    metrics = calculateLentMetrics(lent, selectedCurrency, p2pRate, loanDetails);
    rows = lent.map((loan) => {
      // Reuse domain FX, principal progress and health rules for each row so
      // filters, badges and the donut always describe the same positions.
      const individual = calculateLentMetrics([loan], selectedCurrency, p2pRate, loanDetails);
      return { id: loan.id, name: loan.counterpartyName, lent: individual.totalLent,
        pending: individual.totalPending, progress: individual.collectedPercentage,
        status: individual.completedLoansCount > 0 ? "Finalizado" : individual.healthBreakdown.find((item) => item.count > 0)!.status,
        dueDate: individual.upcomingCollections[0]?.dueDate };
    });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return <section className="flex flex-col gap-5">{header}<Card role="alert" className="border-destructive/30 p-6 text-sm">
      No se pudieron calcular los préstamos. Revisa las monedas, el tipo de cambio y los importes antes de consultar los totales.
    </Card></section>;
  }

  const collectionLoanId = metrics.upcomingCollections[0]?.loanId ?? rows.find((row) => row.status !== "Finalizado")?.id;
  return (
    <section className="flex w-full min-w-0 flex-col gap-5">
      {header}
      <DineroPrestadoKpiCards metrics={metrics} />
      {metrics.hasEstimates && <p role="note" className="text-xs text-muted-foreground">Estimaciones: algunas cuotas y fechas se calculan desde el resumen. Consulta el calendario del préstamo para ver los cobros confirmados.</p>}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <DineroPrestadoEvolutionChartCard metrics={metrics} />
        <DineroPrestadoHealthDonutCard metrics={metrics} />
        <DineroPrestadoUpcomingCollectionsCard collections={metrics.upcomingCollections} onOpenPayment={onOpenPayment} />
        <DineroPrestadoTableCard rows={rows} currency={metrics.currency} onOpenPayment={onOpenPayment} onOpenLoanDetails={onOpenLoanDetails} />
        <DineroPrestadoSideSummaryCard metrics={metrics} collectionLoanId={collectionLoanId} onOpenCreateLent={onOpenCreateLent} onOpenPayment={onOpenPayment} />
      </div>
    </section>
  );
}
