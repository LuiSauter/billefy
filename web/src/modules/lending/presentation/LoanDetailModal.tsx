"use client";

import { LoanDetailDto } from "@/modules/lending/domain/lending.types";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Progress } from "@/shared/ui/progress";

interface LoanDetailModalProps {
  isOpen: boolean;
  loan: LoanDetailDto | null;
  onClose: () => void;
}

export function LoanDetailModal({ isOpen, loan, onClose }: LoanDetailModalProps) {
  if (!isOpen || !loan) return null;

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
      } · ${loan.summary.template} · TEA: ${(loan.summary.annualEffectiveRate * 100).toFixed(2)}%`}
      footer={
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {/* KPI Card */}
        <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Capital inicial</span>
              <strong className="text-base font-extrabold text-foreground tabular-nums">
                {loan.summary.principal.toFixed(2)} {loan.summary.currency}
              </strong>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Saldo pendiente</span>
              <strong className="text-base font-extrabold text-amber-600 tabular-nums">
                {loan.summary.remainingPrincipal.toFixed(2)} {loan.summary.currency}
              </strong>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block">Cuotas totales</span>
              <strong className="text-base font-extrabold text-foreground">
                {loan.summary.totalInstallments}
              </strong>
            </div>
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
            <div className="grid grid-cols-6 font-bold py-2.5 px-3 bg-muted text-muted-foreground sticky top-0">
              <span>#</span>
              <span>Vence</span>
              <span>Esperado</span>
              <span>Cap. Pagado</span>
              <span>Int. Pagado</span>
              <span>Estado</span>
            </div>
            {loan.installments.map((inst) => (
              <div key={inst.id} className="grid grid-cols-6 py-2.5 px-3 items-center hover:bg-muted/40">
                <span className="font-semibold text-foreground">Cuota {inst.number}</span>
                <span className="text-muted-foreground">{inst.dueDate}</span>
                <span className="font-mono text-foreground">{inst.expectedTotal.toFixed(2)}</span>
                <span className="font-mono text-foreground">{inst.paidPrincipal.toFixed(2)}</span>
                <span className="font-mono text-foreground">{inst.paidInterest.toFixed(2)}</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs w-fit font-semibold ${
                    inst.status === "Paid"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : inst.status === "Overdue"
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {inst.status}
                </span>
              </div>
            ))}
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
                            `Cuota ${a.installmentNumber}: Cap ${a.toPrincipal.toFixed(2)} + Int ${a.toInterest.toFixed(2)}`
                        )
                        .join(" | ")}
                    </span>
                  </div>
                  <div className="font-bold text-emerald-600 font-mono text-sm">
                    +{pay.amount.toFixed(2)} {pay.currency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResponsiveDrawer>
  );
}
