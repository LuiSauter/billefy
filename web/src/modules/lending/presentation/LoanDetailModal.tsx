"use client";

import { LoanDetailDto, LoanCancellationResultDto } from "@/modules/lending/domain/lending.types";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Progress } from "@/shared/ui/progress";
import { Amount } from "@/shared/ui/amount";
import { formatAmountText, formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

interface LoanDetailModalProps {
  isOpen: boolean;
  loan: LoanDetailDto | null;
  onClose: () => void;
  onCancelLoan?: (loanId: string) => Promise<LoanCancellationResultDto>;
  onOpenPayment?: (loanId: string, installmentNumber?: number) => void;
}

export function LoanDetailModal(props: LoanDetailModalProps) {
  const { isOpen, loan, onClose, onOpenPayment } = props;
  const preferences = useNumberPreferences();
  if (!isOpen || !loan) return null;

  const canPay = ["Active", "InArrears"].includes(loan.summary.status) && Boolean(onOpenPayment);
  const isCollection = loan.summary.type === "Lent";
  const principal = Number(loan.summary.principal) || 1;
  const remaining = Number(loan.summary.remainingPrincipal) || 0;
  const paid = Math.max(0, principal - remaining);
  const progressPercent = Math.min(100, Math.round((paid / principal) * 100));

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      title={`Detalle de préstamo: ${loan.summary.counterpartyName}`}
      description={`${
        loan.summary.type === "Lent" ? "Dinero que presté" : "Deuda a pagar"
      } · ${loan.summary.template} · TEA: ${formatPercent(loan.summary.annualEffectiveRate * 100, preferences)}`}
      footer={
        <>
        {canPay &&
          <Button type="button" size="lg" onClick={() => onOpenPayment?.(loan.summary.id)}>{isCollection ? "Registrar cobro" : "Registrar pago"}</Button>}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Cerrar
        </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* KPI Card */}
        <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Capital inicial</span>
              <Amount value={loan.summary.principal} currency={loan.summary.currency} size="md" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Saldo de capital</span>
              <Amount value={loan.summary.remainingPrincipal} currency={loan.summary.currency} size="md" className="text-amber-600" />
            </div>
            {loan.summary.totalPayoff !== undefined && (
              <div>
                <span className="text-xs text-muted-foreground block">Total para cancelar</span>
                <Amount value={loan.summary.totalPayoff} currency={loan.summary.currency} size="md" />
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground block">Cuotas totales</span>
              <strong className="text-base font-extrabold text-foreground">
                {loan.summary.totalInstallments}
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Política de prepago:</span>
              <span className="font-semibold px-2 py-0.5 rounded-full bg-background border border-border">
                {loan.summary.earlyPaymentPolicy === "ReduceInstallment"
                  ? "Abono a capital (reducir cuota)"
                  : loan.summary.earlyPaymentPolicy === "ReduceTerm"
                  ? "Abono a capital (reducir plazo)"
                  : "Adelanto de cuotas futuras"}
              </span>
            </div>
            <span className="text-muted-foreground">
              TEA: {formatPercent(loan.summary.annualEffectiveRate * 100, preferences)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Amortización del capital</span>
              <span className="font-semibold">{progressPercent}% pagado</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        {/* Schedule */}
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-bold text-foreground">Cronograma de cuotas</h4>
          <div className="max-h-64 overflow-y-auto border border-border rounded-2xl divide-y divide-border text-xs">
            <div className="grid grid-cols-7 font-bold py-2.5 px-3 bg-muted text-muted-foreground sticky top-0 text-[11px]">
              <span>#</span>
              <span>Vence</span>
              <span>Esperado</span>
              <span>Cap. Pagado</span>
              <span>Int. Pagado</span>
              <span>Pendiente</span>
              <span>Estado</span>
            </div>
            {loan.installments.map((inst) => {
              const pending = inst.totalOutstanding != null
                ? (typeof inst.totalOutstanding === "number" ? inst.totalOutstanding : inst.totalOutstanding.toNumber())
                : inst.status === "Paid" ? 0 : (typeof inst.expectedTotal === "number" ? inst.expectedTotal : inst.expectedTotal.toNumber());
              return (
                <div key={inst.id} className="grid grid-cols-7 py-2.5 px-3 items-center hover:bg-muted/40">
                  <span className="font-semibold text-foreground">Cuota {inst.number}</span>
                  <span className="text-muted-foreground">{inst.dueDate}</span>
                  <Amount value={inst.expectedTotal} currency={loan.summary.currency} size="xs" />
                  <Amount value={inst.paidPrincipal} currency={loan.summary.currency} size="xs" />
                  <Amount value={inst.paidInterest} currency={loan.summary.currency} size="xs" />
                  <Amount value={pending} currency={loan.summary.currency} size="xs" className={pending > 0 ? "text-amber-500" : "text-emerald-500"} />
                  <div className="flex flex-col items-start gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs w-fit font-semibold ${
                        inst.status === "Paid"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : inst.status === "Overdue"
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : inst.status === "PartiallyPaid"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {inst.status === "PartiallyPaid" ? "Parcial" : inst.status === "Paid" ? "Pagada" : inst.status === "Overdue" ? "En mora" : "Pendiente"}
                    </span>
                    {canPay && !["Paid", "Forgiven"].includes(inst.status) && (inst.totalOutstanding == null || (typeof inst.totalOutstanding === "number" ? inst.totalOutstanding > 0 : inst.totalOutstanding.gt(0))) && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label={`${isCollection ? "Cobrar" : "Pagar"} cuota ${inst.number}`}
                        onClick={() => onOpenPayment?.(loan.summary.id, inst.number)}
                      >
                        {isCollection ? "Cobrar" : "Pagar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payments history */}
        {loan.payments.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-foreground">
              Pagos registrados ({loan.payments.length})
            </h4>
            <div className="max-h-48 overflow-y-auto border border-border rounded-2xl divide-y divide-border text-xs">
              {loan.payments.map((pay) => (
                <div key={pay.id} className="py-2.5 px-3 flex justify-between items-center hover:bg-muted/40">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">
                      Fecha: {new Date(pay.paymentDate).toLocaleDateString()} {pay.note && `· ${pay.note}`}
                    </span>
                    <span className="text-muted-foreground">
                      {pay.allocations
                        .map(
                          (a) =>
                            `Cuota ${a.installmentNumber}: Cap ${formatAmountText(a.toPrincipal, loan.summary.currency, preferences)} + Int ${formatAmountText(a.toInterest, loan.summary.currency, preferences)}`
                        )
                        .join(" | ")}
                    </span>
                  </div>
                  <Amount value={pay.amount} currency={pay.currency} sign="always" tone="income" size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResponsiveDrawer>
  );
}
