import { LoanDetailDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LoanDetailModalProps {
  isOpen: boolean;
  loan: LoanDetailDto | null;
  onClose: () => void;
}

export function LoanDetailModal({ isOpen, loan, onClose }: LoanDetailModalProps) {
  if (!isOpen || !loan) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-3xl shadow-xl bg-background border my-8">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Detalle del Préstamo: {loan.summary.counterpartyName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {loan.summary.type === "Lent" ? "Dinero que presté" : "Deuda"} · {loan.summary.template} · TEA: {(loan.summary.annualEffectiveRate * 100).toFixed(2)}%
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/40 rounded-lg text-xs">
            <div>
              Capital Inicial:{" "}
              <span className="font-mono font-bold">
                {loan.summary.principal.toFixed(2)} {loan.summary.currency}
              </span>
            </div>
            <div>
              Saldo Pendiente:{" "}
              <span className="font-mono font-bold text-amber-600">
                {loan.summary.remainingPrincipal.toFixed(2)} {loan.summary.currency}
              </span>
            </div>
            <div>
              Cuotas Totales: <span className="font-bold">{loan.summary.totalInstallments}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Cronograma de Cuotas</h4>
            <div className="max-h-60 overflow-y-auto border rounded-md divide-y text-xs font-mono">
              <div className="grid grid-cols-6 font-bold py-2 px-3 bg-muted/30 text-muted-foreground">
                <span>#</span>
                <span>Vence</span>
                <span>Esperado</span>
                <span>Cap. Pagado</span>
                <span>Int. Pagado</span>
                <span>Estado</span>
              </div>
              {loan.installments.map((inst) => (
                <div key={inst.id} className="grid grid-cols-6 py-2 px-3 items-center">
                  <span>Cuota {inst.number}</span>
                  <span>{inst.dueDate}</span>
                  <span>{inst.expectedTotal.toFixed(2)}</span>
                  <span>{inst.paidPrincipal.toFixed(2)}</span>
                  <span>{inst.paidInterest.toFixed(2)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] w-fit font-sans font-semibold ${
                      inst.status === "Paid"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : inst.status === "Overdue"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {inst.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {loan.payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Pagos Registrados ({loan.payments.length})</h4>
              <div className="max-h-40 overflow-y-auto border rounded-md divide-y text-xs font-mono">
                {loan.payments.map((pay) => (
                  <div key={pay.id} className="py-2 px-3 flex justify-between items-center">
                    <div>
                      <div>
                        Fecha: {new Date(pay.paymentDate).toLocaleDateString()} {pay.note && `· ${pay.note}`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {pay.allocations
                          .map(
                            (a) =>
                              `Cuota ${a.installmentNumber}: Cap ${a.toPrincipal.toFixed(2)} + Int ${a.toInterest.toFixed(2)}`
                          )
                          .join(" | ")}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600">
                      +{pay.amount.toFixed(2)} {pay.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
