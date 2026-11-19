"use client";

import React from "react";
import { Layers, Plus } from "lucide-react";
import { calculateDebtMetrics, type DebtMetrics } from "../../domain/lending-analytics";
import type { LoanDetailDto, LoanSummaryDto } from "../../domain/lending.types";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { DeudasHeader } from "./DeudasHeader";
import { DeudasKpiCards } from "./DeudasKpiCards";
import { DeudasTableCard, type DebtPaymentStatus, type DebtTableRow } from "./DeudasTableCard";
import { DeudaDistributionDonutCard } from "./DeudaDistributionDonutCard";
import { DeudaPayoffProjectionCard } from "./DeudaPayoffProjectionCard";
import { DeudasUpcomingPaymentsCard } from "./DeudasUpcomingPaymentsCard";
import { DeudaAvalanchePriorityCard } from "./DeudaAvalanchePriorityCard";
import { DeudaInsightsBanner } from "./DeudaInsightsBanner";

export interface DeudasViewProps {
  loans: LoanSummaryDto[];
  loanDetails?: Record<string, LoanDetailDto>;
  loading?: boolean;
  selectedCurrency?: string;
  p2pRate?: number;
  monthlyIncome?: number;
  onOpenCreateDebt: () => void;
  onOpenPayment: (loanId: string) => void;
  onOpenLoanDetails?: (loanId: string) => void;
  onOpenCardPurchase?: (loanId: string) => void;
}

function paymentStatus(loan: LoanSummaryDto, detail: LoanDetailDto | undefined, nextNumber?: number): DebtPaymentStatus {
  const today = new Date().toISOString().slice(0, 10);
  const unpaid = detail?.installments.filter((item) => item.status !== "Paid" && item.status !== "Forgiven"
    && item.expectedTotal.minus(item.paidPrincipal).minus(item.paidInterest).gt(0));
  if (loan.status === "InArrears" || unpaid?.some((item) => item.dueDate.slice(0, 10) < today)) return "Atrasada";
  const next = unpaid?.find((item) => item.number === nextNumber);
  // Repaid principal on a summary does not imply a partially paid installment.
  if (next && (next.status === "PartiallyPaid" || next.paidPrincipal.gt(0) || next.paidInterest.gt(0))) return "Pago parcial";
  return "Al día";
}

export function DeudasView({ loans, loanDetails, loading = false, selectedCurrency = "USD", p2pRate,
  monthlyIncome = 0, onOpenCreateDebt, onOpenPayment, onOpenLoanDetails, onOpenCardPurchase }: DeudasViewProps) {
  const header = <DeudasHeader onOpenCreateDebt={onOpenCreateDebt} />;
  if (loading) {
    return <section className="flex flex-col gap-5">{header}<div role="status" aria-busy="true" aria-label="Cargando deudas">
      <span className="sr-only">Cargando deudas</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="mt-5 h-80 rounded-2xl" />
    </div></section>;
  }

  const cards = loans.filter(loan => loan.loanKind === "CreditCard" && !["Cancelled", "Forgiven"].includes(loan.status));
  const cardActions = onOpenCardPurchase && cards.length > 0 ? <Card className="space-y-3 p-4">
    <h2 className="text-sm font-semibold">Compras con tarjeta</h2>
    <p className="text-sm text-muted-foreground">La compra consume presupuesto y aumenta deuda; pagar capital no genera otro gasto.</p>
    <div className="flex flex-wrap gap-2">{cards.map(card => <Button key={card.id} variant="outline" aria-label={`Registrar compra de ${card.counterpartyName}`} onClick={() => onOpenCardPurchase(card.id)}>
      Registrar compra · {card.counterpartyName}</Button>)}</div>
  </Card> : null;
  const debts = loans.filter((loan) => loan.type === "Borrowed" && loan.status !== "Paid"
    && loan.status !== "Cancelled" && loan.remainingPrincipal.gt(0));
  if (debts.length === 0) {
    return <section className="flex flex-col gap-5">{header}{cardActions}<Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="rounded-full bg-violet-500/15 p-4 text-violet-500"><Layers className="size-8" aria-hidden="true" /></div>
      <h2 className="text-xl font-semibold">No tienes deudas pendientes</h2>
      <p className="max-w-md text-sm text-muted-foreground">Registra tu primera deuda para organizar tus cuotas, conocer tus intereses y planificar tus pagos.</p>
      <Button onClick={onOpenCreateDebt}><Plus aria-hidden="true" />Registrar mi primera deuda</Button>
    </Card></section>;
  }

  let metrics: DebtMetrics;
  let rows: DebtTableRow[];
  try {
    metrics = calculateDebtMetrics(debts, monthlyIncome, selectedCurrency, p2pRate, loanDetails);
    rows = debts.map((loan) => {
      // Reuse domain categorization, FX and schedule math rather than infer a
      // monthly payment or aggregate incompatible currencies in the UI.
      const individual = calculateDebtMetrics([loan], monthlyIncome, selectedCurrency, p2pRate, loanDetails);
      const next = individual.upcomingPayments[0];
      return { id: loan.id, name: loan.counterpartyName,
        category: individual.distribution.find((item) => item.total > 0)?.category ?? "Otros",
        balance: individual.totalDebt, monthlyPayment: individual.monthlyPayment,
        annualRate: individual.paymentPriority[0]?.rate ?? 0, dueDate: next?.dueDate,
        status: paymentStatus(loan, loanDetails?.[loan.id], next?.installmentNumber) };
    });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return <section className="flex flex-col gap-5">{header}<Card role="alert" className="border-destructive/30 p-6 text-sm">
      No se pudieron calcular las deudas. Revisa las monedas, el tipo de cambio y los importes antes de consultar los totales.
    </Card></section>;
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-5">
      {header}
      {cardActions}
      <DeudasKpiCards metrics={metrics} hasIncome={Number.isFinite(monthlyIncome) && monthlyIncome > 0} />
      {metrics.hasEstimates && <p role="note" className="text-xs text-muted-foreground">Estimaciones: algunas cuotas y proyecciones se calculan desde el resumen. Consulta el calendario del préstamo para ver los importes confirmados.</p>}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <DeudasTableCard rows={rows} currency={metrics.currency} onOpenPayment={onOpenPayment} onOpenLoanDetails={onOpenLoanDetails} />
        <DeudaDistributionDonutCard metrics={metrics} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <DeudaPayoffProjectionCard metrics={metrics} />
        <DeudasUpcomingPaymentsCard payments={metrics.upcomingPayments} onOpenPayment={onOpenPayment} />
        <DeudaAvalanchePriorityCard priority={metrics.paymentPriority} />
      </div>
      <DeudaInsightsBanner insights={metrics.insights} />
    </section>
  );
}
